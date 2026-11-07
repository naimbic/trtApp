import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { richParts, previewOf, applyAction } from '@/lib/crm/chatApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { notifyNewMentions } from '@/lib/crm/mentionsApi'
import { chat } from '@/lib/crm/ai/providers'
import { resolveAi } from '@/lib/crm/ai/aiSettings'
import { rateLimit } from '@/lib/rateLimit'
import { shapeAiMessage } from '@/lib/crm/scheduledMessagesCalc'
import { REPEATS, UNITS, customOf, nextAfter, describe } from '@/lib/crm/scheduleRules'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const AUDIENCES = ['team', 'admins', 'all', 'selected']
export const CATEGORIES = ['tips', 'reminders', 'meetings', 'announcements', 'celebrations', 'other']
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

async function gate(cap) {
    const session = await requirePermission('scheduled_messages', cap)
    return { session, staffId: await getStaffId(session) }
}

/** Who gets it, as private messages: the active people of the audience (never the sender). Team: nobody, the Team room is used. */
async function recipients(m, senderId) {
    if (m.audience === 'team') return []
    const where = m.audience === 'admins' ? { active: true, admin: true } : m.audience === 'all' ? { active: true } : { active: true, id: { in: m.staffIds } }
    return (await prisma.crmStaff.findMany({ where, select: { id: true } })).map((s) => s.id).filter((id) => id !== senderId)
}

async function post(roomId, sender, parts) {
    const m = await prisma.crmChatMessage.create({ data: { roomId, senderType: 'staff', senderId: sender.id, senderName: staffName(sender), body: parts.shown, ...(parts.html ? { rich: parts.html, tags: parts.tags } : {}) } })
    await prisma.crmChatRoom.update({ where: { id: roomId }, data: { lastMessageAt: m.createdAt, lastMessage: previewOf(parts.shown, null) } })
    if (parts.html) notifyNewMentions({ by: { staffId: sender.id, name: staffName(sender) }, text: parts.html, prev: '', link: `/crm/chat?room=${roomId}`, subject: 'Chat' }).catch(() => {})
    return m
}

/** Posts the message in the chat now, then does what was asked with it: tell the assigned team, make a task, link and email the client.
 *  Returns { n: conversations that received it, notes: what could not be done }. */
export async function deliverScheduled(m) {
    const sender = (m.createdBy && (await prisma.crmStaff.findFirst({ where: { id: m.createdBy, active: true }, select: { id: true, firstName: true, lastName: true, email: true } }))) || (await prisma.crmStaff.findFirst({ where: { active: true, admin: true }, select: { id: true, firstName: true, lastName: true, email: true } }))
    if (!sender) throw fail('No active sender for this message')
    const parts = richParts(m.rich, m.body)
    const posted = []
    if (m.audience === 'team') {
        const room = (await prisma.crmChatRoom.findFirst({ where: { kind: 'team' } })) || (await prisma.crmChatRoom.create({ data: { kind: 'team' } }))
        posted.push(await post(room.id, sender, parts))
    } else {
        for (const to of await recipients(m, sender.id)) {
            const found = await prisma.crmChatRoom.findFirst({ where: { kind: 'direct', AND: [{ staffIds: { has: sender.id } }, { staffIds: { has: to } }] } })
            const room = found || (await prisma.crmChatRoom.create({ data: { kind: 'direct', staffIds: [sender.id, to] } }))
            posted.push(await post(room.id, sender, parts))
        }
    }
    const notes = []
    if (posted.length) {
        const c = { staffId: sender.id, name: staffName(sender) }
        const ids = posted.map((x) => x.id), first = posted[0]
        const team = (m.assigneeIds || [])
        try {
            if (m.makeTask) {
                const r = await applyAction(c, first, { action: 'task', assigneeIds: team, clientId: m.clientId, leadId: m.leadId })
                await prisma.crmChatMessage.updateMany({ where: { id: { in: ids } }, data: { taskId: r.taskId } })
            }
            if (team.length) { await applyAction(c, first, { action: 'assign', assigneeIds: team }); await prisma.crmChatMessage.updateMany({ where: { id: { in: ids } }, data: { assigneeIds: team } }) }
            if (m.clientId || m.leadId) {
                await applyAction(c, first, { action: 'client', clientId: m.clientId, leadId: m.leadId, email: !!m.emailClient, subject: m.title })
                await prisma.crmChatMessage.updateMany({ where: { id: { in: ids } }, data: m.clientId ? { clientId: m.clientId } : { leadId: m.leadId } })
            }
        } catch (e) { notes.push(e.message) }
    }
    return { n: posted.length, notes }
}

/** The automatic task: sends what is due. A message is claimed first (its next moment moves on), so two runs never send it twice. */
export async function scheduledMessagesJob({ lines, dry }) {
    const due = await prisma.crmScheduledMessage.findMany({ where: { active: true, AND: [{ nextAt: { not: null } }, { nextAt: { lte: new Date() } }] }, orderBy: { nextAt: 'asc' }, take: 50 })
    for (const m of due) {
        if (dry) { lines.push(`[preview] Scheduled message “${m.title}” would be sent (${m.audience})`); continue }
        // the last of a limited series ("2 times") does not schedule another one
        const lastRun = m.cycles > 0 && (m.runs || 0) + 1 >= m.cycles
        const next = lastRun ? null : nextAfter(m.nextAt, m.repeat, new Date(), { every: m.every, unit: m.unit })
        const claimed = await prisma.crmScheduledMessage.updateMany({ where: { id: m.id, nextAt: m.nextAt, active: true }, data: { nextAt: next, active: !!next } })
        if (!claimed.count) continue
        try {
            const { n, notes } = await deliverScheduled(m)
            await prisma.crmScheduledMessage.update({ where: { id: m.id }, data: { lastSentAt: new Date(), lastCount: n, sentCount: { increment: 1 }, runs: { increment: 1 } } })
            lines.push(`Scheduled message “${m.title}” sent to ${n} conversation(s)${next ? '' : ' (done)'}`)
            for (const x of notes) lines.push(`! Scheduled message “${m.title}”: ${x}`)
        } catch (e) { lines.push(`! Scheduled message “${m.title}”: ${e.message}`) }
    }
}

const shape = (m, names) => ({ id: m.id, category: m.category || 'other', title: m.title, body: m.body, rich: m.rich || null, assigneeIds: m.assigneeIds || [], clientId: m.clientId || null, leadId: m.leadId || null, emailClient: !!m.emailClient, makeTask: !!m.makeTask, audience: m.audience, staffIds: m.staffIds, repeat: m.repeat, every: m.every || 1, unit: m.unit || 'day', cycles: m.cycles || 0, runs: m.runs || 0, repeatLabel: describe(m.repeat, { every: m.every, unit: m.unit }, m.cycles), nextAt: m.nextAt, active: m.active, lastSentAt: m.lastSentAt, lastCount: m.lastCount, sentCount: m.sentCount, createdBy: names[m.createdBy] || '', createdAt: m.createdAt })

export async function listScheduled() {
    await gate('view')
    const [rows, staff] = await Promise.all([prisma.crmScheduledMessage.findMany({ orderBy: [{ active: 'desc' }, { nextAt: 'asc' }], take: 500 }), prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, admin: true } })])
    const names = Object.fromEntries(staff.map((s) => [s.id, staffName(s)]))
    return { list: rows.map((m) => shape(m, names)), staff: staff.map((s) => ({ id: s.id, name: staffName(s), admin: !!s.admin })).sort((a, b) => a.name.localeCompare(b.name)) }
}

export async function saveScheduled(id, body = {}) {
    const g = await gate(id ? 'edit' : 'create')
    const cur = id ? (oid(id) && (await prisma.crmScheduledMessage.findUnique({ where: { id } }))) : null
    if (id && !cur) throw fail('Message not found', 404)
    const data = {}
    if (!cur || body.title !== undefined) { const t = String(body.title || '').trim(); if (!t) throw fail('Give the message a title'); data.title = t.slice(0, 120) }
    if (!cur || body.body !== undefined || body.rich !== undefined) {
        const html = body.rich !== undefined ? (body.rich ? storeRich(body.rich, 20000) : '') : ''
        const text = html ? plainText(html).replace(/\n{3,}/g, '\n\n').trim() : String(body.body ?? '').replace(/\r\n/g, '\n').trim()
        const pictures = /<img\b/i.test(html)
        if (!text && !pictures) throw fail('Write the message first')
        if (text.length > 2000) throw fail('The message is too long (2000 characters at most)')
        data.body = text || '🖼 Screenshot'; data.rich = html || null
    }
    if (body.category !== undefined) { if (!CATEGORIES.includes(body.category)) throw fail('Unknown category'); data.category = body.category }
    if (!cur || body.audience !== undefined) { if (!AUDIENCES.includes(body.audience || 'team')) throw fail('Unknown audience'); data.audience = body.audience || 'team' }
    if (body.staffIds !== undefined) data.staffIds = [...new Set((Array.isArray(body.staffIds) ? body.staffIds : []).map(oid).filter(Boolean))]
    if ((data.audience || cur?.audience) === 'selected' && !(data.staffIds ?? cur?.staffIds ?? []).length) throw fail('Choose at least one person')
    if (body.assigneeIds !== undefined) data.assigneeIds = [...new Set((Array.isArray(body.assigneeIds) ? body.assigneeIds : []).map(oid).filter(Boolean))]
    if (body.clientId !== undefined || body.leadId !== undefined) {
        const cid = oid(body.clientId), lid = !cid ? oid(body.leadId) : null
        if (cid) { await requirePermission('customers', 'view'); if (!(await prisma.crmClient.findUnique({ where: { id: cid }, select: { id: true } }))) throw fail('Client not found', 404) }
        if (lid) { await requirePermission('leads', 'view'); if (!(await prisma.crmLead.findUnique({ where: { id: lid }, select: { id: true } }))) throw fail('Lead not found', 404) }
        data.clientId = cid; data.leadId = lid
    }
    if (body.emailClient !== undefined) data.emailClient = !!body.emailClient
    if (body.makeTask !== undefined) { data.makeTask = !!body.makeTask; if (data.makeTask) await requirePermission('tasks', 'create') }
    if ((data.emailClient ?? cur?.emailClient) && !(data.clientId ?? cur?.clientId) && !(data.leadId ?? cur?.leadId)) throw fail('Choose the client or lead to email')
    if (!cur || body.repeat !== undefined) { if (!REPEATS.includes(body.repeat || 'none')) throw fail('Unknown repeat'); data.repeat = body.repeat || 'none' }
    if (body.every !== undefined || body.unit !== undefined) {
        const ev = Math.floor(Number(body.every)), un = body.unit
        if (!(ev >= 1 && ev <= 365)) throw fail('Repeat every 1 to 365')
        if (!UNITS.includes(un)) throw fail('Unknown unit')
        data.every = ev; data.unit = un
    }
    if (body.cycles !== undefined) {
        const cy = body.cycles === '' || body.cycles === null ? 0 : Math.floor(Number(body.cycles))
        if (!(cy >= 0 && cy <= 1000)) throw fail('The number of times is 0 (for ever) to 1000')
        data.cycles = cy; data.runs = 0 // a new count starts when the series is changed
    }
    if (!cur || body.sendAt !== undefined) {
        const at = new Date(body.sendAt)
        if (Number.isNaN(+at)) throw fail('Choose the date and time to send')
        if (at < new Date(Date.now() - 60000)) throw fail('The date and time must be in the future')
        data.nextAt = at; data.active = true
    }
    if (cur && body.active !== undefined) {
        data.active = !!body.active
        if (data.active && !data.nextAt && (!cur.nextAt || cur.nextAt < new Date())) { // switched on again: the next moment after now
            const nx = nextAfter(cur.nextAt || new Date(), data.repeat || cur.repeat, new Date(), { every: data.every ?? cur.every, unit: data.unit ?? cur.unit })
            if (!nx) throw fail('Choose a new date and time first')
            data.nextAt = nx
        }
    }
    const row = cur ? await prisma.crmScheduledMessage.update({ where: { id }, data }) : await prisma.crmScheduledMessage.create({ data: { ...data, createdBy: g.staffId } })
    return { success: true, id: row.id }
}

export async function deleteScheduled(id) {
    await gate('delete')
    const cur = oid(id) && (await prisma.crmScheduledMessage.findUnique({ where: { id } }))
    if (!cur) throw fail('Message not found', 404)
    await prisma.crmScheduledMessage.delete({ where: { id } })
    return { success: true }
}

/** Send it now, once, without touching its schedule. */
export async function sendScheduledNow(id) {
    await gate('edit')
    const cur = oid(id) && (await prisma.crmScheduledMessage.findUnique({ where: { id } }))
    if (!cur) throw fail('Message not found', 404)
    const { n, notes } = await deliverScheduled(cur)
    await prisma.crmScheduledMessage.update({ where: { id }, data: { lastSentAt: new Date(), lastCount: n, sentCount: { increment: 1 } } })
    return { success: true, sent: n, notes }
}

/** The AI writes the message from a few words: what to tell the team, in what tone. Returns { title, html } for the editor. */
export async function writeWithAi(body = {}) {
    const g = await gate('create')
    const idea = String(body.idea || '').replace(/\s+/g, ' ').trim().slice(0, 1200)
    if (idea.length < 8) throw fail('Tell the AI what the message is about (a sentence or two)')
    rateLimit(`sched-ai:${g.staffId}`, 30, 3600000)
    const ai = await resolveAi()
    const tone = { friendly: 'warm, friendly and encouraging', professional: 'clear and professional', short: 'very short and direct (3 or 4 lines)', motivating: 'motivating and positive' }[body.tone] || 'warm, friendly and encouraging'
    const lang = { fr: 'French', es: 'Spanish', ar: 'Arabic', ja: 'Japanese', en: 'English' }[body.lang] || 'English'
    const current = String(body.current || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500)
    const system = 'You write short internal messages that a CRM posts in the team chat. Write in ' + lang + ', ' + tone + '. Plain text only: no markdown symbols, no hashtags. Short paragraphs separated by a blank line; a list may use lines starting with "- ". At most 1500 characters. Reply with JSON only: {"title":"a short title of at most 8 words","message":"the message"}.'
    const user = `What to tell the team: ${idea}${current ? `\n\nThe draft so far (improve it): ${current}` : ''}`
    const out = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: 900, timeoutMs: 60000 })
    return shapeAiMessage(out.text)
}

import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { scope as clientScope } from '@/lib/crm/clientsApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { sendTemplate } from '@/lib/crm/mailer'
import { notifyStaffChannels } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'
import { realPicture } from '@/lib/crm/pictures'
import { emit } from '@/lib/crm/webhooks'
import { CATEGORIES } from '@/lib/crm/clientIdeasPrompt'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** The columns of the board, left to right. A draft is internal; the client sees the others (when the idea is visible). */
export const STATUSES = ['draft', 'proposed', 'interested', 'approved', 'doing', 'done', 'declined']
export { CATEGORIES }
/** What a client may answer, and the column it moves the idea to. */
export const ANSWERS = { interested: 'interested', approved: 'approved', declined: 'declined' }
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

async function gate(cap) {
    const session = await requirePermission('client_ideas', cap)
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), name: session.user.name || session.user.email }
}

/** The client, when this person may see it (view own: only the clients they administer). */
async function clientOf(g, clientId) {
    if (!oid(clientId)) throw fail('Client not found', 404)
    const c = await prisma.crmClient.findFirst({ where: { id: clientId, ...(await clientScope(g.session)) } })
    if (!c) throw fail('Client not found', 404)
    return c
}

const shape = (i, extra = {}) => ({
    id: i.id, clientId: i.clientId, title: i.title, body: i.body || '', category: i.category, status: i.status, visible: !!i.visible, priority: i.priority, impact: i.impact, effort: i.effort,
    gain: i.gain || '', price: i.price ?? null, currencyId: i.currencyId || null, dueDate: i.dueDate, source: i.source, sources: i.sources || [], tags: i.tags || [], assigneeIds: i.assigneeIds || [],
    answer: i.answer || null, answeredAt: i.answeredAt, answeredBy: i.answeredBy || null, position: i.position, taskId: i.taskId || null, proposedAt: i.proposedAt, createdAt: i.createdAt, updatedAt: i.updatedAt, ...extra,
})

const fingerprintOf = (clientId, title) => `${clientId}:${String(title || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim().slice(0, 80)}`

/** The board of one client: its ideas, the team to assign, the currencies and the last AI research. */
export async function listIdeas(clientId) {
    const g = await gate('view')
    const client = await clientOf(g, clientId)
    const [rows, staff, currencies, research] = await Promise.all([
        prisma.crmClientIdea.findMany({ where: { clientId }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 500 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, orderBy: { firstName: 'asc' } }),
        prisma.crmCurrency.findMany({ select: { id: true, name: true, symbol: true } }),
        prisma.crmClientResearch.findFirst({ where: { clientId }, orderBy: { createdAt: 'desc' } }),
    ])
    const counts = await prisma.crmClientIdeaComment.findMany({ where: { ideaId: { in: rows.map((r) => r.id) } }, select: { ideaId: true } })
    const n = {}
    for (const c of counts) n[c.ideaId] = (n[c.ideaId] || 0) + 1
    return {
        client: { id: client.id, company: client.company, website: client.website || '' },
        list: rows.map((r) => shape(r, { comments: n[r.id] || 0 })),
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })),
        currencies,
        research: research ? { id: research.id, summary: research.summary || '', competitors: research.competitors || [], provider: research.provider, model: research.model, webSearch: research.webSearch, createdAt: research.createdAt } : null,
        can: { create: hasCap(g.authority, 'client_ideas', 'create'), edit: hasCap(g.authority, 'client_ideas', 'edit'), delete: hasCap(g.authority, 'client_ideas', 'delete') },
    }
}

const clean = (b, cur = {}) => {
    const out = {}
    if (b.title !== undefined) { const t = String(b.title || '').trim().slice(0, 200); if (!t) throw fail('Give the idea a title'); out.title = t }
    if (b.body !== undefined) out.body = storeRich(String(b.body || ''), 20000) || null
    if (b.category !== undefined) out.category = CATEGORIES.includes(b.category) ? b.category : 'other'
    for (const k of ['priority', 'impact', 'effort']) if (b[k] !== undefined) out[k] = Math.min(3, Math.max(1, parseInt(b[k], 10) || 2))
    if (b.gain !== undefined) out.gain = String(b.gain || '').trim().slice(0, 300) || null
    if (b.price !== undefined) { const p = b.price === '' || b.price === null ? null : Number(b.price); if (p !== null && (!Number.isFinite(p) || p < 0)) throw fail('The price must be a number'); out.price = p }
    if (b.currencyId !== undefined) out.currencyId = oid(b.currencyId)
    if (b.dueDate !== undefined) out.dueDate = b.dueDate ? new Date(b.dueDate) : null
    if (b.tags !== undefined) out.tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map((t) => String(t).trim().replace(/^#/, '').slice(0, 30)).filter(Boolean))].slice(0, 10)
    if (b.assigneeIds !== undefined) out.assigneeIds = [...new Set((Array.isArray(b.assigneeIds) ? b.assigneeIds : []).filter(oid))].slice(0, 20)
    if (b.visible !== undefined) out.visible = !!b.visible
    void cur
    return out
}

/** Tells the client's contacts that an idea is waiting for them. Returns how many emails went out. */
async function tellClient(idea, client) {
    const contacts = await prisma.crmContact.findMany({ where: { clientId: client.id, active: true }, select: { email: true, firstName: true, lastName: true } })
    let sent = 0
    const seen = new Set()
    for (const c of contacts) {
        const to = String(c.email || '').trim().toLowerCase()
        if (!EMAIL.test(to) || seen.has(to)) continue
        seen.add(to)
        const r = await sendTemplate({ slug: 'client-idea-proposed', to, relType: 'client_idea', relId: idea.id, data: { contact_firstname: c.firstName || '', contact_lastname: c.lastName || '', client_company: client.company || '', idea_title: idea.title, idea_gain: idea.gain || plainText(idea.body || '').slice(0, 200), idea_link: `${publicBase()}/portal/ideas/${idea.id}` } })
        if (r.sent) sent++
    }
    return sent
}

/** Create (no id) or change an idea. Moving it to "proposed" shows it to the client and tells them. */
export async function saveIdea(clientId, body = {}, id = null) {
    const g = await gate(id ? 'edit' : 'create')
    const client = await clientOf(g, clientId)
    const cur = id ? await prisma.crmClientIdea.findFirst({ where: { id, clientId } }) : null
    if (id && !cur) throw fail('Idea not found', 404)
    const data = clean(body, cur || {})
    if (!id && !data.title) throw fail('Give the idea a title')
    let status = body.status !== undefined ? body.status : cur?.status
    if (status !== undefined && !STATUSES.includes(status)) throw fail('Unknown status')
    const first = !cur?.proposedAt && status === 'proposed'
    if (status !== undefined) {
        data.status = status
        if (status === 'draft') data.visible = false
        else if (status === 'proposed' && !cur?.proposedAt) { data.visible = true; data.proposedAt = new Date() }
    }
    if (!cur) {
        const last = await prisma.crmClientIdea.findFirst({ where: { clientId, status: data.status || 'draft' }, orderBy: { position: 'desc' }, select: { position: true } })
        const row = await prisma.crmClientIdea.create({ data: { clientId, source: 'manual', addedFrom: g.staffId || undefined, position: (last?.position || 0) + 1, fingerprint: fingerprintOf(clientId, data.title), ...data } })
        const mailed = row.status === 'proposed' ? await tellClient(row, client) : 0
        emit('client_idea.created', { id: row.id, client_id: clientId, title: row.title, status: row.status })
        return { idea: shape(row), mailed }
    }
    if (data.title) data.fingerprint = fingerprintOf(clientId, data.title)
    const row = await prisma.crmClientIdea.update({ where: { id }, data })
    const mailed = first ? await tellClient(row, client) : 0
    if (data.status && data.status !== cur.status) emit('client_idea.moved', { id, client_id: clientId, from: cur.status, to: data.status })
    return { idea: shape(row), mailed }
}

/** Drag and drop: the column and the place in it. */
export async function moveIdea(clientId, id, { status, index } = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const cur = await prisma.crmClientIdea.findFirst({ where: { id, clientId } })
    if (!cur) throw fail('Idea not found', 404)
    if (!STATUSES.includes(status)) throw fail('Unknown status')
    const data = { status }
    if (status === 'draft') data.visible = false
    if (status === 'proposed' && !cur.proposedAt) { data.visible = true; data.proposedAt = new Date() }
    await prisma.crmClientIdea.update({ where: { id }, data })
    // renumber the target column with the card at its new place
    const col = (await prisma.crmClientIdea.findMany({ where: { clientId, status, id: { not: id } }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], select: { id: true } })).map((x) => x.id)
    col.splice(Math.min(Math.max(parseInt(index, 10) || 0, 0), col.length), 0, id)
    await Promise.all(col.map((x, p) => prisma.crmClientIdea.update({ where: { id: x }, data: { position: p + 1 } })))
    const row = await prisma.crmClientIdea.findUnique({ where: { id } })
    const mailed = status === 'proposed' && !cur.proposedAt ? await tellClient(row, client) : 0
    if (status !== cur.status) emit('client_idea.moved', { id, client_id: clientId, from: cur.status, to: status })
    return { idea: shape(row), mailed }
}

export async function deleteIdea(clientId, id) {
    const g = await gate('delete')
    await clientOf(g, clientId)
    const cur = await prisma.crmClientIdea.findFirst({ where: { id, clientId }, select: { id: true } })
    if (!cur) throw fail('Idea not found', 404)
    await prisma.crmClientIdeaComment.deleteMany({ where: { ideaId: id } })
    await prisma.crmClientIdea.delete({ where: { id } })
    return { success: true }
}

/** The conversation of an idea (internal notes included, for the team). */
export async function listComments(clientId, id) {
    const g = await gate('view')
    await clientOf(g, clientId)
    const rows = await prisma.crmClientIdeaComment.findMany({ where: { ideaId: id }, orderBy: { createdAt: 'asc' }, take: 300 })
    return { list: rows.map((c) => ({ id: c.id, authorKind: c.authorKind, authorName: c.authorName || '', body: c.body, internal: !!c.internal, createdAt: c.createdAt })) }
}

export async function addComment(clientId, id, body = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const idea = await prisma.crmClientIdea.findFirst({ where: { id, clientId } })
    if (!idea) throw fail('Idea not found', 404)
    const text = String(body.body || '').trim().slice(0, 4000)
    if (!text) throw fail('Write a message first')
    const internal = !!body.internal || !idea.visible
    const row = await prisma.crmClientIdeaComment.create({ data: { ideaId: id, authorKind: 'staff', authorId: g.staffId || undefined, authorName: g.name, body: text, internal } })
    if (!internal) await tellClientOfComment(idea, client, g.name, text)
    return { comment: { id: row.id, authorKind: 'staff', authorName: row.authorName, body: row.body, internal: row.internal, createdAt: row.createdAt } }
}

/** A reply from the team shows in the client area; the contacts get a short email too. */
async function tellClientOfComment(idea, client, who, text) {
    const contacts = await prisma.crmContact.findMany({ where: { clientId: client.id, active: true }, select: { email: true, firstName: true, lastName: true } })
    const seen = new Set()
    for (const c of contacts) {
        const to = String(c.email || '').trim().toLowerCase()
        if (!EMAIL.test(to) || seen.has(to)) continue
        seen.add(to)
        await sendTemplate({ slug: 'client-idea-message', to, relType: 'client_idea', relId: idea.id, data: { contact_firstname: c.firstName || '', contact_lastname: c.lastName || '', client_company: client.company || '', idea_title: idea.title, idea_message: text.slice(0, 600), staff_name: who || '', idea_link: `${publicBase()}/portal/ideas/${idea.id}` } }).catch(() => {})
    }
}

/** One task for the team from an idea ("do it"): linked to the client, assigned to the people of the idea. */
export async function makeTask(clientId, id) {
    const g = await gate('edit')
    if (!hasCap(g.authority, 'tasks', 'create')) throw fail('You are not allowed to create tasks', 403)
    const client = await clientOf(g, clientId)
    const idea = await prisma.crmClientIdea.findFirst({ where: { id, clientId } })
    if (!idea) throw fail('Idea not found', 404)
    if (idea.taskId && (await prisma.crmTask.findUnique({ where: { id: idea.taskId }, select: { id: true } }))) return { success: true, taskId: idea.taskId, existing: true }
    const task = await prisma.crmTask.create({ data: { name: `${idea.title}`.slice(0, 200), description: storeRich(`<p>${plainText(idea.gain || '')}</p>${idea.body || ''}`, 20000) || null, relType: 'customer', relId: client.id, priority: idea.priority || 2, dueDate: idea.dueDate || undefined, addedFrom: g.staffId || undefined, status: 1 } })
    const people = [...new Set([...(idea.assigneeIds || []), ...(g.staffId ? [g.staffId] : [])])]
    if (people.length) await prisma.crmTaskAssigned.createMany({ data: people.map((staffId) => ({ taskId: task.id, staffId, assignedFrom: g.staffId || undefined })) }).catch(() => {})
    await prisma.crmClientIdea.update({ where: { id }, data: { taskId: task.id } })
    return { success: true, taskId: task.id, existing: false }
}

/** Who in the team hears about the client's answer: the client's admins, the people of the idea, and who wrote it. */
export async function teamOf(idea, clientId) {
    const admins = await prisma.crmCustomerAdmin.findMany({ where: { clientId }, select: { staffId: true } })
    return [...new Set([...(idea.assigneeIds || []), ...(idea.addedFrom ? [idea.addedFrom] : []), ...admins.map((a) => a.staffId)].filter(Boolean))]
}

/** The bell and Telegram / WhatsApp for the team. */
export async function tellTeam(idea, clientId, text, byName) {
    const ids = await teamOf(idea, clientId)
    for (const staffId of ids) {
        const st = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { active: true } })
        if (!st?.active) continue
        await prisma.crmNotification.create({ data: { toUserId: staffId, fromFullName: byName || 'Client', description: text.slice(0, 200), link: `/crm/clients/${clientId}?tab=ideas&idea=${idea.id}`, additionalData: 'client-idea', isRead: false } }).catch(() => {})
        await notifyStaffChannels(staffId, `${text}\n${publicBase()}/crm/clients/${clientId}?tab=ideas&idea=${idea.id}`).catch(() => {})
    }
}

/* ---------------------------------------------------------------- the client area (portal) */
export const ideaForClient = (i, currency) => ({ id: i.id, title: i.title, body: i.body || '', category: i.category, status: i.status, gain: i.gain || '', price: i.price ?? null, currency: currency || null, impact: i.impact, effort: i.effort, dueDate: i.dueDate, answer: i.answer || null, answeredAt: i.answeredAt, proposedAt: i.proposedAt, sources: i.sources || [] })

import prisma from '@/lib/prisma'
import { teamIps } from '@/lib/crm/viewTracking'
import { requirePermission, getStaffId, viewScope, hasCap } from '@/lib/crm/permissions'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { workDayStart } from '@/lib/crm/notifyHoursApi'

const DAY = 86400000
/** Where a reminder takes you: the record it is about. */
export const reminderLink = (r) => { const l = reminderBase(r); return l && r.tab ? `${l}?tab=${r.tab}` : l }
const reminderBase = (r) => ({ my_space: `/crm/chat?tab=myspace&space=${r.relId}`, customer: `/crm/clients/${r.relId}`, lead: `/crm/leads/${r.relId}`, task: `/crm/tasks/${r.relId}`, ticket: `/crm/tickets/${r.relId}`, project: `/crm/projects/${r.relId}`, invoice: `/crm/invoices/${r.relId}`, estimate: `/crm/estimates/${r.relId}`, proposal: `/crm/proposals/${r.relId}`, contract: `/crm/contracts/${r.relId}`, expense: `/crm/expenses/${r.relId}`, kb_article: `/crm/knowledge-base/article/${r.relId}` }[r.relType] || null)
/** The kind of a stored notification, from what the code that wrote it stamped on it. */
const STORED_KIND = { leave: 'team', mention: 'mention', 'note-reminder': 'reminder', 'proposal-expired': 'reminder', 'ticket-reminder': 'reminder', 'event-reminder': 'reminder', appointment: 'calendar', 'recap-task': 'task', 'note-shared': 'note', 'client-request': 'request', 'client-idea': 'idea', 'record-reminder': 'reminder', 'signup-request': 'team', growth: 'grow', 'grow-task': 'grow', 'grow-ideas': 'grow', 'grow-assigned': 'grow' }
const kindOfStored = (d) => (String(d || '').startsWith('comment|') ? 'comment' : String(d || '').startsWith('assign|') ? 'task' : STORED_KIND[d] || 'other')
const TONE_OF = { reminder: 'amber', mention: 'amber', request: 'purple', idea: 'blue', note: 'blue', team: 'amber', grow: 'green', calendar: 'blue' }
/** The words of a stored notification: who did what. */
function storedWords(m, kind) {
    const from = m.fromFullName || ''
    const d = String(m.additionalData || '')
    if (d === 'mention') return [`${from || 'A colleague'} mentioned you`, m.description]
    if (kind === 'comment') return [`${from || 'A colleague'} commented on “${d.slice(8)}”`, m.description]
    if (d.startsWith('assign|')) return [`${from || 'A colleague'} gave you a checklist step on “${d.slice(7)}”`, m.description]
    if (d === 'note-shared') return [`${from || 'A colleague'} ${m.description || 'shared a note with you'}`, '']
    return [m.description || 'Notification', from && !/^(Grow|Appointments|⏰ Reminder)$/.test(from) ? from : '']
}
const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * What the signed-in staff member should know about, newest first. Nothing is stored: the feed is built from the
 * records themselves (client replies, assignments, due dates, payments, answers, new leads, documents opened),
 * limited to what the person may see. "Read" is tracked in the browser by the time the bell was last opened.
 */
export async function notificationFeed({ days } = {}) {
    const back = Math.min(180, Math.max(14, Number(days) || 14)) // how far back the stored notifications go (the page's date filter asks for more)
    const session = await requirePermission(null)
    const authority = session.user.authority || []
    const can = (f) => viewScope(authority, f) !== null
    const staffId = await getStaffId(session)
    const now = new Date(), today = new Date(now.toDateString())
    // "due today" and "overdue" belong to the working day: they carry its first hour (not midnight) and show once the day has started
    const dayStart = new Date(await workDayStart(+now)), started = +now >= +dayStart
    const since = (days) => new Date(Date.now() - days * DAY)
    const NONE = { id: '000000000000000000000000' } // matches nothing
    const items = [], stored = []
    // every item has a stable key (what it is about and when), so "read" survives the next refresh
    const add = (kind, title, detail, date, link, tone = 'blue') => date && items.push({ id: `d:${kind}|${link || title}|${title}|${+new Date(date)}`.slice(0, 280), kind, tone, title, detail: detail || '', date, link })

    if (can('tickets')) {
        const scope = staffId ? { OR: [{ assignedId: staffId }, { adminId: staffId }] } : NONE // only the tickets given to me (or opened by me), whatever the view scope
        const rows = await prisma.crmTicket.findMany({ where: { AND: [scope, { adminRead: 0 }] }, orderBy: { createdAt: 'desc' }, take: 8 })
        for (const t of rows) add('ticket', t.lastReply ? `Client replied on ticket #${t.legacyId ?? String(t.id).slice(-5).toUpperCase()}` : `New ticket #${t.legacyId ?? String(t.id).slice(-5).toUpperCase()}`, t.subject, t.lastReply || t.createdAt, `/crm/tickets/${t.id}`, 'purple')
    }
    if (staffId) { // everything written for me: mentions, comments, assignments, shared notes, client requests and ideas, reminders, appointments, growth, account requests
        const ms = await prisma.crmNotification.findMany({ where: { toUserId: staffId, OR: [{ isRead: false }, { createdAt: { gte: since(back) } }] }, orderBy: { createdAt: 'desc' }, take: back > 14 ? 600 : 120 })
        for (const m of ms) {
            const kind = kindOfStored(m.additionalData)
            const [title, detail] = storedWords(m, kind)
            stored.push({ id: `n:${m.id}`, kind, tone: TONE_OF[kind] || 'blue', title, detail: detail || '', date: m.createdAt, link: m.link || null, read: !!m.isRead, from: m.fromFullName || '' })
        }
    }
    if (staffId) { // my checklist steps: overdue, due today, or a reminder that has come
        const steps = await prisma.crmTaskChecklistItem.findMany({ where: { AND: [{ OR: [{ assigned: staffId }, { assignedIds: { has: staffId } }] }, { OR: [{ dueDate: { not: null } }, { remindAt: { not: null } }] }], finished: false }, orderBy: { dueDate: 'asc' }, take: 20 })
        const taskNames = Object.fromEntries((await prisma.crmTask.findMany({ where: { id: { in: [...new Set(steps.map((s) => s.taskId))] } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]))
        for (const st of steps) {
            const due = st.dueDate ? new Date(st.dueDate) : null, dueEnd = due ? +new Date(due.toDateString()) + DAY : 0
            const remindAt = st.remindAt ? +new Date(st.remindAt) : st.reminder == null || !due ? null : +due - st.reminder * 60000
            const late = !!due && +now >= dueEnd, soon = !!due && +now >= +today && +now < dueEnd
            if (late && started) add('task', 'Checklist step overdue', `${st.description} · ${taskNames[st.taskId] || ''}`, dayStart, `/crm/tasks/${st.taskId}`, 'red')
            else if (soon && started) add('task', 'Checklist step due today', `${st.description} · ${taskNames[st.taskId] || ''}`, dayStart, `/crm/tasks/${st.taskId}`, 'amber')
            else if (remindAt !== null && +now >= remindAt) add('reminder', 'Reminder: checklist step', `${st.description} · ${taskNames[st.taskId] || ''}`, new Date(remindAt), `/crm/tasks/${st.taskId}`, 'amber')
        }
    }
    if (can('tasks') && staffId) {
        const mine = await prisma.crmTaskAssigned.findMany({ where: { staffId }, select: { taskId: true, createdAt: true } })
        const ids = mine.map((m) => m.taskId)
        if (ids.length) {
            const tasks = await prisma.crmTask.findMany({ where: { id: { in: ids }, status: { not: 5 } }, select: { id: true, name: true, dueDate: true } })
            const when = Object.fromEntries(mine.map((m) => [m.taskId, m.createdAt]))
            for (const t of tasks) {
                if (when[t.id] >= since(7)) add('task', 'A task was assigned to you', t.name, when[t.id], `/crm/tasks-board?task=${t.id}`, 'blue')
                if (started && t.dueDate && new Date(t.dueDate) <= new Date(+today + DAY)) add('task', new Date(t.dueDate) < today ? 'Task overdue' : 'Task due today', t.name, dayStart, `/crm/tasks-board?task=${t.id}`, 'red')
            }
        }
    }
    if (staffId) {
        const rem = await prisma.crmReminder.findMany({ where: { staffId, date: { gte: since(7), lte: new Date(Date.now() + DAY) } }, orderBy: { date: 'desc' }, take: 6 })
        for (const r of rem) add('reminder', 'Reminder', r.description, r.date, reminderLink(r), 'amber')
    }
    const padding = await numberPadding()
    // money, estimates, proposals and views: only on the documents I am the sales agent of, or that I created / was given
    const mineDoc = staffId ? { OR: [{ saleAgentId: staffId }, { addedFrom: staffId }] } : NONE
    if (can('payments') || can('invoices')) {
        const inv = await prisma.crmInvoice.findMany({ where: { AND: [{ status: 4 }, mineDoc] }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true } })
        if (inv.length && started) add('invoice', `${inv.length} invoice${inv.length === 1 ? ' is' : 's are'} overdue`, inv.slice(0, 3).map((i) => docNumberOf(i, padding)).join(', ') + (inv.length > 3 ? '…' : ''), dayStart, '/crm/invoices', 'red')
        const myInv = (await prisma.crmInvoice.findMany({ where: mineDoc, select: { id: true } })).map((i) => i.id)
        const pays = myInv.length ? await prisma.crmPayment.findMany({ where: { AND: [{ invoiceId: { in: myInv } }, { OR: [{ paymentDate: { gte: since(7) } }, { createdAt: { gte: since(7) } }] }] }, orderBy: { createdAt: 'desc' }, take: 6 }) : []
        if (pays.length) {
            const invs = await prisma.crmInvoice.findMany({ where: { id: { in: pays.map((p) => p.invoiceId) } }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, clientId: true } })
            const cl = await prisma.crmClient.findMany({ where: { id: { in: invs.map((i) => i.clientId).filter(Boolean) } }, select: { id: true, company: true } })
            const iMap = Object.fromEntries(invs.map((i) => [i.id, i])), cMap = Object.fromEntries(cl.map((c) => [c.id, c.company]))
            for (const p of pays) { const i = iMap[p.invoiceId]; if (i) add('payment', `Payment received · ${(p.amount || 0).toFixed(2)}`, `${docNumberOf(i, padding)} · ${cMap[i.clientId] || ''}`, p.paymentDate || p.createdAt, `/crm/invoices/${i.id}`, 'green') }
        }
    }
    if (can('estimates')) {
        const es = await prisma.crmEstimate.findMany({ where: { AND: [{ acceptanceDate: { gte: since(14) }, status: { in: [3, 4] } }, mineDoc] }, take: 6 })
        for (const e of es) add('estimate', `Estimate ${docNumberOf(e, padding, 1)} was ${e.status === 4 ? 'accepted' : 'declined'}`, '', e.acceptanceDate, `/crm/estimates/${e.id}`, e.status === 4 ? 'green' : 'red')
    }
    if (can('proposals')) {
        const ps = await prisma.crmProposal.findMany({ where: { AND: [{ acceptanceDate: { gte: since(14) }, status: { in: [2, 3] } }, staffId ? { OR: [{ assignedId: staffId }, { addedFrom: staffId }] } : NONE] }, take: 6 })
        for (const p of ps) add('proposal', `Proposal “${p.subject || ''}” was ${p.status === 3 ? 'accepted' : 'declined'}`, '', p.acceptanceDate, `/crm/proposals/${p.id}`, p.status === 3 ? 'green' : 'red')
    }
    if (can('leads')) {
        const scope = staffId ? { OR: [{ assigned: staffId }, { assignedIds: { has: staffId } }, { followerIds: { has: staffId } }] } : NONE // only the leads given to me or that I follow
        const ls = await prisma.crmLead.findMany({ where: { AND: [scope, { createdAt: { gte: since(3) }, lost: false, junk: false }] }, orderBy: { createdAt: 'desc' }, take: 6 })
        for (const l of ls) add('lead', 'New lead', [l.name, l.company].filter(Boolean).join(' · '), l.createdAt, `/crm/leads/${l.id}`, 'blue')
    }
    if (can('invoices') || can('estimates') || can('proposals')) {
        const vsAll = await prisma.crmViewTracking.findMany({ where: { relType: { in: ['invoice', 'estimate', 'proposal'] }, createdAt: { gte: since(3) } }, orderBy: { createdAt: 'desc' }, take: 60 })
        // only the documents that are mine
        const ownedIds = async (type, model, where) => (staffId && vsAll.some((v) => v.relType === type) ? new Set((await prisma[model].findMany({ where: { AND: [{ id: { in: vsAll.filter((v) => v.relType === type).map((v) => v.relId).filter(Boolean) } }, where] }, select: { id: true } })).map((r) => r.id)) : new Set())
        const own = { invoice: await ownedIds('invoice', 'crmInvoice', mineDoc), estimate: await ownedIds('estimate', 'crmEstimate', mineDoc), proposal: await ownedIds('proposal', 'crmProposal', { OR: [{ assignedId: staffId }, { addedFrom: staffId }] }) }
        const vs = vsAll.filter((v) => own[v.relType]?.has(v.relId)).slice(0, 6)
        const mine = await teamIps()
        for (const v of vs.filter((x) => !mine.has(x.viewIp))) add('view', `Client opened ${v.relType === 'invoice' ? 'an invoice' : v.relType === 'estimate' ? 'an estimate' : 'a proposal'}`, v.viewIp ? `from ${v.viewIp}` : '', v.createdAt, `/crm/${v.relType === 'invoice' ? 'invoices' : v.relType === 'estimate' ? 'estimates' : 'proposals'}/${v.relId}`, 'gray')
    }
    void hasCap; void strip
    const seenRow = staffId ? await prisma.crmOption.findUnique({ where: { name: `notif_seen_${staffId}` } }) : null
    const seen = seenRow?.value ? +new Date(seenRow.value) || 0 : 0
    const states = staffId && items.length ? await prisma.crmNotifState.findMany({ where: { staffId, key: { in: items.map((x) => x.id) } } }) : []
    const state = Object.fromEntries(states.map((x) => [x.key, x.read]))
    const feed = [...items.map((x) => ({ ...x, read: x.id in state ? state[x.id] : +new Date(x.date) <= seen })), ...stored]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, back > 14 ? 700 : 150)
    const unread = feed.filter((x) => !x.read)
    const byKind = {}
    for (const x of unread) byKind[x.kind] = (byKind[x.kind] || 0) + 1
    return { items: feed, serverTime: now.toISOString(), seen, counts: { unread: unread.length, total: feed.length, byKind } }
}

/**
 * Read / unread. No body or { action: 'all' }: everything is read (remembered for the person, not the browser).
 * { action: 'read' | 'unread', ids: [...] }: those items only (an id starting with "n:" is a stored notification, "d:" one worked out from the records).
 */
export async function markNotificationsSeen(body = {}) {
    const session = await requirePermission(null)
    const staffId = await getStaffId(session)
    if (!staffId) return { seen: Date.now() }
    const action = ['read', 'unread'].includes(body.action) ? body.action : 'all'
    if (action === 'all') {
        const value = new Date().toISOString()
        const name = `notif_seen_${staffId}`
        await prisma.crmOption.upsert({ where: { name }, update: { value }, create: { name, value, autoload: false } })
        await prisma.crmNotification.updateMany({ where: { toUserId: staffId, isRead: false }, data: { isRead: true } })
        await prisma.crmNotifState.deleteMany({ where: { staffId } })
        return { seen: +new Date(value) }
    }
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 300)
    const read = action === 'read'
    const stored = ids.filter((x) => x.startsWith('n:') && /^[a-f0-9]{24}$/i.test(x.slice(2))).map((x) => x.slice(2))
    if (stored.length) await prisma.crmNotification.updateMany({ where: { id: { in: stored }, toUserId: staffId }, data: { isRead: read } })
    for (const key of ids.filter((x) => x.startsWith('d:')).slice(0, 200)) await prisma.crmNotifState.upsert({ where: { staffId_key: { staffId, key } }, update: { read, at: new Date() }, create: { staffId, key, read } })
    // old states are forgotten after two months
    await prisma.crmNotifState.deleteMany({ where: { staffId, at: { lt: new Date(Date.now() - 60 * DAY) } } }).catch(() => {})
    return { success: true, count: ids.length }
}

import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin } from '@/lib/crm/permissions'
import { realPicture } from '@/lib/crm/pictures'
import { clientProfile } from '@/lib/crm/clientProfileApi'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const strip = (h) => String(h || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const nice = (t) => {
    const v = strip(t)
    // imported rows keep Perfex language keys ("invoice_activity_created")
    return /^[a-z0-9_]+$/.test(v) ? v.replace(/^(not_)?(lead|invoice|estimate|proposal|contract|project|credit_note)_activity_/, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : v
}
const name = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const REL = { invoice: ['invoice', '/crm/invoices/'], estimate: ['estimate', '/crm/estimates/'], proposal: ['proposal', '/crm/proposals/'], contract: ['contract', '/crm/contracts/'], credit_note: ['invoice', '/crm/credit-notes/'], project: ['project', '/crm/projects/'], purchase_order: ['invoice', '/crm/purchase-orders/'] }
const PAGE = 30
const LIMIT = 400

async function staffEvents(id) {
    const staff = await prisma.crmStaff.findUnique({ where: { id } })
    if (!staff) throw fail('Member not found', 404)
    const by = { where: { staffId: id }, orderBy: { createdAt: 'desc' }, take: LIMIT }
    const [log, sales, leads, projects, comments, timers, notes, vault, mails, invoices, estimates, expenses, tasks, projectsAdded, leadsAdded] = await Promise.all([
        prisma.crmActivityLog.findMany(by),
        prisma.crmSalesActivity.findMany(by),
        prisma.crmLeadActivityLog.findMany(by),
        prisma.crmProjectActivity.findMany(by),
        prisma.crmTaskComment.findMany(by),
        prisma.crmTaskTimer.findMany(by),
        prisma.crmNote.findMany({ where: { addedFrom: id }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
        prisma.crmPasswordLog.findMany(by),
        prisma.crmMailLog.findMany(by),
        prisma.crmInvoice.findMany({ where: { addedFrom: id }, select: { id: true, number: true, prefix: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
        prisma.crmEstimate.findMany({ where: { addedFrom: id }, select: { id: true, number: true, prefix: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
        prisma.crmExpense.findMany({ where: { addedFrom: id }, select: { id: true, expenseName: true, date: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
        prisma.crmTask.findMany({ where: { addedFrom: id }, select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
        prisma.crmProject.findMany({ where: { addedFrom: id }, select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
        prisma.crmLead.findMany({ where: { addedFrom: id }, select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: LIMIT }),
    ])
    const ev = []
    const add = (type, key, title, detail, date, link) => date && title && ev.push({ id: `${type}:${key}`, type, title, detail: detail || '', date, link: link || null })
    if (staff.lastLogin) add('login', 'last', 'Signed in', staff.lastIp ? `from ${staff.lastIp}` : '', staff.lastLogin)
    for (const l of log) add('system', l.id, nice(l.description), '', l.createdAt)
    for (const a of sales) { const [type, base] = REL[a.relType] || ['system', null]; add(type, a.id, nice(a.description), '', a.date || a.createdAt, base && a.relId ? base + a.relId : null) }
    for (const a of leads) add('lead', a.id, nice(a.description), nice(a.additionalData || ''), a.createdAt, `/crm/leads/${a.leadId}`)
    for (const a of projects) add('project', a.id, nice(a.descriptionKey), nice(a.additionalData || ''), a.createdAt, `/crm/projects/${a.projectId}`)
    for (const c of comments) add('task', c.id, 'Commented on a task', strip(c.content).slice(0, 140), c.createdAt, `/crm/tasks-board?task=${c.taskId}`)
    for (const t of timers) add('task', t.id, 'Worked on a task', t.endTime && t.startTime ? `${Math.max(1, Math.round((+new Date(t.endTime) - +new Date(t.startTime)) / 60000))} min${t.note ? ` · ${strip(t.note).slice(0, 80)}` : ''}` : 'timer running', t.startTime || t.createdAt, `/crm/tasks-board?task=${t.taskId}`)
    for (const n of notes) add('note', n.id, 'Added a note', strip(n.description).slice(0, 140), n.createdAt)
    for (const v of vault) add('vault', v.id, `Password vault: ${String(v.action || '').replace(/_/g, ' ')}`, v.detail || '', v.createdAt, '/crm/passwords')
    for (const m of mails) add('mail', m.id, `Sent an email${m.status === 'failed' ? ' (failed)' : ''}`, [m.subject, m.to].filter(Boolean).join(' · ').slice(0, 140), m.createdAt)
    for (const i of invoices) add('invoice', i.id, 'Created an invoice', `${i.prefix || ''}${i.number}`, i.createdAt, `/crm/invoices/${i.id}`)
    for (const e of estimates) add('estimate', e.id, 'Created an estimate', `${e.prefix || ''}${e.number}`, e.createdAt, `/crm/estimates/${e.id}`)
    for (const x of expenses) add('expense', x.id, 'Added an expense', x.expenseName || '', x.date || x.createdAt)
    for (const t of tasks) add('task', `n${t.id}`, 'Created a task', t.name || '', t.createdAt, `/crm/tasks-board?task=${t.id}`)
    for (const p of projectsAdded) add('project', `n${p.id}`, 'Created a project', p.name || '', p.createdAt, `/crm/projects/${p.id}`)
    for (const l of leadsAdded) add('lead', `n${l.id}`, 'Created a lead', l.name || '', l.createdAt, `/crm/leads/${l.id}`)
    return { subject: { kind: 'staff', id, name: name(staff), image: realPicture(staff.profileImage), email: staff.email, active: staff.active, lastLogin: staff.lastLogin }, events: ev }
}

async function clientEvents(id) {
    const c = await prisma.crmClient.findUnique({ where: { id }, select: { id: true, company: true, active: true } })
    const profile = await clientProfile(id, { full: true }) // also checks the permission and the client scope
    return { subject: { kind: 'client', id, name: c?.company || '', image: null, email: null, active: c?.active }, events: profile.timeline.map((e) => ({ id: e.id, type: e.type, title: e.title, detail: e.detail, date: e.date, link: e.link })) }
}

/** One page of the activity of a team member or a client: { subject, events, more, counts }. */
export async function activityFeed({ kind, id, types, before, limit }) {
    if (!oid(id)) throw fail('Not found', 404)
    let data
    await requirePermission('activity_log', 'view') // administrators, or roles that were given this permission
    if (kind === 'staff') { await requirePermission('staff', 'view'); data = await staffEvents(id) }
    else if (kind === 'client') { await requirePermission('customers', 'view'); data = await clientEvents(id) }
    else throw fail('Unknown activity', 404)
    const all = data.events.sort((a, b) => +new Date(b.date) - +new Date(a.date))
    const counts = all.reduce((o, e) => { o[e.type] = (o[e.type] || 0) + 1; return o }, {})
    const want = String(types || '').split(',').filter(Boolean)
    const cut = before && !Number.isNaN(+new Date(before)) ? +new Date(before) : Infinity
    const rows = all.filter((e) => (!want.length || want.includes(e.type)) && +new Date(e.date) < cut)
    const size = Math.min(Math.max(Number(limit) || PAGE, 5), 100)
    return { subject: data.subject, events: rows.slice(0, size), more: rows.length > size, counts, total: all.length }
}

const DAY = 86400000
const CLIENT_OF = { invoice: 'crmInvoice', estimate: 'crmEstimate', contract: 'crmContract', project: 'crmProject' }

/** Everything that happened in the CRM between two days, for all members (administrators only). */
export async function allActivity({ from, to, staffId, clientId, types }) {
    const session = await requirePermission(null)
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Forbidden', 403)
    const end = to && !Number.isNaN(+new Date(to)) ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date()
    let start = from && !Number.isNaN(+new Date(from)) ? new Date(new Date(from).setHours(0, 0, 0, 0)) : new Date(+end - 6 * DAY)
    if (+end - +start > 62 * DAY) start = new Date(+end - 62 * DAY)
    const sid = oid(staffId)
    const cid = oid(clientId)
    const range = (f) => ({ [f]: { gte: start, lte: end } })
    const q = (extra, f = 'createdAt', staffField = 'staffId') => ({ where: { ...range(f), ...(sid ? { [staffField]: sid } : {}), ...extra }, orderBy: { [f]: 'desc' }, take: LIMIT })
    const [staffRows, log, sales, leads, projects, comments, timers, notes, vault, mails, invoices, estimates, expenses, tasks, projectsAdded, leadsAdded] = await Promise.all([
        prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true, email: true, profileImage: true, active: true, lastLogin: true } }),
        prisma.crmActivityLog.findMany(q()),
        prisma.crmSalesActivity.findMany(q({}, 'createdAt')),
        prisma.crmLeadActivityLog.findMany(q()),
        prisma.crmProjectActivity.findMany(q()),
        prisma.crmTaskComment.findMany(q()),
        prisma.crmTaskTimer.findMany(q({}, 'startTime')),
        prisma.crmNote.findMany(q({}, 'createdAt', 'addedFrom')),
        prisma.crmPasswordLog.findMany(q()),
        prisma.crmMailLog.findMany(q()),
        prisma.crmInvoice.findMany({ ...q({}, 'createdAt', 'addedFrom'), select: { id: true, number: true, prefix: true, createdAt: true, addedFrom: true, clientId: true } }),
        prisma.crmEstimate.findMany({ ...q({}, 'createdAt', 'addedFrom'), select: { id: true, number: true, prefix: true, createdAt: true, addedFrom: true, clientId: true } }),
        prisma.crmExpense.findMany({ ...q({}, 'createdAt', 'addedFrom'), select: { id: true, expenseName: true, createdAt: true, addedFrom: true, clientId: true } }),
        prisma.crmTask.findMany({ ...q({}, 'createdAt', 'addedFrom'), select: { id: true, name: true, createdAt: true, addedFrom: true } }),
        prisma.crmProject.findMany({ ...q({}, 'createdAt', 'addedFrom'), select: { id: true, name: true, createdAt: true, addedFrom: true, clientId: true } }),
        prisma.crmLead.findMany({ ...q({}, 'createdAt', 'addedFrom'), select: { id: true, name: true, createdAt: true, addedFrom: true } }),
    ])
    const people = new Map(staffRows.map((m) => [m.id, { id: m.id, name: name(m), image: realPicture(m.profileImage), active: m.active }]))

    // which client a sales / project entry belongs to
    const rels = {}
    for (const a of sales) if (CLIENT_OF[a.relType] && a.relId) (rels[a.relType] ||= new Set()).add(a.relId)
    for (const a of projects) (rels.project ||= new Set()).add(a.projectId)
    const clientOf = {}
    await Promise.all(Object.entries(rels).map(async ([t, ids]) => {
        const rows = await prisma[CLIENT_OF[t]].findMany({ where: { id: { in: [...ids] } }, select: { id: true, clientId: true } })
        for (const r of rows) clientOf[`${t}:${r.id}`] = r.clientId
    }))

    const ev = []
    const add = (type, key, who, title, detail, date, link, client) => date && title && ev.push({ id: `${type}:${key}`, type, who, client: client || null, title, detail: detail || '', date, link: link || null })
    const sysName = (r) => r.fullName || r.staffName || ''
    for (const m of staffRows) if (m.lastLogin && m.lastLogin >= start && m.lastLogin <= end && (!sid || sid === m.id)) add('login', `l${m.id}`, m.id, 'Signed in', '', m.lastLogin)
    for (const l of log) add('system', l.id, l.staffId, nice(l.description), '', l.createdAt, null, null)
    for (const a of sales) {
        const [type, base] = REL[a.relType] || ['system', null]
        add(type, a.id, a.staffId, nice(a.description), '', a.date || a.createdAt, base && a.relId ? base + a.relId : null, clientOf[`${a.relType}:${a.relId}`])
    }
    for (const a of leads) add('lead', a.id, a.staffId, nice(a.description), nice(a.additionalData || ''), a.createdAt, `/crm/leads/${a.leadId}`)
    for (const a of projects) add('project', a.id, a.staffId, nice(a.descriptionKey), nice(a.additionalData || ''), a.createdAt, `/crm/projects/${a.projectId}`, clientOf[`project:${a.projectId}`])
    for (const c of comments) add('task', c.id, c.staffId, 'Commented on a task', strip(c.content).slice(0, 140), c.createdAt, `/crm/tasks-board?task=${c.taskId}`)
    for (const t of timers) add('task', t.id, t.staffId, 'Worked on a task', t.endTime && t.startTime ? `${Math.max(1, Math.round((+new Date(t.endTime) - +new Date(t.startTime)) / 60000))} min${t.note ? ` · ${strip(t.note).slice(0, 80)}` : ''}` : 'timer running', t.startTime || t.createdAt, `/crm/tasks-board?task=${t.taskId}`)
    for (const n of notes) add('note', n.id, n.addedFrom, 'Added a note', strip(n.description).slice(0, 140), n.createdAt)
    for (const v of vault) add('vault', v.id, v.staffId, `Password vault: ${String(v.action || '').replace(/_/g, ' ')}`, v.detail || '', v.createdAt, '/crm/passwords')
    for (const m of mails) add('mail', m.id, m.staffId, `Sent an email${m.status === 'failed' ? ' (failed)' : ''}`, [m.subject, m.to].filter(Boolean).join(' · ').slice(0, 140), m.createdAt)
    for (const i of invoices) add('invoice', i.id, i.addedFrom, 'Created an invoice', `${i.prefix || ''}${i.number}`, i.createdAt, `/crm/invoices/${i.id}`, i.clientId)
    for (const e of estimates) add('estimate', e.id, e.addedFrom, 'Created an estimate', `${e.prefix || ''}${e.number}`, e.createdAt, `/crm/estimates/${e.id}`, e.clientId)
    for (const x of expenses) add('expense', x.id, x.addedFrom, 'Added an expense', x.expenseName || '', x.createdAt, null, x.clientId)
    for (const t of tasks) add('task', `n${t.id}`, t.addedFrom, 'Created a task', t.name || '', t.createdAt, `/crm/tasks-board?task=${t.id}`)
    for (const p of projectsAdded) add('project', `n${p.id}`, p.addedFrom, 'Created a project', p.name || '', p.createdAt, `/crm/projects/${p.id}`, p.clientId)
    for (const l of leadsAdded) add('lead', `n${l.id}`, l.addedFrom, 'Created a lead', l.name || '', l.createdAt, `/crm/leads/${l.id}`)

    const withClient = cid ? ev.filter((e) => e.client === cid) : ev
    const want = String(types || '').split(',').filter(Boolean)
    const rows = withClient.filter((e) => !want.length || want.includes(e.type)).sort((a, b) => +new Date(b.date) - +new Date(a.date))
    // clients that show up, to fill the filter
    const ids = [...new Set(ev.map((e) => e.client).filter(Boolean))]
    const clients = ids.length ? await prisma.crmClient.findMany({ where: { id: { in: ids } }, select: { id: true, company: true } }) : []
    const cname = new Map(clients.map((c) => [c.id, c.company || '']))
    const out = rows.slice(0, 1500).map((e) => ({ ...e, who: e.who ? (people.get(e.who) || { id: e.who, name: '' }) : { id: null, name: '' }, client: e.client ? { id: e.client, name: cname.get(e.client) || '' } : null }))
    const counts = withClient.reduce((o, e) => { o[e.type] = (o[e.type] || 0) + 1; return o }, {})
    return {
        from: start, to: end, events: out, total: rows.length, counts,
        staff: staffRows.filter((m) => m.active || ev.some((e) => e.who === m.id)).map((m) => people.get(m.id)).sort((a, b) => a.name.localeCompare(b.name)),
        clients: clients.map((c) => ({ id: c.id, name: c.company || '' })).sort((a, b) => a.name.localeCompare(b.name)),
    }
}

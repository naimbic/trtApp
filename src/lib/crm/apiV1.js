import prisma from '@/lib/prisma'
import { emit } from '@/lib/crm/webhooks'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const str = (v, max = 500) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, max))
const iso = (d) => (d ? new Date(d).toISOString() : null)
const date = (v) => { if (v === undefined || v === null || v === '') return null; const d = new Date(v); if (Number.isNaN(+d)) throw fail(`"${v}" is not a valid date`); return d }

/**
 * The resources of the public API (/api/v1/<name>). Each one: the scope names, how a row looks outside, what may be written,
 * and the search. Nothing can be deleted through the API. Secrets, passwords, bank data and private notes never leave.
 */
const lookups = async () => {
    const [statuses, sources] = await Promise.all([prisma.crmLeadStatus.findMany({ select: { id: true, name: true, isDefault: true, statusOrder: true } }), prisma.crmLeadSource.findMany({ select: { id: true, name: true } })])
    return { statuses, sources }
}
const byNameOrId = (list, v) => { if (!v) return null; const s = String(v).trim(); return list.find((x) => x.id === s)?.id || list.find((x) => x.name.toLowerCase() === s.toLowerCase())?.id || null }

export const RESOURCES = {
    leads: {
        model: 'crmLead', read: 'leads:read', write: 'leads:write', search: ['name', 'email', 'company', 'phoneNumber'], sort: { createdAt: 'desc' },
        out: (l, lk) => ({ id: l.id, name: l.name, email: l.email, phone: l.phoneNumber, company: l.company, title: l.title, website: l.website, address: l.address, city: l.city, state: l.state, zip: l.zip, description: l.description, status: lk?.statuses.find((s) => s.id === l.statusId)?.name || null, status_id: l.statusId, source: lk?.sources.find((s) => s.id === l.sourceId)?.name || null, source_id: l.sourceId, assigned_ids: l.assignedIds || [], lost: l.lost, junk: l.junk, client_id: l.clientId, last_contact: iso(l.lastContact), value: l.value, date_converted: iso(l.dateConverted), created_at: iso(l.createdAt), updated_at: iso(l.updatedAt) }),
        needsLookups: true,
        async data(body, create, lk) {
            const d = {}
            if (body.name !== undefined) { const n = str(body.name, 200); if (!n) throw fail('"name" cannot be empty'); d.name = n } else if (create) throw fail('"name" is required')
            for (const [k, col, max] of [['email', 'email', 200], ['phone', 'phoneNumber', 60], ['company', 'company', 200], ['title', 'title', 120], ['website', 'website', 200], ['address', 'address', 300], ['city', 'city', 120], ['state', 'state', 120], ['zip', 'zip', 30], ['description', 'description', 10000]]) if (body[k] !== undefined) d[col] = str(body[k], max)
            if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw fail('"email" does not look right')
            if (body.status !== undefined || body.status_id !== undefined) { const id = byNameOrId(lk.statuses, body.status ?? body.status_id); if (!id) throw fail('Unknown "status" (use a status name or id)'); d.statusId = id; d.lastStatusChange = new Date() } else if (create) d.statusId = (lk.statuses.find((s) => s.isDefault) || [...lk.statuses].sort((a, b) => (a.statusOrder || 0) - (b.statusOrder || 0))[0])?.id
            if (body.source !== undefined || body.source_id !== undefined) { const id = byNameOrId(lk.sources, body.source ?? body.source_id); if (!id) throw fail('Unknown "source" (use a source name or id)'); d.sourceId = id }
            if (Array.isArray(body.assigned_ids)) { d.assignedIds = body.assigned_ids.map(oid).filter(Boolean); d.assigned = d.assignedIds[0] || null }
            if (create) { d.leadOrder = 1; d.isPublic = false }
            return d
        },
        after: async (row, create, key) => { if (create) { await prisma.crmLeadActivityLog.create({ data: { leadId: row.id, description: `Added through the API (${key.name})`, customActivity: true, fullName: 'API' } }).catch(() => {}); emit('lead.created', { id: row.id, name: row.name, email: row.email, phone: row.phoneNumber, company: row.company }) } },
    },
    clients: {
        model: 'crmClient', read: 'clients:read', write: 'clients:write', search: ['company', 'phoneNumber', 'website', 'city'], sort: { createdAt: 'desc' },
        out: (c) => ({ id: c.id, company: c.company, phone: c.phoneNumber, website: c.website, address: c.address, city: c.city, state: c.state, zip: c.zip, vat: c.vat, industry: c.industry, active: c.active, lead_id: c.leadId, created_at: iso(c.createdAt), updated_at: iso(c.updatedAt) }),
        async data(body, create) {
            const d = {}
            if (body.company !== undefined) { const n = str(body.company, 200); if (!n) throw fail('"company" cannot be empty'); d.company = n } else if (create) throw fail('"company" is required')
            for (const [k, col, max] of [['phone', 'phoneNumber', 60], ['website', 'website', 200], ['address', 'address', 300], ['city', 'city', 120], ['state', 'state', 120], ['zip', 'zip', 30], ['vat', 'vat', 60], ['industry', 'industry', 120]]) if (body[k] !== undefined) d[col] = str(body[k], max)
            if (body.active !== undefined) d.active = !!body.active
            if (create && d.active === undefined) d.active = true
            return d
        },
        after: async (row, create) => { if (create) emit('client.created', { id: row.id, company: row.company }) },
    },
    tasks: {
        model: 'crmTask', read: 'tasks:read', write: 'tasks:write', search: ['name', 'description'], sort: { createdAt: 'desc' },
        out: (t) => ({ id: t.id, name: t.name, description: t.description, status: t.status, priority: t.priority, start_date: iso(t.startDate), due_date: iso(t.dueDate), finished_at: iso(t.dateFinished), rel_type: t.relType, rel_id: t.relId, created_at: iso(t.createdAt), updated_at: iso(t.updatedAt) }),
        async data(body, create) {
            const d = {}
            if (body.name !== undefined) { const n = str(body.name, 250); if (!n) throw fail('"name" cannot be empty'); d.name = n } else if (create) throw fail('"name" is required')
            if (body.description !== undefined) d.description = str(body.description, 20000)
            if (body.priority !== undefined) { if (![1, 2, 3, 4].includes(+body.priority)) throw fail('"priority" is 1 (low) to 4 (urgent)'); d.priority = +body.priority }
            if (body.status !== undefined) { if (![1, 2, 3, 4, 5].includes(+body.status)) throw fail('"status" is 1 (not started) to 5 (complete)'); d.status = +body.status; d.dateFinished = +body.status === 5 ? new Date() : null }
            if (body.start_date !== undefined) d.startDate = date(body.start_date)
            if (body.due_date !== undefined) d.dueDate = date(body.due_date)
            if (body.rel_type !== undefined || body.rel_id !== undefined) {
                const t = body.rel_type ? String(body.rel_type) : null
                if (t && !['customer', 'lead', 'project', 'ticket'].includes(t)) throw fail('"rel_type" is customer, lead, project or ticket')
                if (t && !oid(body.rel_id)) throw fail('"rel_id" must be the id of that record')
                d.relType = t; d.relId = t ? oid(body.rel_id) : null
            }
            if (create) { d.startDate = d.startDate || new Date(); d.status = d.status || 1; d.priority = d.priority || 2 }
            return d
        },
        async extra(row, body, create) { // the people the task is assigned to
            if (!Array.isArray(body.assignee_ids)) return
            const want = [...new Set(body.assignee_ids.map(oid).filter(Boolean))]
            const have = await prisma.crmTaskAssigned.findMany({ where: { taskId: row.id }, select: { id: true, staffId: true } })
            const drop = have.filter((h) => !want.includes(h.staffId)).map((h) => h.id)
            if (drop.length) await prisma.crmTaskAssigned.deleteMany({ where: { id: { in: drop } } })
            for (const staffId of want.filter((w) => !have.some((h) => h.staffId === w))) await prisma.crmTaskAssigned.create({ data: { taskId: row.id, staffId } })
        },
        after: async (row, create, key, before) => { if (create) emit('task.created', { id: row.id, name: row.name, due_date: iso(row.dueDate) }); else if (row.status === 5 && before?.status !== 5) emit('task.completed', { id: row.id, name: row.name }) },
    },
    tickets: {
        model: 'crmTicket', read: 'tickets:read', search: ['subject', 'email', 'name'], sort: { createdAt: 'desc' },
        out: (t) => ({ id: t.id, number: t.legacyId, subject: t.subject, email: t.email, name: t.name, client_id: t.clientId, status_id: t.statusId, priority_id: t.priorityId, department_id: t.departmentId, assigned_id: t.assignedId, last_reply: iso(t.lastReply), rating: t.rating || null, created_at: iso(t.createdAt), updated_at: iso(t.updatedAt) }),
    },
    invoices: {
        model: 'crmInvoice', read: 'invoices:read', search: ['number'], sort: { createdAt: 'desc' },
        out: (i) => ({ id: i.id, number: i.number, client_id: i.clientId, status: i.status, date: iso(i.date), due_date: iso(i.dueDate), subtotal: i.subtotal, total: i.total, currency_id: i.currencyId, created_at: iso(i.createdAt), updated_at: iso(i.updatedAt) }),
    },
    proposals: {
        model: 'crmProposal', read: 'proposals:read', search: ['subject', 'proposalTo', 'email'], sort: { createdAt: 'desc' },
        out: (p) => ({ id: p.id, number: p.number, subject: p.subject, to: p.proposalTo, email: p.email, rel_type: p.relType, rel_id: p.relId, status: p.status, total: p.total, currency_id: p.currencyId, date: iso(p.date), open_till: iso(p.openTill), created_at: iso(p.createdAt), updated_at: iso(p.updatedAt) }),
    },
    projects: {
        model: 'crmProject', read: 'projects:read', search: ['name'], sort: { createdAt: 'desc' },
        out: (p) => ({ id: p.id, name: p.name, client_id: p.clientId, status: p.status, progress: p.progress, start_date: iso(p.startDate), deadline: iso(p.deadline), created_at: iso(p.createdAt), updated_at: iso(p.updatedAt) }),
    },
    staff: {
        model: 'crmStaff', read: 'staff:read', search: ['firstName', 'lastName'], sort: { firstName: 'asc' }, where: { active: true },
        out: (s) => ({ id: s.id, first_name: s.firstName, last_name: s.lastName }),
    },
    ideas: {
        model: 'crmGrowIdea', read: 'ideas:read', write: 'ideas:write', search: ['title', 'body'], sort: { createdAt: 'desc' },
        out: (i) => ({ id: i.id, title: i.title, body: i.body, category: i.category, period: i.period, source: i.source, status: i.status, priority: i.priority, tags: i.tags, assignee_ids: i.assigneeIds, due_date: iso(i.dueDate), task_id: i.taskId, url: i.sourceUrl, created_at: iso(i.createdAt), updated_at: iso(i.updatedAt) }),
        async data(body, create) {
            const d = {}
            if (body.title !== undefined) { const n = str(body.title, 200); if (!n) throw fail('"title" cannot be empty'); d.title = n } else if (create) throw fail('"title" is required')
            if (body.body !== undefined) d.body = str(body.body, 10000)
            if (body.category !== undefined) { if (!['leads', 'sales', 'income', 'team', 'skills', 'tech', 'marketing', 'ops', 'other'].includes(body.category)) throw fail('Unknown "category"'); d.category = body.category }
            if (body.period !== undefined) { if (!['daily', 'weekly', 'monthly', 'once'].includes(body.period)) throw fail('"period" is daily, weekly, monthly or once'); d.period = body.period }
            if (body.priority !== undefined) { if (![1, 2, 3].includes(+body.priority)) throw fail('"priority" is 1 (low) to 3 (high)'); d.priority = +body.priority }
            if (body.status !== undefined) { if (!['new', 'accepted', 'doing', 'done', 'dismissed'].includes(body.status)) throw fail('Unknown "status"'); d.status = body.status; d.resolvedAt = ['done', 'dismissed'].includes(body.status) ? new Date() : null }
            if (Array.isArray(body.tags)) d.tags = [...new Set(body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, 10)
            if (body.url !== undefined) d.sourceUrl = str(body.url, 400)
            if (body.due_date !== undefined) d.dueDate = date(body.due_date)
            if (create) d.source = 'api'
            return d
        },
        after: async (row, create) => { if (create) emit('idea.created', { id: row.id, title: row.title, category: row.category }) },
    },
}

const searchWhere = (r, q) => (q ? { OR: r.search.map((f) => ({ [f]: { contains: String(q).slice(0, 100), mode: 'insensitive' } })) } : {})

export async function listRows(name, params) {
    const r = RESOURCES[name]
    const limit = Math.min(Math.max(parseInt(params.get('limit'), 10) || 25, 1), 100), page = Math.max(parseInt(params.get('page'), 10) || 1, 1)
    const since = params.get('updated_since') ? new Date(params.get('updated_since')) : null
    if (since && Number.isNaN(+since)) throw fail('"updated_since" is not a valid date')
    const where = { AND: [r.where || {}, searchWhere(r, params.get('q')), since ? { updatedAt: { gte: since } } : {}] }
    const [rows, total, lk] = await Promise.all([prisma[r.model].findMany({ where, orderBy: r.sort, skip: (page - 1) * limit, take: limit }), prisma[r.model].count({ where }), r.needsLookups ? lookups() : null])
    return { data: rows.map((x) => r.out(x, lk)), page, limit, total }
}

export async function getRow(name, id) {
    const r = RESOURCES[name]
    const row = oid(id) && (await prisma[r.model].findFirst({ where: { AND: [{ id }, r.where || {}] } }))
    if (!row) throw fail('Not found', 404)
    return { data: r.out(row, r.needsLookups ? await lookups() : null) }
}

export async function writeRow(name, id, body, key) {
    const r = RESOURCES[name]
    if (!r.write) throw fail('This resource is read-only', 405)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Send a JSON object')
    const lk = r.needsLookups ? await lookups() : null
    const create = !id
    let before = null
    if (!create) { before = oid(id) && (await prisma[r.model].findUnique({ where: { id } })); if (!before) throw fail('Not found', 404) }
    const data = await r.data(body, create, lk)
    if (!create && !Object.keys(data).length && !r.extra) throw fail('Nothing to change')
    const row = create ? await prisma[r.model].create({ data }) : Object.keys(data).length ? await prisma[r.model].update({ where: { id }, data }) : before
    if (r.extra) await r.extra(row, body, create)
    await r.after?.(row, create, key, before)
    return { data: r.out(row, lk), created: create }
}

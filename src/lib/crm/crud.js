import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getResource } from './resources'
import {
    PermissionError,
    requirePermission,
    getStaffId,
    isCrmAdmin,
    viewScope,
} from './permissions'

const STRING_TYPES = ['text', 'textarea', 'richtext', 'email', 'url', 'color']

const delegate = (resource) => {
    const d = prisma[resource.model]
    if (!d) throw new Error(`Prisma model "${resource.model}" not found for resource "${resource.key}"`)
    return d
}

export const resolveResource = (key) => {
    const r = getResource(key)
    if (!r) throw new PermissionError(`Unknown resource "${key}"`, 404)
    return r
}

const fieldKeys = (resource) =>
    new Set([...(resource.fields || []).map((f) => f.key), ...(resource.columns || []).map((c) => c.key)])

const coerce = (field, value) => {
    if (value === undefined) return undefined
    const empty = value === '' || value === null
    switch (field.type) {
        case 'number':
        case 'money': {
            if (empty) return null
            const n = Number(value)
            if (Number.isNaN(n)) return null
            return field.type === 'money' ? Math.round(n * 100) / 100 : n
        }
        case 'boolean':
            return value === true || value === 'true' || value === 1 || value === '1'
        case 'date':
        case 'datetime': {
            if (empty) return null
            const d = new Date(value)
            return Number.isNaN(d.getTime()) ? null : d
        }
        case 'relation':
            return empty ? null : String(value)
        case 'multiselect':
        case 'tags':
            return Array.isArray(value) ? value.map(String) : empty ? [] : String(value).split(',').map((s) => s.trim()).filter(Boolean)
        case 'json':
            if (empty) return null
            if (typeof value === 'string') {
                try { return JSON.parse(value) } catch { return value }
            }
            return value
        case 'select':
            if (empty) return null
            // numeric Perfex codes are stored as Int: keep numbers numeric when options are numeric
            if (field.options?.length && typeof field.options[0].value === 'number') return Number(value)
            return value
        default:
            return empty ? null : value
    }
}

export const buildData = (resource, body, { partial = false } = {}) => {
    const data = {}
    for (const f of resource.fields || []) {
        if (f.readOnly) continue
        if (!(f.key in body)) {
            if (!partial && f.type === 'boolean') data[f.key] = false
            continue
        }
        data[f.key] = coerce(f, body[f.key])
    }
    // allow partial PATCH of columns that are not form fields (e.g. kanban status)
    if (partial) {
        for (const [k, v] of Object.entries(body)) {
            if (k in data || k === 'id') continue
            const col = (resource.columns || []).find((c) => c.key === k)
            if (col && !col.readOnly) data[k] = coerce(col, v)
        }
    }
    return data
}

const validateRequired = (resource, data) => {
    const missing = (resource.fields || [])
        .filter((f) => f.required && !f.readOnly && (data[f.key] === null || data[f.key] === undefined || data[f.key] === ''))
        .map((f) => f.label || f.key)
    if (missing.length) throw new PermissionError(`Required: ${missing.join(', ')}`, 400)
}

const buildWhere = async (resource, params, session) => {
    const and = []
    const q = params.query?.trim()
    if (q) {
        const stringFields = (resource.search || []).filter(Boolean)
        const or = stringFields.map((key) => ({ [key]: { contains: q, mode: 'insensitive' } }))
        if (or.length) and.push({ OR: or })
    }
    for (const f of resource.filters || []) {
        const v = params[f.key]
        if (v === undefined || v === '' || v === null) continue
        const field = [...(resource.fields || []), ...(resource.columns || [])].find((x) => x.key === f.key)
        and.push({ [f.key]: field ? coerce(field, v) : v })
    }
    for (const [k, v] of Object.entries(params.where || {})) {
        and.push({ [k]: v })
    }
    // resources without a permission feature (notes, reminders, to-dos, events, files, notifications): everybody's own, administrators see all
    if (session && restricted(resource, session)) and.push(await ownerFilter(resource, session))
    if (session) { const own = await ownWhere(resource, session, params); if (own) and.push(own) }
    return and.length ? { AND: and } : {}
}

/** Attach human labels for relation columns: row._rel = { fieldKey: 'Label' } */
const attachRelations = async (resource, rows) => {
    const relCols = [...(resource.columns || []), ...(resource.fields || [])].filter((c) => c.type === 'relation' && c.resource)
    const seen = new Set()
    for (const col of relCols) {
        if (seen.has(col.key)) continue
        seen.add(col.key)
        const target = getResource(col.resource)
        if (!target) continue
        const ids = [...new Set(rows.map((r) => r[col.key]).filter(Boolean))]
        if (!ids.length) continue
        const found = await delegate(target).findMany({
            where: { id: { in: ids } },
            select: { id: true, [target.titleField]: true },
        })
        const map = Object.fromEntries(found.map((x) => [x.id, x[target.titleField]]))
        for (const row of rows) {
            if (row[col.key]) (row._rel ||= {})[col.key] = map[row[col.key]] ?? null
        }
    }
    return rows
}

// ---- "own records only" (view_own) for resources behind a permission feature.
// The owner is a real column of the table (not necessarily one of the screen's fields); child tables (contacts,
// project files...) follow the parent record named in the filter; plain lookups (statuses, sources...) stay readable.
const OWNER_COLUMNS = ['addedFrom', 'assigned', 'assignedId', 'adminId', 'staffId']
const CHILD_PARENT = { clientId: 'clients', leadId: 'leads', projectId: 'projects', taskId: 'tasks', ticketId: 'tickets', invoiceId: 'invoices', estimateId: 'estimates', proposalId: 'proposals', contractId: 'contracts', expenseId: 'expenses', subscriptionId: 'subscriptions', creditNoteId: 'credit-notes' }
const LOOKUPS = new Set(['lead-sources', 'lead-statuses', 'customer-groups', 'item-groups', 'items', 'contract-types', 'expense-categories', 'kb-groups', 'kb-articles', 'kb-feedback', 'milestones', 'checklist-templates', 'days-off', 'consent-purposes', 'ticket-statuses', 'ticket-priorities', 'services', 'predefined-replies', 'surveys', 'survey-questions', 'goals'])
const modelFields = {}
const ownerColumns = (resource) => {
    const name = resource.model[0].toUpperCase() + resource.model.slice(1)
    modelFields[name] ||= new Set((Prisma.dmmf?.datamodel?.models || []).find((m) => m.name === name)?.fields.map((f) => f.name) || [])
    return (resource.ownField ? [resource.ownField] : OWNER_COLUMNS).filter((c) => modelFields[name].has(c))
}
/** Tasks are visible to the whole team; changing them is guarded in the tasks API, and here only for managers. */
const readScope = (resource, authority) => (resource.feature === 'tasks' ? (viewScope(authority, 'tasks') ? 'all' : null) : viewScope(authority, resource.feature))
async function ownWhere(resource, session, params = {}) {
    const authority = session.user.authority || []
    if (!resource.feature || readScope(resource, authority) !== 'own') return null
    const cols = ownerColumns(resource)
    const me = (await getStaffId(session)) || '__none__'
    if (cols.length) return cols.length === 1 ? { [cols[0]]: me } : { OR: cols.map((c) => ({ [c]: me })) }
    if (LOOKUPS.has(resource.key)) return null
    for (const [k, parent] of Object.entries(CHILD_PARENT)) {
        const id = params.where?.[k]
        if (id) { await getRecord(parent, String(id)); return null } // throws when the parent is not theirs
    }
    throw new PermissionError('Forbidden', 403)
}
async function ownAllows(resource, session, row) {
    const authority = session.user.authority || []
    if (!resource.feature || readScope(resource, authority) !== 'own') return true
    const cols = ownerColumns(resource)
    const me = await getStaffId(session)
    if (cols.length) return !!me && cols.some((c) => row[c] === me)
    if (LOOKUPS.has(resource.key)) return true
    for (const [k, parent] of Object.entries(CHILD_PARENT)) {
        if (row[k]) { try { await getRecord(parent, String(row[k])); return true } catch { return false } }
    }
    return false
}
/** Writes on task tables through the generic API are for managers; everybody else uses the tasks API (assignee rules). */
const taskWriteGuard = (resource, session) => {
    if (resource.feature === 'tasks' && viewScope(session.user.authority || [], 'tasks') !== 'all') throw new PermissionError('Only the people assigned to this task, or who created it, can change it', 403)
}

// Resources without a permission feature are not open to every signed-in member:
//  - privateField  (reminders, to-dos, events, notifications): each person sees their own, administrators see all
//  - shareByRel    (notes, files): the author sees theirs, others only those attached to a kind of record they may open
const REL_FEATURE = { customer: 'customers', lead: 'leads', proposal: 'proposals', estimate: 'estimates', invoice: 'invoices', credit_note: 'credit_notes', ticket: 'tickets', expense: 'expenses', contract: 'contracts', project: 'projects', task: 'tasks', subscription: 'subscriptions', staff: 'staff' }
const relAllowed = (authority) => Object.entries(REL_FEATURE).filter(([, f]) => viewScope(authority, f) !== null).map(([t]) => t)
const restricted = (resource, session) => !resource.feature && (resource.privateField || resource.shareByRel) && !isCrmAdmin(session.user.authority || [])
async function ownerFilter(resource, session) {
    const me = (await getStaffId(session)) || '__none__'
    if (resource.privateField) return { [resource.privateField]: me }
    return { OR: [{ [resource.shareByRel]: me }, { relType: { in: relAllowed(session.user.authority || []) } }] }
}

export async function listRecords(key, params = {}) {
    const resource = resolveResource(key)
    const session = await requirePermission(resource.feature, 'view')
    const page = Math.max(parseInt(params.pageIndex || '1', 10), 1)
    const size = Math.min(Math.max(parseInt(params.pageSize || '10', 10), 1), 200)
    const where = await buildWhere(resource, params, session)
    const sortField = params.sortKey && fieldKeys(resource).has(params.sortKey) ? params.sortKey : null
    const orderBy = sortField
        ? { [sortField]: params.order === 'desc' ? 'desc' : 'asc' }
        : resource.defaultSort || { createdAt: 'desc' }
    const d = delegate(resource)
    const [rows, total] = await Promise.all([
        d.findMany({ where, orderBy, skip: (page - 1) * size, take: size }),
        d.count({ where }),
    ])
    await attachRelations(resource, rows)
    return { list: rows, total, pageIndex: page, pageSize: size }
}

export async function getRecord(key, id) {
    const resource = resolveResource(key)
    const session = await requirePermission(resource.feature, 'view')
    const row = await delegate(resource).findUnique({ where: { id } })
    if (!row) throw new PermissionError('Not found', 404)
    if (!(await ownAllows(resource, session, row))) throw new PermissionError('Forbidden', 403)
    if (restricted(resource, session)) {
        const me = await getStaffId(session)
        const ok = resource.privateField ? row[resource.privateField] === me : row[resource.shareByRel] === me || relAllowed(session.user.authority || []).includes(row.relType)
        if (!ok) throw new PermissionError('Forbidden', 403)
    }
    await attachRelations(resource, [row])
    return row
}

const audit = async (session, resource, action, id, label) => {
    try {
        if (!prisma.crmActivityLog) return
        await prisma.crmActivityLog.create({
            data: {
                description: `${action} ${resource.label}${label ? `: ${label}` : ''}`,
                staffId: await getStaffId(session),
                additionalData: JSON.stringify({ resource: resource.key, id }),
            },
        })
    } catch {
        /* auditing must never break a write */
    }
}

export async function createRecord(key, body) {
    const resource = resolveResource(key)
    if (resource.readOnly) throw new PermissionError('Read only', 405)
    const session = await requirePermission(resource.feature, 'create')
    taskWriteGuard(resource, session)
    const data = buildData(resource, body)
    validateRequired(resource, data)
    const keys = fieldKeys(resource)
    if (keys.has('addedFrom') && data.addedFrom === undefined) data.addedFrom = await getStaffId(session)
    // resources whose author column is not `addedFrom` (e.g. ticket replies -> adminId)
    if (resource.staffField && !data[resource.staffField]) data[resource.staffField] = await getStaffId(session)
    if (restricted(resource, session) && resource.privateField) data[resource.privateField] = await getStaffId(session)
    const row = await delegate(resource).create({ data })
    await audit(session, resource, 'Created', row.id, row[resource.titleField])
    return row
}

export async function updateRecord(key, id, body) {
    const resource = resolveResource(key)
    if (resource.readOnly) throw new PermissionError('Read only', 405)
    const session = await requirePermission(resource.feature, 'edit')
    taskWriteGuard(resource, session)
    const current = await getRecord(key, id) // enforces view_own scope
    const locked = resource.lock?.(current)
    if (locked) throw new PermissionError(locked, 409)
    const data = buildData(resource, body, { partial: true })
    const row = await delegate(resource).update({ where: { id }, data })
    await audit(session, resource, 'Updated', id, row[resource.titleField])
    return row
}

export async function deleteRecord(key, id) {
    const resource = resolveResource(key)
    if (resource.readOnly) throw new PermissionError('Read only', 405)
    const session = await requirePermission(resource.feature, 'delete')
    taskWriteGuard(resource, session)
    const row = await getRecord(key, id)
    const locked = resource.lock?.(row)
    if (locked) throw new PermissionError(locked, 409)
    await delegate(resource).delete({ where: { id } })
    await audit(session, resource, 'Deleted', id, row[resource.titleField])
    return { id }
}

/** Options for relation pickers: [{ value, label }] */
export async function listOptions(key, { query = '', ids } = {}) {
    const resource = resolveResource(key)
    const session = await requirePermission(resource.feature, 'view')
    if (restricted(resource, session)) return []
    const where = ids?.length
        ? { id: { in: ids } }
        : query
          ? { [resource.titleField]: { contains: query, mode: 'insensitive' } }
          : {}
    const rows = await delegate(resource).findMany({
        where,
        take: 25,
        orderBy: { [resource.titleField]: 'asc' },
        select: { id: true, [resource.titleField]: true },
    })
    return rows.map((r) => ({ value: r.id, label: String(r[resource.titleField] ?? r.id) }))
}

export const errorResponse = (error) => {
    const status = error?.status || 500
    if (status === 500) console.error('[crm]', error)
    return Response.json(
        { error: status === 500 ? 'Internal server error' : error.message },
        { status },
    )
}

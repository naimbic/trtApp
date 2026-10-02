import prisma from '@/lib/prisma'
import { getResource } from './resources'
import {
    PermissionError,
    requirePermission,
    getStaffId,
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
    if (resource.feature && session) {
        const scope = viewScope(session.user.authority || [], resource.feature)
        if (scope === 'own') {
            const staffId = await getStaffId(session)
            const ownField = resource.ownField || 'addedFrom'
            if (fieldKeys(resource).has(ownField)) and.push({ [ownField]: staffId || '__none__' })
        }
    }
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
    if (resource.feature && viewScope(session.user.authority || [], resource.feature) === 'own') {
        const staffId = await getStaffId(session)
        const ownField = resource.ownField || 'addedFrom'
        if (fieldKeys(resource).has(ownField) && row[ownField] !== staffId) throw new PermissionError('Forbidden', 403)
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
    const data = buildData(resource, body)
    validateRequired(resource, data)
    const keys = fieldKeys(resource)
    if (keys.has('addedFrom') && data.addedFrom === undefined) data.addedFrom = await getStaffId(session)
    // resources whose author column is not `addedFrom` (e.g. ticket replies -> adminId)
    if (resource.staffField && !data[resource.staffField]) data[resource.staffField] = await getStaffId(session)
    const row = await delegate(resource).create({ data })
    await audit(session, resource, 'Created', row.id, row[resource.titleField])
    return row
}

export async function updateRecord(key, id, body) {
    const resource = resolveResource(key)
    if (resource.readOnly) throw new PermissionError('Read only', 405)
    const session = await requirePermission(resource.feature, 'edit')
    await getRecord(key, id) // enforces view_own scope
    const data = buildData(resource, body, { partial: true })
    const row = await delegate(resource).update({ where: { id }, data })
    await audit(session, resource, 'Updated', id, row[resource.titleField])
    return row
}

export async function deleteRecord(key, id) {
    const resource = resolveResource(key)
    if (resource.readOnly) throw new PermissionError('Read only', 405)
    const session = await requirePermission(resource.feature, 'delete')
    const row = await getRecord(key, id)
    await delegate(resource).delete({ where: { id } })
    await audit(session, resource, 'Deleted', id, row[resource.titleField])
    return { id }
}

/** Options for relation pickers: [{ value, label }] */
export async function listOptions(key, { query = '', ids } = {}) {
    const resource = resolveResource(key)
    await requirePermission(resource.feature, 'view')
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

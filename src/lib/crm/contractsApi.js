import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const EXPIRING_DAYS = 7
const day = (d) => new Date(d).toISOString().slice(0, 10)
const addDays = (s, n) => new Date(new Date(`${s}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10)

/** Perfex contract state: trash, expired, expiring (within 7 days), no end date, otherwise active. */
const stateOf = (c, today) => {
    if (c.trash) return 'trash'
    if (!c.dateEnd) return 'active'
    const end = day(c.dateEnd)
    if (end < today) return 'expired'
    if (end <= addDays(today, EXPIRING_DAYS)) return 'expiring'
    return 'active'
}
export const STATE_LABEL = { active: 'Active', expiring: 'About to expire', expired: 'Expired', trash: 'Trash' }

async function scope(session) {
    if (viewScope(session.user.authority || [], 'contracts') === 'all') return {}
    const staffId = await getStaffId(session)
    return staffId ? { addedFrom: staffId } : { id: '000000000000000000000000' }
}

async function mustFind(session, id) {
    const c = await prisma.crmContract.findFirst({ where: { AND: [{ id }, await scope(session)] } })
    if (!c) throw httpError('Contract not found', 404)
    return c
}

export async function listContracts({ query = '', state, clientId, typeId, pageIndex = 1, pageSize = 15, sortKey = 'dateStart', order = 'desc' } = {}) {
    const session = await requirePermission('contracts', 'view')
    const where = { AND: [await scope(session), clientId ? { clientId } : {}, typeId ? { contractTypeId: typeId } : {}] }
    const [rows, clients, types] = await Promise.all([
        prisma.crmContract.findMany({ where, select: { id: true, subject: true, clientId: true, contractTypeId: true, contractValue: true, dateStart: true, dateEnd: true, signed: true, markedAsSigned: true, trash: true, createdAt: true } }),
        prisma.crmClient.findMany({ select: { id: true, company: true } }),
        prisma.crmContractType.findMany(),
    ])
    const cname = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    const tname = Object.fromEntries(types.map((t) => [t.id, t.name]))
    const today = day(new Date())
    let list = rows.map((c) => {
        const st = stateOf(c, today)
        return { id: c.id, subject: c.subject || '(no subject)', clientId: c.clientId, client: cname[c.clientId] || '', type: tname[c.contractTypeId] || '', typeId: c.contractTypeId, value: c.contractValue || 0, dateStart: c.dateStart, dateEnd: c.dateEnd, signed: c.signed || c.markedAsSigned, state: st, stateLabel: STATE_LABEL[st], daysLeft: c.dateEnd ? Math.round((new Date(`${day(c.dateEnd)}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000) : null }
    })
    const counts = { active: 0, expiring: 0, expired: 0, trash: 0 }
    let activeValue = 0
    list.forEach((c) => { counts[c.state] += 1; if (c.state === 'active' || c.state === 'expiring') activeValue += c.value })
    const unsigned = list.filter((c) => !c.signed && c.state !== 'trash').length

    const q = query.trim().toLowerCase()
    if (state) list = list.filter((c) => c.state === state)
    else list = list.filter((c) => c.state !== 'trash') // trash is only shown when asked for
    if (q) list = list.filter((c) => c.subject.toLowerCase().includes(q) || c.client.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
    const dir = order === 'asc' ? 1 : -1
    const keyFn = { subject: (c) => c.subject.toLowerCase(), client: (c) => c.client.toLowerCase(), value: (c) => c.value, dateStart: (c) => +new Date(c.dateStart || 0), dateEnd: (c) => +new Date(c.dateEnd || 8.64e15), type: (c) => c.type.toLowerCase() }[sortKey] || ((c) => +new Date(c.dateStart || 0))
    list.sort((a, b) => (keyFn(a) > keyFn(b) ? dir : keyFn(a) < keyFn(b) ? -dir : 0))
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1)
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 15, 1), 200)
    return { list: list.slice((page - 1) * size, page * size), total: list.length, pageIndex: page, pageSize: size, stats: { counts, activeValue: Math.round(activeValue * 100) / 100, unsigned, types: types.map((t) => ({ id: t.id, name: t.name })) } }
}

export async function getContract(id) {
    const session = await requirePermission('contracts', 'view')
    const c = await mustFind(session, id)
    const [client, type, comments, renewals, staff] = await Promise.all([
        c.clientId ? prisma.crmClient.findUnique({ where: { id: c.clientId }, select: { id: true, company: true } }) : null,
        c.contractTypeId ? prisma.crmContractType.findUnique({ where: { id: c.contractTypeId } }) : null,
        prisma.crmContractComment.findMany({ where: { contractId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmContractRenewal.findMany({ where: { contractId: id }, orderBy: { dateRenewed: 'desc' } }),
        prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true } }),
    ])
    const sname = Object.fromEntries(staff.map((s) => [s.id, `${s.firstName || ''} ${s.lastName || ''}`.trim()]))
    const today = day(new Date())
    const st = stateOf(c, today)
    return {
        id: c.id, clientId: c.clientId, typeId: c.contractTypeId, projectId: c.projectId, hash: c.hash, subject: c.subject, description: c.description, content: c.content, value: c.contractValue || 0, dateStart: c.dateStart, dateEnd: c.dateEnd,
        client, type: type ? { id: type.id, name: type.name } : null, signed: c.signed, markedAsSigned: c.markedAsSigned, trash: c.trash, hidden: c.notVisibleToClient,
        // what the client signed with: name, email, the exact time, the address it came from and the drawn signature
        acceptance: c.signed ? { name: [c.acceptanceFirstname, c.acceptanceLastname].filter(Boolean).join(' '), email: c.acceptanceEmail, date: c.acceptanceDate, ip: c.acceptanceIp ? String(c.acceptanceIp).replace(/^::ffff:/i, '') : null, signature: c.signature?.startsWith('data:image/png;base64,') ? c.signature : null } : null,
        locked: !!(c.signed || c.markedAsSigned), eSigned: !!c.signature,
        state: st, stateLabel: STATE_LABEL[st], createdAt: c.createdAt, updatedAt: c.updatedAt,
        comments: comments.map((x) => ({ id: x.id, content: x.content, staff: sname[x.staffId] || '', createdAt: x.createdAt })),
        renewals: renewals.map((r) => ({ id: r.id, oldStartDate: r.oldStartDate, newStartDate: r.newStartDate, oldEndDate: r.oldEndDate, newEndDate: r.newEndDate, oldValue: r.oldValue, newValue: r.newValue, dateRenewed: r.dateRenewed, renewedBy: r.renewedBy || sname[r.renewedByStaffId] || '' })),
    }
}

/** action: sign | unsign | trash | restore | renew {newStartDate,newEndDate,newValue} */
export async function contractAction(id, { action, ...body }) {
    const session = await requirePermission('contracts', 'edit')
    const c = await mustFind(session, id)
    const staffId = await getStaffId(session)
    if (action === 'sign') await prisma.crmContract.update({ where: { id }, data: { markedAsSigned: true, signed: true, acceptanceDate: c.acceptanceDate || new Date() } })
    else if (action === 'unsign') {
        // only a manual "marked as signed" can be taken back; what the client signed on screen is final
        if (c.signature) throw httpError('A contract signed by the client cannot be changed back to not signed')
        await prisma.crmContract.update({ where: { id }, data: { markedAsSigned: false, signed: false } })
    }
    else if (action === 'trash') await prisma.crmContract.update({ where: { id }, data: { trash: true } })
    else if (action === 'restore') await prisma.crmContract.update({ where: { id }, data: { trash: false } })
    else if (action === 'renew') {
        const newStart = body.newStartDate ? new Date(body.newStartDate) : null
        const newEnd = body.newEndDate ? new Date(body.newEndDate) : null
        if (!newStart || Number.isNaN(+newStart)) throw httpError('New start date is required')
        if (!newEnd || Number.isNaN(+newEnd) || newEnd < newStart) throw httpError('New end date must be after the start date')
        const newValue = body.newValue === '' || body.newValue == null ? c.contractValue : Number(body.newValue)
        const staff = staffId ? await prisma.crmStaff.findUnique({ where: { id: staffId } }) : null
        await prisma.crmContractRenewal.create({ data: { contractId: id, oldStartDate: c.dateStart, newStartDate: newStart, oldEndDate: c.dateEnd, newEndDate: newEnd, oldValue: c.contractValue, newValue, dateRenewed: new Date(), renewedBy: staff ? `${staff.firstName || ''} ${staff.lastName || ''}`.trim() : null, renewedByStaffId: staffId || undefined } })
        await prisma.crmContract.update({ where: { id }, data: { dateStart: newStart, dateEnd: newEnd, contractValue: newValue, isExpiryNotified: false } })
    } else throw httpError('Unknown action')
    return { success: true }
}

export async function addContractComment(id, content) {
    const session = await requirePermission('contracts', 'view')
    await mustFind(session, id)
    const text = String(content || '').trim()
    if (!text) throw httpError('Write a comment first')
    const staffId = await getStaffId(session)
    const c = await prisma.crmContractComment.create({ data: { contractId: id, content: text, staffId: staffId || undefined } })
    return { id: c.id }
}

export async function deleteContractComment(id, commentId) {
    const session = await requirePermission('contracts', 'edit')
    await mustFind(session, id)
    await prisma.crmContractComment.delete({ where: { id: commentId } })
    return { success: true }
}

const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)

/** Create or edit a contract from the editor page (text, client, type, dates, value). */
export async function saveContract(body, id) {
    const session = await requirePermission('contracts', id ? 'edit' : 'create')
    const staffId = await getStaffId(session)
    const subject = String(body.subject || '').trim().slice(0, 200)
    if (!subject) throw httpError('Give the contract a subject')
    if (!oid(body.clientId)) throw httpError('Choose the client')
    const start = body.dateStart ? new Date(body.dateStart) : null, end = body.dateEnd ? new Date(body.dateEnd) : null
    if (!start || Number.isNaN(+start)) throw httpError('Choose the start date')
    if (end && (Number.isNaN(+end) || end < start)) throw httpError('The end date cannot be before the start date')
    const data = { subject, description: String(body.description || '').trim() || null, content: body.content ?? null, clientId: oid(body.clientId), contractTypeId: oid(body.typeId), projectId: oid(body.projectId), dateStart: start, dateEnd: end, contractValue: body.value === '' || body.value == null ? null : Number(body.value) || 0, notVisibleToClient: !!body.hidden }
    if (id) {
        const prev = await mustFind(session, id)
        if (prev.signed || prev.markedAsSigned) throw httpError('A signed contract cannot be edited', 409)
        await prisma.crmContract.update({ where: { id }, data })
        return { success: true, id }
    }
    const last = await prisma.crmContract.findFirst({ where: { legacyId: { not: null } }, orderBy: { legacyId: 'desc' }, select: { legacyId: true } })
    const c = await prisma.crmContract.create({ data: { ...data, legacyId: (last?.legacyId || 0) + 1, addedFrom: staffId, hash: (await import('node:crypto')).randomUUID().replace(/-/g, ''), signed: false, markedAsSigned: false, trash: false, isExpiryNotified: false } })
    return { success: true, id: c.id }
}

export async function deleteContract(id) {
    const session = await requirePermission('contracts', 'delete')
    const cur = await mustFind(session, id)
    if (cur.signed || cur.markedAsSigned) throw httpError('A signed contract cannot be deleted', 409)
    await prisma.crmContractComment.deleteMany({ where: { contractId: id } })
    await prisma.crmContractRenewal.deleteMany({ where: { contractId: id } })
    await prisma.crmFile.deleteMany({ where: { relType: 'contract', relId: id } }).catch(() => {})
    await prisma.crmContract.delete({ where: { id } })
    return { success: true }
}

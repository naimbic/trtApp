// Leave requests: listed with the person, the kind of leave and the days; created, changed, accepted or refused in place.
// "View" sees everybody's, "view own" (everybody has it) only one's own. Accepting or refusing needs the "decide" (or edit) switch;
// the requester is told when the answer comes. Days are counted as working days (not Saturday / Sunday, not a company day off).
import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { realPicture } from '@/lib/crm/pictures'
import { notifyNotice } from '@/lib/crm/notifyMail'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const day = (v) => { if (!v) return null; const s = String(v).slice(0, 10); if (!DAY_RE.test(s)) return null; const d = new Date(`${s}T00:00:00.000Z`); return Number.isNaN(+d) ? null : d }
const dayStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
export const LEAVE_STATUS = { PENDING: 0, APPROVED: 1, REFUSED: 2 }
const name = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'

async function who(session) {
    const authority = session.user.authority || []
    return { authority, staffId: await getStaffId(session), scope: viewScope(authority, 'leave'), admin: isCrmAdmin(authority), can: (cap) => hasCap(authority, 'leave', cap) }
}

/** Working days from `from` to `to` (both included): no weekend, no company day off. */
export async function countDays(from, to) {
    if (!from || !to || to < from) return 0
    const off = new Set((await prisma.crmDayOff.findMany({ where: { offDate: { gte: from, lte: to } }, select: { offDate: true } })).map((d) => dayStr(d.offDate)))
    // the closed days (Calendar → Closed days = Days off) count as company days off too
    for (const c of await prisma.crmClosedDay.findMany({ where: { toDay: { gte: dayStr(from) }, fromDay: { lte: dayStr(to) } }, select: { fromDay: true, toDay: true } })) {
        for (let t = +new Date(`${c.fromDay}T00:00:00Z`), n = 0; t <= +new Date(`${c.toDay}T00:00:00Z`) && n < 400; t += 86400000, n++) off.add(dayStr(new Date(t)))
    }
    let n = 0
    for (let t = +from; t <= +to; t += 86400000) { const d = new Date(t); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !off.has(dayStr(d))) n++ }
    return n
}

export async function listLeaves(q = {}) {
    const session = await requirePermission('leave', 'view_own')
    const a = await who(session)
    const where = {}
    if (a.scope !== 'all') where.staffId = a.staffId || '000000000000000000000000'
    else if (oid(q.staffId)) where.staffId = q.staffId
    if (oid(q.typeId)) where.typeId = q.typeId
    if (['0', '1', '2'].includes(String(q.status))) where.status = Number(q.status)
    const from = day(q.from), to = day(q.to)
    // a request touches the period when it starts before the period ends and ends after the period starts
    if (from) where.endTime = { gte: from }
    if (to) where.startTime = { lte: new Date(+to + 86399999) }
    const [rows, types, staffAll] = await Promise.all([
        prisma.crmLeaveRequest.findMany({ where, orderBy: { startTime: 'desc' }, take: 1000 }),
        prisma.crmLeaveType.findMany({ orderBy: { typeOrder: 'asc' } }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
    ])
    const known = new Map(staffAll.map((s) => [s.id, s]))
    const missing = [...new Set(rows.map((r) => r.staffId).filter((id) => id && !known.has(id)))]
    if (missing.length) for (const s of await prisma.crmStaff.findMany({ where: { id: { in: missing } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })) known.set(s.id, s)
    const person = (id) => { const s = known.get(id); return s ? { id: s.id, name: name(s), image: realPicture(s.profileImage) } : { id: id || '', name: '—', image: null } }
    const edit = a.can('edit'), decide = a.can('decide') || edit // whoever could edit requests before can still accept them
    return {
        list: rows.map((r) => ({
            id: r.id, subject: r.subject || '', reason: r.reason || '', staff: person(r.staffId), typeId: r.typeId || '', startTime: dayStr(r.startTime), endTime: dayStr(r.endTime || r.startTime),
            days: r.numberOfDays ?? 0, status: r.status ?? 0, decidedAt: r.decidedAt, createdAt: r.createdAt,
            mine: !!a.staffId && r.staffId === a.staffId,
        })),
        types: types.filter((t) => t.isActive !== false).map((t) => ({ id: t.id, name: t.name, color: t.color || '' })),
        staff: a.scope === 'all' ? staffAll.map((s) => ({ id: s.id, name: name(s) })).sort((x, y) => x.name.localeCompare(y.name)) : [],
        me: a.staffId,
        can: { all: a.scope === 'all', create: a.can('create'), edit, decide, delete: a.can('delete') },
    }
}

function clean(body, partial) {
    const out = {}
    if (!partial || body.subject !== undefined) out.subject = clip(body.subject, 160) || null
    if (!partial || body.reason !== undefined) out.reason = clip(body.reason, 2000) || null
    if (body.typeId !== undefined) out.typeId = oid(body.typeId)
    for (const k of ['startTime', 'endTime']) if (body[k] !== undefined) { const d = day(body[k]); if (body[k] && !d) throw fail('Choose valid dates'); out[k] = d }
    if (body.numberOfDays !== undefined) { const n = Number(body.numberOfDays); if (!Number.isFinite(n) || n < 0 || n > 366) throw fail('Choose a valid number of days'); out.numberOfDays = n }
    return out
}

export async function createLeave(body = {}) {
    const session = await requirePermission('leave', 'create')
    const a = await who(session)
    const data = clean(body, false)
    if (!data.startTime) throw fail('Choose the first day')
    data.endTime = data.endTime || data.startTime
    if (data.endTime < data.startTime) throw fail('The last day is before the first day')
    let staffId = a.staffId
    if (oid(body.staffId) && body.staffId !== a.staffId) { if (!a.can('edit')) throw fail('Forbidden', 403); staffId = body.staffId }
    if (!staffId) throw fail('Your account is not linked to a team member')
    if (data.numberOfDays === undefined) data.numberOfDays = await countDays(data.startTime, data.endTime)
    const row = await prisma.crmLeaveRequest.create({ data: { ...data, staffId, status: LEAVE_STATUS.PENDING } })
    // the people who can decide are told
    if (staffId === a.staffId) {
        const me = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true, email: true } })
        const text = `${me ? name(me) : 'A colleague'} asks for leave: ${dayStr(row.startTime)} → ${dayStr(row.endTime)}${row.numberOfDays ? ` (${row.numberOfDays} d)` : ''}`
        const admins = await prisma.crmStaff.findMany({ where: { active: true, admin: true, id: { not: staffId } }, select: { id: true } })
        for (const x of admins) {
            await prisma.crmNotification.create({ data: { toUserId: x.id, fromFullName: me ? name(me) : 'Leave', description: text.slice(0, 200), link: '/crm/leave-requests', additionalData: 'leave', isRead: false } }).catch(() => {})
            notifyNotice(x.id, { kind: 'calendar', title: row.subject || 'Leave request', link: '/crm/leave-requests', note: text })
        }
    }
    return { id: row.id }
}

async function load(id) {
    const r = oid(id) && (await prisma.crmLeaveRequest.findUnique({ where: { id } }))
    if (!r) throw fail('Leave request not found', 404)
    return r
}

export async function updateLeave(id, body = {}) {
    const session = await requirePermission('leave', 'view_own')
    const a = await who(session)
    const r = await load(id)
    const own = !!a.staffId && r.staffId === a.staffId
    const data = {}
    const wantsStatus = body.status !== undefined
    const fields = clean(body, true)
    const touchesFields = Object.keys(fields).length > 0
    if (touchesFields) {
        if (!(a.can('edit') || (own && (r.status ?? 0) === LEAVE_STATUS.PENDING))) throw fail('Forbidden', 403)
        Object.assign(data, fields)
        const s = data.startTime ?? r.startTime, e = data.endTime ?? r.endTime ?? s
        if (e < s) throw fail('The last day is before the first day')
        if ((fields.startTime !== undefined || fields.endTime !== undefined) && fields.numberOfDays === undefined) data.numberOfDays = await countDays(s, e)
        if (body.staffId !== undefined && oid(body.staffId) && a.can('edit')) data.staffId = body.staffId
    }
    if (body.staffId !== undefined && !touchesFields && oid(body.staffId)) { if (!a.can('edit')) throw fail('Forbidden', 403); data.staffId = body.staffId }
    let decided = null
    if (wantsStatus) {
        const st = Number(body.status)
        if (![0, 1, 2].includes(st)) throw fail('Unknown status')
        if (!(a.can('decide') || a.can('edit') || a.admin)) throw fail('Forbidden', 403)
        if (st !== (r.status ?? 0)) { data.status = st; data.decidedBy = a.staffId || null; data.decidedAt = st === 0 ? null : new Date(); decided = st }
    }
    if (!Object.keys(data).length) return { id: r.id }
    await prisma.crmLeaveRequest.update({ where: { id }, data })
    if (decided !== null && decided !== 0 && r.staffId && r.staffId !== a.staffId) {
        const by = a.staffId ? await prisma.crmStaff.findUnique({ where: { id: a.staffId }, select: { firstName: true, lastName: true, email: true } }) : null
        const text = `Your leave ${dayStr(r.startTime)} → ${dayStr(r.endTime)} was ${decided === 1 ? 'accepted' : 'refused'}`
        await prisma.crmNotification.create({ data: { toUserId: r.staffId, fromFullName: by ? name(by) : 'Leave', description: text, link: '/crm/leave-requests', additionalData: 'leave', isRead: false } }).catch(() => {})
        notifyNotice(r.staffId, { kind: 'calendar', title: r.subject || 'Leave request', link: '/crm/leave-requests', note: text })
    }
    return { id: r.id }
}

export async function deleteLeave(id) {
    const session = await requirePermission('leave', 'view_own')
    const a = await who(session)
    const r = await load(id)
    const own = !!a.staffId && r.staffId === a.staffId
    if (!(a.can('delete') || (own && (r.status ?? 0) === LEAVE_STATUS.PENDING))) throw fail('Forbidden', 403)
    await prisma.crmLeaveRequest.delete({ where: { id } })
    return { ok: true }
}

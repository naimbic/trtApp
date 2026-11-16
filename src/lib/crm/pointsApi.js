import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { realPicture } from '@/lib/crm/pictures'
import { pushToStaff } from '@/lib/crm/push'

/* Points for good work. Anyone allowed gives points on a message, a comment, a task or straight to a person; the rules give some by themselves
   (a task finished in time). Points are worth money (one setting) and are paid with the salary, in the Prime field of the payment. */

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const name = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const DEFAULTS = { value: 1, taskOnTime: 5, maxGive: 20, monthCap: 0 }
const OPT = { value: 'points_value', taskOnTime: 'points_task_on_time', maxGive: 'points_max_give', monthCap: 'points_month_cap' }
const num = (v, d, lo, hi) => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? d : Math.min(hi, Math.max(lo, n)) }

export async function pointSettings() {
    const rows = await prisma.crmOption.findMany({ where: { name: { in: Object.values(OPT) } } })
    const raw = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    return {
        value: num(raw[OPT.value], DEFAULTS.value, 0, 100000), // money for one point, in the base currency
        taskOnTime: Math.round(num(raw[OPT.taskOnTime], DEFAULTS.taskOnTime, 0, 1000)), // points for a task finished in time (0 = off)
        maxGive: Math.round(num(raw[OPT.maxGive], DEFAULTS.maxGive, 1, 10000)), // the most a person who is not a manager gives at once
        monthCap: Math.round(num(raw[OPT.monthCap], DEFAULTS.monthCap, 0, 1000000)), // the most points one person receives by hand in a month (0 = no limit)
    }
}

const caps = (authority) => ({ view: true, give: hasCap(authority, 'points', 'give') || hasCap(authority, 'points', 'manage_points'), manage: hasCap(authority, 'points', 'manage_points') })
const shape = (p, people) => ({ id: p.id, staffId: p.staffId, staff: people?.[p.staffId] || null, points: p.points, kind: p.kind, reason: p.reason || '', relType: p.relType || null, link: p.link || null, by: p.givenBy || '', at: p.createdAt, paid: !!p.paidAt, paidAt: p.paidAt })
// Mongo: a date never written is "not set", which is not the same as null
const UNPAID = { OR: [{ paidAt: null }, { paidAt: { isSet: false } }] }
const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))

/** The Points page: my points, my history, the ranking of the team and (for managers) what is owed. */
export async function pointsHome() {
    const session = await requirePermission(null)
    const authority = session.user.authority || []
    const can = caps(authority)
    const staffId = await getStaffId(session)
    const [cfg, staff, rows, base] = await Promise.all([
        pointSettings(),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true, jobTitle: true } }),
        prisma.crmPoint.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 }),
        prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { name: true, symbol: true } }),
    ])
    const people = Object.fromEntries(staff.map((s) => [s.id, { id: s.id, name: name(s), image: realPicture(s.profileImage), jobTitle: s.jobTitle || '' }]))
    const since = monthStart()
    const sum = (list) => list.reduce((n, p) => n + p.points, 0)
    const of = (id) => rows.filter((p) => p.staffId === id)
    const stat = (id) => { const mine = of(id); const unpaid = Math.max(0, sum(mine.filter((p) => !p.paidAt))); return { total: sum(mine), month: sum(mine.filter((p) => p.createdAt >= since)), unpaid, money: Math.round(unpaid * cfg.value * 100) / 100 } }
    const board = staff.map((s) => ({ ...people[s.id], ...stat(s.id) })).filter((r) => r.total !== 0 || r.month !== 0 || r.id === staffId).sort((a, b) => b.month - a.month || b.total - a.total)
    const seeAll = can.view || can.manage
    return {
        me: { staffId, ...(staffId ? stat(staffId) : { total: 0, month: 0, unpaid: 0, money: 0 }) },
        history: (staffId ? of(staffId) : []).slice(0, 60).map((p) => shape(p, people)),
        // the ranking shows points only; the money owed to each person is for managers
        board: board.map((r) => (can.manage ? r : { id: r.id, name: r.name, image: r.image, jobTitle: r.jobTitle, total: r.total, month: r.month })),
        feed: seeAll ? rows.slice(0, 40).map((p) => shape(p, people)) : [],
        people: can.give ? staff.filter((s) => s.id !== staffId || can.manage).map((s) => people[s.id]) : [],
        settings: cfg, currency: base?.symbol || base?.name || '', can,
    }
}

/** Give (or, for managers, remove) points. body: { staffIds | staffId, points, reason, relType, relId, link }. */
export async function givePoints(body = {}) {
    const session = await requirePermission(null)
    const can = caps(session.user.authority || [])
    if (!can.give) throw fail('You are not allowed to give points', 403)
    const me = await getStaffId(session)
    const cfg = await pointSettings()
    const points = Math.round(Number(body.points))
    if (!Number.isFinite(points) || points === 0) throw fail('Enter the number of points')
    if (points < 0 && !can.manage) throw fail('Only a manager of the points removes points', 403)
    if (!can.manage && points > cfg.maxGive) throw fail(`You can give ${cfg.maxGive} points at most at once`)
    if (Math.abs(points) > 100000) throw fail('That is too many points')
    const reason = String(body.reason || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (points < 0 && !reason) throw fail('Say why the points are removed')
    const ids = [...new Set((Array.isArray(body.staffIds) ? body.staffIds : [body.staffId]).map(oid).filter(Boolean))]
    if (!ids.length) throw fail('Choose who gets the points')
    if (!can.manage && ids.includes(me)) throw fail('You cannot give points to yourself', 403)
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } })
    if (staff.length !== ids.length) throw fail('Member not found', 404)
    const relType = String(body.relType || '').slice(0, 30) || null, relId = String(body.relId || '').slice(0, 60) || null
    const link = /^\/[a-z0-9/_?=&.-]*$/i.test(String(body.link || '')) ? String(body.link).slice(0, 200) : null
    const since = monthStart()
    const out = []
    for (const staffId of ids) {
        if (!can.manage && relId) { // the same person does not reward the same thing twice
            const again = await prisma.crmPoint.findFirst({ where: { staffId, givenById: me, relType, relId, kind: 'manual' }, select: { id: true } })
            if (again) throw fail('You already gave points for this')
        }
        if (points > 0 && cfg.monthCap > 0 && !can.manage) {
            const got = (await prisma.crmPoint.aggregate({ where: { staffId, kind: 'manual', points: { gt: 0 }, createdAt: { gte: since } }, _sum: { points: true } }))._sum.points || 0
            if (got + points > cfg.monthCap) throw fail(`This person already reached the limit of ${cfg.monthCap} points for this month`)
        }
        const row = await prisma.crmPoint.create({ data: { staffId, points, kind: 'manual', reason: reason || null, relType, relId, link, givenById: me || null, givenBy: session.user.name || null } })
        out.push(row.id)
        await tell(staffId, points, reason, session.user.name, me)
    }
    return { success: true, ids: out }
}

async function tell(staffId, points, reason, byName, byId) {
    if (staffId === byId) return
    const text = `${points > 0 ? `⭐ +${points}` : `➖ ${points}`} ${Math.abs(points) === 1 ? 'point' : 'points'}${reason ? `: ${reason}` : ''}`.slice(0, 200)
    try { await prisma.crmNotification.create({ data: { toUserId: staffId, fromUserId: byId || undefined, fromFullName: byName || 'Points', description: text, link: '/crm/points', additionalData: 'growth', isRead: false } }) } catch { /* the points are kept even when the bell fails */ }
    try { await pushToStaff(staffId, { title: byName || 'Points', body: text, url: '/crm/points' }) } catch { /* same */ }
}

/** A manager takes back an entry that was not paid yet. */
export async function deletePoint(id) {
    await requirePermission('points', 'manage_points')
    const p = oid(id) ? await prisma.crmPoint.findUnique({ where: { id } }) : null
    if (!p) throw fail('Not found', 404)
    if (p.paidAt) throw fail('These points were already paid')
    await prisma.crmPoint.delete({ where: { id } })
    return { success: true }
}

export async function savePointSettings(body = {}) {
    await requirePermission('points', 'manage_points')
    const next = { value: num(body.value, DEFAULTS.value, 0, 100000), taskOnTime: Math.round(num(body.taskOnTime, DEFAULTS.taskOnTime, 0, 1000)), maxGive: Math.round(num(body.maxGive, DEFAULTS.maxGive, 1, 10000)), monthCap: Math.round(num(body.monthCap, DEFAULTS.monthCap, 0, 1000000)) }
    for (const [k, v] of Object.entries(next)) {
        const row = await prisma.crmOption.findUnique({ where: { name: OPT[k] } })
        if (row) await prisma.crmOption.update({ where: { name: OPT[k] }, data: { value: String(v) } })
        else await prisma.crmOption.create({ data: { name: OPT[k], value: String(v) } })
    }
    return pointSettings()
}

/** What a member is owed for their points (for the Prime field of a salary payment). Payroll people only. */
export async function unpaidPoints(staffId) {
    await requirePermission('payroll', 'view')
    if (!oid(staffId)) return { points: 0, amount: 0, value: 0 }
    const cfg = await pointSettings()
    const points = Math.max(0, (await prisma.crmPoint.aggregate({ where: { staffId, ...UNPAID }, _sum: { points: true } }))._sum.points || 0)
    return { points, amount: Math.round(points * cfg.value * 100) / 100, value: cfg.value }
}

/** The points of a member were paid with this payment (called by the payroll when the prime is recorded). */
export async function markPointsPaid(staffId, paymentId) {
    const cfg = await pointSettings()
    const r = await prisma.crmPoint.updateMany({ where: { staffId, ...UNPAID }, data: { paidAt: new Date(), paymentId: paymentId || null, value: cfg.value } })
    return r.count
}

/** The rule: a task finished on or before its due date gives points to each person it is assigned to, once per task. Never throws. */
export async function awardTaskOnTime(taskId) {
    try {
        const cfg = await pointSettings()
        if (!cfg.taskOnTime) return
        const t = await prisma.crmTask.findUnique({ where: { id: taskId }, select: { id: true, name: true, status: true, dueDate: true, dateFinished: true, assignees: { select: { staffId: true } } } })
        if (!t || t.status !== 5 || !t.dueDate || !t.dateFinished) return
        const end = new Date(t.dueDate); end.setUTCHours(23, 59, 59, 999)
        if (+new Date(t.dateFinished) > +end) return
        for (const { staffId } of t.assignees) {
            if (await prisma.crmPoint.findFirst({ where: { staffId, kind: 'task_on_time', relId: t.id }, select: { id: true } })) continue
            await prisma.crmPoint.create({ data: { staffId, points: cfg.taskOnTime, kind: 'task_on_time', reason: `Task finished in time: ${t.name || ''}`.slice(0, 300), relType: 'task', relId: t.id, link: `/crm/tasks/${t.id}`, givenBy: 'Automatic' } })
            await tell(staffId, cfg.taskOnTime, `Task finished in time: ${t.name || ''}`, 'Points', null)
        }
    } catch (e) { console.error('[points] task in time', e?.message) }
}

/** id -> { month, total } of the points of every member (the profile card on the avatars). */
export async function pointsByStaff() {
    const [all, month] = await Promise.all([
        prisma.crmPoint.groupBy({ by: ['staffId'], _sum: { points: true } }),
        prisma.crmPoint.groupBy({ by: ['staffId'], where: { createdAt: { gte: monthStart() } }, _sum: { points: true } }),
    ])
    const out = {}
    for (const r of all) out[r.staffId] = { total: r._sum.points || 0, month: 0 }
    for (const r of month) (out[r.staffId] ||= { total: 0, month: 0 }).month = r._sum.points || 0
    return out
}

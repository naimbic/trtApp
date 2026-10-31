import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, isCrmAdmin, hasCap } from '@/lib/crm/permissions'
import { CATALOG, PLAYBOOKS } from '@/lib/crm/growthCatalog'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
export const KINDS = ['certification', 'language', 'course', 'skill']
export const GOAL_STATUSES = ['planned', 'learning', 'passed', 'failed', 'dropped']
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

async function gate() {
    const session = await requirePermission('growth', 'view')
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Only team members have a growth plan', 403)
    return { authority, staffId, name: session.user.name || session.user.email, seeAll: isCrmAdmin(authority) || hasCap(authority, 'grow', 'view'), manage: isCrmAdmin(authority) || hasCap(authority, 'grow', 'edit'), remove: isCrmAdmin(authority) || hasCap(authority, 'grow', 'delete') }
}

const notify = (toIds, description, link, byName, byId) => Promise.all([...new Set(toIds.filter(Boolean))].map((to) => prisma.crmNotification.create({ data: { toUserId: to, fromUserId: byId || undefined, fromFullName: byName || null, description: description.slice(0, 200), link, additionalData: 'growth', isRead: false } }).catch(() => {})))
const adminIds = async () => (await prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true } })).map((s) => s.id)
const money = (n) => (n == null || n === '' ? null : Math.max(0, Number(n)))

/** The catalog is for everyone; the admin playbook and the admin checklists only for who sees Grow. */
export async function getGrowth() {
    const g = await gate()
    const cur = await prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { name: true } }).catch(() => null)
    const { admin, daily, weekly, monthly, ...team } = PLAYBOOKS
    return { catalog: CATALOG, playbook: { team: team.team, checklists: { daily, weekly, monthly }, ...(g.seeAll ? { admin } : {}) }, currency: cur?.name || 'MAD', can: { all: g.seeAll, manage: g.manage, remove: g.remove } }
}

const shape = (r, people, files) => ({ id: r.id, staffId: r.staffId, staffName: people[r.staffId] || '', kind: r.kind, title: r.title, provider: r.provider || '', catalogKey: r.catalogKey || null, url: r.url || '', status: r.status, targetDate: r.targetDate, doneDate: r.doneDate, note: r.note || '', supportAmount: r.supportAmount, primeAmount: r.primeAmount, primePaid: r.primePaid, primePaidAt: r.primePaidAt, approved: r.approved, files: files[r.id] || 0, createdAt: r.createdAt })

async function load(rows) {
    const ids = rows.map((r) => r.id)
    const [staff, media] = await Promise.all([
        prisma.crmStaff.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.staffId))] } }, select: { id: true, firstName: true, lastName: true, email: true } }),
        ids.length ? prisma.crmMedia.groupBy({ by: ['relId'], where: { relType: 'skillgoal', relId: { in: ids } }, _count: { _all: true } }) : [],
    ])
    return rows.map((r) => shape(r, Object.fromEntries(staff.map((s) => [s.id, staffName(s)])), Object.fromEntries(media.map((m) => [m.relId, m._count._all]))))
}

/** My goals; with all=1 (Grow viewers only) everybody's, optionally one person's. */
export async function listGoals({ all, staffId } = {}) {
    const g = await gate()
    let where = { staffId: g.staffId }
    if (all) { if (!g.seeAll) throw fail('You are not allowed to see the goals of the team', 403); where = oid(staffId) ? { staffId } : {} }
    const rows = await prisma.crmSkillGoal.findMany({ where, orderBy: [{ updatedAt: 'desc' }], take: 1000 })
    return { list: await load(rows), can: { all: g.seeAll, manage: g.manage, remove: g.remove } }
}

const date = (v) => { if (v === null || v === '' || v === undefined) return null; const d = new Date(v); if (Number.isNaN(+d)) throw fail('The date is not valid'); return d }

export async function saveGoal(id, body = {}) {
    const g = await gate()
    const cur = id ? (oid(id) && (await prisma.crmSkillGoal.findUnique({ where: { id } }))) : null
    if (id && !cur) throw fail('Goal not found', 404)
    const owner = cur ? cur.staffId : (g.manage && oid(body.staffId)) || g.staffId
    if (cur && cur.staffId !== g.staffId && !g.manage) throw fail('This is not your goal', 403)
    if (!cur && owner !== g.staffId && !g.manage) throw fail('You can only add goals for yourself', 403)
    const data = {}
    if (!cur || body.title !== undefined) { const t = String(body.title || '').trim(); if (!t) throw fail('Give the goal a title'); data.title = t.slice(0, 200) }
    if (body.kind !== undefined || !cur) { if (!KINDS.includes(body.kind || 'certification')) throw fail('Unknown kind'); data.kind = body.kind || 'certification' }
    if (body.status !== undefined) { if (!GOAL_STATUSES.includes(body.status)) throw fail('Unknown status'); data.status = body.status }
    if (body.provider !== undefined) data.provider = String(body.provider || '').slice(0, 120) || null
    if (body.url !== undefined) { const u = String(body.url || '').trim(); if (u && !/^https?:\/\//i.test(u)) throw fail('The link must start with http:// or https://'); data.url = u || null }
    if (body.note !== undefined) data.note = String(body.note || '').slice(0, 2000) || null
    if (body.catalogKey !== undefined) data.catalogKey = String(body.catalogKey || '').slice(0, 80) || null
    if (body.targetDate !== undefined) data.targetDate = date(body.targetDate)
    if (body.doneDate !== undefined) data.doneDate = date(body.doneDate)
    if (g.manage) {
        if (body.supportAmount !== undefined) data.supportAmount = money(body.supportAmount)
        if (body.primeAmount !== undefined) data.primeAmount = money(body.primeAmount)
        if (body.approved !== undefined) { data.approved = !!body.approved; data.approvedBy = body.approved ? g.staffId : null }
        if (body.primePaid !== undefined) { data.primePaid = !!body.primePaid; data.primePaidAt = body.primePaid ? new Date() : null }
    }
    const status = data.status || cur?.status || 'planned'
    if (status === 'passed' && !(data.doneDate ?? cur?.doneDate)) data.doneDate = new Date()
    if (data.primePaid && status !== 'passed') throw fail('A prime is paid only for a passed goal')
    if (cur && cur.approved && cur.staffId === g.staffId && !g.manage && data.title && data.title !== cur.title) throw fail('An approved goal cannot be renamed: ask a manager')
    let row
    if (cur) row = await prisma.crmSkillGoal.update({ where: { id }, data })
    else row = await prisma.crmSkillGoal.create({ data: { ...data, staffId: owner, createdBy: g.staffId } })
    const link = `/crm/my-growth?tab=${owner === g.staffId ? 'goals' : 'team'}`
    if (!cur && owner === g.staffId) await notify((await adminIds()).filter((x) => x !== g.staffId), `${g.name} plans: ${row.title}`, '/crm/my-growth?tab=team', g.name, g.staffId)
    if (cur && data.status === 'passed' && cur.status !== 'passed') await notify((await adminIds()).filter((x) => x !== g.staffId), `${staffName(await prisma.crmStaff.findUnique({ where: { id: owner }, select: { firstName: true, lastName: true, email: true } }))} passed: ${row.title}${row.primeAmount && !row.primePaid ? ' (prime to pay)' : ''}`, '/crm/my-growth?tab=team', g.name, g.staffId)
    if (cur && owner !== g.staffId) {
        if (data.approved === true && !cur.approved) await notify([owner], `Approved: ${row.title}${row.supportAmount ? ' (the company supports the cost)' : ''}`, link, g.name, g.staffId)
        if (data.primePaid === true && !cur.primePaid) await notify([owner], `Your prime is paid: ${row.title}`, link, g.name, g.staffId)
    }
    return { success: true, id: row.id }
}

export async function deleteGoal(id) {
    const g = await gate()
    const cur = oid(id) && (await prisma.crmSkillGoal.findUnique({ where: { id } }))
    if (!cur) throw fail('Goal not found', 404)
    const mine = cur.staffId === g.staffId && !cur.approved && cur.status !== 'passed'
    if (!mine && !g.remove) throw fail('You cannot delete this goal', 403)
    await prisma.crmSkillGoal.delete({ where: { id } })
    return { success: true }
}

/** One line per member: where they are, what is owed. Grow viewers only. */
export async function teamSkills() {
    const g = await gate()
    if (!g.seeAll) throw fail('You are not allowed to see the team', 403)
    const [staff, goals] = await Promise.all([prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, admin: true } }), prisma.crmSkillGoal.findMany({ select: { staffId: true, status: true, primeAmount: true, primePaid: true, supportAmount: true, approved: true, doneDate: true } })])
    const year = new Date().getUTCFullYear()
    const rows = staff.map((s) => {
        const mine = goals.filter((x) => x.staffId === s.id)
        const passed = mine.filter((x) => x.status === 'passed')
        return { id: s.id, name: staffName(s), admin: !!s.admin, planned: mine.filter((x) => x.status === 'planned').length, learning: mine.filter((x) => x.status === 'learning').length, passed: passed.length, passedThisYear: passed.filter((x) => x.doneDate && new Date(x.doneDate).getUTCFullYear() === year).length, toApprove: mine.filter((x) => !x.approved && ['planned', 'learning'].includes(x.status)).length, primeOwed: passed.filter((x) => x.primeAmount && !x.primePaid).reduce((a, x) => a + x.primeAmount, 0), primePaid: passed.filter((x) => x.primePaid).reduce((a, x) => a + (x.primeAmount || 0), 0), support: mine.filter((x) => x.approved).reduce((a, x) => a + (x.supportAmount || 0), 0) }
    }).sort((a, b) => b.passed - a.passed || b.learning - a.learning)
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0)
    return { list: rows, totals: { learning: sum('learning'), planned: sum('planned'), passed: sum('passed'), passedThisYear: sum('passedThisYear'), toApprove: sum('toApprove'), primeOwed: sum('primeOwed'), primePaid: sum('primePaid'), support: sum('support'), withoutGoal: rows.filter((r) => !r.admin && !r.planned && !r.learning).length }, can: { manage: g.manage } }
}

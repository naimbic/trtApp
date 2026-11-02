import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, isCrmAdmin, hasCap } from '@/lib/crm/permissions'
import { CATALOG, PLAYBOOKS } from '@/lib/crm/growthCatalog'
import { evaluate, catalogInfo, LEVELS } from '@/lib/crm/growthRewards'
import { readSettings } from '@/lib/crm/appSettings'
import { config as primeConfig, primeOfMonth, trophyRoom, certKey, monthOf } from '@/lib/crm/growthPrimes'

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
    return { authority, staffId, name: session.user.name || session.user.email, seeAll: isCrmAdmin(authority) || hasCap(authority, 'grow', 'view') || hasCap(authority, 'growth', 'view_team') || hasCap(authority, 'growth', 'manage'), manage: isCrmAdmin(authority) || hasCap(authority, 'grow', 'edit') || hasCap(authority, 'growth', 'manage'), remove: isCrmAdmin(authority) || hasCap(authority, 'grow', 'delete') }
}

const notify = (toIds, description, link, byName, byId) => Promise.all([...new Set(toIds.filter(Boolean))].map((to) => prisma.crmNotification.create({ data: { toUserId: to, fromUserId: byId || undefined, fromFullName: byName || null, description: description.slice(0, 200), link, additionalData: 'growth', isRead: false } }).catch(() => {})))
const adminIds = async () => (await prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true } })).map((s) => s.id)
const money = (n) => (n == null || n === '' ? null : Math.max(0, Number(n)))


/* ---------------------------------------------------------------- points, levels, trophies */
async function goalsWithFiles(where) {
    const rows = await prisma.crmSkillGoal.findMany({ where, take: 5000 })
    const media = rows.length ? await prisma.crmMedia.groupBy({ by: ['relId'], where: { relType: 'skillgoal', relId: { in: rows.map((r) => r.id) } }, _count: { _all: true } }) : []
    const files = Object.fromEntries(media.map((m) => [m.relId, m._count._all]))
    return rows.map((r) => ({ ...r, files: files[r.id] || 0 }))
}

const nameOf = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

/* ---------------------------------------------------------------- the monthly prime (the money is decided here, never in the browser) */
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const monthNow = () => new Date().toISOString().slice(0, 7)
const monthBefore = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7) }
async function primeCfg() {
    const S = await readSettings(['grow_prime_cap', 'grow_prime_tier1', 'grow_prime_tier2_from', 'grow_prime_tier2', 'grow_prime_max_count', 'grow_prime_min_days'])
    return primeConfig({ cap: S.get('grow_prime_cap'), tier1: S.get('grow_prime_tier1'), tier2From: S.get('grow_prime_tier2_from'), tier2: S.get('grow_prime_tier2'), maxCount: S.get('grow_prime_max_count'), minDays: S.get('grow_prime_min_days') })
}
/** Trophy prizes paid to one person during a month. */
const trophiesPaidIn = (rows, staffId, month) => rows.filter((t) => t.staffId === staffId && t.paid && t.paidAt && monthOf(t.paidAt) === month).reduce((a, t) => a + (t.prize || 0), 0)
/** The prime of one person for one month, from their goals, the settings and what was already paid. */
async function primeFor(staffId, month, cfg, { goals, ledger, trophies } = {}) {
    const [g, rec, tr] = await Promise.all([goals || goalsWithFiles({ staffId }), ledger !== undefined ? ledger : prisma.crmGrowPrime.findUnique({ where: { staffId_month: { staffId, month } } }), trophies || prisma.crmTrophy.findMany({ where: { staffId, paid: true } })])
    return primeOfMonth(g, month, { cfg, paid: rec?.paidAmount || 0, trophiesPaid: trophiesPaidIn(tr, staffId, month) })
}

/** Awards the trophies a person has earned and does not hold yet (once each), tells them and the administrators, and returns the whole picture. */
export async function syncTrophies(staffId) {
    const ev = evaluate(await goalsWithFiles({ staffId }))
    const have = await prisma.crmTrophy.findMany({ where: { staffId } })
    const held = new Set(have.map((h) => h.key))
    const fresh = ev.trophies.filter((t) => t.earned && !held.has(t.key))
    if (fresh.length) {
        const me = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true, email: true } })
        const admins = (await prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true } })).map((a) => a.id)
        for (const t of fresh) {
            try { await prisma.crmTrophy.create({ data: { staffId, key: t.key, prize: t.prize } }) } catch { continue } // won twice at once: the second one is ignored
            await notify([staffId], `🏆 Trophy unlocked: ${t.label}${t.prize ? ` · prize ${t.prize} MAD` : ''}`, '/crm/my-growth?tab=trophies', 'Grow', null)
            if (t.prize) await notify(admins.filter((x) => x !== staffId), `🏆 ${nameOf(me)} won “${t.label}”: prize ${t.prize} MAD to pay`, '/crm/my-growth?tab=team', 'Grow', null)
        }
    }
    const rows = fresh.length ? await prisma.crmTrophy.findMany({ where: { staffId } }) : have
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    return { ...ev, trophies: ev.trophies.map((t) => ({ ...t, id: byKey[t.key]?.id || null, awardedAt: byKey[t.key]?.awardedAt || null, paid: !!byKey[t.key]?.paid, paidAt: byKey[t.key]?.paidAt || null })) }
}

/** Everybody's points, for the hall of fame (no money). */
async function hallOfFame(limit = 10) {
    const [staff, goals] = await Promise.all([prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }), goalsWithFiles({})])
    const by = {}; for (const g of goals) (by[g.staffId] ||= []).push(g)
    return staff.map((s) => { const e = evaluate(by[s.id] || []); return { id: s.id, name: nameOf(s), image: s.profileImage || null, points: e.points, level: e.level.label, levelKey: e.level.key, trophies: e.trophies.filter((t) => t.earned).length, passed: e.passed } }).filter((r) => r.points > 0).sort((a, b) => b.points - a.points || b.trophies - a.trophies).slice(0, limit)
}

/** The picture of one person for a profile page: their own, or anybody's for who sees Grow or the team. Money only for the person and for Grow viewers. */
export async function growthProfile({ staffId } = {}) {
    const g = await gate()
    const id = oid(staffId) || g.staffId
    const own = id === g.staffId
    if (!own && !g.seeAll && !hasCap(g.authority, 'staff', 'view')) throw fail('You are not allowed to see this', 403)
    const rewards = await syncTrophies(id)
    const money = own || g.seeAll
    const recent = (await prisma.crmSkillGoal.findMany({ where: { staffId: id, status: 'passed' }, orderBy: { doneDate: 'desc' }, take: 5 })).map((r) => ({ id: r.id, title: r.title, doneDate: r.doneDate, kind: r.kind }))
    return { ...rewards, trophies: rewards.trophies.map((t) => (money ? t : { ...t, prize: 0, paid: false })), recent, money, own }
}

/** A manager marks a trophy prize as paid (or not). */
export async function payTrophy(id, paid = true) {
    const g = await gate()
    if (!g.manage) throw fail('You are not allowed to do this', 403)
    const cur = oid(id) && (await prisma.crmTrophy.findUnique({ where: { id } }))
    if (!cur) throw fail('Trophy not found', 404)
    if (paid && !cur.paid && cur.prize) {
        // nobody pays their own prize, and nobody earns more than the monthly ceiling (the prime and the prizes together)
        if (cur.staffId === g.staffId) throw fail('Another manager has to pay your prize', 403)
        const cfg = await primeCfg(), month = monthNow()
        const [rec, won] = await Promise.all([prisma.crmGrowPrime.findUnique({ where: { staffId_month: { staffId: cur.staffId, month } } }), prisma.crmTrophy.findMany({ where: { staffId: cur.staffId, paid: true } })])
        const room = trophyRoom({ cfg, primePaid: rec?.paidAmount || 0, trophiesPaid: trophiesPaidIn(won, cur.staffId, month) })
        if (room < cur.prize) throw fail(`Monthly ceiling: nobody earns more than ${cfg.cap} MAD in a month. ${room} MAD are left this month: pay this prize next month.`, 409)
    }
    await prisma.crmTrophy.update({ where: { id }, data: { paid: !!paid, paidAt: paid ? new Date() : null, paidBy: paid ? g.staffId : null } })
    if (paid && !cur.paid && cur.prize) await notify([cur.staffId], `Your trophy prize is paid: ${cur.prize} MAD`, '/crm/my-growth?tab=trophies', g.name, g.staffId)
    return { success: true }
}

/** The catalog is for everyone; the admin playbook and the admin checklists only for who sees Grow. */
export async function getGrowth() {
    const g = await gate()
    const cur = await prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { name: true } }).catch(() => null)
    const { admin, daily, weekly, monthly, ...team } = PLAYBOOKS
    const [me0, board] = await Promise.all([syncTrophies(g.staffId), hallOfFame()])
    const me = { ...me0, staffId: g.staffId }
    const cfg = await primeCfg()
    const prime = await primeFor(g.staffId, monthNow(), cfg)
    return { me, board, levels: LEVELS, prime, primeRules: cfg, catalog: CATALOG, playbook: { team: team.team, checklists: { daily, weekly, monthly }, ...(g.seeAll ? { admin } : {}) }, currency: cur?.name || 'MAD', can: { all: g.seeAll, manage: g.manage, remove: g.remove } }
}

const shape = (r, people, files) => ({ id: r.id, staffId: r.staffId, staffName: people[r.staffId] || '', kind: r.kind, title: r.title, provider: r.provider || '', catalogKey: r.catalogKey || null, url: r.url || '', status: r.status, targetDate: r.targetDate, doneDate: r.doneDate, note: r.note || '', supportAmount: r.supportAmount, approved: r.approved, approvedAt: r.approvedAt, passedAt: r.passedAt, verified: !!r.verified, verifiedAt: r.verifiedAt, files: files[r.id] || 0, createdAt: r.createdAt })

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
    // a verified goal is what the money was decided on: the member cannot change it, and a manager must take the verification off first
    if (cur?.verified && (owner === g.staffId || !g.manage)) throw fail('A verified goal cannot be changed', 403)
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
        if (body.approved !== undefined && !!body.approved !== !!cur?.approved) {
            // nobody approves their own goal: another manager does
            if (owner === g.staffId) throw fail('Another manager has to approve your goal', 403)
            if (!body.approved && cur?.verified) throw fail('Take the verification off first', 409)
            data.approved = !!body.approved; data.approvedBy = body.approved ? g.staffId : null; data.approvedAt = body.approved ? new Date() : null
        }
        if (body.verified !== undefined && !!body.verified !== !!cur?.verified) {
            if (!cur) throw fail('Save the goal first')
            if (owner === g.staffId) throw fail('Another manager has to verify your certificate', 403)
            if (body.verified) {
                const files = await prisma.crmMedia.count({ where: { relType: 'skillgoal', relId: id, isFolder: false } })
                if ((data.status || cur.status) !== 'passed') throw fail('Only a passed goal can be verified', 409)
                if (!(data.approved ?? cur.approved)) throw fail('Approve the goal first', 409)
                if (!files) throw fail('Attach the certificate or the proof before verifying', 409)
                // the same certificate (or the same credential link) cannot be verified twice for the same person, nor a link for two people
                const others = await prisma.crmSkillGoal.findMany({ where: { verified: true, NOT: { id } }, select: { staffId: true, url: true, title: true, provider: true, catalogKey: true } })
                const link = String(data.url ?? cur.url ?? '').trim().toLowerCase()
                if (link && others.some((o) => String(o.url || '').trim().toLowerCase() === link)) throw fail('This credential link is already used by another verified goal', 409)
                if (others.some((o) => o.staffId === owner && certKey(o) === certKey({ ...cur, ...data }))) throw fail('This certificate was already verified for this person', 409)
                data.verified = true; data.verifiedAt = new Date(); data.verifiedBy = g.staffId
            } else {
                // once a month with this goal was paid, the verification stays
                if (await prisma.crmGrowPrime.findFirst({ where: { staffId: owner, goalIds: { has: id } }, select: { id: true } })) throw fail('A prime was already paid with this goal: its verification stays', 409)
                data.verified = false; data.verifiedAt = null; data.verifiedBy = null
            }
        }
    }
    if (cur?.verified && !(body.verified === false && g.manage)) {
        const changed = (data.status && data.status !== 'passed') || (data.kind && data.kind !== cur.kind) || (data.catalogKey !== undefined && data.catalogKey !== cur.catalogKey) || (data.title && data.title !== cur.title) || (data.provider !== undefined && data.provider !== cur.provider)
        if (changed) throw fail('Take the verification off before changing what the certificate is', 409)
    }
    const status = data.status || cur?.status || 'planned'
    if (status === 'passed' && !(data.doneDate ?? cur?.doneDate)) data.doneDate = new Date()
    // the day a goal first becomes "passed" is the server's, not a typed date: the month of the prime cannot be moved
    if (status === 'passed' && !cur?.passedAt) data.passedAt = new Date()
    if (cur && cur.approved && cur.staffId === g.staffId && !g.manage && data.title && data.title !== cur.title) throw fail('An approved goal cannot be renamed: ask a manager')
    let row
    if (cur) row = await prisma.crmSkillGoal.update({ where: { id }, data })
    else row = await prisma.crmSkillGoal.create({ data: { ...data, staffId: owner, createdBy: g.staffId } })
    await syncTrophies(owner).catch(() => {})
    const link = `/crm/my-growth?tab=${owner === g.staffId ? 'goals' : 'team'}`
    if (!cur && owner === g.staffId) await notify((await adminIds()).filter((x) => x !== g.staffId), `${g.name} plans: ${row.title}`, '/crm/my-growth?tab=team', g.name, g.staffId)
    if (cur && data.status === 'passed' && cur.status !== 'passed') await notify((await adminIds()).filter((x) => x !== g.staffId), `${staffName(await prisma.crmStaff.findUnique({ where: { id: owner }, select: { firstName: true, lastName: true, email: true } }))} passed: ${row.title}${row.primeAmount && !row.primePaid ? ' (prime to pay)' : ''}`, '/crm/my-growth?tab=team', g.name, g.staffId)
    if (cur && owner !== g.staffId) {
        if (data.approved === true && !cur.approved) await notify([owner], `Approved: ${row.title}${row.supportAmount ? ' (the company supports the cost)' : ''}`, link, g.name, g.staffId)
        if (data.verified === true && !cur.verified) await notify([owner], `Your certificate is verified: ${row.title}. It counts for this month's prime.`, link, g.name, g.staffId)
    }
    return { success: true, id: row.id }
}

export async function deleteGoal(id) {
    const g = await gate()
    const cur = oid(id) && (await prisma.crmSkillGoal.findUnique({ where: { id } }))
    if (!cur) throw fail('Goal not found', 404)
    if (cur.verified) throw fail('A verified goal cannot be deleted: take the verification off first', 409)
    const mine = cur.staffId === g.staffId && !cur.approved && cur.status !== 'passed'
    if (!mine && !g.remove) throw fail('You cannot delete this goal', 403)
    await prisma.crmSkillGoal.delete({ where: { id } })
    return { success: true }
}

/** One line per member: where they are, what is owed. Grow viewers only. */
export async function teamSkills() {
    const g = await gate()
    if (!g.seeAll) throw fail('You are not allowed to see the team', 403)
    const [staff, goals, trophyRows, allGoals, ledger, cfg] = await Promise.all([prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, admin: true } }), prisma.crmSkillGoal.findMany({ select: { staffId: true, status: true, supportAmount: true, approved: true, doneDate: true } }), prisma.crmTrophy.findMany({ orderBy: { awardedAt: 'desc' } }), goalsWithFiles({}), prisma.crmGrowPrime.findMany({}), primeCfg()])
    const year = new Date().getUTCFullYear()
    const now = monthNow(), before = monthBefore(now)
    const toPay = []
    const rows = staff.map((s) => {
        const mine = goals.filter((x) => x.staffId === s.id)
        const passed = mine.filter((x) => x.status === 'passed')
        const own = allGoals.filter((x) => x.staffId === s.id)
        const ev = evaluate(own), won = trophyRows.filter((t) => t.staffId === s.id)
        const months = [before, now].map((m) => { const rec = ledger.find((l) => l.staffId === s.id && l.month === m); return primeOfMonth(own, m, { cfg, paid: rec?.paidAmount || 0, trophiesPaid: trophiesPaidIn(trophyRows, s.id, m) }) })
        for (const r of months) if (r.due > 0) toPay.push({ staffId: s.id, staffName: staffName(s), month: r.month, count: r.count, amount: r.amount, paid: r.paid, due: r.due, goals: own.filter((x) => r.counted.includes(x.id)).map((x) => x.title) })
        const cur = months[1]
        return { id: s.id, name: staffName(s), admin: !!s.admin, points: ev.points, level: ev.level.label, trophies: won.length, trophyOwed: won.filter((t) => !t.paid).reduce((a2, t) => a2 + (t.prize || 0), 0), planned: mine.filter((x) => x.status === 'planned').length, learning: mine.filter((x) => x.status === 'learning').length, passed: passed.length, passedThisYear: passed.filter((x) => x.doneDate && new Date(x.doneDate).getUTCFullYear() === year).length, toApprove: mine.filter((x) => !x.approved && ['planned', 'learning'].includes(x.status)).length, primeOwed: months.reduce((a, r) => a + r.due, 0), primePaid: cur.paid, primeCount: cur.count, support: mine.filter((x) => x.approved).reduce((a, x) => a + (x.supportAmount || 0), 0) }
    }).sort((a, b) => b.points - a.points || b.passed - a.passed || b.learning - a.learning)
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0)
    const names = Object.fromEntries(staff.map((x) => [x.id, staffName(x)]))
    const labels = Object.fromEntries(evaluate([]).trophies.map((t) => [t.key, t.label]))
    const trophiesOwed = trophyRows.filter((t) => !t.paid && t.prize > 0 && names[t.staffId]).map((t) => ({ id: t.id, staffId: t.staffId, staffName: names[t.staffId], key: t.key, label: labels[t.key] || t.key, prize: t.prize, awardedAt: t.awardedAt }))
    return { list: rows, trophiesOwed, primesToPay: toPay, totals: { trophyOwed: sum('trophyOwed'), points: sum('points'), learning: sum('learning'), planned: sum('planned'), passed: sum('passed'), passedThisYear: sum('passedThisYear'), toApprove: sum('toApprove'), primeOwed: sum('primeOwed'), primePaid: sum('primePaid'), support: sum('support'), withoutGoal: rows.filter((r) => !r.admin && !r.planned && !r.learning).length }, cfg, month: now, can: { manage: g.manage } }
}

/** A manager pays the prime of one member for one month. The amount is worked out here from the goals and the settings, never taken from the screen. */
export async function payPrime({ staffId, month } = {}) {
    const g = await gate()
    if (!g.manage) throw fail('You are not allowed to do this', 403)
    if (!oid(staffId) || !(await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { id: true } }))) throw fail('Member not found', 404)
    if (!MONTH.test(String(month || ''))) throw fail('Choose a month (YYYY-MM)')
    if (month > monthNow()) throw fail('This month has not started: nothing to pay yet', 409)
    if (staffId === g.staffId) throw fail('Another manager has to pay your prime', 403)
    const cfg = await primeCfg()
    const rec = await prisma.crmGrowPrime.findUnique({ where: { staffId_month: { staffId, month } } })
    const r = await primeFor(staffId, month, cfg, { ledger: rec })
    if (r.due <= 0) throw fail('Nothing to pay for this month', 409)
    try {
        if (rec) { const u = await prisma.crmGrowPrime.updateMany({ where: { id: rec.id, paidAmount: rec.paidAmount }, data: { paidAmount: r.amount, amount: r.amount, count: r.count, goalIds: r.counted, paidAt: new Date(), paidBy: g.staffId } }); if (!u.count) throw fail('Someone just paid it: reload the page', 409) } else await prisma.crmGrowPrime.create({ data: { staffId, month, paidAmount: r.amount, amount: r.amount, count: r.count, goalIds: r.counted, paidAt: new Date(), paidBy: g.staffId } })
    } catch (e) { if (e.status) throw e; throw fail('This month was just paid: reload the page', 409) } // the unique (member, month) row stops a second payment at the same time
    await notify([staffId], `Your prime for ${month} is paid: ${r.due} MAD (${r.count} certificate${r.count > 1 ? 's' : ''})`, '/crm/my-growth?tab=goals', g.name, g.staffId)
    return { success: true, paid: r.due, total: r.amount, count: r.count }
}

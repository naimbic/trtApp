// The monthly prime for certificates: figures in, money out. No database, no clock of its own: tested on its own.
//
// The rule (the amounts are settings): in one calendar month a member who gets 1 or 2 verified certificates earns 200 MAD,
// 3 to 5 earn 500 MAD, and nobody earns more than 500 MAD in a month (the prime and the trophy prizes together).
// Only what a manager verified counts, and the month is the month of that verification, taken from the server clock:
// a date typed by the member never moves a certificate from one month to another.

export const DEFAULTS = { cap: 500, tier1: 200, tier2From: 3, tier2: 500, maxCount: 5, minDays: 7 }
/** Courses and skills give points, never money: they are too easy to fake. */
export const PRIME_KINDS = ['certification', 'language']
const DAY = 86400000

const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
/** The settings (strings from the database, or nothing) as safe numbers: a tier never exceeds the ceiling. */
export function config(raw = {}) {
    const cap = num(raw.cap, DEFAULTS.cap, 0, 100000)
    return {
        cap,
        tier1: Math.min(cap, num(raw.tier1, DEFAULTS.tier1, 0, 100000)),
        tier2From: Math.round(num(raw.tier2From, DEFAULTS.tier2From, 2, 50)),
        tier2: Math.min(cap, num(raw.tier2, DEFAULTS.tier2, 0, 100000)),
        maxCount: Math.round(num(raw.maxCount, DEFAULTS.maxCount, 1, 50)),
        minDays: Math.round(num(raw.minDays, DEFAULTS.minDays, 0, 365)),
    }
}

export const monthOf = (d) => new Date(d).toISOString().slice(0, 7)
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** The same certificate, however it was typed: the catalog key, else the title and the provider. */
export const certKey = (g) => (g.catalogKey ? `c:${g.catalogKey}` : `t:${norm(g.title)}|${norm(g.provider)}`)

/** What a number of certificates in a month is worth. */
export function tierAmount(count, cfg = DEFAULTS) {
    const n = Math.min(count, cfg.maxCount)
    if (n <= 0) return 0
    return Math.min(cfg.cap, n >= cfg.tier2From ? cfg.tier2 : cfg.tier1)
}

/**
 * Why a goal does or does not count (before looking at duplicates and the month): { ok } or { ok: false, reason }.
 * goal = { kind, status, createdAt, passedAt, approved, approvedAt, verified, verifiedAt, files }
 */
export function qualifies(goal, cfg = DEFAULTS) {
    if (!PRIME_KINDS.includes(goal.kind)) return { ok: false, reason: 'Only certificates and language exams earn a prime' }
    if (goal.status !== 'passed') return { ok: false, reason: 'Not passed yet' }
    if (!goal.approved || !goal.approvedAt) return { ok: false, reason: 'A manager must approve the goal before the exam' }
    if (!goal.passedAt || +new Date(goal.approvedAt) > +new Date(goal.passedAt)) return { ok: false, reason: 'The approval came after the exam: ask for approval first next time' }
    if (+new Date(goal.passedAt) - +new Date(goal.createdAt) < cfg.minDays * DAY) return { ok: false, reason: 'A goal needs at least {n} days between its creation and the result' } // {n} = the setting, filled in by the screen
    if (!(goal.files > 0)) return { ok: false, reason: 'Attach the certificate or the proof' }
    if (!goal.verified || !goal.verifiedAt) return { ok: false, reason: 'A manager has not verified the certificate yet' }
    return { ok: true }
}

/**
 * The prime of one member for one month. goals = all their goals (with `files`), month = 'YYYY-MM',
 * paid = what was already paid as prime that month, trophiesPaid = trophy prizes already paid that month.
 * Only the first goal of a given certificate ever counts; a goal counts in the month it was verified.
 */
export function primeOfMonth(goals, month, { cfg = DEFAULTS, paid = 0, trophiesPaid = 0 } = {}) {
    const seen = new Set()
    const counted = [], notCounted = []
    const order = [...goals].sort((a, b) => +new Date(a.verifiedAt || a.passedAt || a.createdAt || 0) - +new Date(b.verifiedAt || b.passedAt || b.createdAt || 0))
    for (const g of order) {
        const q = qualifies(g, cfg)
        if (!q.ok) { if (g.status === 'passed' && PRIME_KINDS.includes(g.kind) && (!g.verifiedAt || monthOf(g.verifiedAt) >= month || !g.verified)) notCounted.push({ id: g.id, title: g.title, reason: q.reason }); continue }
        const key = certKey(g)
        if (seen.has(key)) { notCounted.push({ id: g.id, title: g.title, reason: 'This certificate was already counted once' }); continue }
        seen.add(key)
        if (monthOf(g.verifiedAt) === month) counted.push(g)
    }
    const count = Math.min(counted.length, cfg.maxCount)
    const room = Math.max(0, cfg.cap - trophiesPaid)
    const amount = Math.min(tierAmount(count, cfg), room)
    const due = Math.max(0, amount - paid)
    const next = count < cfg.tier2From ? { more: cfg.tier2From - Math.max(count, 0), amount: Math.min(cfg.tier2, room) } : null
    return { month, count, counted: counted.slice(0, cfg.maxCount).map((g) => g.id), amount, paid, due, cap: cfg.cap, room, next, notCounted }
}

/** How much of a trophy prize may be paid now without passing the monthly ceiling (0 when none). */
export const trophyRoom = ({ cfg = DEFAULTS, primePaid = 0, trophiesPaid = 0 } = {}) => Math.max(0, cfg.cap - primePaid - trophiesPaid)

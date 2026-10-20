// Company goals: what can be measured, the period a goal covers, and how far along it is. Pure functions (no database).

/** unit: money (in the base currency) or a count. staff: the goal can be for one team member instead of the whole company. */
export const GOAL_KINDS = [
    { key: 'income', group: 'Money', label: 'Income collected', hint: 'Payments received', unit: 'money', staff: true },
    { key: 'invoiced', group: 'Money', label: 'Invoiced', hint: 'Invoices issued (not draft, not cancelled)', unit: 'money', staff: true },
    { key: 'profit', group: 'Money', label: 'Profit', hint: 'Income collected minus expenses', unit: 'money', staff: false },
    { key: 'customers', group: 'Customers and leads', label: 'New customers', hint: 'Customers added', unit: 'count', staff: false },
    { key: 'leads', group: 'Customers and leads', label: 'New leads', hint: 'Leads added', unit: 'count', staff: true },
    { key: 'converted', group: 'Customers and leads', label: 'Leads won', hint: 'Leads turned into customers', unit: 'count', staff: true },
    { key: 'contracts', group: 'Work', label: 'New contracts', hint: 'Contracts that start', unit: 'count', staff: false },
    { key: 'tasks', group: 'Work', label: 'Tasks completed', hint: 'Tasks finished', unit: 'count', staff: true },
]
export const kindOf = (key) => GOAL_KINDS.find((k) => k.key === key) || null

export const PERIODS = [
    { key: 'month', label: 'Every month', hint: 'Always the current month' },
    { key: 'quarter', label: 'Every quarter', hint: 'Always the current quarter' },
    { key: 'year', label: 'Every year', hint: 'Always the current year' },
    { key: 'fixed', label: 'Fixed dates', hint: 'From one date to another' },
]

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

/** { start, end } of the period a goal covers today (the current month / quarter / year, or its fixed dates). */
export function periodRange(period, now = new Date(), startDate = null, endDate = null) {
    const y = now.getFullYear(), m = now.getMonth()
    if (period === 'month') return { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)) }
    if (period === 'quarter') { const q = Math.floor(m / 3) * 3; return { start: new Date(y, q, 1), end: endOfDay(new Date(y, q + 3, 0)) } }
    if (period === 'year') return { start: new Date(y, 0, 1), end: endOfDay(new Date(y, 11, 31)) }
    const s = startDate ? startOfDay(new Date(startDate)) : null, e = endDate ? endOfDay(new Date(endDate)) : null
    return { start: s || new Date(y, m, 1), end: e || endOfDay(new Date(y, m + 1, 0)) }
}

/**
 * How a goal stands. status: achieved | missed (the period is over and the target was not reached) | upcoming |
 * ahead | on_track | behind (compared with the share of the period already gone). perDay: what is still needed each remaining day.
 */
export function goalStanding({ current = 0, target = 0, start, end, now = new Date() }) {
    const t = Number(target) || 0, c = Number(current) || 0
    const pct = t > 0 ? Math.round((c / t) * 100) : 0
    const total = Math.max(1, Math.round((+end - +start) / 86400000))
    const elapsed = Math.min(total, Math.max(0, Math.round((+now - +start) / 86400000)))
    const daysLeft = Math.max(0, Math.ceil((+end - +now) / 86400000))
    const expected = Math.round((elapsed / total) * 100)
    let status
    if (t > 0 && c >= t) status = 'achieved'
    else if (+now > +end) status = 'missed'
    else if (+now < +start) status = 'upcoming'
    else if (pct >= expected + 10) status = 'ahead'
    else if (pct >= expected - 10) status = 'on_track'
    else status = 'behind'
    const remaining = Math.max(0, t - c)
    return { pct, expected, status, daysLeft, remaining, perDay: status === 'achieved' || daysLeft === 0 ? 0 : remaining / daysLeft }
}

/** A name when the person leaves it empty: "Income collected 100000 every month". */
export const suggestName = (kind, period, target) => `${kindOf(kind)?.label || 'Goal'}${target ? ` ${target}` : ''}${period && period !== 'fixed' ? ` ${PERIODS.find((p) => p.key === period)?.label.toLowerCase() || ''}` : ''}`.trim()

/** Goals imported from Perfex carry a number instead of a kind: their progress is not measured until they are edited. */
export const isLegacyGoal = (g) => !g.kind

/**
 * The steps of a goal (its process). A step is { id, title, at?, due?, done? }:
 *  - with `at` (a value on the way to the target) it is a milestone: it completes by itself when the measured value reaches it;
 *  - without `at` it is an action step that someone ticks off.
 */
export function parseSteps(raw) {
    let list = raw
    if (typeof list === 'string') { try { list = JSON.parse(list) } catch { list = [] } }
    if (!Array.isArray(list)) return []
    return list.slice(0, 30).map((s, i) => ({
        id: String(s?.id || `s${i + 1}`), title: String(s?.title || '').trim().slice(0, 80),
        at: s?.at === undefined || s?.at === null || s?.at === '' || !Number.isFinite(Number(s.at)) ? null : Number(s.at),
        due: s?.due ? String(s.due).slice(0, 10) : null, done: !!s?.done,
    })).filter((s) => s.title)
}

/** The text to store: checked and trimmed. Throws a message a person can read. */
export function cleanSteps(list) {
    if (list === undefined || list === null || list === '') return null
    const steps = parseSteps(list)
    if (Array.isArray(list) && list.length > 30) throw Object.assign(new Error('A goal can have up to 30 steps'), { status: 400 })
    return steps.length ? JSON.stringify(steps) : null
}

/** Each step with `reached` (a milestone the value has passed, or an action step that is ticked) and `auto` (it follows the value). */
export function stepsState(steps = [], current = 0) {
    return steps.map((s) => ({ ...s, auto: s.at !== null, reached: s.at !== null ? Number(current) >= s.at : !!s.done }))
}

/** Milestones at a quarter of the target each, to start from. */
export const defaultSteps = (target) => [25, 50, 75, 100].map((p) => ({ id: `m${p}`, title: `${p}% of the target`, at: Math.round(((Number(target) || 0) * p) / 100 * 100) / 100, due: null, done: false }))

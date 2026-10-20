// Payroll maths (no database): months, what is due, what is paid, and the status of a month.

export const KINDS = ['salary', 'bonus', 'advance', 'other']
export const monthOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** The last n months ending with `now`'s month, oldest first (YYYY-MM). */
export function lastMonths(n, now = new Date()) {
    const out = []
    for (let i = n - 1; i >= 0; i--) out.push(monthOf(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    return out
}

/** The 12 months of a year. */
export const monthsOfYear = (year) => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)

/** What the salary makes due for a month: nothing before the start (hire) month or after the end (fire) month. */
export const dueFor = (month, salary, start, end) => (salary > 0 && (!start || month >= start) && (!end || month <= end) ? salary : 0)

/** none (nothing due) | paid | partial | late (a past month with something unpaid) | due (this month or later). */
export function monthStatus(due, paid, month, current) {
    if (!(due > 0)) return 'none'
    if (paid >= due - 0.005) return 'paid'
    if (paid > 0) return 'partial'
    return month < current ? 'late' : 'due'
}

/** An amount in the base currency: rate = how many base units one unit of its currency is worth (missing = 1). */
export const toBase = (amount, rate) => (Number(amount) || 0) * (rate && rate > 0 ? rate : 1)

/**
 * The month whose salary is the one to pay now. Paid in arrears (the default) a month is due from the 1st of the next one,
 * so in October the salary to pay is September's; otherwise it is the current month's.
 */
export const dueMonthOf = (now = new Date(), arrears = true) => (arrears ? monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)) : monthOf(now))

/** Months before this one are late: the due month stays "to pay" until its pay day has passed. */
export function lateBefore(now = new Date(), arrears = true, payDay = 10) {
    const current = monthOf(now)
    return arrears && now.getDate() <= payDay ? dueMonthOf(now, true) : current
}

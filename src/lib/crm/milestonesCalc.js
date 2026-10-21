// Pure rules of the milestones screen: what state a milestone is in, from its due date and its tasks.
const DAY = 86400000
const ymd = (d) => { const x = new Date(d); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) }

/**
 * tasks = { total, done }. States: done (every task complete), overdue (past its date and not done), soon (due in the next 7 days),
 * open (has tasks or a later date), empty (no tasks, no date).
 */
export function milestoneState({ dueDate, tasks }, now = new Date()) {
    const total = tasks?.total || 0, done = tasks?.done || 0
    if (total > 0 && done === total) return 'done'
    if (dueDate) {
        const left = Math.round((ymd(dueDate) - ymd(now)) / DAY)
        if (left < 0) return 'overdue'
        if (left <= 7) return 'soon'
    }
    return total > 0 || dueDate ? 'open' : 'empty'
}

export const percent = (tasks) => (tasks?.total ? Math.round((tasks.done / tasks.total) * 100) : 0)

/** Whole days until the due date (negative = late), or null without a date. */
export const daysLeft = (dueDate, now = new Date()) => (dueDate ? Math.round((ymd(dueDate) - ymd(now)) / DAY) : null)

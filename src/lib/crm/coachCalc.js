import { atHour } from './notifyHours.js'

/** The month before `now` in the company time zone: { key: '2026-10', label: 'October 2026', from, to } (to is exclusive). */
export function lastMonth(now = Date.now(), tz = 'UTC') {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now)).map((x) => [x.type, x.value]))
    let y = Number(p.year), m = Number(p.month) - 1 // 1..12 of this month, so m (0-based) is last month's index + 1
    const pad = (n) => String(n).padStart(2, '0')
    const next = `${y}-${pad(m + 1)}-01`
    if (m === 0) { y -= 1; m = 12 }
    const from = new Date(atHour(`${y}-${pad(m)}-01`, 0, tz)), to = new Date(atHour(next, 0, tz))
    return { key: `${y}-${pad(m)}`, label: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 15))), from, to }
}

/** True from the 8th of the month at 08:00 (company time zone) until the review of last month has been sent. */
export function reviewDue({ now = Date.now(), tz = 'UTC', last = '', day = 8, hour = 8 } = {}) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map((x) => [x.type, x.value]))
    const thisMonth = `${p.year}-${p.month}`
    if (last === thisMonth) return false
    return Number(p.day) > day || (Number(p.day) === day && Number(p.hour) >= hour)
}

const minutes = (a, b, cap) => (a && b ? Math.max(0, Math.min((+new Date(b) - +new Date(a)) / 60000, cap)) : 0)
const inRange = (d, r) => !!d && +new Date(d) >= +r.from && +new Date(d) < +r.to
const DAY = 86400000

/**
 * What one person did in the month, from plain rows (no database here, so it is testable).
 * tasks: [{ id, name, status, dueDate, dateFinished, createdAt, addedFrom, description, assigneeIds, followerIds, commentStaffIds }]
 * timers: [{ staffId, startTime, endTime }]  comments: [{ staffId, createdAt }]  supervisors: staff ids who should follow everything
 */
export function facts({ staffId, range, tasks, timers = [], comments = [], supervisors = [] }) {
    const sup = new Set(supervisors)
    const isSup = sup.has(staffId)
    const mine = tasks.filter((t) => t.assigneeIds.includes(staffId))
    const made = tasks.filter((t) => t.addedFrom === staffId && inRange(t.createdAt, range))
    const done = mine.filter((t) => t.status === 5 && inRange(t.dateFinished, range))
    const onTime = done.filter((t) => t.dueDate && +new Date(t.dateFinished) <= +new Date(t.dueDate) + DAY).length
    const open = mine.filter((t) => t.status !== 5 && +new Date(t.createdAt) < +range.to)
    const overdue = open.filter((t) => t.dueDate && +new Date(t.dueDate) < +range.to)
    const created = mine.filter((t) => inRange(t.createdAt, range))
    const watched = (t) => [...t.followerIds, ...t.assigneeIds].some((id) => sup.has(id) && id !== staffId)
    const others = (t) => t.commentStaffIds.some((id) => id !== staffId)
    const selfRun = (t) => t.addedFrom === staffId && t.assigneeIds.length === 1 && t.assigneeIds[0] === staffId
    const selfValidated = done.filter((t) => selfRun(t) && !watched(t) && !others(t))
    const unwatched = [...new Map([...made, ...mine.filter((t) => inRange(t.createdAt, range) || (t.status === 5 && inRange(t.dateFinished, range)))].map((t) => [t.id, t])).values()].filter((t) => !watched(t))
    const min = timers.filter((x) => x.staffId === staffId && inRange(x.startTime, range)).reduce((s, x) => s + minutes(x.startTime, x.endTime || range.to, 600), 0)
    const out = {
        tasksCompleted: done.length,
        completedOnTime: onTime,
        completedWithoutDeadline: done.filter((t) => !t.dueDate).length,
        stillOpenAtMonthEnd: open.length,
        overdueAtMonthEnd: overdue.length,
        overdueExamples: overdue.slice(0, 5).map((t) => t.name),
        createdForThemselves: created.length,
        createdWithoutDeadline: created.filter((t) => !t.dueDate).length,
        createdWithoutDescription: created.filter((t) => !String(t.description || '').trim()).length,
        tasksCreatedByThem: made.length,
        createdAndClosedByThemselvesWithNobodyElse: selfValidated.length,
        selfValidatedExamples: selfValidated.slice(0, 5).map((t) => t.name),
        tasksWithoutASupervisor: unwatched.length,
        withoutSupervisorExamples: unwatched.slice(0, 5).map((t) => t.name),
        hoursTracked: Math.round((min / 60) * 10) / 10,
        commentsWritten: comments.filter((c) => c.staffId === staffId && inRange(c.createdAt, range)).length,
    }
    if (isSup) {
        const team = tasks.filter((t) => inRange(t.createdAt, range) && t.assigneeIds.some((id) => !sup.has(id)))
        const byPerson = {}
        for (const t of team.filter((x) => x.status === 5 && x.addedFrom && !sup.has(x.addedFrom) && x.assigneeIds.length === 1 && x.assigneeIds[0] === x.addedFrom && !x.followerIds.some((id) => sup.has(id)) && !x.commentStaffIds.some((id) => id !== x.addedFrom))) byPerson[t.addedFrom] = (byPerson[t.addedFrom] || 0) + 1
        out.supervision = {
            teamTasksCreatedInMonth: team.length,
            followedByYou: team.filter((t) => t.followerIds.includes(staffId) || t.assigneeIds.includes(staffId)).length,
            notFollowedByYou: team.filter((t) => !t.followerIds.includes(staffId) && !t.assigneeIds.includes(staffId)).length,
            closedByTheCreatorAloneByPersonId: byPerson,
        }
    }
    return out
}

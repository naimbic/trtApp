import prisma from '@/lib/prisma'
import { combineScore, workdays } from '@/lib/crm/staffScoreCalc'

const DAY = 86400000
export const SCORE_DAYS = 30
const HOURS_PER_WORKDAY = 8

const pct = (n, d) => (d > 0 ? Math.max(0, Math.min(100, Math.round((n / d) * 100))) : null)

/**
 * Score of the last 30 days per member, from three measures:
 * - completion: of the tasks assigned to them that were due or finished in the period, the share that is complete;
 * - onTime: of the tasks they finished, the share finished by the due date;
 * - hours: tracked time against 8 hours per working day (only when they track time).
 * Returns { [staffId]: { score, parts, counts } }.
 */
export async function staffScores(staffIds, days = SCORE_DAYS) {
    const now = new Date()
    const since = new Date(+now - days * DAY)
    const out = {}
    if (!staffIds.length) return out
    const [assigned, timers] = await Promise.all([
        prisma.crmTaskAssigned.findMany({ where: { staffId: { in: staffIds } }, select: { taskId: true, staffId: true } }),
        prisma.crmTaskTimer.findMany({ where: { staffId: { in: staffIds }, startTime: { gte: since } }, select: { staffId: true, startTime: true, endTime: true } }),
    ])
    const tasks = assigned.length ? await prisma.crmTask.findMany({ where: { id: { in: [...new Set(assigned.map((a) => a.taskId))] } }, select: { id: true, status: true, dueDate: true, dateFinished: true } }) : []
    const tm = Object.fromEntries(tasks.map((t) => [t.id, t]))
    const expected = workdays(since, now) * HOURS_PER_WORKDAY
    for (const id of staffIds) {
        let inPlay = 0, done = 0, onTime = 0, open = 0, overdue = 0
        for (const a of assigned) {
            const t = a.staffId === id ? tm[a.taskId] : null
            if (!t) continue
            const finished = t.status === 5
            if (!finished) { open++; if (t.dueDate && new Date(t.dueDate) < now) overdue++ }
            const fin = t.dateFinished ? new Date(t.dateFinished) : null
            const dueIn = t.dueDate && new Date(t.dueDate) >= since && new Date(t.dueDate) <= now
            const finIn = finished && fin && fin >= since
            if (!dueIn && !finIn) continue
            inPlay++
            if (finished) { done++; if (!t.dueDate || !fin || fin <= new Date(+new Date(t.dueDate) + DAY - 1)) onTime++ }
        }
        let hours = 0, tracked = false
        for (const r of timers) { if (r.staffId !== id || !r.startTime) continue; tracked = true; hours += Math.max(0, (+new Date(r.endTime || now) - +new Date(r.startTime)) / 3600000) }
        const parts = { completion: pct(done, inPlay), onTime: pct(onTime, done), hours: tracked ? pct(hours, expected) : null }
        out[id] = { score: combineScore(parts), parts, counts: { inPlay, done, open, overdue, hours: Math.round(hours * 10) / 10 }, days }
    }
    return out
}

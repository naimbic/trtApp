import prisma from '@/lib/prisma'

const DAY = 86400000
const addUnits = (d, n, unit) => {
    const x = new Date(d)
    if (unit === 'day') x.setUTCDate(x.getUTCDate() + n)
    else if (unit === 'week') x.setUTCDate(x.getUTCDate() + 7 * n)
    else if (unit === 'year') x.setUTCFullYear(x.getUTCFullYear() + n)
    else x.setUTCMonth(x.getUTCMonth() + n)
    return x
}

/**
 * Recurring tasks: when a recurring task has been completed and its interval has passed since the last copy (or since
 * it was finished), a fresh copy is created: same name, description, people, checklist (unticked) and tags, dates moved
 * forward. Stops after `totalCycles` copies (0 = never). Sends no email. Called by the daily cron.
 */
export async function runRecurringTasks({ today = new Date(), lines = [], dry = false } = {}) {
    const sources = await prisma.crmTask.findMany({ where: { recurring: true, repeatEvery: { gt: 0 }, recurringType: { not: null }, status: 5, dateFinished: { not: null } }, include: { assignees: true, followers: true, checklistItems: true } })
    let made = 0
    for (const t of sources) {
        if (t.totalCycles > 0 && t.cycles >= t.totalCycles) continue
        const base = t.lastRecurringDate && +t.lastRecurringDate > +t.dateFinished ? t.lastRecurringDate : t.dateFinished
        if (+addUnits(base, t.repeatEvery, t.recurringType) > +today) continue
        if (dry) { lines.push(`[preview] Recurring task "${t.name}" would be repeated`); made++; continue }
        const shift = (d) => (d ? new Date(+d + (+today - +(t.startDate || t.createdAt))) : null)
        const copy = await prisma.crmTask.create({
            data: {
                name: t.name, description: t.description, priority: t.priority, status: 1, startDate: today, dueDate: t.dueDate && t.startDate ? new Date(+today + (+t.dueDate - +t.startDate)) : shift(t.dueDate),
                relType: t.relType, relId: t.relId, milestoneId: t.milestoneId, parentId: t.parentId, isPublic: t.isPublic, billable: t.billable, hourlyRate: t.hourlyRate, visibleToClient: t.visibleToClient,
                addedFrom: t.addedFrom, isRecurringFrom: t.isRecurringFrom || t.id, recurring: false, kanbanOrder: 0,
            },
        })
        for (const a of t.assignees) await prisma.crmTaskAssigned.create({ data: { taskId: copy.id, staffId: a.staffId, assignedFrom: a.assignedFrom } })
        for (const f of t.followers) await prisma.crmTaskFollower.create({ data: { taskId: copy.id, staffId: f.staffId } })
        for (const c of t.checklistItems) await prisma.crmTaskChecklistItem.create({ data: { taskId: copy.id, description: c.description, listOrder: c.listOrder, addedFrom: c.addedFrom, finished: false } })
        const tags = await prisma.crmTaggable.findMany({ where: { relType: 'task', relId: t.id } })
        for (const g of tags) await prisma.crmTaggable.create({ data: { relType: 'task', relId: copy.id, tagId: g.tagId, tagOrder: g.tagOrder } })
        await prisma.crmTask.update({ where: { id: t.id }, data: { cycles: t.cycles + 1, lastRecurringDate: today } })
        lines.push(`Recurring task "${t.name}" repeated (${t.cycles + 1}${t.totalCycles ? `/${t.totalCycles}` : ''})`)
        made++
    }
    return made
}
void DAY

import prisma from '@/lib/prisma'
import { TASK_STATUS_DEFAULTS, shapeStatuses, defaultStatusCode, START_CODE } from '@/lib/crm/taskStatusesCalc'

/** First use: the five statuses that come with the app (kept apart from the settings of the old 0.94 screen, if any). */
export async function ensureTaskStatuses() {
    if (await prisma.crmTaskStatus.count()) { await ensureDefaultFlag(); return }
    let old = {}
    try { old = JSON.parse((await prisma.crmOption.findUnique({ where: { name: 'task_statuses' } }))?.value || '{}') } catch { /* none */ }
    for (const d of TASK_STATUS_DEFAULTS) {
        await prisma.crmTaskStatus.create({ data: { code: d.code, name: old[d.code]?.name || d.name, color: /^#[0-9a-f]{6}$/i.test(old[d.code]?.color || '') ? old[d.code].color : d.color, statusOrder: d.statusOrder } }).catch(() => {})
    }
    await prisma.crmOption.deleteMany({ where: { name: 'task_statuses' } })
    await ensureDefaultFlag()
}

/** One status is the default: the one the old "Default status" setting named, else Not started. */
async function ensureDefaultFlag() {
    if (await prisma.crmTaskStatus.findFirst({ where: { isDefault: true }, select: { id: true } })) return
    const old = Number((await prisma.crmOption.findUnique({ where: { name: 'default_task_status' } }))?.value)
    const pick = (await prisma.crmTaskStatus.findUnique({ where: { code: Number.isInteger(old) ? old : START_CODE } })) || (await prisma.crmTaskStatus.findUnique({ where: { code: START_CODE } }))
    if (pick) await prisma.crmTaskStatus.update({ where: { id: pick.id }, data: { isDefault: true } })
}

/** The code a new task starts with. */
export async function defaultTaskStatus() {
    await ensureTaskStatuses()
    return defaultStatusCode(await prisma.crmTaskStatus.findMany())
}

/** The statuses in board order: [{ id, value (the code), name, color, order, builtIn, custom, protected }]. */
export async function getTaskStatuses() {
    await ensureTaskStatuses()
    return shapeStatuses(await prisma.crmTaskStatus.findMany())
}

/** { code: name } for the places that print a status in a sentence or a chart. */
export async function taskStatusNames() {
    return Object.fromEntries((await getTaskStatuses()).map((s) => [s.value, s.name]))
}

/** Is this a status of ours? (a task can only take one of them) */
export async function isTaskStatus(code) {
    const n = Number(code)
    if (!Number.isInteger(n)) return false
    await ensureTaskStatuses()
    return !!(await prisma.crmTaskStatus.findUnique({ where: { code: n }, select: { id: true } }))
}

/** A deleted status: its tasks go back to Not started. */
export async function moveTasksFrom(code) {
    await prisma.crmTask.updateMany({ where: { status: Number(code) }, data: { status: START_CODE } })
}

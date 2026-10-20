import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/crm/permissions'
import { mergeTaskStatuses, cleanTaskStatuses } from '@/lib/crm/taskStatusesCalc'

const KEY = 'task_statuses'

/** The task statuses with their (possibly renamed / recoloured) name and colour: [{ value, name, color, custom }]. */
export async function getTaskStatuses() {
    const row = await prisma.crmOption.findUnique({ where: { name: KEY } }).catch(() => null)
    return mergeTaskStatuses(row?.value)
}

/** { 1: 'Not started', ... } for the places that print a status in a sentence, an email or a chart. */
export async function taskStatusNames() {
    return Object.fromEntries((await getTaskStatuses()).map((s) => [s.value, s.name]))
}

/** Settings -> Tasks -> Task statuses. body: { 1: { name, color }, ... } (a missing one keeps its default). */
export async function saveTaskStatuses(body) {
    await requirePermission('settings', 'edit')
    const clean = cleanTaskStatuses(body?.statuses ?? body)
    await prisma.crmOption.upsert({ where: { name: KEY }, update: { value: JSON.stringify(clean) }, create: { name: KEY, value: JSON.stringify(clean) } })
    return getTaskStatuses()
}

/** Back to the original names and colours. */
export async function resetTaskStatuses() {
    await requirePermission('settings', 'edit')
    await prisma.crmOption.deleteMany({ where: { name: KEY } })
    return getTaskStatuses()
}

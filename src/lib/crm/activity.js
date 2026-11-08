// The activity trail of a task and of a lead: one place to write "who did what", used by the task, lead, notes and files code.
// Writing never breaks the action that caused it (a failure is only logged).
import prisma from '@/lib/prisma'

const nameCache = new Map()
async function nameOf(staffId) {
    if (!staffId) return null
    if (nameCache.has(staffId)) return nameCache.get(staffId)
    const s = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true, email: true } }).catch(() => null)
    const n = s ? [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || null : null
    nameCache.set(staffId, n)
    return n
}

/** Something happened on a task. kind: created | status | priority | dates | people | edit | relation | checklist | file | finished */
export async function logTask(taskId, staffId, kind, text) {
    if (!taskId || !text) return
    try { await prisma.crmTaskActivity.create({ data: { taskId, kind, text: String(text).slice(0, 400), staffId: staffId || undefined } }) } catch (e) { console.error('[task activity]', e.message) }
}

/** Something happened on a lead (it shows in the lead's Activity tab). `by` is the staff id, or a label such as "Email integration". */
export async function logLead(leadId, by, text, additional) {
    if (!leadId || !text) return
    try {
        const isId = /^[a-f0-9]{24}$/i.test(String(by || ''))
        await prisma.crmLeadActivityLog.create({ data: { leadId, description: String(text).slice(0, 400), additionalData: additional || null, staffId: isId ? by : undefined, fullName: isId ? await nameOf(by) : by || null, customActivity: true } })
    } catch (e) { console.error('[lead activity]', e.message) }
}

/** The people behind a list of staff ids, as a readable list ("Imane, Sarah"). */
export async function namesOf(ids) {
    const out = []
    for (const id of ids || []) { const n = await nameOf(id); if (n) out.push(n) }
    return out.join(', ')
}

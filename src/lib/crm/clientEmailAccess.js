// Which emails a client's contacts receive: the client page has a switch per kind (invoices, estimates, proposals, contracts, credit notes,
// projects, tasks, support, ideas, requests), the same way it has a switch per section of the client area. Off = no email of that kind goes to any
// of its contacts (they can still read everything in the client area).
import prisma from '@/lib/prisma'

export const EMAIL_AREAS = ['invoices', 'estimates', 'proposals', 'contracts', 'credit_notes', 'projects', 'tasks', 'support', 'ideas', 'requests']

/** True when this kind of email is switched off for the client. */
export async function emailOff(clientId, area) {
    if (!clientId || !area) return false
    const c = await prisma.crmClient.findUnique({ where: { id: clientId }, select: { emailHidden: true } }).catch(() => null)
    return (c?.emailHidden || []).includes(area)
}

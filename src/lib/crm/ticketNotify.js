import prisma from '@/lib/prisma'
import { sendTemplate } from '@/lib/crm/mailer'
import { mailVars, withFiles } from '@/lib/crm/ticketsApi'

/**
 * Tells the team that a client opened a ticket or replied: the person it is assigned to, else the staff of its
 * department, else the administrators. Never throws (a mail problem must not break the client's request).
 */
export async function notifyStaffOfClient(ticket, { reply = false, text = '', files = [] } = {}) {
    try {
        const people = new Map() // email -> first name (the greeting of that email)
        const add = (s) => { if (s?.active && s.email) people.set(s.email, s.firstName || '') }
        if (ticket.assignedId) add(await prisma.crmStaff.findUnique({ where: { id: ticket.assignedId }, select: { email: true, active: true, firstName: true } }))
        if (!people.size && ticket.departmentId) {
            const links = await prisma.crmStaffDepartment.findMany({ where: { departmentId: ticket.departmentId }, select: { staffId: true } })
            if (links.length) (await prisma.crmStaff.findMany({ where: { id: { in: links.map((l) => l.staffId) }, active: true }, select: { email: true, active: true, firstName: true } })).forEach(add)
        }
        if (!people.size) (await prisma.crmStaff.findMany({ where: { admin: true, active: true }, select: { email: true, active: true, firstName: true } })).forEach(add)
        await Promise.all([...people].map(async ([to, first]) => sendTemplate({ slug: reply ? 'ticket-reply-to-admin' : 'new-ticket-opened-admin', to, data: await mailVars(ticket, { message: withFiles(text, files), staffUrl: true, vars: { contact_firstname: first } }), relType: 'ticket', relId: ticket.id }).catch(() => {})))
    } catch (e) { console.error('[tickets] staff notification failed:', e.message) }
}

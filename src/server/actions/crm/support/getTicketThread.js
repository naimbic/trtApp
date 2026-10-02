import prisma from '@/lib/prisma'
import { auth } from '@/auth'

const safe = async (fn) => {
    try {
        return await fn()
    } catch {
        return null
    }
}
const personName = (p) =>
    p ? [p.firstName ?? p.firstname, p.lastName ?? p.lastname].filter(Boolean).join(' ') || p.email || null : null

/** Loads a ticket with its replies/attachments for the thread page. Returns null when not found. */
const getTicketThread = async (id) => {
    const session = await auth()
    if (!session?.user?.id) return null
    if (!/^[0-9a-f]{24}$/i.test(String(id))) return null

    const ticket = await prisma.crmTicket.findUnique({
        where: { id },
        include: {
            status: true,
            priority: true,
            service: true,
            replies: { orderBy: { createdAt: 'asc' } },
            attachments: true,
        },
    })
    if (!ticket) return null

    // Cross-domain lookups (plain FKs, no @relation) — tolerate models that are not generated yet.
    const [client, contact, assignee] = await Promise.all([
        ticket.clientId ? safe(() => prisma.crmClient.findUnique({ where: { id: ticket.clientId } })) : null,
        ticket.contactId ? safe(() => prisma.crmContact.findUnique({ where: { id: ticket.contactId } })) : null,
        ticket.assignedId ? safe(() => prisma.crmStaff.findUnique({ where: { id: ticket.assignedId } })) : null,
    ])
    const staffIds = [...new Set(ticket.replies.map((r) => r.adminId).filter(Boolean))]
    const staff = staffIds.length
        ? (await safe(() => prisma.crmStaff.findMany({ where: { id: { in: staffIds } } }))) || []
        : []
    const staffName = Object.fromEntries(staff.map((s) => [s.id, personName(s)]))

    const mapAttachment = (a) => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        missing: a.missing,
        replyId: a.replyId,
    })

    const messages = [
        {
            id: `ticket-${ticket.id}`,
            admin: false,
            name: ticket.name || personName(contact) || ticket.email || 'Customer',
            email: ticket.email,
            message: ticket.message || '',
            date: ticket.createdAt.toISOString(),
            attachments: ticket.attachments.filter((a) => !a.replyId).map(mapAttachment),
        },
        ...ticket.replies.map((r) => ({
            id: r.id,
            admin: Boolean(r.adminId),
            name: r.adminId ? staffName[r.adminId] || r.name || 'Staff' : r.name || ticket.name || 'Customer',
            email: r.email,
            message: r.message || '',
            date: r.createdAt.toISOString(),
            attachments: ticket.attachments.filter((a) => a.replyId === r.id).map(mapAttachment),
        })),
    ]

    return {
        id: ticket.id,
        number: ticket.legacyId,
        subject: ticket.subject || '(no subject)',
        status: ticket.status ? { name: ticket.status.name, color: ticket.status.statusColor } : null,
        priority: ticket.priority ? { name: ticket.priority.name } : null,
        service: ticket.service?.name ?? null,
        client: client ? { id: client.id, name: client.company ?? null } : null,
        contact: contact ? { id: contact.id, name: personName(contact) } : null,
        assignee: assignee ? { id: assignee.id, name: personName(assignee) } : null,
        viewerId: session.user.id,
        messages,
    }
}

export default getTicketThread

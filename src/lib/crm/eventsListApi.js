// The Calendar events list page: the events of one period (a month, to stay fast) with who owns them, the client or lead, the guests,
// the meeting link and the place. Who sees what is the calendar's rule: your own, the ones you are invited to, public ones (all with the "see every event" switch).
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'

const name = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || ''
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)

export async function listEvents(q = {}) {
    const session = await requirePermission('calendar', 'view')
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    const from = new Date(q.from), to = new Date(q.to)
    if (Number.isNaN(+from) || Number.isNaN(+to)) throw Object.assign(new Error('Choose a period'), { status: 400 })
    const all = isCrmAdmin(authority) || hasCap(authority, 'calendar', 'view_all_events')
    const mine = [{ isPublic: true }, { userId: null }, { userId: { isSet: false } }, ...(staffId ? [{ userId: staffId }, { attendeeIds: { has: staffId } }] : [])]
    const where = { AND: [{ start: { lt: to } }, { OR: [{ end: { gte: from } }, { start: { gte: from } }] }, all ? {} : { OR: mine }, { status: { not: 'declined' } }] }
    const rows = await prisma.crmEvent.findMany({ where, orderBy: { start: 'asc' }, take: 500 })
    const ids = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))]
    const [staff, clients, leads] = await Promise.all([
        prisma.crmStaff.findMany({ where: { id: { in: [...new Set([...ids('userId'), ...rows.flatMap((r) => r.attendeeIds || [])])] } }, select: { id: true, firstName: true, lastName: true, email: true } }),
        ids('clientId').length ? prisma.crmClient.findMany({ where: { id: { in: ids('clientId') } }, select: { id: true, company: true } }) : [],
        ids('leadId').length ? prisma.crmLead.findMany({ where: { id: { in: ids('leadId') } }, select: { id: true, name: true, company: true } }) : [],
    ])
    const sn = Object.fromEntries(staff.map((s) => [s.id, name(s)]))
    const cn = Object.fromEntries(clients.map((c) => [c.id, c.company]))
    const ln = Object.fromEntries(leads.map((l) => [l.id, l.company || l.name]))
    return {
        list: rows.map((r) => ({
            id: r.id, title: r.title, start: r.start, end: r.end, allDay: !!r.allDay, category: r.category || '', color: r.color || '', isPublic: !!r.isPublic,
            meetingUrl: r.meetingUrl || '', location: r.location || '', owner: sn[r.userId] || '', mine: !!staffId && r.userId === staffId,
            about: r.clientId ? cn[r.clientId] || '' : r.leadId ? ln[r.leadId] || '' : '', aboutType: r.clientId ? 'client' : r.leadId ? 'lead' : '',
            guests: (r.attendeeIds || []).map((id) => sn[id]).filter(Boolean), outside: (r.attendeeEmails || []).length, note: plain(r.description), confirmed: !!r.confirmed, status: r.status,
        })),
    }
}

import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { scope } from '@/lib/crm/clientsApi'
import { notifyComment } from '@/lib/crm/mentionsApi'
import { storeRich } from '@/lib/crm/richText'
import { cleanEvent } from '@/lib/crm/calendar'

/* The meetings of a client (customer): calendar events about the client, plus the report (summary) written after the meeting, so it is tracked on the
   client and shows in the Calendar. Meetings booked by an email invitation (.ics) from the client land here too (mailCatch). The meetings of the lead
   this client came from are shown as well (read only). */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const NO_TAB = 'You do not have access to this part of the client'

/** The client (only one the person may see) and what they may do with its meetings. */
async function gate(id) {
    const session = await requirePermission('customers', 'view_own')
    const authority = session.user.authority || []
    const sc = await scope(session)
    const client = oid(id) && (await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] }, select: { id: true, company: true } }))
    if (!client) throw fail('Client not found', 404)
    const admin = isCrmAdmin(authority)
    if (!admin && !hasCap(authority, 'client_tabs', 'tab_meetings')) throw fail(NO_TAB, 403)
    const a = { staffId: (await getStaffId(session)) || undefined, session, authority, admin, can: (c) => admin || hasCap(authority, 'customers', c) }
    return { a, client }
}
const mayChange = (a, by) => !by || (!!a.staffId && by === a.staffId) || a.can('edit')
const mayDrop = (a, by) => (!!a.staffId && by === a.staffId) || a.can('delete')

/** The meetings of the client (and of the lead it came from), the staff that can be invited, and what the person may do. */
export async function getClientMeetings(id) {
    const { a } = await gate(id)
    const leads = await prisma.crmLead.findMany({ where: { clientId: id }, select: { id: true } })
    const leadIds = leads.map((l) => l.id)
    const [events, staffRows] = await Promise.all([
        prisma.crmEvent.findMany({ where: { OR: [{ clientId: id }, ...(leadIds.length ? [{ leadId: { in: leadIds } }] : [])], NOT: { status: 'declined' } }, orderBy: { start: 'desc' }, take: 300 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, orderBy: { firstName: 'asc' } }),
    ])
    const people = Object.fromEntries(staffRows.map((s) => [s.id, { id: s.id, name: staffName(s), image: s.profileImage || null }]))
    const meetings = events.map((e) => {
        const old = !!e.leadId // a meeting held while this was still a lead: shown, not changed here
        return {
            id: e.id, title: e.title, start: e.start, end: e.end, allDay: e.allDay, link: e.meetingUrl || '', location: e.location || '', report: e.report || '',
            reminderBefore: e.reminderBefore, reminderBeforeType: e.reminderBeforeType || 'minutes', attendeeIds: e.attendeeIds || [],
            attendees: (e.attendeeIds || []).map((i) => people[i]).filter(Boolean), by: people[e.userId] || null, mine: !!a.staffId && e.userId === a.staffId,
            fromLead: old, source: e.source || (e.description && /^Booked by email/i.test(e.description) ? 'mail' : ''),
            canEdit: !old && mayChange(a, e.userId), canDelete: !old && mayDrop(a, e.userId),
        }
    })
    return { meetings, staff: staffRows.map((s) => ({ id: s.id, name: staffName(s) })), can: { create: true } }
}

export async function saveClientMeeting(id, body, eventId) {
    const { a, client } = await gate(id)
    const report = body.report !== undefined ? storeRich(body.report) : undefined
    if (eventId) {
        const ev = oid(eventId) && (await prisma.crmEvent.findFirst({ where: { id: eventId, clientId: id } }))
        if (!ev) throw fail('Meeting not found', 404)
        if (!mayChange(a, ev.userId)) throw fail('You can only edit the meetings you added', 403)
        const data = cleanEvent({ title: ev.title, start: ev.start, end: ev.end, color: ev.color, isPublic: ev.isPublic, description: ev.description, allDay: ev.allDay, location: ev.location, meetingUrl: ev.meetingUrl, category: ev.category, projectId: ev.projectId, attendeeIds: ev.attendeeIds, attendeeEmails: ev.attendeeEmails, reminderBefore: ev.reminderBefore, reminderBeforeType: ev.reminderBeforeType, report: ev.report, ...body, clientId: id, leadId: null })
        if (report !== undefined) data.report = report || null
        await prisma.crmEvent.update({ where: { id: eventId }, data: { ...data, isStartNotified: false } })
        return { success: true, id: eventId }
    }
    const data = cleanEvent({ category: 'meeting', ...body, clientId: id, leadId: null, attendeeIds: (body.attendeeIds || []).length ? body.attendeeIds : a.staffId ? [a.staffId] : [] })
    if (report !== undefined) data.report = report || null
    const ev = await prisma.crmEvent.create({ data: { ...data, userId: a.staffId || undefined } })
    try { await notifyComment({ by: { staffId: a.staffId, name: a.session.user.name }, text: `📅 ${data.title}`, link: `/calendar?event=${ev.id}`, subject: client.company, recipients: data.attendeeIds || [] }) } catch (e) { console.error('[client meeting notify]', e.message) }
    return { success: true, id: ev.id }
}

export async function deleteClientMeeting(id, eventId) {
    const { a } = await gate(id)
    const ev = oid(eventId) && (await prisma.crmEvent.findFirst({ where: { id: eventId, clientId: id } }))
    if (!ev) throw fail('Meeting not found', 404)
    if (!mayDrop(a, ev.userId)) throw fail('You can only delete the meetings you added', 403)
    await prisma.crmEvent.delete({ where: { id: eventId } })
    return { success: true }
}

/** How many meetings a client has (the small number on its tab). */
export async function countClientMeetings(id) {
    return prisma.crmEvent.count({ where: { clientId: id, NOT: { status: 'declined' } } }).catch(() => 0)
}

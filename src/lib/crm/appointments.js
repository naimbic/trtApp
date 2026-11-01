import prisma from '@/lib/prisma'
import { authenticate } from '@/lib/crm/apiKeys'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { storeRich } from '@/lib/crm/richText'
import { emit } from '@/lib/crm/webhooks'
import { deliver, escapeHtml } from '@/lib/crm/mailer'
import { notifyStaffChannels } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clip = (v, n) => String(v ?? '').trim().slice(0, n)
const iso = (v) => (v ? new Date(v).toISOString() : null)
const shape = (e) => ({ id: e.id, status: e.status || 'confirmed', title: e.title, start: iso(e.start), end: iso(e.end), meeting_url: e.meetingUrl || null, room: e.externalRef || null, source: e.source || null, guests: Array.isArray(e.guests) ? e.guests : [], decided_at: iso(e.decidedAt) })

/** A request for an appointment from another program (the Meet booking page): it lands on the calendar as a DRAFT that nobody is invited to
 *  until a team member accepts it. The same room is never recorded twice: a second call updates the request while it is still a draft. */
export async function createAppointment(request) {
    const { key, log } = await authenticate(request, 'calendar:write')
    try {
        const b = await request.json().catch(() => null)
        if (!b || typeof b !== 'object') throw fail('Send a JSON body')
        const title = clip(b.title, 200)
        if (!title) throw fail('title is required')
        const start = new Date(b.start)
        if (Number.isNaN(+start)) throw fail('start must be a date (ISO 8601)')
        const end = b.end ? new Date(b.end) : new Date(+start + 30 * 60000)
        if (Number.isNaN(+end) || end <= start) throw fail('end must be after start')
        if (end - start > 12 * 3600000) throw fail('An appointment lasts 12 hours at most')
        if (start < new Date(Date.now() - 3600000)) throw fail('start is in the past')
        const meetingUrl = clip(b.meeting_url, 500)
        if (meetingUrl && !/^https:\/\/[^\s]+$/i.test(meetingUrl)) throw fail('meeting_url must be an https address')
        const room = clip(b.room || (meetingUrl ? new URL(meetingUrl).pathname.replace(/^\/+|\/+$/g, '') : ''), 120) || null
        const source = clip(b.source || key.name, 60) || null
        const list = Array.isArray(b.attendees) ? b.attendees.slice(0, 10) : []
        const guests = list.map((a) => ({ name: clip(a?.name, 120), email: clip(a?.email, 160).toLowerCase(), phone: clip(a?.phone, 40) })).filter((g) => g.name || g.email || g.phone)
        for (const g of guests) if (g.email && !EMAIL.test(g.email)) throw fail(`"${g.email}" is not a valid email address`)
        const emails = [...new Set(guests.map((g) => g.email).filter(Boolean))]
        const description = storeRich(String(b.description ?? '').replace(/\n/g, '<br>'), 5000) || null
        // known people: a lead or a client contact with the same email
        let leadId = null, clientId = null
        if (emails.length) {
            leadId = (await prisma.crmLead.findFirst({ where: { email: { in: emails, mode: 'insensitive' } }, select: { id: true } }))?.id || null
            if (!leadId) clientId = (await prisma.crmContact.findFirst({ where: { email: { in: emails, mode: 'insensitive' } }, select: { clientId: true } }))?.clientId || null
        }
        const data = { title, start, end, meetingUrl: meetingUrl || null, description, status: 'draft', source, externalRef: room, guests, attendeeEmails: emails, category: 'meeting', color: 'yellow', apiKeyId: key.id, leadId, clientId }
        const same = room ? await prisma.crmEvent.findFirst({ where: { source, externalRef: room } }) : null
        let row, created = false
        if (same) {
            if (same.status !== 'draft') { log(200); return { data: shape(same), created: false, note: `This request is already ${same.status}` } }
            row = await prisma.crmEvent.update({ where: { id: same.id }, data })
        } else {
            row = await prisma.crmEvent.create({ data: { ...data, isPublic: false } }); created = true
            const admins = await prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true } })
            const who = guests.map((g) => g.name || g.email).filter(Boolean).join(', ')
            const text = `Appointment request: ${title}${who ? ` (${who})` : ''} on ${start.toISOString().slice(0, 16).replace('T', ' ')} UTC`
            for (const a of admins) {
                await prisma.crmNotification.create({ data: { toUserId: a.id, fromFullName: 'Appointments', description: text.slice(0, 200), link: '/calendar', additionalData: 'appointment', isRead: false } }).catch(() => {})
                notifyStaffChannels(a.id, `${text}\n${publicBase()}/calendar`)
            }
            emit('appointment.requested', shape(row))
        }
        log(created ? 201 : 200)
        return { data: shape(row), created }
    } catch (e) { log(e.status || 500); throw e }
}

/** The state of a request, for the program that sent it: only the one that created it can ask. */
export async function getAppointment(request, id) {
    const { key, log } = await authenticate(request, 'calendar:write')
    const e = oid(id) && (await prisma.crmEvent.findUnique({ where: { id } }))
    if (!e || e.apiKeyId !== key.id) { log(404); throw fail('Appointment not found', 404) }
    log(200)
    return { data: shape(e) }
}

/** A team member accepts or declines a request. Accepting makes it a normal event of theirs (they are the owner) and can tell the person who asked. */
export async function decideAppointment(id, body = {}) {
    const session = await requirePermission('calendar', 'edit')
    const staffId = await getStaffId(session)
    const e = oid(id) && (await prisma.crmEvent.findUnique({ where: { id } }))
    if (!e) throw fail('Event not found', 404)
    if (e.status !== 'draft') throw fail(`This request is already ${e.status}`, 409)
    const accept = body.decision === 'accept'
    if (!accept && body.decision !== 'decline') throw fail('Unknown decision')
    const row = await prisma.crmEvent.update({ where: { id }, data: { status: accept ? 'confirmed' : 'declined', decidedBy: staffId, decidedAt: new Date(), ...(accept ? { userId: staffId || e.userId, color: 'blue' } : {}) } })
    emit(accept ? 'appointment.accepted' : 'appointment.declined', shape(row))
    let mailed = []
    if (body.notify !== false) {
        const note = clip(body.message, 600)
        const when = new Date(e.start).toUTCString().replace(' GMT', ' UTC')
        for (const g of Array.isArray(e.guests) ? e.guests : []) {
            if (!g.email) continue
            const subject = accept ? `Appointment confirmed: ${e.title}` : `Appointment request: ${e.title}`
            const html = `<p>Hello ${escapeHtml(g.name || '')},</p><p>${accept ? `Your appointment is <strong>confirmed</strong> for ${escapeHtml(when)}.` : 'We are sorry, we cannot take this appointment at that time.'}</p>${accept && e.meetingUrl ? `<p>Join here: <a href="${escapeHtml(e.meetingUrl)}">${escapeHtml(e.meetingUrl)}</a></p>` : ''}${note ? `<p>${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}`
            const r = await deliver({ to: g.email, subject, html })
            if (r.sent) mailed.push(g.email)
        }
    }
    return { success: true, status: row.status, emailed: mailed }
}

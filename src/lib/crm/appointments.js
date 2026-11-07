import prisma from '@/lib/prisma'
import { authenticate } from '@/lib/crm/apiKeys'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { storeRich } from '@/lib/crm/richText'
import { emit } from '@/lib/crm/webhooks'
import { deliver, escapeHtml } from '@/lib/crm/mailer'
import { notifyNotice } from '@/lib/crm/notifyMail'
import { getOptions } from '@/lib/crm/mailer'

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
            const picked = String((await getOptions(['appointment_staff']))('appointment_staff') || '').split(',').filter((x) => /^[a-f0-9]{24}$/i.test(x)) // Settings → Calendar: who takes the appointments (empty = every administrator)
            const admins = await prisma.crmStaff.findMany({ where: picked.length ? { active: true, id: { in: picked } } : { active: true, admin: true }, select: { id: true } })
            const who = guests.map((g) => g.name || g.email).filter(Boolean).join(', ')
            const text = `Appointment request: ${title}${who ? ` (${who})` : ''} on ${start.toISOString().slice(0, 16).replace('T', ' ')} UTC`
            for (const a of admins) {
                await prisma.crmNotification.create({ data: { toUserId: a.id, fromFullName: 'Appointments', description: text.slice(0, 200), link: `/calendar?event=${row.id}`, additionalData: 'appointment', isRead: false } }).catch(() => {})
                notifyNotice(a.id, { kind: 'calendar', headlineKey: 'appointment', title: title || '', link: `/calendar?event=${row.id}`, note: text })
            }
            emit('appointment.requested', shape(row))
        }
        log(created ? 201 : 200)
        return { data: shape(row), created }
    } catch (e) { log(e.status || 500); throw e }
}

/** A request a key with calendar:write may act on: any event that came in through the API (it has a source), also when it was sent with an earlier key
 *  (a key is replaced from time to time). An event nobody asked for through the API (no source) is never touched. */
const mayAct = async (key, e) => !!e && !!e.source

/** The state of a request, for the program that sent it. */
export async function getAppointment(request, id) {
    const { key, log } = await authenticate(request, 'calendar:write')
    const e = oid(id) && (await prisma.crmEvent.findUnique({ where: { id } }))
    if (!(await mayAct(key, e))) { log(404); throw fail('Appointment not found', 404) }
    log(200)
    return { data: shape(e) }
}

/** Accepting or refusing, for a person (staffId) or for a program acting on behalf of a team member. Accepting makes it a normal confirmed event owned by that
 *  person; both tell the person who asked (unless notify is false). The same answer twice is not an error. */
async function decideCore(e, { accept, staffId, notify, message }) {
    const status = accept ? 'confirmed' : 'declined'
    if (e.status === status) return { row: e, emailed: [], same: true }
    const row = await prisma.crmEvent.update({ where: { id: e.id }, data: { status, decidedBy: staffId || null, decidedAt: new Date(), ...(accept ? { userId: staffId || e.userId, color: 'blue', confirmed: true } : {}) } })
    emit(accept ? 'appointment.accepted' : 'appointment.declined', shape(row))
    const emailed = []
    if (notify !== false) {
        const note = clip(message, 600)
        const when = new Date(e.start).toUTCString().replace(' GMT', ' UTC')
        for (const g of Array.isArray(e.guests) ? e.guests : []) {
            if (!g.email) continue
            const subject = accept ? `Appointment confirmed: ${e.title}` : `Appointment request: ${e.title}`
            const html = `<p>Hello ${escapeHtml(g.name || '')},</p><p>${accept ? `Your appointment is <strong>confirmed</strong> for ${escapeHtml(when)}.` : 'We are sorry, we cannot take this appointment at that time.'}</p>${accept && e.meetingUrl ? `<p>Join here: <a href="${escapeHtml(e.meetingUrl)}">${escapeHtml(e.meetingUrl)}</a></p>` : ''}${note ? `<p>${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}`
            const r = await deliver({ to: g.email, subject, html })
            if (r.sent) emailed.push(g.email)
        }
    }
    return { row, emailed, same: false }
}

/** An email to the people who asked for an appointment (its guests): what changed, the time, the link, and a note from the team. Returns who was emailed. */
export async function tellRequester(e, { kind = 'updated', message = '' } = {}) {
    const note = clip(message, 1000)
    const when = new Date(e.start).toUTCString().replace(' GMT', ' UTC')
    const lines = { updated: `Your appointment <strong>${escapeHtml(e.title)}</strong> has been changed. New time: <strong>${escapeHtml(when)}</strong>.`, note: `A message about your appointment <strong>${escapeHtml(e.title)}</strong> (${escapeHtml(when)}).` }
    const sent = []
    for (const g of Array.isArray(e.guests) ? e.guests : []) {
        if (!g.email) continue
        const html = `<p>Hello ${escapeHtml(g.name || '')},</p><p>${lines[kind] || lines.note}</p>${note ? `<blockquote style="margin:8px 0;padding:6px 12px;border-left:3px solid #ccc">${escapeHtml(note).replace(/\n/g, '<br>')}</blockquote>` : ''}${e.meetingUrl ? `<p>Join here: <a href="${escapeHtml(e.meetingUrl)}">${escapeHtml(e.meetingUrl)}</a></p>` : ''}`
        const r = await deliver({ to: g.email, subject: kind === 'updated' ? `Appointment changed: ${e.title}` : `About your appointment: ${e.title}`, html })
        if (r.sent) sent.push(g.email)
    }
    return sent
}

const decisionOf = (d) => (['accept', 'accepted'].includes(d) ? true : ['decline', 'refuse', 'declined', 'refused'].includes(d) ? false : null)

/** A team member accepts or declines a request in the CRM. */
export async function decideAppointment(id, body = {}) {
    const session = await requirePermission('calendar', 'edit')
    const staffId = await getStaffId(session)
    const e = oid(id) && (await prisma.crmEvent.findUnique({ where: { id } }))
    if (!e) throw fail('Event not found', 404)
    const accept = decisionOf(body.decision)
    if (accept === null) throw fail('Unknown decision')
    if (e.status !== 'draft') throw fail(`This request is already ${e.status}`, 409)
    const r = await decideCore(e, { accept, staffId, notify: body.notify, message: body.message })
    return { success: true, status: r.row.status, emailed: r.emailed }
}

/* ---- the program that sent a request can also accept, refuse, edit and delete its own requests (a team member does it in its screen) ---- */
async function ownRequest(request, id) {
    const { key, log } = await authenticate(request, 'calendar:write')
    const e = oid(id) && (await prisma.crmEvent.findUnique({ where: { id } }))
    if (!(await mayAct(key, e))) { log(404); throw fail('Appointment not found', 404) }
    return { key, log, e }
}

/** POST /calendar/events/<id>/decision { decision: accept | refuse, staff_id, notify?, message? }: staff_id is the CRM team member who decided in the program. */
export async function decideByKey(request, id) {
    const { log, e } = await ownRequest(request, id)
    try {
        const b = await request.json().catch(() => ({}))
        const accept = decisionOf(b.decision ?? b.action)
        if (accept === null) throw fail('decision must be "accept" or "refuse"')
        const staffId = oid(b.staff_id)
        if (accept && !staffId) throw fail('staff_id (the team member who accepts) is required to accept')
        if (staffId && !(await prisma.crmStaff.findFirst({ where: { id: staffId, active: true }, select: { id: true } }))) throw fail('staff_id is not an active team member', 400)
        const r = await decideCore(e, { accept, staffId, notify: b.notify, message: b.message })
        log(200)
        return { data: shape(r.row), emailed: r.emailed, changed: !r.same }
    } catch (x) { log(x.status || 500); throw x }
}

/** PATCH /calendar/events/<id>: title, start, end, meeting_url, description, attendees (same rules as the request). */
export async function editByKey(request, id) {
    const { log, e } = await ownRequest(request, id)
    try {
        const b = await request.json().catch(() => null)
        if (!b || typeof b !== 'object') throw fail('Send a JSON body')
        const data = {}
        if (b.title !== undefined) { const t = clip(b.title, 200); if (!t) throw fail('title cannot be empty'); data.title = t }
        const start = b.start !== undefined ? new Date(b.start) : e.start
        const end = b.end !== undefined ? new Date(b.end) : e.end
        if (b.start !== undefined) { if (Number.isNaN(+start)) throw fail('start must be a date (ISO 8601)'); data.start = start }
        if (b.end !== undefined) { if (Number.isNaN(+end)) throw fail('end must be a date (ISO 8601)'); data.end = end }
        if (end && start && end <= start) throw fail('end must be after start')
        if (end && start && end - start > 12 * 3600000) throw fail('An appointment lasts 12 hours at most')
        if (b.meeting_url !== undefined) { const u = clip(b.meeting_url, 500); if (u && !/^https:\/\/[^\s]+$/i.test(u)) throw fail('meeting_url must be an https address'); data.meetingUrl = u || null }
        if (b.description !== undefined) data.description = storeRich(String(b.description ?? '').replace(/\n/g, '<br>'), 5000) || null
        if (b.attendees !== undefined) {
            const guests = (Array.isArray(b.attendees) ? b.attendees.slice(0, 10) : []).map((a) => ({ name: clip(a?.name, 120), email: clip(a?.email, 160).toLowerCase(), phone: clip(a?.phone, 40) })).filter((g) => g.name || g.email || g.phone)
            for (const g of guests) if (g.email && !EMAIL.test(g.email)) throw fail(`"${g.email}" is not a valid email address`)
            data.guests = guests; data.attendeeEmails = [...new Set(guests.map((g) => g.email).filter(Boolean))]
        }
        const note = clip(b.message, 10) || b.notify === true
        if (!Object.keys(data).length && !note) throw fail('Nothing to change')
        const row = Object.keys(data).length ? await prisma.crmEvent.update({ where: { id: e.id }, data }) : e
        if (Object.keys(data).length) emit('appointment.updated', shape(row))
        // a note for the person who asked (message), or the new time (notify: true)
        const emailed = note ? await tellRequester(row, { kind: data.start || data.end || data.meetingUrl ? 'updated' : 'note', message: b.message }) : []
        log(200)
        return { data: shape(row), emailed }
    } catch (x) { log(x.status || 500); throw x }
}

/** DELETE /calendar/events/<id>: removes a request this key created (nothing else can be deleted through the API). */
export async function deleteByKey(request, id) {
    const { log, e } = await ownRequest(request, id)
    await prisma.crmEvent.delete({ where: { id: e.id } })
    emit('appointment.deleted', shape(e))
    log(200)
    return { success: true, deleted: e.id }
}

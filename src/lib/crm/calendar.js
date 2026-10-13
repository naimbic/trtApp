import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { viewScope, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { buildIcs } from '@/lib/crm/ics'
import { deliver, getOptions, setOptions } from '@/lib/crm/mailer'
import crypto from 'node:crypto'

// Calendar layers shown next to the user's own events (each gated by the matching Perfex feature).
export const LAYERS = ['events', 'tasks', 'invoices', 'projects', 'estimates', 'proposals', 'contracts']
const NAMES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

/** Template calendar colours are names; Perfex stored hex colours, so map those to the nearest name by hue. */
export function colorName(color) {
    if (NAMES.includes(color)) return color
    const m = /^#?([0-9a-f]{6})$/i.exec(color || '')
    if (!m) return 'blue'
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max - min < 0.08) return 'blue'
    let h = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4
    h = (h * 60 + 360) % 360
    return h < 20 || h >= 340 ? 'red' : h < 45 ? 'orange' : h < 70 ? 'yellow' : h < 170 ? 'green' : h < 260 ? 'blue' : 'purple'
}

const iso = (d) => (d ? new Date(d).toISOString() : undefined)

async function context() {
    const session = await auth()
    if (!session?.user?.id) return null
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), admin: isCrmAdmin(authority), can: (f) => viewScope(authority, f) === 'all' }
}

/** Everything that belongs on the calendar between `from` and `to` (ISO dates). */
export async function getCalendarItems({ from, to }) {
    const ctx = await context()
    if (!ctx) return null
    const start = new Date(from)
    const end = new Date(to)
    if (Number.isNaN(+start) || Number.isNaN(+end)) throw new Error('Invalid range')
    const items = []
    const layers = ['events']

    // own, invited-to and public events (and unowned ones)
    const events = await prisma.crmEvent.findMany({
        where: { start: { lt: end }, OR: [{ end: { gte: start } }, { end: null, start: { gte: start } }] },
    })
    const staffRows = await prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true } })
    const staffName = Object.fromEntries(staffRows.map((x) => [x.id, `${x.firstName || ''} ${x.lastName || ''}`.trim()]))
    const clientIds = [...new Set(events.map((e) => e.clientId).filter(Boolean))]
    const clientRows = clientIds.length ? await prisma.crmClient.findMany({ where: { id: { in: clientIds } }, select: { id: true, company: true } }) : []
    const clientName = Object.fromEntries(clientRows.map((c) => [c.id, c.company]))
    for (const e of events) {
        const mine = !e.userId || e.userId === ctx.staffId
        const invited = (e.attendeeIds || []).includes(ctx.staffId)
        if (!mine && !invited && !e.isPublic && !ctx.admin) continue
        items.push({
            id: `event:${e.id}`,
            title: e.title,
            start: e.allDay ? iso(e.start).slice(0, 10) : iso(e.start),
            end: e.allDay ? (e.end ? iso(new Date(new Date(e.end).getTime() + 86400000)).slice(0, 10) : undefined) : iso(e.end),
            allDay: !!e.allDay,
            eventColor: colorName(e.color),
            type: 'events',
            editable: mine || ctx.admin,
            canEdit: mine || ctx.admin,
            description: e.description || '',
            isPublic: e.isPublic,
            rawId: e.id,
            rawTitle: e.title,
            rawStart: iso(e.start),
            rawEnd: iso(e.end),
            location: e.location || '',
            meetingUrl: e.meetingUrl || '',
            clientId: e.clientId || null,
            clientName: e.clientId ? clientName[e.clientId] || '' : '',
            attendeeIds: e.attendeeIds || [],
            attendees: (e.attendeeIds || []).map((id) => ({ id, name: staffName[id] || '' })),
            attendeeEmails: e.attendeeEmails || [],
            reminderBefore: e.reminderBefore ?? null,
            reminderBeforeType: e.reminderBeforeType || 'minutes',
            owner: e.userId ? staffName[e.userId] || '' : '',
            invited: invited && !mine,
        })
    }

    const range = { gte: start, lt: end }
    const day = (d) => new Date(d).toISOString().slice(0, 10)
    const add = (type, id, title, date, color, href) => items.push({ id: `${type}:${id}`, title, start: day(date), allDay: true, eventColor: color, type, editable: false, href })

    if (ctx.can('tasks')) {
        layers.push('tasks')
        const rows = await prisma.crmTask.findMany({ where: { dueDate: range, status: { not: 5 } }, select: { id: true, name: true, dueDate: true } })
        rows.forEach((t) => add('tasks', t.id, `Task: ${t.name}`, t.dueDate, 'orange', `/crm/tasks/${t.id}`))
    }
    if (ctx.can('invoices')) {
        layers.push('invoices')
        const rows = await prisma.crmInvoice.findMany({ where: { dueDate: range, status: { notIn: [2, 5, 6] } }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, dueDate: true, total: true } })
        const pad = await numberPadding()
        rows.forEach((i) => add('invoices', i.id, `Invoice ${docNumberOf(i, pad)} due · ${round2(i.total).toLocaleString('en-US')}`, i.dueDate, 'red', `/crm/invoices/${i.id}`))
    }
    if (ctx.can('projects')) {
        layers.push('projects')
        const rows = await prisma.crmProject.findMany({ where: { deadline: range, status: { notIn: [4, 5] } }, select: { id: true, name: true, deadline: true } })
        rows.forEach((p) => add('projects', p.id, `Project deadline: ${p.name}`, p.deadline, 'purple', `/crm/projects/${p.id}`))
    }
    if (ctx.can('estimates')) {
        layers.push('estimates')
        const rows = await prisma.crmEstimate.findMany({ where: { expiryDate: range, status: { in: [1, 2] } }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, expiryDate: true } })
        const epad = await numberPadding()
        rows.forEach((e) => add('estimates', e.id, `Estimate ${docNumberOf(e, epad, null)} expires`, e.expiryDate, 'yellow', `/crm/estimates/${e.id}`))
    }
    if (ctx.can('proposals')) {
        layers.push('proposals')
        const rows = await prisma.crmProposal.findMany({ where: { openTill: range, status: { in: [1, 4, 5] } }, select: { id: true, subject: true, openTill: true } })
        rows.forEach((p) => add('proposals', p.id, `Proposal open till: ${p.subject || ''}`, p.openTill, 'green', `/crm/proposals/${p.id}`))
    }
    if (ctx.can('contracts')) {
        layers.push('contracts')
        const rows = await prisma.crmContract.findMany({ where: { dateEnd: range }, select: { id: true, subject: true, dateEnd: true } })
        rows.forEach((c) => add('contracts', c.id, `Contract ends: ${c.subject || ''}`, c.dateEnd, 'blue', `/crm/contracts/${c.id}`))
    }
    return { items, layers }
}

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const validUrl = (u) => /^https?:\/\/[^\s]+$/i.test(u)
const OID = /^[0-9a-f]{24}$/i
const clean = (b) => {
    const title = String(b.title || '').trim()
    if (!title) throw Object.assign(new Error('Title is required'), { status: 400 })
    const start = new Date(b.start)
    if (Number.isNaN(+start)) throw Object.assign(new Error('Start date is required'), { status: 400 })
    const end = b.end ? new Date(b.end) : null
    if (end && end < start) throw Object.assign(new Error('End must be after start'), { status: 400 })
    const meetingUrl = String(b.meetingUrl || '').trim()
    if (meetingUrl && !validUrl(meetingUrl)) throw Object.assign(new Error('The meeting link must start with http:// or https://'), { status: 400 })
    const emails = [...new Set((Array.isArray(b.attendeeEmails) ? b.attendeeEmails : String(b.attendeeEmails || '').split(/[,;\s]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
    const badEmail = emails.find((x) => !validEmail(x))
    if (badEmail) throw Object.assign(new Error(`"${badEmail}" is not a valid email address`), { status: 400 })
    const remind = b.reminderBefore === '' || b.reminderBefore == null ? null : Math.max(0, Math.round(Number(b.reminderBefore)))
    return {
        title, description: b.description || null, start, end, color: NAMES.includes(b.color) ? b.color : 'blue', isPublic: !!b.isPublic,
        allDay: !!b.allDay,
        location: String(b.location || '').trim() || null,
        meetingUrl: meetingUrl || null,
        clientId: OID.test(b.clientId || '') ? b.clientId : null,
        attendeeIds: [...new Set((b.attendeeIds || []).filter((x) => OID.test(x)))],
        attendeeEmails: emails,
        reminderBefore: Number.isFinite(remind) ? remind : null,
        reminderBeforeType: ['minutes', 'hours', 'days', 'weeks'].includes(b.reminderBeforeType) ? b.reminderBeforeType : 'minutes',
    }
}

/** Emails an .ics invitation to the staff, guests and (optionally) the client's primary contact. */
async function invite(ev, { inviteClient, update }) {
    const to = new Set(ev.attendeeEmails || [])
    if (ev.attendeeIds?.length) (await prisma.crmStaff.findMany({ where: { id: { in: ev.attendeeIds } }, select: { email: true } })).forEach((x) => x.email && to.add(x.email))
    if (inviteClient && ev.clientId) {
        const c = await prisma.crmContact.findFirst({ where: { clientId: ev.clientId, active: true, email: { not: null } }, orderBy: { isPrimary: 'desc' } })
        if (c?.email) to.add(c.email)
    }
    if (!to.size) return { sent: 0 }
    const o = await getOptions(['companyname'])
    const when = new Date(ev.start).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: ev.allDay ? undefined : 'short' })
    const esc = (t) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#374151"><h2 style="margin:0 0 12px;color:#111827">${esc(ev.title)}</h2><p><strong>${esc(when)}</strong></p>${ev.location ? `<p>📍 ${esc(ev.location)}</p>` : ''}${ev.meetingUrl ? `<p><a href="${esc(ev.meetingUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Join the meeting</a></p>` : ''}${ev.description ? `<p style="white-space:pre-line">${esc(ev.description)}</p>` : ''}<p style="color:#6b7280;font-size:13px">The event is attached, open it to add it to your calendar.<br/>${esc(o('companyname'))}</p></div>`
    const res = await deliver({ to: [...to].join(', '), subject: `${update ? 'Updated invitation' : 'Invitation'}: ${ev.title}`, html, attachments: [{ filename: 'event.ics', content: buildIcs([ev]), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }] })
    if (!res.sent) throw Object.assign(new Error(`Event saved, but the invitation could not be sent: ${res.error}`), { status: 502 })
    return { sent: to.size }
}

export async function createCalendarEvent(body) {
    const ctx = await context()
    if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const data = clean(body)
    const ev = await prisma.crmEvent.create({ data: { ...data, userId: ctx.staffId || undefined } })
    const out = { ...JSON.parse(JSON.stringify(ev)) }
    if (body.sendInvites) out.invited = (await invite(ev, { inviteClient: !!body.inviteClient })).sent
    return out
}

async function ownEvent(id) {
    const ctx = await context()
    if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const ev = await prisma.crmEvent.findUnique({ where: { id } })
    if (!ev) throw Object.assign(new Error('Not found'), { status: 404 })
    if (ev.userId && ev.userId !== ctx.staffId && !ctx.admin) throw Object.assign(new Error('Forbidden'), { status: 403 })
    return ev
}

export async function updateCalendarEvent(id, body) {
    const ev = await ownEvent(id)
    const current = { title: ev.title, start: ev.start, end: ev.end, color: ev.color, isPublic: ev.isPublic, description: ev.description, allDay: ev.allDay, location: ev.location, meetingUrl: ev.meetingUrl, clientId: ev.clientId, attendeeIds: ev.attendeeIds, attendeeEmails: ev.attendeeEmails, reminderBefore: ev.reminderBefore, reminderBeforeType: ev.reminderBeforeType }
    const data = clean({ ...current, ...body })
    const updated = await prisma.crmEvent.update({ where: { id }, data })
    const out = { ...JSON.parse(JSON.stringify(updated)) }
    if (body.sendInvites) out.invited = (await invite(updated, { inviteClient: !!body.inviteClient, update: true })).sent
    return out
}

export async function deleteCalendarEvent(id) {
    await ownEvent(id)
    await prisma.crmEvent.delete({ where: { id } })
    return { success: true }
}

/** Staff the event can be shared with. */
export async function calendarLookups() {
    const ctx = await context()
    if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true }, orderBy: { firstName: 'asc' } })
    return { staff: staff.map((x) => ({ id: x.id, name: `${x.firstName || ''} ${x.lastName || ''}`.trim() || x.email, email: x.email })), me: ctx.staffId }
}

/** One event as .ics (download / "add to calendar"). */
export async function eventIcs(id) {
    const ctx = await context()
    if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const ev = await prisma.crmEvent.findUnique({ where: { id } })
    if (!ev) throw Object.assign(new Error('Not found'), { status: 404 })
    const allowed = ctx.admin || ev.isPublic || !ev.userId || ev.userId === ctx.staffId || (ev.attendeeIds || []).includes(ctx.staffId)
    if (!allowed) throw Object.assign(new Error('Forbidden'), { status: 403 })
    return { ics: buildIcs([ev]), name: `${ev.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'event'}.ics` }
}

/** Private subscription address for Google / Apple / Outlook calendars (one token per staff member). */
export async function getFeed({ regenerate } = {}) {
    const ctx = await context()
    if (!ctx?.staffId) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const name = `calendar_feed_${ctx.staffId}`
    let token = (await getOptions([name]))(name)
    if (!token || regenerate) {
        token = crypto.randomBytes(24).toString('hex')
        await setOptions({ [name]: token })
    }
    return { token }
}

/** Public ICS feed. The unguessable token identifies the staff member; nothing else is exposed. */
export async function feedByToken(token) {
    if (!/^[0-9a-f]{48}$/.test(token || '')) return null
    const row = await prisma.crmOption.findFirst({ where: { value: token, name: { startsWith: 'calendar_feed_' } } })
    if (!row) return null
    const staffId = row.name.replace('calendar_feed_', '')
    const from = new Date(Date.now() - 60 * 86400000), to = new Date(Date.now() + 400 * 86400000)
    const events = await prisma.crmEvent.findMany({ where: { start: { gte: from, lt: to }, OR: [{ userId: staffId }, { attendeeIds: { has: staffId } }, { isPublic: true }] } })
    const o = await getOptions(['companyname'])
    return buildIcs(events, { name: `${o('companyname') || 'CRM'} calendar` })
}

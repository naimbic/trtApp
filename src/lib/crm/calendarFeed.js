import prisma from '@/lib/prisma'
import { authenticate } from '@/lib/crm/apiKeys'
import { verifyAccessToken } from '@/lib/crm/oauth'
import { rateLimit } from '@/lib/rateLimit'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { hasCap, isCrmAdmin } from '@/lib/crm/permissions'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const MEET_HOST = 'meet.trtcrm.com'
const DAY = 86400000

/** What the calendar holds in the range that is NOT in the list, and why: requests still waiting (drafts), refused ones, and tasks, reminders, invoices (other layers of the CRM calendar, never events). */
async function notShown(from, to) {
    const inRange = { start: { lt: to }, OR: [{ end: { gte: from } }, { start: { gte: from }, OR: [{ end: null }, { end: { isSet: false } }] }] }
    const [drafts, declined, tasks, invoices] = await Promise.all([
        prisma.crmEvent.count({ where: { ...inRange, status: 'draft' } }),
        prisma.crmEvent.count({ where: { ...inRange, status: 'declined' } }),
        prisma.crmTask.count({ where: { dueDate: { gte: from, lt: to }, status: { not: 5 } } }).catch(() => 0),
        prisma.crmInvoice.count({ where: { dueDate: { gte: from, lt: to }, status: { notIn: [2, 5, 6, 7] } } }).catch(() => 0),
    ])
    return { waiting_requests: drafts, refused: declined, tasks_due: tasks, invoices_due: invoices }
}

/** The meetings of ONE team member, for the Meet app: who it answers for is either the member's own access token (given by "Sign in with CRM"),
 *  or an API key with the calendar:read scope plus ?staff_id=. By default only events that have a meeting link on meet.trtcrm.com; all=1 adds any link; include_unlinked=1 returns every event of the member, with meeting_url null when there is no link. */
export async function meetingsFeed(request) {
    const url = new URL(request.url)
    const header = request.headers.get('authorization') || ''
    const raw = (header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-api-key') || '').trim()
    if (!raw) throw fail('Send the member access token (or an API key) as "Authorization: Bearer …"', 401)
    let staffId, log = () => {}, userId = null
    if (raw.split('.').length === 3) { // a signed access token: the person is the one who signed in
        const { claims, scope } = await verifyAccessToken(raw).catch((e) => { throw fail(e.message, 401) })
        if (!scope.split(' ').includes('calendar.read')) throw fail('This token cannot read the calendar: ask for the calendar.read scope when signing in', 403)
        rateLimit(`calfeed:${claims.sub}`, 60, 60000)
        staffId = claims.staff_id
        userId = claims.sub
    } else { // an API key: it says whose meetings it wants
        const a = await authenticate(request, 'calendar:read')
        log = a.log
        staffId = oid(url.searchParams.get('staff_id'))
        if (!staffId) { a.log(400); throw fail('staff_id is required with an API key') }
    }
    try {
        const staff = await prisma.crmStaff.findFirst({ where: { id: staffId, active: true }, select: { id: true } })
        if (!staff) throw fail('Unknown or inactive team member', 404)
        const now = Date.now()
        const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')) : new Date(now - DAY)
        const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')) : new Date(+from + 30 * DAY)
        if (Number.isNaN(+from) || Number.isNaN(+to)) throw fail('from and to must be dates (ISO 8601)')
        if (to <= from) throw fail('to must be after from')
        if (to - from > 366 * DAY) throw fail('Ask for at most one year at a time')
        const unlinked = ['1', 'true'].includes(url.searchParams.get('include_unlinked'))
        // With a member's own token the CRM answers what that member sees in the CRM calendar: their events and the ones they are invited to, the
        // events nobody owns, the public ones, and every event for administrators and for who may see all events. (An API key stays at "this member's own".)
        let who = [{ userId: staffId }, { attendeeIds: { has: staffId } }]
        let view = 'own and invited'
        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } })
            const { authority } = user ? await buildUserAuthority(user) : { authority: [] }
            if (!isCrmAdmin(authority) && !hasCap(authority, 'calendar', 'view')) { log(200); return { data: [], from, to, note: 'This member has no access to the calendar' } }
            who = isCrmAdmin(authority) || hasCap(authority, 'calendar', 'view_all_events') ? null : [...who, { userId: null }, { userId: { isSet: false } }, { isPublic: true }]
            view = who ? 'own, invited, shared and public' : 'everything'
        }
        const rows = await prisma.crmEvent.findMany({
            where: { ...(unlinked ? {} : { meetingUrl: { not: null } }), NOT: { status: { in: ['draft', 'declined'] } }, start: { lt: to }, OR: [{ end: { gte: from } }, { start: { gte: from }, OR: [{ end: null }, { end: { isSet: false } }] }], AND: who ? [{ OR: who }] : [] },
            orderBy: { start: 'asc' }, take: 300,
        })
        const all = url.searchParams.get('all') === '1'
        const keep = rows.filter((e) => { const u = String(e.meetingUrl || '').trim(); if (!u) return unlinked; if (all || unlinked) return true; try { return new URL(u).hostname === MEET_HOST } catch { return false } })
        const ids = [...new Set(keep.flatMap((e) => [e.userId, ...(e.attendeeIds || [])]).filter(Boolean))]
        const people = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
        const name = Object.fromEntries(people.map((p) => [p.id, [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email]))
        const out = {
            data: keep.map((e) => {
                const staffGuests = [...new Set([e.userId, ...(e.attendeeIds || [])].filter(Boolean))].map((id) => ({ staff_id: id, name: name[id] || '' }))
                let room = null; try { room = new URL(e.meetingUrl).pathname.replace(/^\/+|\/+$/g, '') || null } catch { /* a link that is not a URL */ }
                return { id: e.id, title: e.title, start: e.start, end: e.end || new Date(+e.start + (e.allDay ? 86400000 : 3600000)), all_day: e.allDay, category: e.category, location: e.location || null, meeting_url: e.meetingUrl || null, room, organizer: name[e.userId] || null, attendees: staffGuests, external_guests: (e.attendeeEmails || []).length, attendees_count: staffGuests.length + (e.attendeeEmails || []).length }
            }),
            from, to,
            meta: { view, in_range: rows.length, returned: keep.length, include_unlinked: unlinked, not_shown: await notShown(from, to) },
        }
        log(200)
        return out
    } catch (e) { log(e.status || 500); throw e }
}

/** When the team is busy, for a booking page that offers free slots: only the start, the end, the state and who is in it (staff ids): no titles, no names,
 *  every confirmed event of the team (with or without a meeting link) and the requests still waiting (draft), so a slot is not given twice. Key with calendar:read, or a member token with calendar.read.
 *  ?staff_id= limits it to one member; ?from= &to= (at most 62 days). */
export async function busyFeed(request) {
    const url = new URL(request.url)
    const header = request.headers.get('authorization') || ''
    const raw = (header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-api-key') || '').trim()
    if (!raw) throw fail('Send an API key (calendar:read) or a member access token as "Authorization: Bearer …"', 401)
    let log = () => {}
    if (raw.split('.').length === 3) {
        const { claims, scope } = await verifyAccessToken(raw).catch((e) => { throw fail(e.message, 401) })
        if (!scope.split(' ').includes('calendar.read')) throw fail('This token cannot read the calendar: ask for the calendar.read scope when signing in', 403)
        rateLimit(`calfeed:${claims.sub}`, 60, 60000)
    } else log = (await authenticate(request, 'calendar:read')).log
    try {
        const only = oid(url.searchParams.get('staff_id'))
        const now = Date.now()
        const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')) : new Date(now - DAY)
        const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')) : new Date(+from + 14 * DAY)
        if (Number.isNaN(+from) || Number.isNaN(+to)) throw fail('from and to must be dates (ISO 8601)')
        if (to <= from) throw fail('to must be after from')
        if (to - from > 62 * DAY) throw fail('Ask for at most 62 days at a time')
        const rows = await prisma.crmEvent.findMany({
            where: { NOT: { status: 'declined' }, start: { lt: to }, OR: [{ end: { gte: from } }, { start: { gte: from }, OR: [{ end: null }, { end: { isSet: false } }] }], ...(only ? { AND: [{ OR: [{ userId: only }, { attendeeIds: { has: only } }] }] } : {}) },
            orderBy: { start: 'asc' }, take: 1000, select: { id: true, start: true, end: true, allDay: true, status: true, userId: true, attendeeIds: true },
        })
        const out = { data: rows.map((e) => ({ id: e.id, start: e.start, end: e.end || new Date(+e.start + 3600000), all_day: !!e.allDay, status: e.status || 'confirmed', staff_ids: [...new Set([e.userId, ...(e.attendeeIds || [])].filter(Boolean))] })), from, to }
        log(200)
        return out
    } catch (e) { log(e.status || 500); throw e }
}

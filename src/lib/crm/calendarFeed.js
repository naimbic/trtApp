import prisma from '@/lib/prisma'
import { authenticate } from '@/lib/crm/apiKeys'
import { verifyAccessToken } from '@/lib/crm/oauth'
import { rateLimit } from '@/lib/rateLimit'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const MEET_HOST = 'meet.trtcrm.com'
const DAY = 86400000

/** The meetings of ONE team member, for the Meet app: who it answers for is either the member's own access token (given by "Sign in with CRM"),
 *  or an API key with the calendar:read scope plus ?staff_id=. Only events that have a meeting link; by default only the links on meet.trtcrm.com (all=1 for any link). */
export async function meetingsFeed(request) {
    const url = new URL(request.url)
    const header = request.headers.get('authorization') || ''
    const raw = (header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-api-key') || '').trim()
    if (!raw) throw fail('Send the member access token (or an API key) as "Authorization: Bearer …"', 401)
    let staffId, log = () => {}
    if (raw.split('.').length === 3) { // a signed access token: the person is the one who signed in
        const { claims, scope } = await verifyAccessToken(raw).catch((e) => { throw fail(e.message, 401) })
        if (!scope.split(' ').includes('calendar.read')) throw fail('This token cannot read the calendar: ask for the calendar.read scope when signing in', 403)
        rateLimit(`calfeed:${claims.sub}`, 60, 60000)
        staffId = claims.staff_id
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
        const rows = await prisma.crmEvent.findMany({
            where: { meetingUrl: { not: null }, NOT: { status: { in: ['draft', 'declined'] } }, start: { lt: to }, OR: [{ end: { gte: from } }, { start: { gte: from }, OR: [{ end: null }, { end: { isSet: false } }] }], AND: [{ OR: [{ userId: staffId }, { attendeeIds: { has: staffId } }] }] },
            orderBy: { start: 'asc' }, take: 300,
        })
        const all = url.searchParams.get('all') === '1'
        const keep = rows.filter((e) => { const u = String(e.meetingUrl || '').trim(); if (!u) return false; if (all) return true; try { return new URL(u).hostname === MEET_HOST } catch { return false } })
        const ids = [...new Set(keep.flatMap((e) => [e.userId, ...(e.attendeeIds || [])]).filter(Boolean))]
        const people = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
        const name = Object.fromEntries(people.map((p) => [p.id, [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email]))
        const out = {
            data: keep.map((e) => {
                const staffGuests = [...new Set([e.userId, ...(e.attendeeIds || [])].filter(Boolean))].map((id) => ({ staff_id: id, name: name[id] || '' }))
                let room = null; try { room = new URL(e.meetingUrl).pathname.replace(/^\/+|\/+$/g, '') || null } catch { /* a link that is not a URL */ }
                return { id: e.id, title: e.title, start: e.start, end: e.end, all_day: e.allDay, category: e.category, location: e.location || null, meeting_url: e.meetingUrl, room, organizer: name[e.userId] || null, attendees: staffGuests, external_guests: (e.attendeeEmails || []).length, attendees_count: staffGuests.length + (e.attendeeEmails || []).length }
            }),
            from, to,
        }
        log(200)
        return out
    } catch (e) { log(e.status || 500); throw e }
}

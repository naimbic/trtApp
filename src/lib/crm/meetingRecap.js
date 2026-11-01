import prisma from '@/lib/prisma'
import { authenticate } from '@/lib/crm/apiKeys'
import { storeRich } from '@/lib/crm/richText'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { isCrmAdmin } from '@/lib/crm/permissions'
import { emit } from '@/lib/crm/webhooks'
import { publicBase } from '@/lib/crm/shortLinks'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const clip = (v, n) => String(v ?? '').trim().slice(0, n)
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** The calendar event of a Meet room: the one the room belongs to, nearest to now (started up to a day ago, or starting within a day). */
async function eventOfRoom(room) {
    const r = clip(room, 120)
    if (!r) return null
    const now = Date.now()
    const rows = await prisma.crmEvent.findMany({
        where: { OR: [{ externalRef: r }, { meetingUrl: { endsWith: `/${r}`, mode: 'insensitive' } }], start: { gte: new Date(now - 36 * 3600000), lte: new Date(now + 36 * 3600000) } },
        orderBy: { start: 'asc' }, take: 20,
    })
    return rows.filter((e) => (e.status || 'confirmed') !== 'declined').sort((a, b) => Math.abs(+a.start - now) - Math.abs(+b.start - now))[0] || null
}

/** Who may write a recap on this event: a team member who owns it, is invited, or may see it (unowned, public, or an administrator). */
async function mayRecap(staff, e) {
    if (!staff) return false
    if (e.userId === staff.id || (e.attendeeIds || []).includes(staff.id) || !e.userId || e.isPublic) return true
    const user = staff.userId ? await prisma.user.findUnique({ where: { id: staff.userId } }) : null
    const { authority } = user ? await buildUserAuthority(user) : { authority: [] }
    return isCrmAdmin(authority)
}

/** POST /api/v1/calendar/recap { room | event_id, staff_id, report, tasks: [{ name, owner, due, description }] }
 *  The recap of a meeting written in Meet: the minutes go on the calendar event (and show on its lead), the action items become CRM tasks
 *  for the people named (else the member who saved it), linked to the event's client or lead. The same call twice does not repeat a task. */
export async function saveRecap(request) {
    const { log } = await authenticate(request, 'calendar:write')
    try {
        const b = await request.json().catch(() => null)
        if (!b || typeof b !== 'object') throw fail('Send a JSON body')
        const staffId = oid(b.staff_id)
        const staff = staffId && (await prisma.crmStaff.findFirst({ where: { id: staffId, active: true }, select: { id: true, userId: true, firstName: true, lastName: true, email: true } }))
        if (!staff) throw fail('staff_id must be an active team member')
        const e = oid(b.event_id) ? await prisma.crmEvent.findUnique({ where: { id: b.event_id } }) : await eventOfRoom(b.room)
        if (!e) throw fail('No calendar event found for this meeting', 404)
        if (!(await mayRecap(staff, e))) throw fail('This team member cannot write on this event', 403)

        const text = clip(b.report, 20000)
        const tasks = (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 20).map((t) => ({ name: clip(t?.name, 250), owner: clip(t?.owner, 120), due: t?.due ? new Date(t.due) : null, description: clip(t?.description, 2000) })).filter((t) => t.name)
        if (!text && !tasks.length) throw fail('Nothing to save: send a report or tasks')
        const out = { event: { id: e.id, title: e.title, start: e.start }, report_saved: false, tasks: [], skipped: [] }

        if (text) {
            const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
            const html = storeRich(`<p><strong>Meeting recap · ${stamp} UTC</strong></p><p>${esc(text).replace(/\n/g, '<br>')}</p>`, 20000)
            const merged = b.replace === true || !e.report ? html : storeRich(`${e.report}<hr>${html}`, 40000)
            await prisma.crmEvent.update({ where: { id: e.id }, data: { report: merged } })
            out.report_saved = true
        }

        if (tasks.length) {
            const team = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true } })
            const find = (owner) => {
                const k = norm(owner); if (!k) return null
                const full = team.filter((s) => norm(`${s.firstName || ''} ${s.lastName || ''}`) === k)
                if (full.length === 1) return full[0]
                const first = team.filter((s) => norm(s.firstName) === k || norm(`${s.firstName || ''} ${s.lastName || ''}`).startsWith(`${k} `))
                return first.length === 1 ? first[0] : null
            }
            const rel = e.clientId ? { relType: 'customer', relId: e.clientId } : e.leadId ? { relType: 'lead', relId: e.leadId } : {}
            for (const t of tasks) {
                const owner = find(t.owner) || staff
                const dup = await prisma.crmTask.findFirst({ where: { name: t.name, ...rel, createdAt: { gte: new Date(Date.now() - 6 * 3600000) } }, select: { id: true } })
                if (dup) { out.skipped.push({ name: t.name, reason: 'already created' }); continue }
                const due = t.due && !Number.isNaN(+t.due) ? t.due : null
                const desc = storeRich(`<p>${esc(t.description || '')}</p><p>From the meeting “${esc(e.title)}” (${new Date(e.start).toISOString().slice(0, 10)}).</p>`, 5000)
                const task = await prisma.crmTask.create({ data: { name: t.name, description: desc, priority: 2, status: 1, startDate: new Date(), dueDate: due, addedFrom: staff.id, ...rel } })
                await prisma.crmTaskAssigned.create({ data: { taskId: task.id, staffId: owner.id, assignedFrom: staff.id } })
                if (owner.id !== staff.id) await prisma.crmNotification.create({ data: { toUserId: owner.id, fromUserId: staff.id, fromFullName: [staff.firstName, staff.lastName].filter(Boolean).join(' ') || staff.email, description: `New task from the meeting: ${t.name}`.slice(0, 200), link: `/crm/tasks/${task.id}`, additionalData: 'recap-task', isRead: false } }).catch(() => {})
                emit('task.created', { id: task.id, name: task.name, due_date: task.dueDate })
                out.tasks.push({ id: task.id, name: t.name, assigned_to: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email, link: `${publicBase()}/crm/tasks/${task.id}` })
            }
        }
        log(200)
        return out
    } catch (x) { log(x.status || 500); throw x }
}

import prisma from '@/lib/prisma'
import { realPicture } from '@/lib/crm/pictures'
import { requirePermission, viewScope, getStaffId, isCrmAdmin } from '@/lib/crm/permissions'
import { STATUS as TASK_STATUS, PRIORITY as TASK_PRIORITY } from '@/lib/crm/tasksApi'

const NONE = '000000000000000000000000'
const DAY = 86400000
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || 'Staff'
const person = (s) => (s ? { id: s.id, name: staffName(s), image: realPicture(s.profileImage) } : null)
// due dates are stored as UTC midnight of the chosen day, so "today" is the UTC day too (like the other dashboards)
const startOfDay = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

/**
 * What the team is doing and what each person has to do: the signed-in person's tasks, leads to follow up, issues, tickets
 * and agenda, plus the team's workload, pipeline, ideas and recent activity (each part only for people who may see it).
 */
export async function teamDashboard() {
    const session = await requirePermission(null)
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    const admin = isCrmAdmin(authority)
    const scopes = Object.fromEntries(['tasks', 'leads', 'issues', 'tickets'].map((f) => [f, admin ? 'all' : viewScope(authority, f)]))
    const today = startOfDay(), tomorrow = new Date(+today + DAY), week = new Date(+today + 8 * DAY)
    const me = staffId ? await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : null
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    const sm = Object.fromEntries(staff.map((s) => [s.id, person(s)]))
    const out = { me: person(me) || { id: null, name: session.user.name || session.user.email, image: null }, generatedAt: new Date().toISOString(), scopes, can: Object.fromEntries(Object.entries(scopes).map(([k, v]) => [k, !!v])) }

    /* ---- tasks ---- */
    if (scopes.tasks) {
        const open = { status: { not: 5 } }
        const assignedTo = async (id) => (await prisma.crmTaskAssigned.findMany({ where: { staffId: id }, select: { taskId: true } })).map((x) => x.taskId)
        const mineIds = staffId ? await assignedTo(staffId) : []
        const mine = mineIds.length ? await prisma.crmTask.findMany({ where: { id: { in: mineIds }, ...open }, orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }], take: 200, select: { id: true, name: true, status: true, priority: true, dueDate: true, relType: true, relId: true } }) : []
        const projects = mine.filter((t) => t.relType === 'project' && t.relId).map((t) => t.relId)
        const pm = Object.fromEntries((projects.length ? await prisma.crmProject.findMany({ where: { id: { in: [...new Set(projects)] } }, select: { id: true, name: true } }) : []).map((p) => [p.id, p.name]))
        const card = (t) => ({ id: t.id, name: t.name, status: t.status, priority: t.priority, dueDate: t.dueDate, project: t.relType === 'project' ? pm[t.relId] || null : null })
        const overdue = mine.filter((t) => t.dueDate && new Date(t.dueDate) < today)
        const dueToday = mine.filter((t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow)
        const upcoming = mine.filter((t) => t.dueDate && new Date(t.dueDate) >= tomorrow && new Date(t.dueDate) < week)
        const noDate = mine.filter((t) => !t.dueDate)
        const doneWeek = mineIds.length ? await prisma.crmTask.count({ where: { id: { in: mineIds }, status: 5, dateFinished: { gte: new Date(+today - 7 * DAY) } } }) : 0
        out.tasks = {
            mine: { open: mine.length, overdue: overdue.length, today: dueToday.length, week: upcoming.length, doneWeek, list: [...overdue, ...dueToday, ...upcoming, ...noDate].slice(0, 10).map(card), overdueIds: overdue.slice(0, 10).map((t) => t.id) },
        }
        if (scopes.tasks === 'all') {
            const [assigned, allOpen, finished] = await Promise.all([
                prisma.crmTaskAssigned.findMany({ select: { taskId: true, staffId: true } }),
                prisma.crmTask.findMany({ where: open, select: { id: true, dueDate: true, priority: true }, take: 5000 }),
                prisma.crmTask.findMany({ where: { status: 5, dateFinished: { gte: new Date(+today - 7 * DAY) } }, select: { id: true, name: true, dateFinished: true }, orderBy: { dateFinished: 'desc' }, take: 300 }),
            ])
            const openMap = Object.fromEntries(allOpen.map((t) => [t.id, t]))
            const finMap = Object.fromEntries(finished.map((t) => [t.id, t]))
            const load = Object.fromEntries(staff.map((s) => [s.id, { ...sm[s.id], open: 0, overdue: 0, done: 0 }]))
            const assignedOpen = new Set()
            for (const a of assigned) {
                if (openMap[a.taskId] && load[a.staffId]) { load[a.staffId].open++; assignedOpen.add(a.taskId); if (openMap[a.taskId].dueDate && new Date(openMap[a.taskId].dueDate) < today) load[a.staffId].overdue++ }
                else if (finMap[a.taskId] && load[a.staffId]) load[a.staffId].done++
            }
            out.tasks.team = {
                open: allOpen.length, overdue: allOpen.filter((t) => t.dueDate && new Date(t.dueDate) < today).length, unassigned: allOpen.filter((t) => !assignedOpen.has(t.id)).length, doneWeek: finished.length,
                workload: Object.values(load).filter((x) => x.open || x.done).sort((a, b) => b.open - a.open),
            }
        }
    }

    /* ---- leads ---- */
    if (scopes.leads) {
        const active = { lost: false, junk: false, clientId: null }
        const where = scopes.leads === 'all' ? {} : staffId ? { OR: [{ assigned: staffId }, { addedFrom: staffId }] } : { id: NONE }
        const [statuses, rows] = await Promise.all([
            prisma.crmLeadStatus.findMany({ orderBy: { statusOrder: 'asc' } }),
            prisma.crmLead.findMany({ where: { AND: [where, { lost: false, junk: false }] }, select: { id: true, name: true, company: true, statusId: true, assigned: true, lastContact: true, createdAt: true, clientId: true, dateAssigned: true }, orderBy: { createdAt: 'desc' }, take: 2000 }),
        ])
        void active
        const sn = Object.fromEntries(statuses.map((s) => [s.id, { name: s.name, color: s.color || null }]))
        const openLeads = rows.filter((l) => !l.clientId)
        const mineLeads = openLeads.filter((l) => staffId && l.assigned === staffId)
        const since = (l) => Math.max(0, Math.floor((+new Date() - +new Date(l.lastContact || l.createdAt)) / DAY))
        out.leads = {
            mine: { open: mineLeads.length, stale: mineLeads.filter((l) => since(l) >= 7).length, list: [...mineLeads].sort((a, b) => since(b) - since(a)).slice(0, 8).map((l) => ({ id: l.id, name: l.name, company: l.company || '', status: sn[l.statusId]?.name || '', color: sn[l.statusId]?.color || null, days: since(l), contacted: !!l.lastContact })) },
        }
        if (scopes.leads === 'all') {
            const byStatus = {}, byOwner = {}
            for (const l of openLeads) { const k = sn[l.statusId]?.name || 'No status'; byStatus[k] = (byStatus[k] || 0) + 1; const o = l.assigned || 'none'; byOwner[o] = (byOwner[o] || 0) + 1 }
            const converted = await prisma.crmLead.count({ where: { dateConverted: { gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)) } } })
            out.leads.team = {
                open: openLeads.length, unassigned: openLeads.filter((l) => !l.assigned).length, newWeek: openLeads.filter((l) => new Date(l.createdAt) >= new Date(+today - 7 * DAY)).length, convertedMonth: converted,
                byStatus, byOwner: Object.entries(byOwner).map(([id, n]) => ({ person: sm[id] || null, n })).sort((a, b) => b.n - a.n).slice(0, 8),
            }
        }
    }

    /* ---- issues and ideas ---- */
    if (scopes.issues) {
        const where = scopes.issues === 'all' ? {} : staffId ? { OR: [{ assigneeIds: { has: staffId } }, { reporterId: staffId }] } : { id: NONE }
        const rows = await prisma.crmIssue.findMany({ where: { AND: [where, { status: { in: ['open', 'in_progress', 'in_review'] } }] }, orderBy: { updatedAt: 'desc' }, take: 500 })
        const plats = Object.fromEntries((await prisma.crmPlatform.findMany()).map((p) => [p.id, p.name]))
        const sh = (i) => ({ id: i.id, number: i.number, title: i.title, priority: i.priority, type: i.type, status: i.status, platform: plats[i.platformId] || null, assignees: (i.assigneeIds || []).map((x) => sm[x]).filter(Boolean) })
        const byPriority = {}, byPlatform = {}
        rows.forEach((i) => { byPriority[i.priority] = (byPriority[i.priority] || 0) + 1; const p = plats[i.platformId] || '—'; byPlatform[p] = (byPlatform[p] || 0) + 1 })
        out.issues = {
            open: rows.length, critical: rows.filter((i) => i.priority === 'critical').length,
            mine: rows.filter((i) => staffId && (i.assigneeIds || []).includes(staffId)).slice(0, 6).map(sh),
            mineOpen: rows.filter((i) => staffId && (i.assigneeIds || []).includes(staffId)).length,
            ideas: rows.filter((i) => ['feature', 'improvement'].includes(i.type)).slice(0, 6).map(sh),
            byPriority, byPlatform: Object.entries(byPlatform).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 6),
        }
    }

    /* ---- tickets ---- */
    if (scopes.tickets) {
        const closed = await prisma.crmTicketStatus.findMany({ where: { legacyId: 5 }, select: { id: true } })
        const base = { statusId: { notIn: closed.map((c) => c.id) } }
        const vis = scopes.tickets === 'all' ? {} : staffId ? { OR: [{ assignedId: staffId }, { adminId: staffId }] } : { id: NONE }
        const [mineRows, openCount, unassigned] = await Promise.all([
            staffId ? prisma.crmTicket.findMany({ where: { ...base, assignedId: staffId }, orderBy: { lastReply: 'desc' }, take: 5, select: { id: true, legacyId: true, subject: true, lastReply: true, clientId: true } }) : [],
            prisma.crmTicket.count({ where: { AND: [vis, base] } }),
            scopes.tickets === 'all' ? prisma.crmTicket.count({ where: { ...base, assignedId: null } }) : 0,
        ])
        const cl = Object.fromEntries((mineRows.length ? await prisma.crmClient.findMany({ where: { id: { in: mineRows.map((t) => t.clientId).filter(Boolean) } }, select: { id: true, company: true } }) : []).map((c) => [c.id, c.company]))
        out.tickets = { open: openCount, unassigned, mine: mineRows.map((t) => ({ id: t.id, number: t.legacyId, subject: t.subject || '', client: cl[t.clientId] || '', lastReply: t.lastReply })) }
    }

    /* ---- today: events and reminders ---- */
    if (staffId) {
        const [events, reminders] = await Promise.all([
            prisma.crmEvent.findMany({ where: { start: { gte: today, lt: new Date(+today + 2 * DAY) }, OR: [{ userId: staffId }, { attendeeIds: { has: staffId } }, { isPublic: true }] }, orderBy: { start: 'asc' }, take: 8, select: { id: true, title: true, start: true, end: true } }),
            prisma.crmReminder.findMany({ where: { staffId, date: { lt: new Date(+today + 4 * DAY) }, isNotified: false }, orderBy: { date: 'asc' }, take: 6, select: { id: true, description: true, date: true, relType: true, relId: true } }),
        ])
        out.agenda = { events: events.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end })), reminders: reminders.map((r) => ({ id: r.id, text: (r.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140), date: r.date, relType: r.relType, relId: r.relId })) }
    }

    /* ---- recent activity of the team (what each part allows) ---- */
    const feed = []
    const since = new Date(+today - 7 * DAY)
    const own = (field) => (f) => (f === 'all' ? {} : staffId ? { [field]: staffId } : { id: NONE })
    if (scopes.tasks) {
        const [comments, done] = await Promise.all([
            prisma.crmTaskComment.findMany({ where: { createdAt: { gte: since }, staffId: { not: null }, ...own('staffId')(scopes.tasks) }, orderBy: { createdAt: 'desc' }, take: 8, include: { task: { select: { id: true, name: true } } } }),
            prisma.crmTask.findMany({ where: { status: 5, dateFinished: { gte: since } }, orderBy: { dateFinished: 'desc' }, take: 8, select: { id: true, name: true, dateFinished: true } }),
        ])
        const doneAssign = done.length ? await prisma.crmTaskAssigned.findMany({ where: { taskId: { in: done.map((d) => d.id) } }, select: { taskId: true, staffId: true } }) : []
        for (const c of comments) feed.push({ type: 'comment', at: c.createdAt, staff: sm[c.staffId] || null, text: c.task?.name || '', link: c.task ? `/crm/tasks/${c.task.id}` : null })
        for (const t of done) { const a = doneAssign.find((x) => x.taskId === t.id); if (scopes.tasks === 'all' || (staffId && a?.staffId === staffId)) feed.push({ type: 'done', at: t.dateFinished, staff: a ? sm[a.staffId] || null : null, text: t.name, link: `/crm/tasks/${t.id}` }) }
    }
    if (scopes.leads) {
        const rows = await prisma.crmLead.findMany({ where: { createdAt: { gte: since }, ...(scopes.leads === 'all' ? {} : staffId ? { OR: [{ assigned: staffId }, { addedFrom: staffId }] } : { id: NONE }) }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, company: true, addedFrom: true, createdAt: true } })
        for (const l of rows) feed.push({ type: 'lead', at: l.createdAt, staff: sm[l.addedFrom] || null, text: l.name || l.company || '', link: `/crm/leads/${l.id}` })
    }
    if (scopes.issues) {
        const rows = await prisma.crmIssueComment.findMany({ where: { createdAt: { gte: since }, kind: 'comment' }, orderBy: { createdAt: 'desc' }, take: 6 })
        const iss = rows.length ? Object.fromEntries((await prisma.crmIssue.findMany({ where: { id: { in: rows.map((r) => r.issueId) } }, select: { id: true, number: true, title: true } })).map((i) => [i.id, i])) : {}
        for (const r of rows) if (iss[r.issueId]) feed.push({ type: 'issue', at: r.createdAt, staff: sm[r.staffId] || null, text: `#${iss[r.issueId].number} ${iss[r.issueId].title}`, link: `/crm/issues/${r.issueId}` })
    }
    out.activity = feed.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 12)

    /* ---- who is around ---- */
    const pres = await prisma.crmChatPresence.findMany({ where: { memberKey: { startsWith: 'staff:' }, lastSeen: { gt: new Date(Date.now() - 45000) } } })
    out.online = pres.map((p) => sm[p.memberKey.slice(6)]).filter(Boolean)
    out.taskLabels = { status: TASK_STATUS, priority: TASK_PRIORITY }
    return out
}

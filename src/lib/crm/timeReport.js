import prisma from '@/lib/prisma'
import { realPicture } from '@/lib/crm/pictures'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'

const DAY = 86400000
const name = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || 'Staff'
const hours = (ms) => Math.round((ms / 3600000) * 100) / 100

/**
 * Time logged on tasks over the last 7 / 30 / 90 days: per person, per project, per day and the latest entries.
 * People who see all tasks get the whole team (and may pick one person); everybody else gets their own time.
 */
export async function timeReport({ days = 30, staffId: only } = {}) {
    const session = await requirePermission('tasks', 'view')
    const all = viewScope(session.user.authority || [], 'tasks') === 'all'
    const me = await getStaffId(session)
    days = [7, 30, 90].includes(Number(days)) ? Number(days) : 30
    const today = new Date(Date.UTC(...(() => { const d = new Date(); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()] })()))
    const since = new Date(+today - (days - 1) * DAY)
    const who = all ? (/^[a-f0-9]{24}$/i.test(String(only || '')) ? String(only) : null) : me || '000000000000000000000000'
    const rows = await prisma.crmTaskTimer.findMany({ where: { endTime: { gte: since }, startTime: { not: null }, ...(who ? { staffId: who } : {}) }, orderBy: { endTime: 'desc' }, take: 10000, select: { id: true, taskId: true, staffId: true, startTime: true, endTime: true, note: true } })
    const tasks = await prisma.crmTask.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.taskId).filter(Boolean))] } }, select: { id: true, name: true, relType: true, relId: true, billable: true } })
    const tMap = Object.fromEntries(tasks.map((t) => [t.id, t]))
    const projectIds = [...new Set(tasks.filter((t) => t.relType === 'project' && t.relId).map((t) => t.relId))]
    const projects = projectIds.length ? await prisma.crmProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }) : []
    const pMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    const sMap = Object.fromEntries(staff.map((s) => [s.id, { id: s.id, name: name(s), image: realPicture(s.profileImage) }]))

    const labels = Array.from({ length: days }, (_, i) => new Date(+since + i * DAY).toISOString().slice(0, 10))
    const perDay = Object.fromEntries(labels.map((l) => [l, 0]))
    const perPerson = {}, perProject = {}
    let total = 0, billable = 0
    const ms = (r) => Math.max(0, +new Date(r.endTime) - +new Date(r.startTime))
    for (const r of rows) {
        const t = tMap[r.taskId]
        const m = ms(r)
        total += m
        if (t?.billable) billable += m
        const day = new Date(r.endTime).toISOString().slice(0, 10)
        if (day in perDay) perDay[day] += m
        const p = (perPerson[r.staffId] ||= { ms: 0, tasks: new Set(), entries: 0 })
        p.ms += m; p.entries++; if (r.taskId) p.tasks.add(r.taskId)
        const proj = t?.relType === 'project' && pMap[t.relId] ? pMap[t.relId] : null
        const key = proj || 'No project'
        perProject[key] = (perProject[key] || 0) + m
    }
    return {
        days, all, labels,
        total: hours(total), billable: hours(billable), entries: rows.length,
        average: hours(total / Math.max(1, new Set(rows.map((r) => `${r.staffId}|${new Date(r.endTime).toISOString().slice(0, 10)}`)).size)),
        perDay: labels.map((l) => hours(perDay[l])),
        people: Object.entries(perPerson).map(([id, p]) => ({ person: sMap[id] || { id, name: tr0(id), image: null }, hours: hours(p.ms), tasks: p.tasks.size, entries: p.entries })).sort((a, b) => b.hours - a.hours),
        projects: Object.fromEntries(Object.entries(perProject).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, hours(v)])),
        recent: rows.slice(0, 25).map((r) => ({ id: r.id, task: tMap[r.taskId] ? { id: tMap[r.taskId].id, name: tMap[r.taskId].name } : null, project: tMap[r.taskId]?.relType === 'project' ? pMap[tMap[r.taskId].relId] || null : null, person: sMap[r.staffId] || null, hours: hours(ms(r)), at: r.endTime, note: r.note || '' })),
        staff: all ? Object.values(sMap).sort((a, b) => a.name.localeCompare(b.name)) : [],
        staffId: who && all ? who : null,
    }
}
const tr0 = () => 'Former member'

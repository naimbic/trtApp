import prisma from '@/lib/prisma'
import { realPicture } from '@/lib/crm/pictures'
import { requirePermission, viewScope, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'

export const STATUS = { open: 'Open', in_progress: 'In progress', in_review: 'In review', resolved: 'Resolved', closed: 'Closed' }
export const PRIORITY = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }
export const TYPE = { bug: 'Bug', improvement: 'Improvement', feature: 'New feature', question: 'Question' }
export const KIND = { website: 'Website', platform: 'Platform', app: 'App', other: 'Other' }

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'
const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
const clean = (v, max) => String(v ?? '').trim().slice(0, max)

async function access(session) {
    const authority = session.user.authority || []
    return { authority, scope: viewScope(authority, 'issues'), staffId: await getStaffId(session), admin: isCrmAdmin(authority), can: (cap) => hasCap(authority, 'issues', cap) }
}
/** Staff with the "own" scope only see the issues assigned to them or reported by them. */
const visible = (a) => (a.scope === 'all' ? {} : a.staffId ? { OR: [{ assigneeIds: { has: a.staffId } }, { reporterId: a.staffId }] } : { id: NONE })

async function people(ids) {
    const list = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(ids.filter(oid))] } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    return Object.fromEntries(list.map((s) => [s.id, { id: s.id, name: staffName(s), image: realPicture(s.profileImage) }]))
}

const card = (i, ppl, plats, commentCount = 0) => ({
    id: i.id, number: i.number, title: i.title, status: i.status, priority: i.priority, type: i.type, labels: i.labels || [],
    platform: i.platformId ? plats[i.platformId] || null : null, pageUrl: i.pageUrl || '', dueDate: i.dueDate, resolvedAt: i.resolvedAt,
    reporter: ppl[i.reporterId] || null, assignees: (i.assigneeIds || []).map((x) => ppl[x]).filter(Boolean), comments: commentCount, createdAt: i.createdAt, updatedAt: i.updatedAt,
})

async function platformMap() {
    const rows = await prisma.crmPlatform.findMany()
    return Object.fromEntries(rows.map((p) => [p.id, { id: p.id, name: p.name, url: p.url || '', kind: p.kind, active: p.active }]))
}

export async function issueLookups() {
    const session = await requirePermission('issues', 'view')
    const a = await access(session)
    const [staff, platforms, issues] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmPlatform.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmIssue.findMany({ select: { labels: true }, take: 2000 }),
    ])
    const labels = [...new Set(issues.flatMap((i) => i.labels || []))].sort()
    return {
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })).sort((x, y) => x.name.localeCompare(y.name)),
        platforms: platforms.map((p) => ({ id: p.id, name: p.name, url: p.url || '', kind: p.kind, description: p.description || '', active: p.active })),
        labels, me: a.staffId, can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete') },
    }
}

export async function listIssues(p = {}) {
    const session = await requirePermission('issues', 'view')
    const a = await access(session)
    const base = [visible(a)]
    if (p.mine === '1' && a.staffId) base.push({ OR: [{ assigneeIds: { has: a.staffId } }, { reporterId: a.staffId }] })
    if (oid(p.assignee)) base.push({ assigneeIds: { has: p.assignee } })
    if (oid(p.platform)) base.push({ platformId: p.platform })
    if (p.priority in PRIORITY) base.push({ priority: p.priority })
    if (p.type in TYPE) base.push({ type: p.type })
    if (p.label) base.push({ labels: { has: String(p.label) } })
    const q = clean(p.query, 100)
    if (q) base.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }, ...(/^#?\d+$/.test(q) ? [{ number: parseInt(q.replace('#', ''), 10) }] : [])] })
    // counts per status ignore the status filter itself
    const grouped = await prisma.crmIssue.groupBy({ by: ['status'], where: { AND: base }, _count: { _all: true } })
    const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]))
    const and = [...base]
    if (p.status === 'active') and.push({ status: { in: ['open', 'in_progress', 'in_review'] } })
    else if (p.status in STATUS) and.push({ status: p.status })
    const size = Math.min(Math.max(parseInt(p.pageSize, 10) || 25, 5), 100)
    const page = Math.max(parseInt(p.page, 10) || 1, 1)
    const order = { priority: [{ createdAt: 'desc' }], updated: [{ updatedAt: 'desc' }], due: [{ dueDate: 'asc' }], number: [{ number: 'desc' }] }[p.sort] || [{ updatedAt: 'desc' }]
    const [total, rows] = await Promise.all([
        prisma.crmIssue.count({ where: { AND: and } }),
        prisma.crmIssue.findMany({ where: { AND: and }, orderBy: order, skip: (page - 1) * size, take: size }),
    ])
    const [ppl, plats, comments] = await Promise.all([
        people(rows.flatMap((i) => [...(i.assigneeIds || []), i.reporterId].filter(Boolean))),
        platformMap(),
        prisma.crmIssueComment.groupBy({ by: ['issueId'], where: { issueId: { in: rows.map((r) => r.id) }, kind: 'comment' }, _count: { _all: true } }),
    ])
    const cc = Object.fromEntries(comments.map((c) => [c.issueId, c._count._all]))
    return { list: rows.map((i) => card(i, ppl, plats, cc[i.id] || 0)), total, counts, can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete') } }
}

export async function getIssue(id) {
    const session = await requirePermission('issues', 'view')
    const a = await access(session)
    if (!oid(id)) throw fail('Issue not found', 404)
    const i = await prisma.crmIssue.findFirst({ where: { AND: [{ id }, visible(a)] } })
    if (!i) throw fail('Issue not found', 404)
    const feed = await prisma.crmIssueComment.findMany({ where: { issueId: id }, orderBy: { createdAt: 'asc' } })
    const ppl = await people([...(i.assigneeIds || []), i.reporterId, ...feed.map((c) => c.staffId)].filter(Boolean))
    const plats = await platformMap()
    return {
        issue: { ...card(i, ppl, plats, feed.filter((c) => c.kind === 'comment').length), description: i.description || '', assigneeIds: i.assigneeIds || [] },
        feed: feed.map((c) => ({ id: c.id, kind: c.kind, body: c.body || '', meta: c.meta || null, staff: ppl[c.staffId] || null, createdAt: c.createdAt, mine: !!a.staffId && c.staffId === a.staffId })),
        can: { edit: a.can('edit'), delete: a.can('delete'), comment: a.can('view') || a.can('view_own') },
    }
}

async function nextNumber() {
    const last = await prisma.crmIssue.findFirst({ orderBy: { number: 'desc' }, select: { number: true } })
    return (last?.number || 0) + 1
}

const names = (ppl, ids) => ids.map((x) => ppl[x]?.name).filter(Boolean)

export async function saveIssue(body, id) {
    const session = await requirePermission('issues', id ? 'edit' : 'create')
    const a = await access(session)
    const old = id ? await prisma.crmIssue.findFirst({ where: { AND: [{ id: oid(id) || NONE }, visible(a)] } }) : null
    if (id && !old) throw fail('Issue not found', 404)
    const data = {}
    if (!id || body.title !== undefined) { data.title = clean(body.title, 200); if (!data.title) throw fail('Give the issue a title') }
    if (body.description !== undefined) data.description = clean(body.description, 20000) || null
    if (body.status !== undefined) { if (!(body.status in STATUS)) throw fail('Unknown status'); data.status = body.status; data.resolvedAt = ['resolved', 'closed'].includes(body.status) ? old?.resolvedAt || new Date() : null }
    if (body.priority !== undefined) { if (!(body.priority in PRIORITY)) throw fail('Unknown priority'); data.priority = body.priority }
    if (body.type !== undefined) { if (!(body.type in TYPE)) throw fail('Unknown type'); data.type = body.type }
    if (body.platformId !== undefined) {
        if (body.platformId && !(await prisma.crmPlatform.findUnique({ where: { id: oid(body.platformId) || NONE } }))) throw fail('Platform not found')
        data.platformId = body.platformId || null
    }
    if (body.pageUrl !== undefined) data.pageUrl = clean(body.pageUrl, 500) || null
    if (body.labels !== undefined) data.labels = [...new Set((body.labels || []).map((l) => clean(l, 30)).filter(Boolean))].slice(0, 12)
    if (body.assigneeIds !== undefined) data.assigneeIds = [...new Set((body.assigneeIds || []).filter(oid))]
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
    let issue
    if (!id) {
        issue = await prisma.crmIssue.create({ data: { ...data, number: await nextNumber(), reporterId: a.staffId || null } })
        await prisma.crmIssueComment.create({ data: { issueId: issue.id, staffId: a.staffId || null, kind: 'event', meta: { field: 'created' } } })
        return { id: issue.id, number: issue.number }
    }
    issue = await prisma.crmIssue.update({ where: { id: old.id }, data })
    // what changed, for the history
    const events = []
    const plats = await platformMap()
    const ppl = await people([...(old.assigneeIds || []), ...(issue.assigneeIds || [])])
    for (const f of ['status', 'priority', 'type']) if (data[f] !== undefined && data[f] !== old[f]) events.push({ field: f, from: old[f], to: data[f] })
    if (data.title !== undefined && data.title !== old.title) events.push({ field: 'title', from: old.title, to: data.title })
    if (data.platformId !== undefined && (data.platformId || null) !== (old.platformId || null)) events.push({ field: 'platform', from: plats[old.platformId]?.name || '', to: plats[data.platformId]?.name || '' })
    if (data.dueDate !== undefined && String(data.dueDate?.toISOString() || '') !== String(old.dueDate?.toISOString() || '')) events.push({ field: 'dueDate', from: old.dueDate ? old.dueDate.toISOString().slice(0, 10) : '', to: data.dueDate ? data.dueDate.toISOString().slice(0, 10) : '' })
    if (data.assigneeIds !== undefined) {
        const add = data.assigneeIds.filter((x) => !(old.assigneeIds || []).includes(x)), rem = (old.assigneeIds || []).filter((x) => !data.assigneeIds.includes(x))
        if (add.length || rem.length) events.push({ field: 'assignees', added: names(ppl, add), removed: names(ppl, rem) })
    }
    if (data.labels !== undefined && data.labels.join('|') !== (old.labels || []).join('|')) events.push({ field: 'labels', from: (old.labels || []).join(', '), to: data.labels.join(', ') })
    if (events.length) await prisma.crmIssueComment.createMany({ data: events.map((meta) => ({ issueId: id, staffId: a.staffId || null, kind: 'event', meta })) })
    return { id: issue.id, number: issue.number }
}

export async function addIssueComment(id, text) {
    const session = await requirePermission('issues', 'view')
    const a = await access(session)
    const i = await prisma.crmIssue.findFirst({ where: { AND: [{ id: oid(id) || NONE }, visible(a)] } })
    if (!i) throw fail('Issue not found', 404)
    const body = clean(text, 5000)
    if (!body) throw fail('Write a comment first')
    await prisma.crmIssueComment.create({ data: { issueId: i.id, staffId: a.staffId || null, kind: 'comment', body } })
    await prisma.crmIssue.update({ where: { id: i.id }, data: { updatedAt: new Date() } })
    return { success: true }
}

export async function deleteIssueComment(id, commentId) {
    const session = await requirePermission('issues', 'view')
    const a = await access(session)
    const c = await prisma.crmIssueComment.findFirst({ where: { id: oid(commentId) || NONE, issueId: oid(id) || NONE, kind: 'comment' } })
    if (!c) throw fail('Comment not found', 404)
    if (!(a.admin || a.can('delete') || (a.staffId && c.staffId === a.staffId))) throw fail('Forbidden', 403)
    await prisma.crmIssueComment.delete({ where: { id: c.id } })
    return { success: true }
}

export async function deleteIssue(id) {
    const session = await requirePermission('issues', 'delete')
    const a = await access(session)
    const i = await prisma.crmIssue.findFirst({ where: { AND: [{ id: oid(id) || NONE }, visible(a)] } })
    if (!i) throw fail('Issue not found', 404)
    await prisma.crmIssueComment.deleteMany({ where: { issueId: i.id } })
    await prisma.crmIssue.delete({ where: { id: i.id } })
    return { success: true }
}

/* ---------- platforms and websites ---------- */
export async function savePlatform(body, id) {
    await requirePermission('issues', id ? 'edit' : 'create')
    const name = clean(body.name, 80)
    if (!name) throw fail('Give the platform a name')
    const url = clean(body.url, 300)
    if (url && !/^https?:\/\//i.test(url)) throw fail('The address must start with https://')
    const data = { name, url: url || null, kind: body.kind in KIND ? body.kind : 'website', description: clean(body.description, 500) || null, active: body.active !== false, clientId: oid(body.clientId) || null }
    const row = id ? await prisma.crmPlatform.update({ where: { id: oid(id) || NONE }, data }).catch(() => { throw fail('Platform not found', 404) }) : await prisma.crmPlatform.create({ data })
    return { id: row.id }
}

export async function deletePlatform(id) {
    await requirePermission('issues', 'delete')
    const used = await prisma.crmIssue.count({ where: { platformId: oid(id) || NONE } })
    if (used) throw fail(`${used} issue${used === 1 ? '' : 's'} belong to it: turn it off instead of deleting it`)
    await prisma.crmPlatform.delete({ where: { id: oid(id) || NONE } }).catch(() => { throw fail('Platform not found', 404) })
    return { success: true }
}

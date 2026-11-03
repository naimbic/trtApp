import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, isCrmAdmin, hasCap } from '@/lib/crm/permissions'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { storeRich } from '@/lib/crm/richText'
import { leadsData, clientsData, incomeData } from '@/lib/crm/ai/aiData'
import { chat } from '@/lib/crm/ai/providers'
import { resolveAiForJob } from '@/lib/crm/ai/aiSettings'
import { ruleIdeas, stamp } from '@/lib/crm/growRules'
import { emit } from '@/lib/crm/webhooks'
import { CATALOG } from '@/lib/crm/growthCatalog'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const DAY = 86400000
export const CATEGORIES = ['leads', 'sales', 'income', 'team', 'skills', 'tech', 'marketing', 'ops', 'other']
export const PERIODS = ['daily', 'weekly', 'monthly', 'once']
export const STATUSES = ['new', 'accepted', 'doing', 'done', 'dismissed']
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

/** Who accepts, refuses and moves ideas: administrators, and the people given "Accept or refuse ideas" in Grow. Editing an idea is not enough. */
const canDecide = (authority) => isCrmAdmin(authority) || hasCap(authority, 'grow', 'approve')
const NOT_DECIDER = 'Only an administrator accepts, refuses or moves an idea'

async function gate(cap = 'view') {
    const session = await requirePermission('grow', cap)
    return { session, authority: session.user.authority || [], staffId: await getStaffId(session), name: session.user.name || session.user.email }
}

/* ============================================================ figures */
async function taskFigures() {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    const [open, done7, staff] = await Promise.all([
        prisma.crmTask.findMany({ where: { status: { not: 5 } }, select: { dueDate: true, assignees: { select: { staffId: true } } }, take: 30000 }),
        prisma.crmTask.count({ where: { status: 5, dateFinished: { gte: new Date(Date.now() - 7 * DAY) } } }),
        prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true, email: true } }),
    ])
    const overdue = open.filter((t) => t.dueDate && +new Date(t.dueDate) < +today)
    const by = {}
    for (const t of overdue) for (const a of t.assignees) by[a.staffId] = (by[a.staffId] || 0) + 1
    const names = Object.fromEntries(staff.map((s) => [s.id, staffName(s)]))
    return { open: open.length, overdue: overdue.length, completedLast7Days: done7, unassigned: open.filter((t) => !t.assignees.length).length, overdueByPerson: Object.entries(by).map(([id, count]) => ({ name: names[id] || '?', count })).sort((a, b) => b.count - a.count).slice(0, 8) }
}

async function ticketFigures() {
    const statuses = await prisma.crmTicketStatus.findMany({ select: { id: true, name: true, legacyId: true } })
    const closedIds = statuses.filter((s) => s.legacyId === 5 || /clos|resolv/i.test(s.name)).map((s) => s.id)
    const rows = await prisma.crmTicket.findMany({ where: { statusId: { notIn: closedIds.length ? closedIds : ['000000000000000000000000'] } }, select: { adminRead: true, lastReply: true, createdAt: true }, take: 20000 })
    const rated = await prisma.crmTicket.findMany({ where: { rating: { not: null }, ratedAt: { gte: new Date(Date.now() - 90 * DAY) } }, select: { rating: true }, take: 5000 })
    return { open: rows.length, waitingOver24h: rows.filter((t) => !t.adminRead && Date.now() - +new Date(t.lastReply || t.createdAt) > DAY).length, ratingLast90Days: rated.length ? Math.round((rated.reduce((a, r) => a + r.rating, 0) / rated.length) * 10) / 10 : null, ratings: rated.length }
}

async function proposalFigures() {
    const rows = await prisma.crmProposal.findMany({ where: { status: { in: [1, 4, 5] }, date: { lt: new Date(Date.now() - 7 * DAY) } }, select: { id: true, total: true }, take: 5000 })
    return { sentNoAnswerOver7d: rows.length }
}

async function teamFigures() {
    const [staff, goals] = await Promise.all([prisma.crmStaff.findMany({ where: { active: true, admin: false }, select: { id: true } }), prisma.crmSkillGoal.findMany({ select: { staffId: true, status: true, primeAmount: true, primePaid: true, supportAmount: true } })])
    const live = new Set(goals.filter((g) => ['planned', 'learning'].includes(g.status)).map((g) => g.staffId))
    const owed = goals.filter((g) => g.status === 'passed' && g.primeAmount && !g.primePaid)
    return { members: staff.length, withoutGoal: staff.filter((s) => !live.has(s.id)).length, goalsLearning: goals.filter((g) => g.status === 'learning').length, passed: goals.filter((g) => g.status === 'passed').length, primesToPay: owed.length, primesToPayAmount: owed.reduce((a, g) => a + (g.primeAmount || 0), 0) }
}

/** Everything the routine and the dashboard know about the company, in one object. Totals and rates only: nothing personal. */
/** Credit and grant programs not yet on the ideas board. */
async function programFigures() {
    const done = new Set((await prisma.crmGrowIdea.findMany({ where: { fingerprint: { startsWith: 'program:' } }, select: { fingerprint: true } })).map((i) => i.fingerprint))
    const open = CATALOG.programs.filter((p) => !done.has(`program:${p.key}`))
    return { total: CATALOG.programs.length, untracked: open.length, names: open.slice(0, 4).map((p) => p.title) }
}

export async function gatherFigures() {
    const [leads, clients, income, tasks, tickets, proposals, team, programs] = await Promise.all([leadsData(), clientsData(), incomeData(), taskFigures(), ticketFigures(), proposalFigures(), teamFigures(), programFigures()])
    return { leads, clients, income, tasks, tickets, proposals, team, programs }
}

export async function growOverview() {
    await gate('view')
    const [figures, ideas] = await Promise.all([gatherFigures(), prisma.crmGrowIdea.groupBy({ by: ['status'], _count: { _all: true } })])
    return { generatedAt: new Date().toISOString(), ...figures, ideas: Object.fromEntries(ideas.map((i) => [i.status, i._count._all])) }
}

/* ============================================================ ideas */
const shapeIdea = (i, people, task) => ({ id: i.id, title: i.title, body: i.body || '', category: i.category, period: i.period, source: i.source, status: i.status, priority: i.priority, tags: i.tags, assignees: (i.assigneeIds || []).map((id) => people[id]).filter(Boolean), assigneeIds: i.assigneeIds, dueDate: i.dueDate, taskId: i.taskId, taskStatus: task?.status ?? null, url: i.sourceUrl || '', createdAt: i.createdAt, resolvedAt: i.resolvedAt })

async function peopleMap(ids) {
    const list = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(ids.filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
    return Object.fromEntries(list.map((s) => [s.id, { id: s.id, name: staffName(s) }]))
}

export async function listIdeas(q = {}) {
    const g = await gate('view')
    const and = []
    for (const k of ['status', 'category', 'period', 'source']) if (q[k]) and.push({ [k]: String(q[k]) })
    if (q.tag) and.push({ tags: { has: String(q.tag) } })
    if (oid(q.assignee)) and.push({ assigneeIds: { has: q.assignee } })
    if (q.mine === '1' && g.staffId) and.push({ assigneeIds: { has: g.staffId } })
    if (q.q) and.push({ OR: [{ title: { contains: String(q.q), mode: 'insensitive' } }, { body: { contains: String(q.q), mode: 'insensitive' } }] })
    const rows = await prisma.crmGrowIdea.findMany({ where: and.length ? { AND: and } : {}, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: 500 })
    // an idea made into a task is done when its task is complete
    const taskIds = rows.map((r) => r.taskId).filter(Boolean)
    const tasks = taskIds.length ? await prisma.crmTask.findMany({ where: { id: { in: taskIds } }, select: { id: true, status: true } }) : []
    const tMap = Object.fromEntries(tasks.map((t) => [t.id, t]))
    for (const r of rows) if (r.taskId && tMap[r.taskId]?.status === 5 && !['done', 'dismissed'].includes(r.status)) { r.status = 'done'; r.resolvedAt = new Date(); await prisma.crmGrowIdea.update({ where: { id: r.id }, data: { status: 'done', resolvedAt: r.resolvedAt } }).catch(() => {}) }
    const people = await peopleMap(rows.flatMap((r) => r.assigneeIds || []))
    const all = await prisma.crmGrowIdea.findMany({ select: { tags: true, status: true } })
    const tags = {}; for (const i of all) for (const t of i.tags) tags[t] = (tags[t] || 0) + 1
    const counts = {}; for (const i of all) counts[i.status] = (counts[i.status] || 0) + 1
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true } })
    return { list: rows.map((r) => shapeIdea(r, people, tMap[r.taskId])), counts, tags: Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name, n]) => ({ name, n })), staff: staff.map((s) => ({ id: s.id, name: staffName(s) })), can: { create: hasCap(g.authority, 'grow', 'create'), edit: hasCap(g.authority, 'grow', 'edit'), decide: canDecide(g.authority), delete: hasCap(g.authority, 'grow', 'delete'), task: hasCap(g.authority, 'tasks', 'create') } }
}

const cleanTags = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(',')).map((t) => String(t).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30)).filter(Boolean))].slice(0, 10)

export async function saveIdea(body = {}, id = null) {
    const g = await gate(id ? 'edit' : 'create')
    const data = {}
    if (body.title !== undefined || !id) { const t = String(body.title || '').trim().slice(0, 200); if (!t) throw fail('Give the idea a title'); data.title = t }
    if (body.body !== undefined) data.body = storeRich(body.body, 10000) || null
    if (body.category !== undefined) { if (!CATEGORIES.includes(body.category)) throw fail('Unknown category'); data.category = body.category }
    if (body.period !== undefined) { if (!PERIODS.includes(body.period)) throw fail('Unknown period'); data.period = body.period }
    if (body.priority !== undefined) { if (![1, 2, 3].includes(+body.priority)) throw fail('Priority is 1 to 3'); data.priority = +body.priority }
    if (body.tags !== undefined) data.tags = cleanTags(body.tags)
    if (body.assigneeIds !== undefined) data.assigneeIds = (Array.isArray(body.assigneeIds) ? body.assigneeIds : []).map(oid).filter(Boolean)
    if (body.dueDate !== undefined) { const d = body.dueDate ? new Date(body.dueDate) : null; if (d && Number.isNaN(+d)) throw fail('The date is not valid'); data.dueDate = d }
    if (body.url !== undefined) data.sourceUrl = String(body.url || '').trim().slice(0, 400) || null
    if (body.status !== undefined) { if (!STATUSES.includes(body.status)) throw fail('Unknown status'); data.status = body.status; data.resolvedAt = ['done', 'dismissed'].includes(body.status) ? new Date() : null }
    if (id) {
        const prev = oid(id) && (await prisma.crmGrowIdea.findUnique({ where: { id } }))
        if (!prev) throw fail('Idea not found', 404)
        if (data.status !== undefined && data.status !== prev.status && !canDecide(g.authority)) throw fail(NOT_DECIDER, 403)
        await prisma.crmGrowIdea.update({ where: { id }, data })
        const added = (data.assigneeIds || []).filter((x) => !(prev.assigneeIds || []).includes(x) && x !== g.staffId)
        await notifyAssigned(added, data.title || prev.title, id, g.name, g.staffId)
        return { success: true, id }
    }
    if (data.status && data.status !== 'new' && !canDecide(g.authority)) throw fail(NOT_DECIDER, 403) // a new idea starts as new: somebody else decides
    const row = await prisma.crmGrowIdea.create({ data: { category: 'other', period: 'once', priority: 2, tags: [], assigneeIds: [], ...data, source: 'manual', addedFrom: g.staffId } })
    await notifyAssigned((row.assigneeIds || []).filter((x) => x !== g.staffId), row.title, row.id, g.name, g.staffId)
    emit('idea.created', { id: row.id, title: row.title, category: row.category })
    return { success: true, id: row.id }
}

async function notifyAssigned(ids, title, ideaId, byName, byId) {
    for (const to of ids) await prisma.crmNotification.create({ data: { toUserId: to, fromUserId: byId || undefined, fromFullName: byName || null, description: `Grow: ${title}`.slice(0, 200), link: `/crm/grow?tab=ideas&idea=${ideaId}`, additionalData: 'grow-assigned', isRead: false } }).catch(() => {})
}

export async function deleteIdea(id) {
    await gate('delete')
    if (!oid(id)) throw fail('Idea not found', 404)
    await prisma.crmGrowComment.deleteMany({ where: { ideaId: id } })
    await prisma.crmGrowIdea.delete({ where: { id } }).catch(() => { throw fail('Idea not found', 404) })
    return { success: true }
}

export async function ideaComments(id) {
    await gate('view')
    if (!oid(id)) throw fail('Idea not found', 404)
    return { comments: (await prisma.crmGrowComment.findMany({ where: { ideaId: id }, orderBy: { createdAt: 'asc' } })).map((c) => ({ id: c.id, body: c.body, author: c.authorName || '', staffId: c.staffId, createdAt: c.createdAt })) }
}

export async function addComment(id, body) {
    const g = await gate('view')
    const text = storeRich(String(body?.body || ''), 12000)
    if (!text) throw fail('Write your comment first')
    if (!oid(id) || !(await prisma.crmGrowIdea.findUnique({ where: { id }, select: { id: true } }))) throw fail('Idea not found', 404)
    await prisma.crmGrowComment.create({ data: { ideaId: id, staffId: g.staffId, authorName: g.name, body: text } })
    return { success: true }
}

export async function deleteComment(id, commentId) {
    const g = await gate('view')
    const c = oid(commentId) && (await prisma.crmGrowComment.findFirst({ where: { id: commentId, ideaId: id } }))
    if (!c) throw fail('Comment not found', 404)
    if (c.staffId !== g.staffId && !hasCap(g.authority, 'grow', 'delete')) throw fail('You can only delete your own comments', 403)
    await prisma.crmGrowComment.delete({ where: { id: commentId } })
    return { success: true }
}

/** Makes a task from an idea (name, description, priority, people, date) and links the two. Needs Grow edit and permission to create tasks. */
export async function ideaToTask(id, body = {}) {
    const g = await gate('edit')
    if (!hasCap(g.authority, 'tasks', 'create')) throw fail('You are not allowed to create tasks', 403)
    const idea = oid(id) && (await prisma.crmGrowIdea.findUnique({ where: { id } }))
    if (!idea) throw fail('Idea not found', 404)
    if (idea.status === 'new' && !canDecide(g.authority)) throw fail(NOT_DECIDER, 403) // making a task accepts the idea
    if (idea.taskId && (await prisma.crmTask.findUnique({ where: { id: idea.taskId }, select: { id: true } }))) throw fail('This idea already has a task', 409)
    const assignees = [...new Set(((Array.isArray(body.assigneeIds) && body.assigneeIds.length ? body.assigneeIds : idea.assigneeIds) || []).map(oid).filter(Boolean))]
    const due = body.dueDate ? new Date(body.dueDate) : idea.dueDate
    if (due && Number.isNaN(+new Date(due))) throw fail('The date is not valid')
    const plain = String(idea.body || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    const task = await prisma.crmTask.create({ data: { name: idea.title.slice(0, 250), description: storeRich(`${plain}\n\nFrom a Grow idea: ${process.env.PUBLIC_URL || ''}/crm/grow?tab=ideas&idea=${idea.id}`, 20000), priority: Math.min(idea.priority, 3), status: 1, startDate: new Date(), dueDate: due ? new Date(due) : null, addedFrom: g.staffId } })
    for (const staffId of assignees) await prisma.crmTaskAssigned.create({ data: { taskId: task.id, staffId, assignedFrom: g.staffId } })
    await prisma.crmGrowIdea.update({ where: { id }, data: { taskId: task.id, status: idea.status === 'new' ? 'doing' : idea.status, assigneeIds: assignees.length ? assignees : idea.assigneeIds } })
    for (const to of assignees.filter((x) => x !== g.staffId)) await prisma.crmNotification.create({ data: { toUserId: to, fromUserId: g.staffId || undefined, fromFullName: g.name, description: `New task: ${idea.title}`.slice(0, 200), link: `/crm/tasks/${task.id}`, additionalData: 'grow-task', isRead: false } }).catch(() => {})
    emit('task.created', { id: task.id, name: task.name, due_date: task.dueDate })
    return { success: true, taskId: task.id }
}

/* ============================================================ the routine */
const SETTINGS_DEFAULT = { enabled: true, daily: true, weekly: true, monthly: true, ai: true, webSearch: true, lang: 'en' }

export async function getRoutine() {
    await gate('view')
    const o = await getOptions(['grow_settings', 'grow_last_daily', 'grow_last_weekly', 'grow_last_monthly'])
    let s = {}; try { s = JSON.parse(o('grow_settings', '{}')) || {} } catch { s = {} }
    const ai = await resolveAiForJob().catch(() => null)
    return { settings: { ...SETTINGS_DEFAULT, ...s }, last: { daily: o('grow_last_daily') || null, weekly: o('grow_last_weekly') || null, monthly: o('grow_last_monthly') || null }, ai: ai ? { provider: ai.provider, model: ai.model, webSearch: ai.provider === 'anthropic' } : null, stamps: { daily: stamp('daily'), weekly: stamp('weekly'), monthly: stamp('monthly') } }
}

export async function saveRoutine(body = {}) {
    await gate('edit')
    const cur = (await getRoutine()).settings
    const next = { ...cur }
    for (const k of ['enabled', 'daily', 'weekly', 'monthly', 'ai', 'webSearch']) if (body[k] !== undefined) next[k] = !!body[k]
    if (body.lang !== undefined) { if (!['en', 'fr', 'es', 'ja', 'ar'].includes(body.lang)) throw fail('Unknown language'); next.lang = body.lang }
    await setOptions({ grow_settings: JSON.stringify(next) })
    return { success: true }
}

const LANG_NAME = { en: 'English', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' }
const NUM = { daily: 3, weekly: 4, monthly: 5 }

/** Ideas written by the AI from the figures (and, for the Claude provider, a web search for what is new). Returns [] when the AI is off or fails. */
export async function aiIdeas(period, figures, settings, lines = []) {
    const ai = await resolveAiForJob().catch(() => null)
    if (!ai) { lines.push('AI: no API key in Settings → AI, only the rules ran'); return [] }
    const search = settings.webSearch && ai.provider === 'anthropic' && period !== 'daily'
    const system = `You are a practical growth advisor for a small digital agency (websites, Google and Meta ads, SEO, social media, automation, AI services) that serves French- and Arabic-speaking markets. ${ai.systemPrompt ? `About the company: ${ai.systemPrompt.slice(0, 1200)}` : ''}
You receive the company figures as JSON. Use ONLY those figures for any number; never invent numbers. Give concrete, small, doable ideas (what to do, who, when), not generic advice. ${search ? 'Search the web for what is new and useful in digital marketing, advertising platforms, SEO and AI tools this ' + (period === 'monthly' ? 'month' : 'week') + ' and for one opportunity to earn more; cite the page in "url".' : ''}
Answer in ${LANG_NAME[settings.lang] || 'English'}. Return ONLY a JSON array (no text around it) of at most ${NUM[period] || 3} objects: {"title": max 120 chars, "body": max 600 chars with the steps, "category": one of ${CATEGORIES.join('|')}, "priority": 1-3, "url": optional source page}.`
    const user = `Period: ${period}. Today: ${new Date().toISOString().slice(0, 10)}.\nFigures (JSON):\n${JSON.stringify({ leads: figures.leads?.attention && { open: figures.leads.open, converted: figures.leads.converted, conversionRatePct: figures.leads.conversionRatePct, attention: figures.leads.attention, sources: (figures.leads.sources || []).slice(0, 6) }, clients: figures.clients && { clientsWithOverdue: figures.clients.clientsWithOverdue?.count, totalOutstanding: figures.clients.totalOutstanding, dormant: figures.clients.dormantOverAYear?.count, top5SharePct: figures.clients.top5SharePct }, income: figures.income && { currency: figures.income.mainCurrency, yearToDate: figures.income.yearToDate, last12Months: figures.income.last12Months }, tasks: figures.tasks, tickets: figures.tickets, team: figures.team }).slice(0, 12000)}`
    let text
    try { text = (await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: search ? 3500 : 2200, webSearch: search ? 3 : 0, timeoutMs: 150000 })).text } catch (e) { lines.push(`AI: ${e.message}`); return [] }
    let arr
    try { const a = text.indexOf('['), b = text.lastIndexOf(']'); arr = JSON.parse(text.slice(a, b + 1)) } catch { lines.push('AI: the answer could not be read as ideas'); return [] }
    const s = stamp(period)
    return (Array.isArray(arr) ? arr : []).slice(0, NUM[period] || 3).map((x) => ({ title: String(x.title || '').trim().slice(0, 200), body: String(x.body || '').trim().slice(0, 1500), category: CATEGORIES.includes(x.category) ? x.category : 'other', priority: [1, 2, 3].includes(+x.priority) ? +x.priority : 2, url: /^https?:\/\//.test(x.url || '') ? String(x.url).slice(0, 400) : '', period, tags: ['ai'], fingerprint: `ai:${period}:${s}:${String(x.title || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60)}` })).filter((x) => x.title)
}

/** Writes the ideas of one period (rules, then the AI when it is on and has a key). Returns the lines of what happened. */
export async function runPeriod(period, { dry = false, settings } = {}) {
    const lines = []
    const st = settings || (await getRoutine()).settings
    const figures = await gatherFigures()
    const candidates = [...ruleIdeas(period, figures, { lang: st.lang }).map((c) => ({ ...c, source: 'rule' }))]
    if (st.ai) candidates.push(...(await aiIdeas(period, figures, st, lines)).map((c) => ({ ...c, source: 'ai' })))
    const have = new Set((await prisma.crmGrowIdea.findMany({ where: { fingerprint: { in: candidates.map((c) => c.fingerprint) } }, select: { fingerprint: true } })).map((r) => r.fingerprint))
    const fresh = candidates.filter((c) => !have.has(c.fingerprint))
    if (dry) { lines.push(`[preview] ${fresh.length} new ${period} idea(s) would be written (${candidates.length - fresh.length} already there)`); return { lines, created: 0 } }
    for (const c of fresh) {
        const row = await prisma.crmGrowIdea.create({ data: { title: c.title, body: storeRich(c.body, 10000) || null, category: c.category, period, source: c.source, priority: c.priority || 2, tags: c.tags || [], sourceUrl: c.url || null, fingerprint: c.fingerprint } })
        emit('idea.created', { id: row.id, title: row.title, category: row.category })
    }
    lines.push(`Grow ${period}: ${fresh.length} new idea(s)${candidates.length - fresh.length ? `, ${candidates.length - fresh.length} already written` : ''}`)
    if (fresh.length) {
        const admins = await prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true } })
        for (const a of admins) await prisma.crmNotification.create({ data: { toUserId: a.id, fromFullName: 'Grow', description: `Grow: ${fresh.length} new ${period} idea(s)`, link: '/crm/grow?tab=ideas', additionalData: 'grow-ideas', isRead: false } }).catch(() => {})
    }
    return { lines, created: fresh.length }
}

/** The automatic task: once a day the daily ideas, once a week the weekly ones, once a month the monthly ones. */
export async function growJob({ lines, dry }) {
    const r = await getRoutine()
    if (!r.settings.enabled) { lines.push('Grow routine: switched off in Grow → Routine'); return }
    for (const period of ['daily', 'weekly', 'monthly']) {
        if (!r.settings[period]) continue
        if (r.last[period] === r.stamps[period] && !dry) continue
        try { const out = await runPeriod(period, { dry, settings: r.settings }); lines.push(...out.lines); if (!dry) await setOptions({ [`grow_last_${period}`]: r.stamps[period] }) } catch (e) { lines.push(`! Grow ${period} failed: ${e.message}`) }
    }
}

/** "Run it now" (Grow edit): one period, on demand. */
export async function runNow(body = {}) {
    await gate('edit')
    const period = ['daily', 'weekly', 'monthly'].includes(body.period) ? body.period : 'daily'
    const out = await runPeriod(period, { dry: !!body.dry })
    if (!body.dry) await setOptions({ [`grow_last_${period}`]: stamp(period) })
    return out
}

/* ============================================================ credits, grants and partner programs */
/** The curated programs, and which of them are already on the ideas board (with the state of that idea). */
export async function listPrograms() {
    const g = await gate('view')
    const rows = await prisma.crmGrowIdea.findMany({ where: { fingerprint: { startsWith: 'program:' } }, select: { id: true, fingerprint: true, status: true, assigneeIds: true, taskId: true } })
    const tracked = Object.fromEntries(rows.map((r) => [r.fingerprint.slice('program:'.length), { ideaId: r.id, status: r.status, assigned: (r.assigneeIds || []).length, taskId: r.taskId || null }]))
    return { programs: CATALOG.programs, tracked, can: { create: hasCap(g.authority, 'grow', 'create') || isCrmAdmin(g.authority) } }
}

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Puts a program on the ideas board (once): the steps to apply, to assign, comment and turn into tasks. */
export async function trackProgram(key) {
    const g = await gate('create')
    const prog = CATALOG.programs.find((p) => p.key === key)
    if (!prog) throw fail('Program not found', 404)
    const fingerprint = `program:${prog.key}`
    const have = await prisma.crmGrowIdea.findFirst({ where: { fingerprint }, select: { id: true } })
    if (have) return { success: true, id: have.id, existing: true }
    const html = `<p><strong>${esc(prog.provider)}</strong>: ${esc(prog.amount)}</p><p>${esc(prog.what)}</p><p><strong>Who can apply:</strong> ${esc(prog.eligibility)}</p><p><strong>For us:</strong> ${esc(prog.fit)}</p><p><strong>Steps:</strong></p><ol>${prog.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol><p>Terms change often: always confirm on the official page before applying.</p>`
    const row = await prisma.crmGrowIdea.create({ data: { title: `Apply: ${prog.title}`.slice(0, 200), body: storeRich(html, 10000), category: 'income', period: 'once', priority: ['credits', 'accelerator', 'partner'].includes(prog.kind) ? 3 : 2, tags: cleanTags(['programs', prog.kind, prog.provider]), assigneeIds: [], source: 'manual', sourceUrl: prog.url, fingerprint, addedFrom: g.staffId } })
    emit('idea.created', { id: row.id, title: row.title, category: row.category })
    return { success: true, id: row.id, existing: false }
}

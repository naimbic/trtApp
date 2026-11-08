import { cleanOffer, offerTotals, offerPrice } from '@/lib/crm/ideaOffer'
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { scope as clientScope } from '@/lib/crm/clientsApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { sendTemplate } from '@/lib/crm/mailer'
import { notifyNotice } from '@/lib/crm/notifyMail'
import { publicBase } from '@/lib/crm/shortLinks'
import { realPicture } from '@/lib/crm/pictures'
import { emit } from '@/lib/crm/webhooks'
import { notifyComment, notifyMentions } from '@/lib/crm/mentionsApi'
import { mentionedIds } from '@/lib/crm/mentionsCalc'
import { pushToContacts } from '@/lib/crm/push'
import { getIdeaCategories } from '@/lib/crm/ideaCategories'
import { FALLBACK_CATEGORY } from '@/lib/crm/ideaCategoriesCalc'
import { emailOff } from '@/lib/crm/clientEmailAccess'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** The columns of the board, left to right. A draft is internal; the client sees the others (when the idea is visible). */
export const STATUSES = ['draft', 'proposed', 'interested', 'approved', 'doing', 'done', 'declined']
/** What a client may answer, and the column it moves the idea to. */
export const ANSWERS = { interested: 'interested', approved: 'approved', declined: 'declined' }
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

async function gate(cap) {
    const session = await requirePermission('client_ideas', cap)
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), name: session.user.name || session.user.email }
}

/** The client, when this person may see it (view own: only the clients they administer). */
async function clientOf(g, clientId) {
    if (!oid(clientId)) throw fail('Client not found', 404)
    const c = await prisma.crmClient.findFirst({ where: { id: clientId, ...(await clientScope(g.session)) } })
    if (!c) throw fail('Client not found', 404)
    return c
}

const shape = (i, extra = {}) => ({
    id: i.id, clientId: i.clientId, title: i.title, body: i.body || '', category: i.category, status: i.status, visible: !!i.visible, priority: i.priority, impact: i.impact, effort: i.effort,
    gain: i.gain || '', price: i.price ?? null, offer: i.offer || null, totals: i.offer ? offerTotals(i.offer) : null, currencyId: i.currencyId || null, dueDate: i.dueDate, source: i.source, sources: i.sources || [], tags: i.tags || [], assigneeIds: i.assigneeIds || [],
    answer: i.answer || null, answeredAt: i.answeredAt, answeredBy: i.answeredBy || null, position: i.position, taskId: i.taskId || null, proposedAt: i.proposedAt, createdAt: i.createdAt, updatedAt: i.updatedAt, ...extra,
})

const fingerprintOf = (clientId, title) => `${clientId}:${String(title || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim().slice(0, 80)}`

/** The board of one client: its ideas, the team to assign, the currencies and the last AI research. */
export async function listIdeas(clientId) {
    const g = await gate('view')
    const client = await clientOf(g, clientId)
    const [rows, staff, currencies, research, categories] = await Promise.all([
        prisma.crmClientIdea.findMany({ where: { clientId }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 500 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true }, orderBy: { firstName: 'asc' } }),
        prisma.crmCurrency.findMany({ select: { id: true, name: true, symbol: true } }),
        prisma.crmClientResearch.findFirst({ where: { clientId }, orderBy: { createdAt: 'desc' } }),
        getIdeaCategories(),
    ])
    const counts = await prisma.crmClientIdeaComment.findMany({ where: { ideaId: { in: rows.map((r) => r.id) } }, select: { ideaId: true } })
    const n = {}
    for (const c of counts) n[c.ideaId] = (n[c.ideaId] || 0) + 1
    return {
        client: { id: client.id, company: client.company, website: client.website || '' },
        list: rows.map((r) => shape(r, { comments: n[r.id] || 0 })),
        staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })),
        currencies,
        categories,
        // the client's people the team can name with @ in the discussion (they are told, by email and on the phone)
        contacts: (await prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true, firstName: true, lastName: true } })).map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ') })).filter((c) => c.name),
        research: research ? { id: research.id, summary: research.summary || '', competitors: research.competitors || [], provider: research.provider, model: research.model, webSearch: research.webSearch, createdAt: research.createdAt } : null,
        can: { create: hasCap(g.authority, 'client_ideas', 'create'), edit: hasCap(g.authority, 'client_ideas', 'edit'), delete: hasCap(g.authority, 'client_ideas', 'delete') },
    }
}

const clean = (b, codes) => {
    const out = {}
    if (b.title !== undefined) { const t = String(b.title || '').trim().slice(0, 200); if (!t) throw fail('Give the idea a title'); out.title = t }
    if (b.body !== undefined) out.body = storeRich(String(b.body || ''), 20000) || null
    if (b.category !== undefined) out.category = codes.includes(b.category) ? b.category : FALLBACK_CATEGORY
    for (const k of ['priority', 'impact', 'effort']) if (b[k] !== undefined) out[k] = Math.min(3, Math.max(1, parseInt(b[k], 10) || 2))
    if (b.gain !== undefined) out.gain = String(b.gain || '').trim().slice(0, 300) || null
    if (b.price !== undefined) { const p = b.price === '' || b.price === null ? null : Number(b.price); if (p !== null && (!Number.isFinite(p) || p < 0)) throw fail('The price must be a number'); out.price = p }
    if (b.offer !== undefined) {
        out.offer = cleanOffer(b.offer) || null
        // the price of the idea follows its detailed offer (the first year); with no offer the price typed by hand stays
        if (out.offer) out.price = offerPrice(out.offer)
    }
    if (b.currencyId !== undefined) out.currencyId = oid(b.currencyId)
    if (b.dueDate !== undefined) out.dueDate = b.dueDate ? new Date(b.dueDate) : null
    if (b.tags !== undefined) out.tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map((t) => String(t).trim().replace(/^#/, '').slice(0, 30)).filter(Boolean))].slice(0, 10)
    if (b.assigneeIds !== undefined) out.assigneeIds = [...new Set((Array.isArray(b.assigneeIds) ? b.assigneeIds : []).filter(oid))].slice(0, 20)
    if (b.visible !== undefined) out.visible = !!b.visible
    return out
}

/** Tells the client's contacts that an idea is waiting for them. Returns how many emails went out. */
async function tellClient(idea, client) {
    if (await emailOff(client.id, 'ideas')) return 0
    const contacts = (await prisma.crmContact.findMany({ where: { clientId: client.id, active: true }, select: { email: true, firstName: true, lastName: true, ideaEmails: true } })).filter((c) => c.ideaEmails !== false) // a contact can switch the idea emails off (its own notifications)
    let sent = 0
    const seen = new Set()
    void pushToContacts({ clientId: client.id }, { title: client.company || 'trtCRM', body: idea.title, url: `/portal/ideas/${idea.id}`, tag: `idea-${idea.id}` })
    for (const c of contacts) {
        const to = String(c.email || '').trim().toLowerCase()
        if (!EMAIL.test(to) || seen.has(to)) continue
        seen.add(to)
        const r = await sendTemplate({ slug: 'client-idea-proposed', to, relType: 'client_idea', relId: idea.id, data: { contact_firstname: c.firstName || '', contact_lastname: c.lastName || '', client_company: client.company || '', idea_title: idea.title, idea_gain: idea.gain || plainText(idea.body || '').slice(0, 200), idea_link: `${publicBase()}/portal/ideas/${idea.id}` } })
        if (r.sent) sent++
    }
    return sent
}

/** Create (no id) or change an idea. Moving it to "proposed" shows it to the client and tells them. */
export async function saveIdea(clientId, body = {}, id = null) {
    const g = await gate(id ? 'edit' : 'create')
    const client = await clientOf(g, clientId)
    const cur = id ? await prisma.crmClientIdea.findFirst({ where: { id, clientId } }) : null
    if (id && !cur) throw fail('Idea not found', 404)
    const data = clean(body, (await getIdeaCategories()).map((c) => c.code))
    if (!id && !data.title) throw fail('Give the idea a title')
    let status = body.status !== undefined ? body.status : cur?.status
    if (status !== undefined && !STATUSES.includes(status)) throw fail('Unknown status')
    const first = !cur?.proposedAt && status === 'proposed'
    if (status !== undefined) {
        data.status = status
        if (status === 'draft') data.visible = false
        else if (status === 'proposed' && !cur?.proposedAt) { data.visible = true; data.proposedAt = new Date() }
    }
    if (!cur) {
        const last = await prisma.crmClientIdea.findFirst({ where: { clientId, status: data.status || 'draft' }, orderBy: { position: 'desc' }, select: { position: true } })
        const row = await prisma.crmClientIdea.create({ data: { clientId, source: 'manual', addedFrom: g.staffId || undefined, position: (last?.position || 0) + 1, fingerprint: fingerprintOf(clientId, data.title), ...data } })
        const mailed = row.status === 'proposed' ? await tellClient(row, client) : 0
        emit('client_idea.created', { id: row.id, client_id: clientId, title: row.title, status: row.status })
        return { idea: shape(row), mailed }
    }
    if (data.title) data.fingerprint = fingerprintOf(clientId, data.title)
    const row = await prisma.crmClientIdea.update({ where: { id }, data })
    const mailed = first ? await tellClient(row, client) : 0
    if (data.status && data.status !== cur.status) emit('client_idea.moved', { id, client_id: clientId, from: cur.status, to: data.status })
    return { idea: shape(row), mailed }
}

/** Drag and drop: the column and the place in it. */
export async function moveIdea(clientId, id, { status, index } = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const cur = await prisma.crmClientIdea.findFirst({ where: { id, clientId } })
    if (!cur) throw fail('Idea not found', 404)
    if (!STATUSES.includes(status)) throw fail('Unknown status')
    const data = { status }
    if (status === 'draft') data.visible = false
    if (status === 'proposed' && !cur.proposedAt) { data.visible = true; data.proposedAt = new Date() }
    await prisma.crmClientIdea.update({ where: { id }, data })
    // renumber the target column with the card at its new place
    const col = (await prisma.crmClientIdea.findMany({ where: { clientId, status, id: { not: id } }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], select: { id: true } })).map((x) => x.id)
    col.splice(Math.min(Math.max(parseInt(index, 10) || 0, 0), col.length), 0, id)
    await Promise.all(col.map((x, p) => prisma.crmClientIdea.update({ where: { id: x }, data: { position: p + 1 } })))
    const row = await prisma.crmClientIdea.findUnique({ where: { id } })
    const mailed = status === 'proposed' && !cur.proposedAt ? await tellClient(row, client) : 0
    if (status !== cur.status) emit('client_idea.moved', { id, client_id: clientId, from: cur.status, to: status })
    return { idea: shape(row), mailed }
}

export async function deleteIdea(clientId, id) {
    const g = await gate('delete')
    await clientOf(g, clientId)
    const cur = await prisma.crmClientIdea.findFirst({ where: { id, clientId }, select: { id: true } })
    if (!cur) throw fail('Idea not found', 404)
    await prisma.crmClientIdeaComment.deleteMany({ where: { ideaId: id } })
    await prisma.crmClientIdea.delete({ where: { id } })
    return { success: true }
}

/** A message as the screens show it. `replyTo` is the message it answers (name and first words). */
const reactionsOf = (c) => (c.reactions && typeof c.reactions === 'object' && !Array.isArray(c.reactions) ? c.reactions : {})
export const commentOut = (c, all, { me = null, canDelete = false, forClient = false, people = {} } = {}) => {
    const r = c.replyToId ? all.find((x) => x.id === c.replyToId && (!forClient || !x.internal)) : null
    const own = forClient ? c.authorKind === 'client' : c.authorKind === 'staff' && !!me && c.authorId === me
    return {
        id: c.id, authorKind: c.authorKind, authorName: c.authorName || '', body: c.body, createdAt: c.createdAt, edited: !!c.editedAt, mine: own,
        replyTo: r ? { id: r.id, name: r.authorName || '', text: plainText(r.body).replace(/\s+/g, ' ').slice(0, 120) } : null,
        ...(forClient ? {} : { internal: !!c.internal, canDelete: own || canDelete, reactions: Object.entries(reactionsOf(c)).map(([emoji, ids]) => ({ emoji, count: ids.length, mine: !!me && ids.includes(me), names: ids.filter((i) => i !== me).map((i) => people[i]).filter(Boolean) })).filter((r) => r.count) }),
    }
}

/** id -> name of the team members who reacted on these comments. */
async function reactors(rows) {
    const ids = [...new Set(rows.flatMap((c) => Object.values(reactionsOf(c)).flat()))]
    if (!ids.length) return {}
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } })
    return Object.fromEntries(staff.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || '']))
}

/** The conversation of an idea (internal notes included, for the team). */
export async function listComments(clientId, id) {
    const g = await gate('view')
    await clientOf(g, clientId)
    const rows = await prisma.crmClientIdeaComment.findMany({ where: { ideaId: id }, orderBy: { createdAt: 'asc' }, take: 300 })
    const people = await reactors(rows)
    return { list: rows.map((c) => commentOut(c, rows, { me: g.staffId, canDelete: hasCap(g.authority, 'client_ideas', 'delete'), people })) }
}

/** Write to the client (or leave a note for the team): rich text, @mentions and #tags, and an answer to an earlier message. */
export async function addComment(clientId, id, body = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const idea = await prisma.crmClientIdea.findFirst({ where: { id, clientId } })
    if (!idea) throw fail('Idea not found', 404)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    const internal = !!body.internal || !idea.visible
    const reply = oid(body.replyToId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: body.replyToId, ideaId: id } }))
    const row = await prisma.crmClientIdeaComment.create({ data: { ideaId: id, authorKind: 'staff', authorId: g.staffId || undefined, authorName: g.name, body: text, internal, replyToId: reply ? reply.id : null } })
    // the people named with @, the team of the idea, and the colleague who is answered
    try { await notifyComment({ by: { staffId: g.staffId, name: g.name }, text, link: `/crm/clients/${clientId}?tab=ideas&idea=${id}`, subject: idea.title, recipients: [...(await teamOf(idea, clientId)), reply?.authorKind === 'staff' ? reply.authorId : null] }) } catch (e) { console.error('[idea notify]', e.message) }
    if (!internal) await tellClientOfComment(idea, client, g.name, plainText(text), mentionedIds(plainText(text), (await prisma.crmContact.findMany({ where: { clientId: client.id, active: true }, select: { id: true, firstName: true, lastName: true } })).map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ') }))))
    const all = await prisma.crmClientIdeaComment.findMany({ where: { ideaId: id } })
    return { comment: commentOut(row, all, { me: g.staffId, canDelete: hasCap(g.authority, 'client_ideas', 'delete'), people: {} }) }
}

/** An emoji on a message of the discussion (again on the same emoji takes it back). */
export async function reactComment(clientId, id, body = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const e = String(body.react || '').trim()
    if (!e || e.length > 16) throw fail('Pick an emoji')
    if (!g.staffId) throw fail('Only staff can react', 403)
    const c = oid(body.commentId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: body.commentId, ideaId: id } }))
    if (!c) throw fail('Message not found', 404)
    const all = { ...reactionsOf(c) }
    const ids = Array.isArray(all[e]) ? all[e] : []
    const next = ids.includes(g.staffId) ? ids.filter((x) => x !== g.staffId) : [...ids, g.staffId]
    if (next.length) all[e] = next; else delete all[e]
    await prisma.crmClientIdeaComment.update({ where: { id: c.id }, data: { reactions: all } })
    return { success: true }
}

/** Tags a colleague on a message that is already sent: they are told (the message itself is not changed, the client may read it). */
export async function mentionComment(clientId, id, body = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(body.commentId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: body.commentId, ideaId: id } }))
    if (!c) throw fail('Message not found', 404)
    const who = oid(body.mention) && (await prisma.crmStaff.findFirst({ where: { id: body.mention, active: true }, select: { id: true } }))
    if (!who) throw fail('Choose a colleague')
    await notifyMentions({ staffIds: [who.id], text: plainText(c.body), url: `/crm/clients/${clientId}?tab=ideas&idea=${id}` })
    return { success: true }
}

export async function editComment(clientId, id, body = {}) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(body.commentId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: body.commentId, ideaId: id } }))
    if (!c) throw fail('Message not found', 404)
    if (c.authorKind !== 'staff' || !g.staffId || c.authorId !== g.staffId) throw fail('You can only edit your own messages', 403)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    await prisma.crmClientIdeaComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

export async function deleteComment(clientId, id, commentId) {
    const g = await gate('edit')
    await clientOf(g, clientId)
    const c = oid(commentId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: commentId, ideaId: id } }))
    if (!c) throw fail('Message not found', 404)
    const own = c.authorKind === 'staff' && !!g.staffId && c.authorId === g.staffId
    if (!own && !hasCap(g.authority, 'client_ideas', 'delete')) throw fail('You can only delete your own messages', 403)
    await prisma.crmClientIdeaComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
    await prisma.crmClientIdeaComment.delete({ where: { id: c.id } })
    return { success: true }
}

/** A reply from the team shows in the client area; the contacts get a short email too. */
async function tellClientOfComment(idea, client, who, text, named = []) {
    if (await emailOff(client.id, 'ideas')) return
    const everyone = await prisma.crmContact.findMany({ where: { clientId: client.id, active: true }, select: { id: true, email: true, firstName: true, lastName: true, ideaEmails: true } })
    const contacts = everyone.filter((c) => c.ideaEmails !== false)
    const seen = new Set()
    // a contact named with @ is told personally; the others get the usual message
    for (const c of contacts) void pushToContacts({ contactId: c.id }, { title: named.includes(c.id) ? `${who || 'trtCRM'} · @${[c.firstName, c.lastName].filter(Boolean).join(' ')}` : who || 'trtCRM', body: text, url: `/portal/ideas/${idea.id}`, tag: `idea-${idea.id}` })
    for (const c of contacts) {
        const to = String(c.email || '').trim().toLowerCase()
        if (!EMAIL.test(to) || seen.has(to)) continue
        seen.add(to)
        await sendTemplate({ slug: 'client-idea-message', to, relType: 'client_idea', relId: idea.id, data: { contact_firstname: c.firstName || '', contact_lastname: c.lastName || '', client_company: client.company || '', idea_title: idea.title, idea_message: `${named.includes(c.id) ? `@${[c.firstName, c.lastName].filter(Boolean).join(' ')} · ` : ''}${text.slice(0, 600)}`, staff_name: who || '', idea_link: `${publicBase()}/portal/ideas/${idea.id}` } }).catch(() => {})
    }
}

/** One task for the team from an idea ("do it"): linked to the client, assigned to the people of the idea. */
export async function makeTask(clientId, id) {
    const g = await gate('edit')
    if (!hasCap(g.authority, 'tasks', 'create')) throw fail('You are not allowed to create tasks', 403)
    const client = await clientOf(g, clientId)
    const idea = await prisma.crmClientIdea.findFirst({ where: { id, clientId } })
    if (!idea) throw fail('Idea not found', 404)
    if (idea.taskId && (await prisma.crmTask.findUnique({ where: { id: idea.taskId }, select: { id: true } }))) return { success: true, taskId: idea.taskId, existing: true }
    const task = await prisma.crmTask.create({ data: { name: `${idea.title}`.slice(0, 200), description: storeRich(`<p>${plainText(idea.gain || '')}</p>${idea.body || ''}`, 20000) || null, relType: 'customer', relId: client.id, priority: idea.priority || 2, dueDate: idea.dueDate || undefined, addedFrom: g.staffId || undefined, status: 1 } })
    const people = [...new Set([...(idea.assigneeIds || []), ...(g.staffId ? [g.staffId] : [])])]
    if (people.length) await prisma.crmTaskAssigned.createMany({ data: people.map((staffId) => ({ taskId: task.id, staffId, assignedFrom: g.staffId || undefined })) }).catch(() => {})
    await prisma.crmClientIdea.update({ where: { id }, data: { taskId: task.id } })
    return { success: true, taskId: task.id, existing: false }
}

/** Who in the team hears about the client's answer: the client's admins, the people of the idea, and who wrote it. */
export async function teamOf(idea, clientId) {
    const admins = await prisma.crmCustomerAdmin.findMany({ where: { clientId }, select: { staffId: true } })
    return [...new Set([...(idea.assigneeIds || []), ...(idea.addedFrom ? [idea.addedFrom] : []), ...admins.map((a) => a.staffId)].filter(Boolean))]
}

/** The bell and Telegram / WhatsApp for the team. */
export async function tellTeam(idea, clientId, text, byName) {
    const ids = await teamOf(idea, clientId)
    for (const staffId of ids) {
        const st = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { active: true } })
        if (!st?.active) continue
        await prisma.crmNotification.create({ data: { toUserId: staffId, fromFullName: byName || 'Client', description: text.slice(0, 200), link: `/crm/clients/${clientId}?tab=ideas&idea=${idea.id}`, additionalData: 'client-idea', isRead: false } }).catch(() => {})
        await notifyNotice(staffId, { kind: 'idea', headlineKey: 'ideaUpdate', relType: 'customer', relId: clientId, link: `/crm/clients/${clientId}?tab=ideas&idea=${idea.id}`, note: text })
    }
}

/* ---------------------------------------------------------------- the client area (portal) */
export const ideaForClient = (i, currency) => ({ id: i.id, title: i.title, body: i.body || '', category: i.category, status: i.status, gain: i.gain || '', price: i.price ?? null, offer: i.offer || null, totals: i.offer ? offerTotals(i.offer) : null, currency: currency || null, impact: i.impact, effort: i.effort, dueDate: i.dueDate, answer: i.answer || null, answeredAt: i.answeredAt, proposedAt: i.proposedAt, sources: i.sources || [] })

/** Every idea of the clients this person may see, with its client: the page of one status (and the count of each status). */
export async function ideasByStatus({ status = '' } = {}) {
    const g = await gate('view')
    const clients = await prisma.crmClient.findMany({ where: await clientScope(g.session), select: { id: true, company: true }, take: 5000 })
    const name = Object.fromEntries(clients.map((c) => [c.id, c.company || '']))
    const rows = clients.length ? await prisma.crmClientIdea.findMany({ where: { clientId: { in: clients.map((c) => c.id) } }, orderBy: [{ updatedAt: 'desc' }], take: 2000 }) : []
    const counts = {}
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1
    const list = rows.filter((r) => !status || r.status === status).slice(0, 300).map((r) => shape(r, { clientName: name[r.clientId] || '' }))
    return { counts, list, can: { create: hasCap(g.authority, 'client_ideas', 'create'), edit: hasCap(g.authority, 'client_ideas', 'edit') } }
}

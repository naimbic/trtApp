import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { ideaForClient, tellTeam, commentOut, ANSWERS } from '@/lib/crm/clientIdeasApi'
import { storeRich, plainText } from '@/lib/crm/richText'
import { emit } from '@/lib/crm/webhooks'
import { getIdeaCategories } from '@/lib/crm/ideaCategories'

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
/** What a client sees: ideas the team proposed (never a draft, never one switched off), with their own answer. */
const SEEN = { visible: true, status: { not: 'draft' } }
const REPLY_OPEN = ['proposed', 'interested', 'approved', 'declined']

const categoryMap = async () => Object.fromEntries((await getIdeaCategories()).map((c) => [c.code, { name: c.name, color: c.color }]))
const currenciesById = async () => Object.fromEntries((await prisma.crmCurrency.findMany()).map((c) => [c.id, { name: c.name, symbol: c.symbol, placement: c.placement }]))

export async function listIdeas() {
    const s = await requirePortal('ideas')
    const [rows, cur] = await Promise.all([prisma.crmClientIdea.findMany({ where: { clientId: s.client.id, ...SEEN }, orderBy: [{ proposedAt: 'desc' }, { createdAt: 'desc' }], take: 200 }), currenciesById()])
    return { list: rows.map((i) => ideaForClient(i, cur[i.currencyId])), waiting: rows.filter((i) => i.status === 'proposed').length, categories: await categoryMap() }
}

export async function getIdea(id) {
    const s = await requirePortal('ideas')
    const idea = oid(id) && (await prisma.crmClientIdea.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    if (!idea) throw httpError('Idea not found', 404)
    const [cur, comments] = await Promise.all([currenciesById(), prisma.crmClientIdeaComment.findMany({ where: { ideaId: id }, orderBy: { createdAt: 'asc' }, take: 300 })])
    const visible = comments.filter((c) => !c.internal)
    return { idea: ideaForClient(idea, cur[idea.currencyId]), categories: await categoryMap(), canAnswer: REPLY_OPEN.includes(idea.status), comments: visible.map((c) => commentOut(c, comments, { forClient: true })) }
}

const who = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email

/** Interested / approved / declined, with an optional word. The idea moves to the matching column and the team is told. */
export async function answerIdea(id, body = {}) {
    const s = await requirePortal('ideas')
    if (s.preview) throw httpError('This is a preview: nothing is saved', 403)
    const idea = oid(id) && (await prisma.crmClientIdea.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    if (!idea) throw httpError('Idea not found', 404)
    const answer = ANSWERS[body.answer]
    if (!answer) throw httpError('Choose interested, approved or declined')
    if (!REPLY_OPEN.includes(idea.status)) throw httpError('We are already working on this idea', 409)
    const name = who(s.contact)
    const row = await prisma.crmClientIdea.update({ where: { id }, data: { answer, status: answer, answeredAt: new Date(), answeredBy: name } })
    const text = storeRich(String(body.comment || ''), 8000)
    if (text) await prisma.crmClientIdeaComment.create({ data: { ideaId: id, authorKind: 'client', authorId: s.contact.id, authorName: name, body: text } })
    const label = { interested: 'is interested in', approved: 'approved', declined: 'declined' }[answer]
    await tellTeam(row, s.client.id, `${s.client.company || name} ${label} the idea “${row.title}”${text ? `: ${plainText(text).slice(0, 120)}` : ''}`, name)
    emit('client_idea.answered', { id, client_id: s.client.id, answer, title: row.title })
    return { success: true, status: row.status }
}

export async function commentIdea(id, body = {}) {
    const s = await requirePortal('ideas')
    if (s.preview) throw httpError('This is a preview: nothing is saved', 403)
    const idea = oid(id) && (await prisma.crmClientIdea.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    if (!idea) throw httpError('Idea not found', 404)
    const text = storeRich(String(body.body || ''), 8000)
    if (!text) throw httpError('Write a message first')
    const reply = oid(body.replyToId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: body.replyToId, ideaId: id, internal: false } }))
    const name = who(s.contact)
    const c = await prisma.crmClientIdeaComment.create({ data: { ideaId: id, authorKind: 'client', authorId: s.contact.id, authorName: name, body: text, replyToId: reply ? reply.id : null } })
    await tellTeam(idea, s.client.id, `${s.client.company || name} wrote on the idea “${idea.title}”: ${plainText(text).slice(0, 120)}`, name)
    const all = await prisma.crmClientIdeaComment.findMany({ where: { ideaId: id, internal: false } })
    return { comment: commentOut(c, all, { forClient: true }) }
}

/** The client edits or removes its own message. */
export async function changeComment(id, body = {}, remove = false) {
    const s = await requirePortal('ideas')
    if (s.preview) throw httpError('This is a preview: nothing is saved', 403)
    const idea = oid(id) && (await prisma.crmClientIdea.findFirst({ where: { id, clientId: s.client.id, ...SEEN } }))
    const c = oid(body.commentId) && (await prisma.crmClientIdeaComment.findFirst({ where: { id: body.commentId, ideaId: id, authorKind: 'client', authorId: s.contact.id, internal: false } }))
    if (!idea || !c) throw httpError('Message not found', 404)
    if (remove) {
        await prisma.crmClientIdeaComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
        await prisma.crmClientIdeaComment.delete({ where: { id: c.id } })
        return { success: true }
    }
    const text = storeRich(String(body.body || ''), 8000)
    if (!text) throw httpError('Write a message first')
    await prisma.crmClientIdeaComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

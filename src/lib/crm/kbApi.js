import prisma from '@/lib/prisma'
import { requirePermission, hasCap, getStaffId } from '@/lib/crm/permissions'
import { safeHtml } from '@/lib/crm/contractDoc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
export const strip = (h) => String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
export const readingTime = (h) => Math.max(1, Math.round(strip(h).split(' ').filter(Boolean).length / 200))
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

/** Adds ids to h2/h3 headings and returns the table of contents for the page. */
export function withToc(html) {
    const toc = []
    const out = safeHtml(html).replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, inner) => {
        const label = strip(inner)
        if (!label) return m
        const id = `s${toc.length + 1}`
        toc.push({ id, label, level: Number(tag[1]) })
        return `<${tag}${attrs.replace(/\sid="[^"]*"/i, '')} id="${id}">${inner}</${tag}>`
    })
    return { html: out, toc }
}

async function views(articleIds) {
    if (!articleIds.length) return {}
    const rows = await prisma.crmViewTracking.groupBy({ by: ['relId'], where: { relType: 'kb_article', relId: { in: articleIds } }, _count: { _all: true } }).catch(() => [])
    return Object.fromEntries(rows.map((r) => [r.relId, r._count._all]))
}
async function votes(articleIds) {
    if (!articleIds.length) return {}
    const rows = await prisma.crmKnowledgeBaseArticleFeedback.findMany({ where: { articleId: { in: articleIds } }, select: { articleId: true, answer: true } })
    const out = {}
    for (const r of rows) { const v = (out[r.articleId] ||= { yes: 0, no: 0 }); if (r.answer === 1) v.yes++; else v.no++ }
    return out
}

const card = (a, group, v, f) => ({ id: a.id, subject: a.subject, group: group ? { id: group.id, name: group.name, color: group.color } : null, excerpt: strip(a.description).slice(0, 160), minutes: readingTime(a.description), views: v[a.id] || 0, helpful: f[a.id]?.yes || 0, notHelpful: f[a.id]?.no || 0, active: a.active, staffOnly: a.staffArticle, updatedAt: a.updatedAt, createdAt: a.createdAt })

const LANGS = ['en', 'fr', 'es', 'ja', 'ar']
/** Groups written in another language than the viewer's stay out of the way (a group with no language shows in every language). */
const inLang = (g, lang) => !LANGS.includes(lang) || !g.language || g.language === lang

async function ctx() {
    const session = await requirePermission('knowledge_base', 'view')
    const a = session.user.authority || []
    return { session, can: (cap) => hasCap(a, 'knowledge_base', cap), staffId: await getStaffId(session) }
}

/** Help-center home for staff: groups with counts, popular and (when searching) matching articles. */
export async function kbHub({ q = '', groupId, lang } = {}) {
    const c = await ctx()
    const [groups, articles] = await Promise.all([prisma.crmKnowledgeBaseGroup.findMany({ orderBy: [{ groupOrder: 'asc' }, { name: 'asc' }] }), prisma.crmKnowledgeBaseArticle.findMany({ orderBy: [{ articleOrder: 'asc' }, { subject: 'asc' }] })])
    const shown = groups.filter((g) => inLang(g, lang))
    const okGroup = new Set(shown.map((g) => g.id))
    const live = articles.filter((a) => a.active && (!a.groupId || okGroup.has(a.groupId)))
    const [v, f] = await Promise.all([views(live.map((a) => a.id)), votes(live.map((a) => a.id))])
    const gMap = Object.fromEntries(groups.map((g) => [g.id, g]))
    const out = { groups: shown.filter((g) => g.active || c.can('edit')).map((g) => ({ id: g.id, name: g.name, description: g.description || '', color: g.color, active: g.active, count: live.filter((a) => a.groupId === g.id).length })), can: { create: c.can('create'), edit: c.can('edit'), delete: c.can('delete') }, total: live.length }
    const term = String(q).trim().toLowerCase()
    if (term || oid(groupId)) {
        let list = live
        if (oid(groupId)) list = list.filter((a) => a.groupId === groupId)
        if (term) list = list.filter((a) => `${a.subject} ${strip(a.description)}`.toLowerCase().includes(term))
        out.results = list.map((a) => card(a, gMap[a.groupId], v, f))
        out.group = oid(groupId) ? out.groups.find((g) => g.id === groupId) || null : null
    } else {
        out.popular = live.map((a) => card(a, gMap[a.groupId], v, f)).sort((x, y) => y.views - x.views).slice(0, 6)
        out.recent = live.map((a) => card(a, gMap[a.groupId], v, f)).sort((x, y) => +new Date(y.updatedAt) - +new Date(x.updatedAt)).slice(0, 4)
    }
    return out
}

export async function kbManage() {
    const c = await ctx()
    const [groups, articles] = await Promise.all([prisma.crmKnowledgeBaseGroup.findMany({ orderBy: [{ groupOrder: 'asc' }, { name: 'asc' }] }), prisma.crmKnowledgeBaseArticle.findMany({ orderBy: { updatedAt: 'desc' } })])
    const [v, f] = await Promise.all([views(articles.map((a) => a.id)), votes(articles.map((a) => a.id))])
    const gMap = Object.fromEntries(groups.map((g) => [g.id, g]))
    return { list: articles.map((a) => card(a, gMap[a.groupId], v, f)), groups: groups.map((g) => ({ id: g.id, name: g.name, description: g.description || '', color: g.color, active: g.active, order: g.groupOrder, language: g.language || null, count: articles.filter((a) => a.groupId === g.id).length })), can: { create: c.can('create'), edit: c.can('edit'), delete: c.can('delete') } }
}

export async function getArticle(id, { raw = false } = {}) {
    const c = await ctx()
    const a = oid(id) && (await prisma.crmKnowledgeBaseArticle.findUnique({ where: { id } }))
    if (!a) throw fail('Article not found', 404)
    const [group, v, f, related] = await Promise.all([a.groupId ? prisma.crmKnowledgeBaseGroup.findUnique({ where: { id: a.groupId } }) : null, views([id]), votes([id]), a.groupId ? prisma.crmKnowledgeBaseArticle.findMany({ where: { groupId: a.groupId, id: { not: id }, active: true }, orderBy: { articleOrder: 'asc' }, take: 6 }) : []])
    const body = withToc(a.description)
    return {
        article: { id: a.id, subject: a.subject, groupId: a.groupId, group: group ? { id: group.id, name: group.name, color: group.color } : null, html: raw ? a.description || '' : body.html, active: a.active, staffOnly: a.staffArticle, minutes: readingTime(a.description), views: v[id] || 0, helpful: f[id]?.yes || 0, notHelpful: f[id]?.no || 0, createdAt: a.createdAt, updatedAt: a.updatedAt },
        toc: body.toc, related: related.map((r) => ({ id: r.id, subject: r.subject })), can: { edit: c.can('edit'), delete: c.can('delete') },
    }
}

export async function saveArticle(body, id) {
    const c = await ctx()
    if (!(id ? c.can('edit') : c.can('create'))) throw fail('You are not allowed to do that', 403)
    const subject = nz(body.subject)?.slice(0, 200)
    if (!subject) throw fail('Give the article a title')
    const data = { subject, groupId: oid(body.groupId), description: body.description ?? null, active: body.active !== false, staffArticle: !!body.staffOnly, slug: slugify(subject) }
    if (id) { if (!oid(id) || !(await prisma.crmKnowledgeBaseArticle.findUnique({ where: { id } }))) throw fail('Article not found', 404); await prisma.crmKnowledgeBaseArticle.update({ where: { id }, data }); return { success: true, id } }
    const last = await prisma.crmKnowledgeBaseArticle.findFirst({ orderBy: { articleOrder: 'desc' }, select: { articleOrder: true } })
    const a = await prisma.crmKnowledgeBaseArticle.create({ data: { ...data, articleOrder: (last?.articleOrder || 0) + 1 } })
    return { success: true, id: a.id }
}

export async function deleteArticle(id) {
    const c = await ctx()
    if (!c.can('delete')) throw fail('You are not allowed to delete articles', 403)
    if (!oid(id)) throw fail('Article not found', 404)
    await prisma.crmKnowledgeBaseArticleFeedback.deleteMany({ where: { articleId: id } })
    await prisma.crmViewTracking.deleteMany({ where: { relType: 'kb_article', relId: id } })
    await prisma.crmKnowledgeBaseArticle.delete({ where: { id } })
    return { success: true }
}

export async function saveGroup(body, id) {
    const c = await ctx()
    if (!(id ? c.can('edit') : c.can('create'))) throw fail('You are not allowed to do that', 403)
    const name = nz(body.name)?.slice(0, 80)
    if (!name) throw fail('Name the group')
    const data = { name, description: nz(body.description)?.slice(0, 300) || null, color: /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : null, active: body.active !== false, groupSlug: slugify(name), ...(body.language !== undefined ? { language: LANGS.includes(body.language) ? body.language : null } : {}) }
    if (id) { await prisma.crmKnowledgeBaseGroup.update({ where: { id }, data }); return { success: true, id } }
    const last = await prisma.crmKnowledgeBaseGroup.findFirst({ orderBy: { groupOrder: 'desc' }, select: { groupOrder: true } })
    const g = await prisma.crmKnowledgeBaseGroup.create({ data: { ...data, groupOrder: (last?.groupOrder || 0) + 1 } })
    return { success: true, id: g.id }
}

export async function deleteGroup(id) {
    const c = await ctx()
    if (!c.can('delete')) throw fail('You are not allowed to delete groups', 403)
    if (!oid(id)) throw fail('Group not found', 404)
    await prisma.crmKnowledgeBaseArticle.updateMany({ where: { groupId: id }, data: { groupId: null } })
    await prisma.crmKnowledgeBaseGroup.delete({ where: { id } })
    return { success: true }
}

/* ---------------- client area (articles meant for clients only) ---------------- */
export async function portalHub({ q = '', groupId, lang } = {}) {
    const groups = (await prisma.crmKnowledgeBaseGroup.findMany({ where: { active: true }, orderBy: [{ groupOrder: 'asc' }, { name: 'asc' }] })).filter((g) => inLang(g, lang))
    const articles = await prisma.crmKnowledgeBaseArticle.findMany({ where: { active: true, staffArticle: false, OR: [{ groupId: { in: groups.map((g) => g.id) } }, { groupId: null }] }, orderBy: [{ articleOrder: 'asc' }, { subject: 'asc' }] })
    const [v, f] = await Promise.all([views(articles.map((a) => a.id)), votes(articles.map((a) => a.id))])
    const gMap = Object.fromEntries(groups.map((g) => [g.id, g]))
    const out = { groups: groups.map((g) => ({ id: g.id, name: g.name, description: g.description || '', color: g.color, count: articles.filter((a) => a.groupId === g.id).length })).filter((g) => g.count) }
    const term = String(q).trim().toLowerCase()
    if (term || oid(groupId)) {
        let list = articles
        if (oid(groupId)) list = list.filter((a) => a.groupId === groupId)
        if (term) list = list.filter((a) => `${a.subject} ${strip(a.description)}`.toLowerCase().includes(term))
        out.results = list.map((a) => card(a, gMap[a.groupId], v, f))
        out.group = oid(groupId) ? out.groups.find((g) => g.id === groupId) || null : null
    } else out.popular = articles.map((a) => card(a, gMap[a.groupId], v, f)).sort((x, y) => y.views - x.views).slice(0, 6)
    return out
}

export async function portalArticle(id) {
    const a = oid(id) && (await prisma.crmKnowledgeBaseArticle.findUnique({ where: { id } }))
    if (!a || !a.active || a.staffArticle) throw fail('Article not found', 404)
    const group = a.groupId ? await prisma.crmKnowledgeBaseGroup.findUnique({ where: { id: a.groupId } }) : null
    if (group && !group.active) throw fail('Article not found', 404)
    const body = withToc(a.description)
    const related = a.groupId ? await prisma.crmKnowledgeBaseArticle.findMany({ where: { groupId: a.groupId, id: { not: id }, active: true, staffArticle: false }, orderBy: { articleOrder: 'asc' }, take: 6 }) : []
    return { article: { id: a.id, subject: a.subject, group: group ? { id: group.id, name: group.name, color: group.color } : null, html: body.html, minutes: readingTime(a.description), updatedAt: a.updatedAt }, toc: body.toc, related: related.map((r) => ({ id: r.id, subject: r.subject })) }
}

export async function portalFeedback(id, helpful, ip) {
    const a = oid(id) && (await prisma.crmKnowledgeBaseArticle.findUnique({ where: { id } }))
    if (!a || !a.active || a.staffArticle) throw fail('Article not found', 404)
    const recent = ip ? await prisma.crmKnowledgeBaseArticleFeedback.findFirst({ where: { articleId: id, ip, createdAt: { gte: new Date(Date.now() - 86400000) } } }) : null
    if (recent) throw fail('Thank you, we already have your answer for today')
    await prisma.crmKnowledgeBaseArticleFeedback.create({ data: { articleId: id, answer: helpful ? 1 : 0, ip: ip || null } })
    return { success: true }
}

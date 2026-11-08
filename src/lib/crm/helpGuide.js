// The client area guide: help center articles that explain every page of the client area, in each language in use
// (scripts/help-center/guide/{en,fr,es,ja,ar}.json). One group per topic and language; a person sees the groups of their own language.
// Loading it again REFRESHES the guide groups (those created from these files) and never touches anything else.
import fs from 'node:fs'
import path from 'node:path'
import prisma from '@/lib/prisma'
import { requirePermission, hasCap } from '@/lib/crm/permissions'
import { getOptions } from '@/lib/crm/mailer'

const CODE = { english: 'en', french: 'fr', spanish: 'es', japanese: 'ja', arabic: 'ar' }
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80) || 'article'
const dir = () => path.join(process.cwd(), 'scripts', 'help-center', 'guide')

/** What is installed and what is available: the languages in use that have content, and how many guide articles each has. */
export async function guideStatus() {
    await requirePermission('knowledge_base', 'view')
    const langs = await guideLanguages()
    const out = []
    for (const l of langs) {
        const data = JSON.parse(fs.readFileSync(path.join(dir(), `${l}.json`), 'utf8'))
        const slugs = data.groups.map((g) => `${g.key}-${l}`)
        const groups = await prisma.crmKnowledgeBaseGroup.findMany({ where: { groupSlug: { in: slugs } }, select: { id: true } })
        const have = groups.length ? await prisma.crmKnowledgeBaseArticle.count({ where: { groupId: { in: groups.map((g) => g.id) } } }) : 0
        out.push({ lang: l, articles: data.articles.length, installed: have })
    }
    return { languages: out }
}

async function guideLanguages() {
    const o = await getOptions(['active_languages'])
    const active = String(o('active_languages', 'english,french,spanish,japanese,arabic')).split(',').map((x) => CODE[x.trim()]).filter(Boolean)
    return active.filter((c) => fs.existsSync(path.join(dir(), `${c}.json`)))
}

/** Creates (or refreshes) the guide groups and their articles. Returns { created, refreshed }. */
export async function installGuide() {
    const session = await requirePermission('knowledge_base', 'create')
    if (!hasCap(session.user.authority || [], 'knowledge_base', 'delete')) throw Object.assign(new Error('Refreshing the guide replaces its articles: it needs the permission to delete articles'), { status: 403 })
    const langs = await guideLanguages()
    let order = (await prisma.crmKnowledgeBaseGroup.findFirst({ orderBy: { groupOrder: 'desc' }, select: { groupOrder: true } }))?.groupOrder || 0
    let aorder = (await prisma.crmKnowledgeBaseArticle.findFirst({ orderBy: { articleOrder: 'desc' }, select: { articleOrder: true } }))?.articleOrder || 0
    let created = 0, refreshed = 0
    for (const lang of langs) {
        const data = JSON.parse(fs.readFileSync(path.join(dir(), `${lang}.json`), 'utf8'))
        // the first, shorter client area group (slug crm-<lang>) is replaced by this guide (it said, for example, that invoices can be paid online)
        const legacy = await prisma.crmKnowledgeBaseGroup.findFirst({ where: { groupSlug: `crm-${lang}` } })
        if (legacy) {
            const lids = (await prisma.crmKnowledgeBaseArticle.findMany({ where: { groupId: legacy.id }, select: { id: true } })).map((a) => a.id)
            if (lids.length) {
                await prisma.crmKnowledgeBaseArticleFeedback.deleteMany({ where: { articleId: { in: lids } } })
                await prisma.crmViewTracking.deleteMany({ where: { relType: 'kb_article', relId: { in: lids } } })
                await prisma.crmKnowledgeBaseArticle.deleteMany({ where: { id: { in: lids } } })
            }
            await prisma.crmKnowledgeBaseGroup.delete({ where: { id: legacy.id } })
        }
        const groups = {}
        for (const g of data.groups) {
            const slug = `${g.key}-${lang}`
            const old = await prisma.crmKnowledgeBaseGroup.findFirst({ where: { groupSlug: slug } })
            let keepOrder = null
            if (old) {
                const ids = (await prisma.crmKnowledgeBaseArticle.findMany({ where: { groupId: old.id }, select: { id: true } })).map((a) => a.id)
                if (ids.length) {
                    await prisma.crmKnowledgeBaseArticleFeedback.deleteMany({ where: { articleId: { in: ids } } })
                    await prisma.crmViewTracking.deleteMany({ where: { relType: 'kb_article', relId: { in: ids } } })
                    await prisma.crmKnowledgeBaseArticle.deleteMany({ where: { id: { in: ids } } })
                }
                keepOrder = old.groupOrder
                await prisma.crmKnowledgeBaseGroup.delete({ where: { id: old.id } })
                refreshed++
            }
            const row = await prisma.crmKnowledgeBaseGroup.create({ data: { name: g.name, description: g.description, color: g.color, active: true, groupSlug: slug, groupOrder: keepOrder ?? ++order, language: lang } })
            groups[g.key] = row.id
        }
        for (const a of data.articles) {
            if (!groups[a.group]) continue
            await prisma.crmKnowledgeBaseArticle.create({ data: { subject: a.subject, description: a.html, slug: slugify(a.subject), groupId: groups[a.group], active: true, staffArticle: false, articleOrder: ++aorder } })
            created++
        }
    }
    return { created, refreshed, languages: langs }
}

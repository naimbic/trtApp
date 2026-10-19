#!/usr/bin/env node
/**
 * Help center articles for the client area and the staff help center, in the languages in use:
 *   node scripts/seed-help-center.mjs [--replace] [--dry]
 * Two groups per language, "trtCRM: your client area" (how to use the client area) and "trtDigital: working with us":
 * 9 + 5 articles, written in scripts/help-center/{en,fr,es,ja,ar}.json. Which languages are created follows
 * Settings → General → Languages in use. A group has a language, so each person sees the articles of their own language.
 *   --replace  first DELETES every existing help center article, group, vote and view count, then creates these
 *   --dry      shows what would happen and changes nothing
 * Without --replace nothing existing is touched; groups already created by this script are skipped (safe to run again).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const here = path.dirname(fileURLToPath(import.meta.url))
const replace = process.argv.includes('--replace')
const dry = process.argv.includes('--dry')
const CODE = { english: 'en', french: 'fr', spanish: 'es', japanese: 'ja', arabic: 'ar' }
const prisma = new PrismaClient()
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80) || 'article'

const opt = await prisma.crmOption.findFirst({ where: { name: 'active_languages' } })
const active = String(opt?.value || 'english,french,spanish,japanese,arabic').split(',').map((x) => CODE[x.trim()]).filter(Boolean)
const langs = active.filter((c) => fs.existsSync(path.join(here, 'help-center', `${c}.json`)))
console.log(`Languages in use with content: ${langs.join(', ') || 'none'}`)

const [nA, nG] = [await prisma.crmKnowledgeBaseArticle.count(), await prisma.crmKnowledgeBaseGroup.count()]
console.log(`Existing: ${nG} groups, ${nA} articles${replace ? ' (will be deleted)' : ' (kept)'}`)
if (dry) { console.log('Dry run: nothing changed.'); await prisma.$disconnect(); process.exit(0) }

if (replace) {
    const ids = (await prisma.crmKnowledgeBaseArticle.findMany({ select: { id: true } })).map((a) => a.id)
    if (ids.length) {
        await prisma.crmKnowledgeBaseArticleFeedback.deleteMany({ where: { articleId: { in: ids } } })
        await prisma.crmViewTracking.deleteMany({ where: { relType: 'kb_article', relId: { in: ids } } })
    }
    await prisma.crmKnowledgeBaseArticle.deleteMany({})
    await prisma.crmKnowledgeBaseGroup.deleteMany({})
    console.log('Deleted the existing help center.')
}

let order = (await prisma.crmKnowledgeBaseGroup.findFirst({ orderBy: { groupOrder: 'desc' }, select: { groupOrder: true } }))?.groupOrder || 0
let aorder = (await prisma.crmKnowledgeBaseArticle.findFirst({ orderBy: { articleOrder: 'desc' }, select: { articleOrder: true } }))?.articleOrder || 0
let made = 0
for (const lang of langs) {
    const data = JSON.parse(fs.readFileSync(path.join(here, 'help-center', `${lang}.json`), 'utf8'))
    const groups = {}
    for (const g of data.groups) {
        const slug = `${g.key}-${lang}`
        let row = await prisma.crmKnowledgeBaseGroup.findFirst({ where: { groupSlug: slug } })
        if (row) continue // already there (a previous run)
        row = await prisma.crmKnowledgeBaseGroup.create({ data: { name: g.name, description: g.description, color: g.color, active: true, groupSlug: slug, groupOrder: ++order, language: lang } })
        groups[g.key] = row.id
    }
    for (const a of data.articles) {
        if (!groups[a.group]) continue
        await prisma.crmKnowledgeBaseArticle.create({ data: { subject: a.subject, description: a.html, slug: slugify(a.subject), groupId: groups[a.group], active: true, staffArticle: false, articleOrder: ++aorder } })
        made++
    }
}
console.log(`Created ${made} articles.`)
await prisma.$disconnect()

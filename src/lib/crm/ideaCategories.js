import prisma from '@/lib/prisma'
import { IDEA_CATEGORY_DEFAULTS } from '@/lib/crm/ideaCategoriesCalc'

/** First use: the eight categories that come with the app. */
export async function ensureIdeaCategories() {
    if (await prisma.crmIdeaCategory.count()) return
    for (const [i, d] of IDEA_CATEGORY_DEFAULTS.entries()) await prisma.crmIdeaCategory.create({ data: { code: d.code, name: d.name, color: d.color, categoryOrder: i + 1, isActive: true } }).catch(() => {})
}

/** [{ code, name, color, isActive }] in board order. */
export async function getIdeaCategories() {
    await ensureIdeaCategories()
    const rows = await prisma.crmIdeaCategory.findMany({ orderBy: [{ categoryOrder: 'asc' }, { createdAt: 'asc' }] })
    return rows.map((r) => ({ code: r.code, name: r.name, color: r.color || '#6b7280', isActive: r.isActive !== false }))
}

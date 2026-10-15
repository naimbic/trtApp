import prisma from '@/lib/prisma'
import { getOptions } from '@/lib/crm/mailer'
import { LANGUAGES } from '@/lib/crm/settings/registry'

/** The languages in use (Settings -> Localization). English is always there; the company language is added when missing. */
export const DEFAULT_ACTIVE = 'english,french,spanish,japanese,arabic'
export const normalizeLanguages = (v) => {
    const list = String(v || '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => LANGUAGES.includes(x))
    return LANGUAGES.filter((l) => l === 'english' || list.includes(l))
}

export async function activeLanguages() {
    const o = await getOptions(['active_languages', 'active_language'])
    const list = normalizeLanguages(o('active_languages', DEFAULT_ACTIVE) || DEFAULT_ACTIVE)
    const def = o('active_language', 'english')
    return LANGUAGES.includes(def) && !list.includes(def) ? LANGUAGES.filter((l) => list.includes(l) || l === def) : list
}

/**
 * Makes sure every template exists in every active language. A missing one is a copy of the English template
 * (to be translated afterwards). Templates of languages that are not active are kept but no longer listed.
 * Returns how many were created.
 */
export async function syncTemplateLanguages({ force = false } = {}) {
    const langs = await activeLanguages()
    const english = await prisma.crmEmailTemplate.findMany({ where: { language: 'english' } })
    if (!english.length) return 0
    if (!force) {
        const counts = await Promise.all(langs.map((l) => prisma.crmEmailTemplate.count({ where: { language: l } })))
        if (counts.every((n) => n >= english.length)) return 0
    }
    let created = 0
    for (const lang of langs.filter((l) => l !== 'english')) {
        const have = new Set((await prisma.crmEmailTemplate.findMany({ where: { language: lang }, select: { slug: true } })).map((r) => r.slug))
        const missing = english.filter((t) => !have.has(t.slug))
        if (!missing.length) continue
        await prisma.crmEmailTemplate.createMany({ data: missing.map((t) => ({ type: t.type, slug: t.slug, language: lang, name: t.name, subject: t.subject, message: t.message, fromName: t.fromName, fromEmail: t.fromEmail, plainText: t.plainText, active: t.active, sortOrder: t.sortOrder })) })
        created += missing.length
    }
    return created
}

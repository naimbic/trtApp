import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/crm/permissions'
import { colorName, autoColor } from '@/lib/crm/itemsCalc'

/* The categories of the contract types (SEO, Web, Social Ads...). Same rights as the types: seeing = see contracts; add / change / delete = that right on contracts. */
const trouble = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)

export async function saveContractCategory(body = {}, id = null) {
    await requirePermission('contracts', id ? 'edit' : 'create')
    const name = String(body.name || '').trim().slice(0, 80)
    if (!name) throw trouble('Name the category')
    if (await prisma.crmContractCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(id ? { NOT: { id } } : {}) }, select: { id: true } })) throw trouble('That category already exists')
    if (id) {
        if (!oid(id) || !(await prisma.crmContractCategory.findUnique({ where: { id }, select: { id: true } }))) throw trouble('Category not found', 404)
        await prisma.crmContractCategory.update({ where: { id }, data: { name } })
        return { success: true, id }
    }
    const all = await prisma.crmContractCategory.findMany({ select: { sortOrder: true }, take: 500 })
    const c = await prisma.crmContractCategory.create({ data: { name, sortOrder: Math.max(-1, ...all.map((x) => x.sortOrder ?? -1)) + 1 } })
    return { success: true, id: c.id }
}

/** Deleting a category keeps its types: they simply have no category any more. */
export async function deleteContractCategory(id) {
    await requirePermission('contracts', 'delete')
    if (!oid(id) || !(await prisma.crmContractCategory.findUnique({ where: { id }, select: { id: true } }))) throw trouble('Category not found', 404)
    await prisma.crmContractType.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
    await prisma.crmContractCategory.delete({ where: { id } })
    return { success: true }
}

/* ---- the catalogue of the agency: every category with its types (code : name). Added once from the Categories box; what is already there is kept. */
const CATALOGUE = [
    ['SEO', 'emerald', ['SEO-PERF : SEO Performance (référencement naturel)', 'SEO-ENT : Services SEO pour entreprises', 'SEO-LOC : SEO local et Google Business Profile', 'SEO-ECOM : SEO e-commerce', 'SEO-TECH : SEO technique avancé', 'SEO-INT : SEO international, multi-pays et multilingue', 'SEO-AUDIT : Audit SEO', 'SEO-LINK : Netlinking et backlinks', 'SEO-CONS : Consulting SEO', 'SEO-RED : Rédaction SEO et content marketing']],
    ['IA', 'violet', ['GEO : Optimisation pour moteurs génératifs (GEO)', 'AEO : Answer Engine Optimization (AEO)', 'IA-SUIVI : Suivi de visibilité IA / LLM', 'IA-ENT : Solutions IA pour entreprise (ChatGPT, intégration API)']],
    ['Google Ads et SEA', 'blue', ['SEA-ACQ : SEA Acquisition', 'SEA-GADS : Campagnes Google Ads (Search, Display, Shopping, YouTube)', 'SEA-PMAX : Performance Max', 'SEA-ECOM : SEA pour e-commerce (Shopping, Merchant Center)', 'SEA-LOC : SEA local et Google Local Services', 'SEA-RMK : Remarketing et audiences', 'SEA-YT : YouTube et Video Ads', 'SEA-DISP : Display Ads', 'SEA-PROG : Programmatique', 'SEA-AB : Tests A/B et optimisation', 'SEA-B2B : SEA B2B', 'SEA-PPC : Gestion PPC']],
    ['Autres régies', 'cyan', ['ADS-MS : Microsoft Ads (Bing)', 'ADS-AMZ : Amazon Ads (Sponsored Products, DSP)', 'ADS-PIN : Pinterest Ads', 'ADS-X : X (Twitter) Ads']],
    ['Social Ads', 'pink', ['SOC-META : Meta Ads (Facebook et Instagram)', 'SOC-TIKTOK : TikTok Ads', 'SOC-SNAP : Snap Ads', 'SOC-LINKEDIN : LinkedIn Ads', 'SOC-ECOM : Social Ads pour e-commerce (catalogues dynamiques)', 'SOC-GEO : GEO Social Ads (ciblage local)', 'SOC-CREA : Création et testing créatif', 'SOC-INFL : Marketing d’influence']],
    ['Réseaux sociaux et contenu', 'amber', ['CM : Social media et community management', 'CONT-SOC : Création de contenu social (photo, vidéo, reels, stories)', 'CONT-MKT : Content marketing et brand content', 'CONT-RED : Rédaction web et copywriting', 'EMAIL : Email marketing et automation', 'STUDIO : Studio graphique et print', 'VIDEO : Production audiovisuelle']],
    ['Web', 'indigo', ['WEB-VIT : Site vitrine et institutionnel', 'WEB-ECOM : Site e-commerce', 'WEB-NEXT : Développement Next.js et React', 'WEB-WP : Développement WordPress et CMS', 'WEB-REF : Refonte de site web', 'WEB-UX : UX design, UI design et design system', 'WEB-ERGO : Ergonomie et utilisabilité', 'WEB-A11Y : Accessibilité', 'WEB-PERF : Performance et Core Web Vitals', 'WEB-MAINT : Sécurité et maintenance de site', 'WEB-PLUG : Plugins', 'WEB-MOE : Maîtrise d’œuvre et pilotage de projet web']],
    ['Data', 'teal', ['DATA-TRACK : Analytics et tracking (GA4, GTM, API de conversions)', 'DATA-DASH : Tableaux de bord et reporting (Looker Studio)', 'DATA-GEO : Suivi GEO et analytics par zone', 'CRO : Optimisation du taux de conversion (CRO)']],
    ['Conseil', 'slate', ['CONS-STRAT : Stratégie webmarketing', 'CONS-AUDIT-SITE : Audit et benchmark de sites internet', 'CONS-AUDIT-MKT : Audit de stratégies webmarketing', 'CONS-AMO : Assistance à maîtrise d’ouvrage web', 'CONS-MOE : Assistance à maîtrise d’œuvre web', 'ACADEMY : Formation (Academy, webinaires)']],
]
export const CATALOGUE_SIZE = CATALOGUE.reduce((n, c) => n + c[2].length, 0)

/** Adds the categories and the types of the catalogue that are not there yet (a type is recognised by its code, a category by its name). */
export async function addContractCatalogue() {
    await requirePermission('contracts', 'create')
    const [cats, types] = await Promise.all([prisma.crmContractCategory.findMany(), prisma.crmContractType.findMany({ select: { id: true, code: true, name: true, typeOrder: true } })])
    const byName = new Map(cats.map((c) => [c.name.toLowerCase(), c]))
    const codes = new Set(types.map((t) => String(t.code || '').toUpperCase()).filter(Boolean)), names = new Set(types.map((t) => t.name.toLowerCase()))
    let order = Math.max(-1, ...types.map((t) => t.typeOrder ?? -1)) + 1, catOrder = Math.max(-1, ...cats.map((c) => c.sortOrder ?? -1)) + 1
    const added = { categories: 0, types: 0 }
    for (const [catName, color, list] of CATALOGUE) {
        let cat = byName.get(catName.toLowerCase())
        if (!cat) { cat = await prisma.crmContractCategory.create({ data: { name: catName, color, sortOrder: catOrder++ } }); added.categories++ }
        for (const line of list) {
            const i = line.indexOf(' : '), code = line.slice(0, i), name = line.slice(i + 3)
            if (codes.has(code) || names.has(name.toLowerCase())) continue
            await prisma.crmContractType.create({ data: { name, code, categoryId: cat.id, color: colorName(color || autoColor(name)), isActive: true, isDefault: false, typeOrder: order++ } })
            added.types++
        }
    }
    return { success: true, ...added }
}

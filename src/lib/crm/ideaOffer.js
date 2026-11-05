// The offer of a client idea: what we sell (SaaS, development, marketing, services...), how it is billed (one price, or every month / quarter / year),
// the contract (1 to 5 years, or open), a setup fee, a discount and the options on top (domain, server, maintenance, support...). Pure: shared by
// the server (which keeps the idea's price in step with the offer) and the screens (which show the totals as the offer is built).

export const OFFER_KINDS = [
    ['saas', 'SaaS subscription'],
    ['development', 'Development (website, app, custom software)'],
    ['marketing', 'Marketing (SEO, ads, social media, content)'],
    ['hosting', 'Hosting and infrastructure'],
    ['service', 'Service or consulting'],
    ['design', 'Design and branding'],
    ['other', 'Other'],
]

export const BILLING = [
    ['one_shot', 'One-time price'],
    ['monthly', 'Every month'],
    ['quarterly', 'Every 3 months'],
    ['yearly', 'Every year'],
]
export const OPTION_BILLING = BILLING.filter(([k]) => k === 'one_shot' || k === 'monthly' || k === 'yearly')

/** Contract length in years; 0 = open (no end date, ended with a notice). */
export const TERMS = [[1, '1 year'], [2, '2 years'], [3, '3 years'], [4, '4 years'], [5, '5 years'], [0, 'Open (no end date)']]
export const NOTICES = [0, 1, 2, 3, 6]

/** What can be added to an offer, by family. `billing` is the usual way it is charged; the price is always the one of the person making the offer. */
export const OPTION_PRESETS = [
    { group: 'Domain and identity', items: [
        ['domain', 'Domain name', 'yearly'],
        ['ssl', 'SSL certificate', 'yearly'],
        ['mailboxes', 'Professional mailboxes', 'monthly'],
        ['dns', 'DNS and email setup', 'one_shot'],
    ] },
    { group: 'Hosting and server', items: [
        ['hosting', 'Web hosting', 'monthly'],
        ['vps', 'Dedicated server (VPS)', 'monthly'],
        ['managed_server', 'Managed server (updates, security)', 'monthly'],
        ['cdn', 'CDN and firewall', 'monthly'],
        ['backups', 'Daily backups', 'monthly'],
    ] },
    { group: 'Maintenance and support', items: [
        ['maintenance', 'Maintenance (updates, fixes, security)', 'monthly'],
        ['support', 'Support by email and chat', 'monthly'],
        ['support_priority', 'Priority support with a response time', 'monthly'],
        ['monitoring', 'Monitoring and alerts', 'monthly'],
        ['hours_pack', 'Pack of development hours', 'one_shot'],
    ] },
    { group: 'Launch and training', items: [
        ['onboarding', 'Setup and onboarding', 'one_shot'],
        ['migration', 'Data migration', 'one_shot'],
        ['training', 'Training of the team', 'one_shot'],
        ['integration', 'Integration with their tools (API)', 'one_shot'],
        ['audit', 'Audit (SEO, security or performance)', 'one_shot'],
    ] },
    { group: 'SaaS extras', items: [
        ['seats', 'Extra users', 'monthly'],
        ['storage', 'Extra storage', 'monthly'],
        ['white_label', 'White label (their brand)', 'monthly'],
        ['api_access', 'API access', 'monthly'],
    ] },
    { group: 'Marketing monthly', items: [
        ['seo', 'SEO follow-up', 'monthly'],
        ['ads', 'Ads management', 'monthly'],
        ['social', 'Social media management', 'monthly'],
        ['content', 'Content writing', 'monthly'],
        ['reporting', 'Monthly report and call', 'monthly'],
    ] },
]

/** Ready-made starting points: what is sold, how, for how long, and the options that usually go with it. */
export const OFFER_PACKS = [
    { key: 'saas', label: 'SaaS subscription', kind: 'saas', billing: 'monthly', term: 1, options: ['onboarding', 'support'] },
    { key: 'website', label: 'Website + hosting and maintenance', kind: 'development', billing: 'one_shot', term: 1, options: ['domain', 'ssl', 'hosting', 'maintenance', 'support'] },
    { key: 'app', label: 'Custom app + support plan', kind: 'development', billing: 'one_shot', term: 3, options: ['hosting', 'maintenance', 'support_priority', 'hours_pack'] },
    { key: 'marketing', label: 'Marketing monthly package', kind: 'marketing', billing: 'monthly', term: 1, options: ['seo', 'social', 'reporting'] },
    { key: 'hosting', label: 'Hosting + domain + mailboxes', kind: 'hosting', billing: 'yearly', term: 0, options: ['domain', 'ssl', 'mailboxes', 'backups'] },
]

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0 }
const round = (n) => Math.round(n * 100) / 100
const PER_MONTH = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }
const perMonth = (price, billing) => price * (PER_MONTH[billing] || 0)

/** Makes an offer safe to keep: known words only, numbers that are numbers, at most 30 options. `null` when there is nothing in it. */
export function cleanOffer(raw) {
    if (!raw || typeof raw !== 'object') return null
    const kinds = OFFER_KINDS.map(([k]) => k)
    const billing = BILLING.some(([k]) => k === raw.billing) ? raw.billing : 'one_shot'
    const term = billing === 'one_shot' ? 0 : [0, 1, 2, 3, 4, 5].includes(Number(raw.term)) ? Number(raw.term) : 1
    const options = (Array.isArray(raw.options) ? raw.options : []).slice(0, 30).map((o, i) => ({
        id: String(o?.id || `o${i}`).slice(0, 40), key: String(o?.key || '').slice(0, 30), label: String(o?.label || '').trim().slice(0, 120),
        price: num(o?.price), qty: Math.min(Math.max(Math.round(num(o?.qty)) || 1, 1), 999), billing: OPTION_BILLING.some(([k]) => k === o?.billing) ? o.billing : 'one_shot', on: o?.on !== false,
    })).filter((o) => o.label)
    const offer = {
        kind: kinds.includes(raw.kind) ? raw.kind : 'service', billing, term, price: num(raw.price), setupFee: num(raw.setupFee), discountPct: Math.min(num(raw.discountPct), 100),
        noticeMonths: term === 0 && billing !== 'one_shot' ? Math.min(Math.max(Math.round(Number(raw.noticeMonths) || 0), 0), 24) : 0, options,
    }
    return offer.price || offer.setupFee || options.length ? offer : null
}

/**
 * The money of an offer: what is paid once, what is paid every month (all recurring prices as a monthly equivalent), the first year, and the
 * whole contract when it has an end. The discount applies to everything.
 */
export function offerTotals(offer) {
    const o = cleanOffer(offer)
    if (!o) return { oneOff: 0, monthly: 0, firstYear: 0, contract: null, months: 0, open: false, recurring: false }
    const f = 1 - o.discountPct / 100
    let one = o.billing === 'one_shot' ? o.price : 0
    let month = o.billing === 'one_shot' ? 0 : perMonth(o.price, o.billing)
    one += o.setupFee
    for (const x of o.options) {
        if (!x.on) continue
        const amount = x.price * x.qty
        if (x.billing === 'one_shot') one += amount
        else month += perMonth(amount, x.billing)
    }
    const oneOff = round(one * f), monthly = round(month * f)
    const months = o.term * 12
    const recurring = monthly > 0
    return { oneOff, monthly, firstYear: round(oneOff + monthly * 12), months, open: recurring && o.term === 0, recurring, contract: recurring && o.term > 0 ? round(oneOff + monthly * months) : null }
}

/** The idea's own price follows its offer: what the client pays in the first year (everything once + 12 months of what recurs). */
export const offerPrice = (offer) => { const t = offerTotals(offer); return t.firstYear > 0 ? t.firstYear : null }

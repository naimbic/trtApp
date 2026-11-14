import prisma from '@/lib/prisma'
import { detectLanguage } from '@/lib/crm/detectLanguage'
import { proposalText, isStartingText } from '@/lib/crm/proposalText'
import { calcDocument, round2 } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { getOptions } from '@/lib/crm/mailer'
import { companyImageDataUri } from '@/lib/crm/company'
import { pdfSettings, formatMoney, attachTotals } from '@/lib/crm/docStyle'
import { companyTokenData, COMPANY_KEYS } from '@/lib/crm/docTokens'
import { lineLong, esc, stripTags, logoDataUri, fmtDate, LABELS, docHeader, HEADER_CSS } from '@/lib/crm/invoicePdf'

export const PROPOSAL = { OPEN: 1, DECLINED: 2, ACCEPTED: 3, SENT: 4, REVISED: 5, DRAFT: 6 }
export const LABEL = { 1: 'Open', 2: 'Declined', 3: 'Accepted', 4: 'Sent', 5: 'Revised', 6: 'Draft' }

/** Proposal numbers: the new `number`, or the Perfex id for imported ones. */
export const numberOf = (p) => p.number ?? p.legacyId ?? 0
/** A function that formats many proposal numbers without re-reading the settings each time. */
export async function numberFormatter() {
    const prefix = (await getOptions(['proposal_number_prefix']))('proposal_number_prefix', 'PRO-')
    const pad = await numberPadding()
    return (p) => `${prefix}${String(numberOf(p)).padStart(pad, '0')}`
}
export async function displayNumber(p) {
    const prefix = (await getOptions(['proposal_number_prefix']))('proposal_number_prefix', 'PRO-')
    return `${prefix}${String(numberOf(p)).padStart(await numberPadding(), '0')}`
}
export async function nextProposalNumber() {
    const [a, b] = await Promise.all([prisma.crmProposal.findFirst({ where: { number: { not: null } }, orderBy: { number: 'desc' }, select: { number: true } }), prisma.crmProposal.findFirst({ orderBy: { legacyId: 'desc' }, select: { legacyId: true } })])
    return Math.max(a?.number || 0, b?.legacyId || 0) + 1
}

/** Expired = still open for an answer but past the "open till" date. */
export const effectiveStatus = (p) => (p.openTill && [PROPOSAL.OPEN, PROPOSAL.SENT, PROPOSAL.REVISED].includes(p.status) && new Date(p.openTill) < new Date(new Date().toDateString()) ? 7 : p.status)
export const EXPIRED = 7

/** The language of the client or lead a proposal is for: the one chosen on its form, else (lead) the one it writes in (its received emails, then its description). '' when unknown. */
export async function proposalLanguage(relType, relId) {
    if (!/^[0-9a-f]{24}$/i.test(relId || '')) return ''
    if (relType === 'customer') return String((await prisma.crmClient.findUnique({ where: { id: relId }, select: { defaultLanguage: true } }).catch(() => null))?.defaultLanguage || '').toLowerCase()
    const l = await prisma.crmLead.findUnique({ where: { id: relId }, select: { defaultLanguage: true, description: true } }).catch(() => null)
    if (!l) return ''
    if (l.defaultLanguage) return String(l.defaultLanguage).toLowerCase()
    const mails = await prisma.crmLeadMail.findMany({ where: { leadId: relId, direction: 'in' }, orderBy: { date: 'desc' }, take: 5, select: { subject: true, body: true } }).catch(() => [])
    return detectLanguage(mails.map((m) => `${m.subject || ''} ${m.body || ''}`).join(' ').slice(0, 20000)) || detectLanguage(l.description) || ''
}

export async function loadItems(id) {
    const lines = await prisma.crmItemable.findMany({ where: { relType: 'proposal', relId: id }, orderBy: { itemOrder: 'asc' }, include: { taxes: true } })
    return lines.map((l) => ({ id: l.id, description: l.description, longDescription: l.longDescription || '', qty: l.qty, rate: l.rate, unit: l.unit || '', taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })) }))
}

const SAFE_TAGS = /<(?!\/?(p|br|b|strong|i|em|u|s|span|div|h1|h2|h3|h4|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|a|img|hr|blockquote|small|sub|sup)\b)[^>]*>/gi
/** Proposal text is HTML written by staff: keep layout tags, drop scripts, frames, event handlers and javascript: links. */
export function safeProposalHtml(h) {
    return String(h ?? '')
        .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '')
        .replace(SAFE_TAGS, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*("|')\s*(javascript|data):[^"']*\2/gi, '$1=$2#$2')
}

/** The items table + totals block that replaces {proposal_items}. */
function itemsHtml(p, items, currency, S, L) {
    const M = (n) => formatMoney(n, currency, S), Mi = (n) => formatMoney(n, currency, S, { noSymbol: S.itemsNoSymbol })
    const totals = calcDocument({ items, discountPercent: p.discountPercent, discountFixed: p.discountPercent > 0 ? 0 : p.discountTotal, discountType: p.discountType || 'before_tax', adjustment: p.adjustment })
    const rows = items.map((it, i) => `<tr><td class="n">${i + 1}</td><td><strong>${stripTags(it.description)}</strong>${it.longDescription ? `<div class="long">${lineLong(it.longDescription)}</div>` : ''}</td><td class="r">${it.qty}</td>${items.some((x) => x.unit) ? `<td class="r">${esc(it.unit || '')}</td>` : ''}<td class="r">${Mi(it.rate)}</td><td class="r">${Mi(round2((it.qty || 0) * (it.rate || 0)))}</td></tr>`).join('')
    const tr = [`<tr><td>${L.subtotal}</td><td>${M(p.subtotal)}</td></tr>`]
    if (p.discountTotal > 0) tr.push(`<tr><td>${L.discount}${p.discountPercent > 0 ? ` (${p.discountPercent}%)` : ''}</td><td>-${M(p.discountTotal)}</td></tr>`)
    for (const t of totals.taxes) tr.push(`<tr><td>${esc(t.name)} (${t.rate}%)</td><td>${M(t.total)}</td></tr>`)
    if (Number(p.adjustment)) tr.push(`<tr><td>${L.adjustment}</td><td>${M(p.adjustment)}</td></tr>`)
    tr.push(`<tr class="grand"><td>${L.total}</td><td>${M(p.total)}</td></tr>`)
    return `<table class="items"><thead><tr style="background:${S.head};color:${S.headText}"><th class="n" style="color:${S.headText}">#</th><th>${L.item}</th><th class="r">${L.qty}</th>${items.some((x) => x.unit) ? `<th class="r">${L.unit || 'Unit'}</th>` : ''}<th class="r">${L.rate}</th><th class="r">${L.amount}</th></tr></thead><tbody>${rows}</tbody></table><table class="tot">${tr.join('')}</table>`
}

const TXT = { french: { title: 'OFFRE DE PRIX', to: 'À l’attention de', openTill: 'Valable jusqu’au', subject: 'Objet' }, english: { title: 'PROPOSAL', to: 'Prepared for', openTill: 'Open until', subject: 'Subject' } }

/** The proposal document body (staff view, PDF and public page). */
export const proposalDocumentHtml = async (p, items, currency, S, number) => attachTotals(await proposalDocumentHtmlRaw(p, items, currency, S, number))
async function proposalDocumentHtmlRaw(p, items, currency, S, number) {
    // the labels and an untouched starting text are in the language of the client or lead the proposal is for (French or English labels; the company language otherwise)
    const holder = await proposalLanguage(p.relType, p.relId)
    const lang = LABELS[holder] && TXT[holder] ? holder : S.lang
    const L = LABELS[lang], T = TXT[lang]
    const og = await getOptions([...COMPANY_KEYS, 'company_logo', 'company_info_format', 'invoice_company_name'])
    const D = (x) => fmtDate(x, S.dateFormat, S.timezone)
    const countryName = p.country ? (await prisma.crmCountry.findFirst({ where: { legacyId: p.country }, select: { shortName: true } }))?.shortName || '' : ''
    const logo = await companyImageDataUri('logo', logoDataUri(og('company_logo')), ['proposal_logo_url', 'company_logo_url'])
    const signature = S.showSignature ? await companyImageDataUri('signature', '') : ''
    const co = companyTokenData(og)
    const org = [co.company_name, co.address, [co.zip_code, co.city].filter(Boolean).join(' '), co.phone, co.email, co.vat_number_with_label].filter(Boolean).map(esc).join('<br />')
    const to = [`<strong>${esc(p.proposalTo || '')}</strong>`, p.address && esc(p.address), [p.city, p.state, p.zip].filter(Boolean).map(esc).join(' '), countryName && esc(countryName), p.email && esc(p.email), p.phone && esc(p.phone)].filter(Boolean).join('<br />')
    const itemsBlock = itemsHtml(p, items, currency, S, L)
    const M = (n) => formatMoney(n, currency, S)
    const merge = {
        proposal_items: itemsBlock, proposal_number: esc(number), proposal_subject: esc(p.subject || ''), proposal_total: M(p.total), proposal_subtotal: M(p.subtotal),
        proposal_open_till: D(p.openTill), proposal_proposal_to: esc(p.proposalTo || ''), proposal_address: esc(p.address || ''), proposal_city: esc(p.city || ''), proposal_state: esc(p.state || ''), proposal_zip: esc(p.zip || ''),
        proposal_country: esc(countryName), proposal_email: esc(p.email || ''), proposal_phone: esc(p.phone || ''), proposal_date: D(p.date), proposal_assigned: '',
        ...Object.fromEntries(Object.entries(co).map(([k, v]) => [k, esc(v)])), companyname: esc(co.company_name),
    }
    let content = safeProposalHtml(holder && isStartingText(p.content) ? proposalText(holder) : p.content)
    // the items table always comes first and the whole text is printed under it: the text is never split around the table
    content = content.replace(/<p>\s*\{proposal_items\}\s*<\/p>|\{proposal_items\}/gi, '')
    content = content.replace(/\{([a-z0-9_]+)\}/gi, (m, k) => (k in merge ? String(merge[k] ?? '') : ''))
    const infoTo = `<div class="info"><div class="lbl">${T.to}</div>${to}<div class="dates"><div>Date: <strong>${D(p.date)}</strong></div>${p.openTill ? `<div>${T.openTill}: <strong>${D(p.openTill)}</strong></div>` : ''}</div></div>`
    return `${docHeader({ logo, width: S.logoWidth * 1.5, name: co.company_name, title: T.title, num: `#${esc(number)}`, org: `<div class="info org">${org}</div>`, info: infoTo, swap: S.swap })}
${p.subject ? `<h2 class="psub">${esc(p.subject)}</h2>` : ''}${itemsBlock}<div class="pcontent" style="margin-top:18px">${content}</div>${signature ? `<div class="sig"><img src="${signature}" alt=""></div>` : ''}`
}

export const PROPOSAL_CSS = `${HEADER_CSS}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.logo{text-align:right}.top img{max-width:62%;height:auto}.title{text-align:left}.title h1{margin:0;font-size:2.4em;letter-spacing:.5px;color:#111}.title .num{font-weight:700;color:#4e4e4e;font-size:1.2em}
.cols{display:flex;gap:30px;margin-bottom:20px}.cols>.info{flex:1}.lbl{font-weight:700;margin-bottom:2px}.org{color:#424242}.dates{margin-top:12px}.psub{font-size:1.5em;margin:6px 0 14px}
.pcontent{line-height:1.6}.pcontent h1,.pcontent h2,.pcontent h3{margin:18px 0 8px}.pcontent img{max-width:100%;height:auto}.pcontent table{border-collapse:collapse;margin:8px 0}.pcontent td,.pcontent th{border:1px solid #e5e7eb;padding:6px 8px}
table.items,table.tot{width:100%;border-collapse:collapse}.items th{text-align:left;padding:8px;font-size:.95em}.items td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
.n{width:28px;color:#6b7280}.r{text-align:right;white-space:nowrap}.items th.r{text-align:right}.long{color:#6b7280;font-size:.9em;margin-top:2px}.long p{margin:0 0 2px}.long ul,.long ol{margin:2px 0;padding-left:18px}.long h2,.long h3{margin:4px 0 2px;font-size:1.05em}.long blockquote{margin:2px 0;padding-left:8px;border-left:2px solid #d1d5db}.long table{border-collapse:collapse;margin:2px 0}.long td,.long th{border:1px solid #d1d5db;padding:2px 6px;text-align:left}.long a{color:inherit}
.tot{width:52%;margin:14px 0 0 auto;break-inside:avoid}.tot td{padding:6px 8px;text-align:right}.tot td:first-child{font-weight:700}.tot tr.grand td{background:#e5e7eb;font-weight:700;font-size:1.1em}
.sig{margin-top:28px;text-align:right}.sig img{max-height:90px;max-width:260px}tr{page-break-inside:avoid}`

export const settingsFor = () => pdfSettings('proposal')

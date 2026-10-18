import prisma from '@/lib/prisma'
import { calcDocument, round2, formatDocumentNumber } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { getOptions } from '@/lib/crm/mailer'
import { companyImageDataUri } from '@/lib/crm/company'
import { pdfSettings, formatMoney, paperCss } from '@/lib/crm/docStyle'
import { amountInWords } from '@/lib/crm/numberWords'
import { esc, safeHtml, stripTags, logoDataUri, fmtDate, organizationInfo, customerInfo, LABELS, htmlToPdf, docHeader, HEADER_CSS } from '@/lib/crm/invoicePdf'
import { bankTokensFor } from '@/lib/crm/bankDb'

const TXT = {
    french: { title: 'BON DE COMMANDE', delivery: 'Livraison prévue', reference: 'Réf. client', words: 'Arrêté le présent bon de commande à la somme de' },
    english: { title: 'PURCHASE ORDER', delivery: 'Expected delivery', reference: 'Client reference', words: 'Total in words' },
}
const CSS = `${HEADER_CSS}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.logo{text-align:right}.top img{max-width:62%;height:auto}.title{text-align:left}.title h1{margin:0;font-size:2.4em;letter-spacing:.5px;color:#111}.title .num{font-weight:700;color:#4e4e4e;font-size:1.2em}
.cols{display:flex;gap:30px;margin-bottom:20px}.cols>.info{flex:1}.lbl{font-weight:700;margin-bottom:2px}.org{color:#424242}.dates{margin-top:12px}
table{width:100%;border-collapse:collapse}.items th{text-align:left;padding:8px;font-size:.95em}.items td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
.n{width:28px;color:#6b7280}.r{text-align:right;white-space:nowrap}.items th.r{text-align:right}.long{color:#6b7280;font-size:.9em;margin-top:2px}
.tot{width:52%;margin:14px 0 0 auto;break-inside:avoid}.tot td{padding:6px 8px;text-align:right}.tot td:first-child{font-weight:700}.tot tr.grand td{background:#e5e7eb;font-weight:700;font-size:1.1em}
.words{margin:14px 0 0}.sig{margin-top:28px;text-align:right}.sig img{max-height:90px;max-width:260px}h4{margin:20px 0 6px;font-size:1.05em}.block{white-space:pre-line}tr{page-break-inside:avoid}`

/** Staff-only document (the caller checked the permission). */
export async function renderPurchaseOrderHtml(id) {
    const p = await prisma.crmPurchaseOrder.findUnique({ where: { id } })
    if (!p) return null
    const [lines, client, currency] = await Promise.all([
        prisma.crmItemable.findMany({ where: { relType: 'purchase_order', relId: id }, orderBy: { itemOrder: 'asc' }, include: { taxes: true } }),
        p.clientId ? prisma.crmClient.findUnique({ where: { id: p.clientId } }) : null,
        p.currencyId ? prisma.crmCurrency.findUnique({ where: { id: p.currencyId } }) : null,
    ])
    const items = lines.map((l) => ({ description: l.description, longDescription: l.longDescription || '', qty: l.qty, rate: l.rate, unit: l.unit || '', taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })) }))
    const S = await pdfSettings('purchase_order')
    const L = LABELS[S.lang], T = TXT[S.lang]
    const og = await getOptions(['company_info_format', 'company_logo', 'companyname'])
    const number = formatDocumentNumber({ prefix: p.prefix, number: p.number, numberFormat: p.numberFormat, date: p.date, padding: await numberPadding() })
    const M = (n) => formatMoney(n, currency, S), Mi = (n) => formatMoney(n, currency, S, { noSymbol: S.itemsNoSymbol }), D = (x) => fmtDate(x, S.dateFormat, S.timezone)
    const totals = calcDocument({ items, discountPercent: p.discountPercent, discountFixed: p.discountPercent > 0 ? 0 : p.discountTotal, discountType: p.discountType || 'before_tax', adjustment: p.adjustment })
    const logo = await companyImageDataUri('logo', logoDataUri(og('company_logo')), S.logoKeys)
    const signature = S.showSignature ? await companyImageDataUri('signature', '') : ''
    const info = `<div class="info"><div class="lbl">${L.billTo}</div>${await customerInfo(client, p, L)}<div class="dates"><div>${L.date}: <strong>${D(p.date)}</strong></div>${p.deliveryDate ? `<div>${T.delivery}: <strong>${D(p.deliveryDate)}</strong></div>` : ''}${p.referenceNo ? `<div>${T.reference}: <strong>${esc(p.referenceNo)}</strong></div>` : ''}</div></div>`
    const org = `<div class="info org">${await organizationInfo(og, await bankTokensFor({ docAccountId: p.bankAccountId, clientId: p.clientId }))}</div>`
    const rows = items.map((it, i) => `<tr><td class="n">${i + 1}</td><td><strong>${stripTags(it.description)}</strong>${it.longDescription ? `<div class="long">${safeHtml(it.longDescription)}</div>` : ''}</td><td class="r">${it.qty}${it.unit ? ` ${esc(it.unit)}` : ''}</td><td class="r">${Mi(it.rate)}</td>${S.perItemTax ? `<td class="r">${(it.taxes || []).map((t) => (S.hideTaxName ? `${t.rate}%` : `${esc(t.name)} ${t.rate}%`)).join('<br />') || '—'}</td>` : ''}<td class="r">${Mi(round2((it.qty || 0) * (it.rate || 0)))}</td></tr>`).join('')
    const tr = [`<tr><td>${L.subtotal}</td><td>${M(p.subtotal)}</td></tr>`]
    if (p.discountTotal > 0) tr.push(`<tr><td>${L.discount}${p.discountPercent > 0 ? ` (${p.discountPercent}%)` : ''}</td><td>-${M(p.discountTotal)}</td></tr>`)
    for (const t of totals.taxes) tr.push(`<tr><td>${esc(t.name)} (${t.rate}%)</td><td>${M(t.total)}</td></tr>`)
    if (Number(p.adjustment)) tr.push(`<tr><td>${L.adjustment}</td><td>${M(p.adjustment)}</td></tr>`)
    tr.push(`<tr class="grand"><td>${L.total}</td><td>${M(p.total)}</td></tr>`)
    const words = S.words.on ? `<p class="words"><strong>${T.words} :</strong> ${esc(amountInWords(p.total, { lang: S.lang, currency: currency?.name, lowercase: S.words.lower }))}</p>` : ''
    const body = `${docHeader({ logo, width: S.logoWidth * 1.5, name: og('companyname'), title: T.title, num: `#${esc(number)}`, org, info, swap: S.swap })}
<table class="items"><thead><tr style="background:${S.head};color:${S.headText}"><th class="n" style="color:${S.headText}">#</th><th>${L.item}</th><th class="r">${L.qty}</th><th class="r">${L.rate}</th>${S.perItemTax ? `<th class="r">${L.tax}</th>` : ''}<th class="r">${L.amount}</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot">${tr.join('')}</table>
${words}${p.clientNote ? `<h4>${L.note}</h4><div class="block">${esc(p.clientNote)}</div>` : ''}${p.terms ? `<h4>${L.terms}</h4><div class="block">${safeHtml(p.terms)}</div>` : ''}${signature ? `<div class="sig"><img src="${signature}" alt=""></div>` : ''}`
    return { number, html: `<!doctype html><html><head><meta charset="utf-8"><title>${esc(number)}</title><style>${S.pageCss()}${S.baseCss()}${CSS}${paperCss()}</style></head><body>${body}</body></html>` }
}

export async function purchaseOrderPdf(id) {
    const r = await renderPurchaseOrderHtml(id)
    if (!r) return null
    return { pdf: await htmlToPdf(r.html), name: `${r.number.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.pdf`, number: r.number }
}

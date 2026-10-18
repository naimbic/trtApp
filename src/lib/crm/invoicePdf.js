import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import prisma from '@/lib/prisma'
import { calcDocument, round2 } from '@/lib/crm/sales/calc'
import { getInvoiceDocument } from '@/server/actions/crm/sales/invoices'
import { getOptions } from '@/lib/crm/mailer'
import { formatDocumentNumber, INVOICE_STATUS } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { companyImageDataUri } from '@/lib/crm/company'
import { pdfSettings, formatMoney } from '@/lib/crm/docStyle'
import { amountInWords } from '@/lib/crm/numberWords'
import { companyTokenData, renderInfoFormat, clientTokenData, phpDate, COMPANY_KEYS } from '@/lib/crm/docTokens'
import { bankTokensFor } from '@/lib/crm/bankDb'

const run = promisify(execFile)
// Item descriptions are stored as small HTML snippets: keep basic formatting, drop everything else.
const unescapeEntities = (h) => (/&lt;\/?[a-z]/i.test(h) ? String(h).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"') : String(h))
const stripTags = (t) => esc(unescapeEntities(t ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim())
const safeHtml = (h) => unescapeEntities(h ?? '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<(?!\/?(b|strong|i|em|u|br|p|ul|ol|li|span)\b)[^>]*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '')
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const LABELS = {
    french: { invoice: 'FACTURE', billTo: 'Facturé à', date: 'Date de facture', due: "Date d'échéance", item: 'Désignation', qty: 'Qté', rate: 'Prix unitaire', tax: 'Taxe', amount: 'Montant', subtotal: 'Sous-total', discount: 'Remise', adjustment: 'Ajustement', total: 'Total', paid: 'Total payé', due2: 'Montant dû', payments: 'Paiements reçus', no: 'N°', mode: 'Mode', pdate: 'Date', pamount: 'Montant', pay: 'Détails de paiement', note: 'Note', terms: 'Conditions générales', vat: 'N° TVA', page: 'Page', status: { 1: 'Impayée', 2: 'Payée', 3: 'Partiellement payée', 4: 'En retard', 5: 'Annulée', 6: 'Brouillon' } },
    english: { invoice: 'INVOICE', billTo: 'Bill to', date: 'Invoice date', due: 'Due date', item: 'Item', qty: 'Qty', rate: 'Rate', tax: 'Tax', amount: 'Amount', subtotal: 'Subtotal', discount: 'Discount', adjustment: 'Adjustment', total: 'Total', paid: 'Total paid', due2: 'Amount due', payments: 'Payments received', no: 'No.', mode: 'Mode', pdate: 'Date', pamount: 'Amount', pay: 'Payment details', note: 'Note', terms: 'Terms & conditions', vat: 'VAT number', page: 'Page', status: { 1: 'Unpaid', 2: 'Paid', 3: 'Partially paid', 4: 'Overdue', 5: 'Cancelled', 6: 'Draft' } },
}
const STATUS_COLOR = { 1: '#d97706', 2: '#059669', 3: '#2563eb', 4: '#dc2626', 5: '#6b7280', 6: '#6b7280' }

const money = (n, cur, sep) => formatMoney(n, cur, { sep, trimZero: false })

function logoDataUri(file) {
    const candidates = [file && path.join(process.cwd(), 'storage', 'company', file)]
    for (const f of candidates) {
        try {
            if (f && fs.existsSync(f)) return `data:image/${path.extname(f).slice(1) || 'png'};base64,${fs.readFileSync(f).toString('base64')}`
        } catch { /* ignore */ }
    }
    return ''
}

const fmtDate = (d, fmt, tz) => phpDate(d, fmt, tz)

/**
 * The top of every sales document: the logo and the company details on the left; on the right the document title and number, and
 * under them the client's details (bill to, dates). `swap` (Settings → PDF) puts the client under the logo and the company on the right.
 */
export const HEADER_CSS = `.hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:30px;margin-bottom:22px}.hdr .hl{flex:1;min-width:0}.hdr .hl img{max-width:100%;height:auto}.hdr .hl .info{margin-top:14px}
.hdr .hr{flex:1;min-width:0;text-align:right}.hdr .hr h1{margin:0;font-size:2.7em;letter-spacing:.5px;color:#111}.hdr .hr .num{font-weight:700;color:#4e4e4e;font-size:1.2em}.hdr .hr .status{margin-top:4px;font-weight:700;text-transform:uppercase}.hdr .hr .info{margin-top:16px;text-align:right}
@media(max-width:640px){.hdr{flex-direction:column;gap:14px}.hdr .hr{text-align:left}.hdr .hr .info{text-align:left}}`
export function docHeader({ logo, width, name, title, num, status = '', org, info, swap = false }) {
    const mark = logo ? `<img src="${logo}" style="width:${width}px" alt="">` : `<strong style="font-size:18pt">${esc(name)}</strong>`
    return `<div class="hdr"><div class="hl">${mark}${swap ? info : org}</div><div class="hr"><h1>${title}</h1><div class="num">${num}</div>${status}${swap ? org : info}</div></div>`
}

/** The company block at the top of documents: company_info_format with merge terms, or a built-in fallback. */
async function organizationInfo(o, bank = null) {
    const get = await getOptions(COMPANY_KEYS)
    const data = companyTokenData(get, undefined, bank)
    const fmt = o('company_info_format')
    if (fmt) return renderInfoFormat(fmt, data)
    const lines = [data.company_name, data.address, [data.zip_code, data.city].filter(Boolean).join(' '), data.phone, data.vat_number_with_label]
    return lines.filter(Boolean).map(esc).join('<br />')
}

async function customerInfo(client, doc, L) {
    const fmt = (await getOptions(['customer_info_format']))('customer_info_format')
    const data = await clientTokenData(client, doc, L.vat)
    if (fmt) return renderInfoFormat(fmt, data).replace(/^(.*?)(<br \/>|$)/, '<strong>$1</strong>$2')
    const lines = [`<strong>${esc(data.company_name)}</strong>`, data.street && esc(data.street), [data.city, data.state, data.zip_code].filter(Boolean).map(esc).join(' '), data.country_name && esc(data.country_name), data.phone && esc(data.phone), data.vat_number_with_label && esc(data.vat_number_with_label)]
    return lines.filter(Boolean).join('<br />')
}

/** Document for the public (client) page: allowed only with the invoice's secret hash, never for drafts. */
async function loadPublicDocument(id, hash) {
    if (!/^[0-9a-f]{24}$/i.test(id || '') || !hash) return null
    const invoice = await prisma.crmInvoice.findUnique({ where: { id } })
    if (!invoice || invoice.hash !== hash || invoice.status === INVOICE_STATUS.DRAFT) return null
    const [lines, payments, client, currency] = await Promise.all([
        prisma.crmItemable.findMany({ where: { relType: 'invoice', relId: id }, orderBy: { itemOrder: 'asc' }, include: { taxes: true } }),
        prisma.crmPayment.findMany({ where: { invoiceId: id }, orderBy: { paymentDate: 'desc' } }),
        invoice.clientId ? prisma.crmClient.findUnique({ where: { id: invoice.clientId } }) : null,
        invoice.currencyId ? prisma.crmCurrency.findUnique({ where: { id: invoice.currencyId } }) : null,
    ])
    const paid = round2(payments.reduce((t, p) => t + (p.amount || 0), 0))
    return {
        invoice: { ...invoice, displayNumber: formatDocumentNumber({ prefix: invoice.prefix, number: invoice.number, numberFormat: invoice.numberFormat, date: invoice.date, padding: await numberPadding() }) },
        items: lines.map((l) => ({ id: l.id, description: l.description, longDescription: l.longDescription || '', qty: l.qty, rate: l.rate, unit: l.unit || '', taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })) })),
        payments, client, currency, paid,
    }
}

/** Screen-only shell of the public invoice page (hidden when printing, absent from the PDF). */
const PUBLIC_CSS = `
body.pub{background:#f3f4f6;font-size:14px}
.pub .bar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 14px}.pub .bar .in{max-width:920px;margin:0 auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pub .bar b{font-size:15px}.pub .spc{flex:1}
.pub .btn{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:9px;padding:9px 16px;font-weight:600;font-size:14px;line-height:1.2;font-family:inherit;text-decoration:none;display:inline-block;cursor:pointer}.pub .btn.pr{background:#2563eb;border-color:#2563eb;color:#fff}
.pub .wrap{max-width:920px;margin:0 auto;padding:20px 14px 60px}.pub .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:34px}
.pub .banner{border-radius:12px;padding:14px 18px;margin-bottom:16px}.pub .banner.ok{background:#ecfdf5;color:#065f46}.pub .banner.no{background:#fef2f2;color:#991b1b}.pub .banner.due{background:#eff6ff;color:#1e40af}
@media(max-width:640px){.pub .card{padding:18px}.pub .cols{flex-direction:column;gap:14px}.pub .tot{width:100%}.pub .top{flex-direction:column-reverse;gap:12px}.pub .top img{max-width:70%}.pub .items th:nth-child(1),.pub .items td:nth-child(1){display:none}}
@media print{.pub .bar{display:none}body.pub{background:#fff}.pub .wrap{max-width:none;padding:0}.pub .card{border:0;border-radius:0;padding:0}.pub .banner{display:none}}`

export async function renderInvoiceHtml(id, { hash, pdfHref } = {}) {
    const doc = hash ? await loadPublicDocument(id, hash) : await getInvoiceDocument(id)
    if (!doc) return null
    const { invoice, items, payments, client, currency, paid } = doc
    const S = await pdfSettings('invoice')
    const { o } = S
    const og = await getOptions(['company_info_format', 'show_total_paid_on_invoice', 'show_amount_due_on_invoice', 'show_transactions_on_invoice_pdf', 'show_status_on_pdf_ei', 'show_sale_agent_on_invoices', 'show_project_on_invoice', 'company_logo', 'companyname'])
    const L = LABELS[S.lang]
    const M = (n) => formatMoney(n, currency, S)
    const Mi = (n) => formatMoney(n, currency, S, { noSymbol: S.itemsNoSymbol })
    const D = (d) => fmtDate(d, S.dateFormat, S.timezone)

    const totals = calcDocument({ items, discountPercent: invoice.discountPercent, discountFixed: invoice.discountPercent > 0 ? 0 : invoice.discountTotal, discountType: invoice.discountType || 'before_tax', adjustment: invoice.adjustment })
    const modes = await prisma.crmPaymentMode.findMany()
    const modeName = Object.fromEntries(modes.map((m) => [m.id, m.name]))
    const unpaid = ![2, 5].includes(invoice.status)
    const showModes = unpaid ? modes.filter((m) => m.showOnPdf && m.active !== false && m.description) : []
    const logo = await companyImageDataUri('logo', logoDataUri(og('company_logo')), S.logoKeys)
    const signature = S.showSignature ? await companyImageDataUri('signature', '') : ''
    const org = await organizationInfo(og, await bankTokensFor({ docAccountId: invoice.bankAccountId, clientId: invoice.clientId }))
    const bill = await customerInfo(client, invoice, L)

    const extra = []
    if (og('show_sale_agent_on_invoices') === '1' && invoice.saleAgentId) {
        const a = await prisma.crmStaff.findUnique({ where: { id: invoice.saleAgentId }, select: { firstName: true, lastName: true } }).catch(() => null)
        if (a) extra.push(`${S.lang === 'french' ? 'Commercial' : 'Sale agent'}: <strong>${esc(`${a.firstName || ''} ${a.lastName || ''}`.trim())}</strong>`)
    }
    if (og('show_project_on_invoice') === '1' && invoice.projectId) {
        const pr = await prisma.crmProject.findUnique({ where: { id: invoice.projectId }, select: { name: true } }).catch(() => null)
        if (pr) extra.push(`${S.lang === 'french' ? 'Projet' : 'Project'}: <strong>${esc(pr.name)}</strong>`)
    }
    const infoBlock = `<div class="info"><div class="lbl">${L.billTo}</div>${bill}<div class="dates"><div>${L.date}: <strong>${D(invoice.date)}</strong></div>${invoice.dueDate ? `<div>${L.due}: <strong>${D(invoice.dueDate)}</strong></div>` : ''}${extra.map((x) => `<div>${x}</div>`).join('')}</div></div>`
    const orgBlock = `<div class="info org">${org}</div>`

    const rows = items.map((it, i) => {
        const amount = round2((it.qty || 0) * (it.rate || 0))
        const taxCell = (it.taxes || []).map((t) => (S.hideTaxName ? `${t.rate}%` : `${esc(t.name)} ${t.rate}%`)).join('<br />') || '—'
        return `<tr><td class="n">${i + 1}</td><td><strong>${stripTags(it.description)}</strong>${it.longDescription ? `<div class="long">${/<[a-z][\s\S]*>|&lt;\/?[a-z]/i.test(it.longDescription) ? safeHtml(it.longDescription) : esc(it.longDescription).replace(/\n/g, '<br />')}</div>` : ''}</td><td class="r">${it.qty}${it.unit ? ` ${esc(it.unit)}` : ''}</td><td class="r">${Mi(it.rate)}</td>${S.perItemTax ? `<td class="r">${taxCell}</td>` : ''}<td class="r">${Mi(amount)}</td></tr>`
    }).join('')

    const totalRows = [`<tr><td>${L.subtotal}</td><td>${M(invoice.subtotal)}</td></tr>`]
    if (invoice.discountTotal > 0) totalRows.push(`<tr><td>${L.discount}${invoice.discountPercent > 0 ? ` (${invoice.discountPercent}%)` : ''}</td><td>-${M(invoice.discountTotal)}</td></tr>`)
    for (const t of totals.taxes) totalRows.push(`<tr><td>${esc(t.name)} (${t.rate}%)</td><td>${M(t.total)}</td></tr>`)
    if (Number(invoice.adjustment)) totalRows.push(`<tr><td>${L.adjustment}</td><td>${M(invoice.adjustment)}</td></tr>`)
    totalRows.push(`<tr class="grand"><td>${L.total}</td><td>${M(invoice.total)}</td></tr>`)
    if (payments.length && og('show_total_paid_on_invoice', '1') === '1') totalRows.push(`<tr><td>${L.paid}</td><td>-${M(paid)}</td></tr>`)
    if (og('show_amount_due_on_invoice') === '1' && invoice.status !== 5) totalRows.push(`<tr class="grand"><td>${L.due2}</td><td>${M(invoice.total - paid)}</td></tr>`)

    const words = S.words.on ? `<p class="words"><strong>${S.lang === 'french' ? 'Arrêtée la présente facture à la somme de' : 'Total in words'} :</strong> ${esc(amountInWords(invoice.total, { lang: S.lang, currency: currency?.name, lowercase: S.words.lower }))}</p>` : ''
    const payTable = payments.length && og('show_transactions_on_invoice_pdf', '1') === '1'
        ? `<h4>${L.payments}</h4><table class="plain"><tr><th>${L.no}</th><th>${L.mode}</th><th>${L.pdate}</th><th class="r">${L.pamount}</th></tr>${payments.map((p) => `<tr><td>${p.legacyId ?? ''}</td><td>${esc(modeName[p.paymentModeId] || p.paymentMethod || '')}${p.transactionId ? ` - ${esc(p.transactionId)}` : ''}</td><td>${D(p.paymentDate)}</td><td class="r">${M(p.amount)}</td></tr>`).join('')}</table>`
        : ''
    const modesBlock = showModes.length ? `<h4>${L.pay}</h4>${showModes.map((m) => `<div class="mode"><strong>${esc(m.name)}</strong><div>${m.description}</div></div>`).join('')}` : ''
    const status = og('show_status_on_pdf_ei') === '1' ? `<div class="status" style="color:${STATUS_COLOR[invoice.status]}">${L.status[invoice.status] || ''}</div>` : ''
    // The public (client) page gets a screen shell like estimates and contracts: top bar, centred card, banner. The PDF and
    // the print view keep the plain document (no pdfHref, and the shell rules are screen-only or hidden when printing).
    const pub = !!pdfHref
    const fr = S.lang === 'french'
    const due = round2((invoice.total || 0) - (paid || 0))
    const banner = !pub ? '' : invoice.status === 2
        ? `<div class="banner ok"><strong>${fr ? 'Facture payée' : 'Paid'}</strong><div>${fr ? 'Merci pour votre règlement.' : 'Thank you for your payment.'}</div></div>`
        : invoice.status === 4
            ? `<div class="banner no"><strong>${fr ? 'Facture en retard' : 'Overdue'}</strong><div>${fr ? 'Reste à payer' : 'Amount due'}: <b>${M(due)}</b>${invoice.dueDate ? ` · ${L.due}: ${D(invoice.dueDate)}` : ''}</div></div>`
            : [1, 3].includes(invoice.status) && due > 0 ? `<div class="banner due"><strong>${fr ? 'Reste à payer' : 'Amount due'}: ${M(due)}</strong>${invoice.dueDate ? `<div>${L.due}: ${D(invoice.dueDate)}</div>` : ''}</div>` : ''
    const bar = pub ? `<div class="bar"><div class="in"><b>${esc(og('companyname'))}</b><span class="spc"></span><button type="button" class="btn" onclick="window.print()">${fr ? 'Imprimer' : 'Print'}</button><a class="btn pr" href="${pdfHref}">${fr ? 'Télécharger le PDF' : 'Download PDF'}</a></div></div>` : ''
    const sig = signature ? `<div class="sig"><img src="${signature}" alt=""></div>` : ''

    return `<!doctype html><html lang="${fr ? 'fr' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${pub ? '<link rel="icon" href="/api/crm/branding/favicon">' : ''}<title>${esc(invoice.displayNumber)}</title><style>
${S.pageCss()}
${S.baseCss()}
${HEADER_CSS}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.top img{width:${S.logoWidth * 1.5}px;max-width:62%;height:auto}
.logo{text-align:right}.title{text-align:left}.title h1{margin:0;font-size:2.7em;letter-spacing:.5px;color:#111}.title .num{font-weight:700;color:#4e4e4e;font-size:1.2em}.status{margin-top:4px;font-weight:700;text-transform:uppercase}
.cols{display:flex;gap:30px;margin-bottom:20px}.cols>.info{flex:1}.lbl{font-weight:700;margin-bottom:2px}.org{color:#424242}.dates{margin-top:12px}
table{width:100%;border-collapse:collapse}.items th{background:${S.head};color:${S.headText};text-align:left;padding:8px 8px;font-size:.95em}.items td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
.n{width:28px;color:#6b7280}.r{text-align:right;white-space:nowrap}.items th.r{text-align:right}.long{color:#6b7280;font-size:.9em;margin-top:2px}
.tot{width:52%;margin:14px 0 0 auto}.tot td{padding:6px 8px;text-align:right}.tot td:first-child{font-weight:700}.tot tr.grand td{background:#e5e7eb;font-weight:700;font-size:1.1em}
.words{margin:14px 0 0;text-align:left;break-inside:avoid}.tot{break-inside:avoid}.sig{margin-top:28px;text-align:right}.sig img{max-height:90px;max-width:260px}
h4{margin:20px 0 6px;font-size:1.05em}.plain th{text-align:left;border-bottom:1px solid #111;padding:5px 6px}.plain td{padding:5px 6px}.plain .r,.plain th.r{text-align:right}
.mode{margin-bottom:8px}.block{white-space:pre-line}tr{page-break-inside:avoid}.sc{overflow-x:auto}
${pub ? PUBLIC_CSS : ''}
</style></head><body${pub ? ' class="pub"' : ''}>
${bar}${pub ? `<div class="wrap">${banner}<div class="card">` : ''}${docHeader({ logo, width: S.logoWidth * 1.5, name: og('companyname'), title: L.invoice, num: `#${esc(invoice.displayNumber)}`, status, org: orgBlock, info: infoBlock, swap: S.swap })}
<div class="sc"><table class="items"><thead><tr><th class="n">#</th><th>${L.item}</th><th class="r">${L.qty}</th><th class="r">${L.rate}</th>${S.perItemTax ? `<th class="r">${L.tax}</th>` : ''}<th class="r">${L.amount}</th></tr></thead><tbody>${rows}</tbody></table></div>
<table class="tot">${totalRows.join('')}</table>
${words}${payTable}${modesBlock}
${invoice.clientNote ? `<h4>${L.note}</h4><div class="block">${esc(invoice.clientNote)}</div>` : ''}
${invoice.terms ? `<h4>${L.terms}</h4><div class="block">${safeHtml(invoice.terms)}</div>` : ''}
${sig}
${pub ? '</div></div>' : ''}</body></html>`
}

function chromePath() {
    const cands = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
    return cands.find((c) => c && fs.existsSync(c))
}

/** Renders the invoice to a PDF with headless Chrome (set CHROME_PATH when it is installed elsewhere). */
/** HTML -> PDF with headless Chrome (set CHROME_PATH when it is installed elsewhere). */
export async function htmlToPdf(html) {
    const chrome = chromePath()
    if (!chrome) throw Object.assign(new Error('PDF generation needs Google Chrome or Chromium on the server (set CHROME_PATH).'), { status: 501 })
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-pdf-'))
    try {
        const src = path.join(dir, 'doc.html'), out = path.join(dir, 'doc.pdf')
        fs.writeFileSync(src, html)
        await run(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions', '--disable-background-networking', '--no-pdf-header-footer', `--user-data-dir=${path.join(os.tmpdir(), 'trt-chrome-pdf-profile')}`, `--print-to-pdf=${out}`, `file://${src}`], { timeout: 45000 })
        return fs.readFileSync(out)
    } finally {
        fs.rmSync(dir, { recursive: true, force: true })
    }
}

export async function renderInvoicePdf(id, { hash } = {}) {
    const html = await renderInvoiceHtml(id, { hash })
    return html ? htmlToPdf(html) : null
}

export const pdfFileName = (displayNumber) => `${String(displayNumber).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'invoice'}.pdf`

export { esc, safeHtml, stripTags, money, logoDataUri, fmtDate, organizationInfo, customerInfo, LABELS, STATUS_COLOR }

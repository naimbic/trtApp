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

const fmtNumber = (n, cur, sep) => {
    const [i, d] = Math.abs(Number(n) || 0).toFixed(2).split('.')
    return `${n < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, sep.thousand)}${sep.decimal}${d}`
}
const money = (n, cur, sep) => {
    const v = fmtNumber(n, cur, sep)
    const sym = cur?.symbol || cur?.name || ''
    return cur?.placement === 'before' ? `${sym}${v}` : `${v} ${sym}`.trim()
}

function logoDataUri(file) {
    const candidates = [file && path.join(process.cwd(), 'storage', 'company', file)]
    for (const f of candidates) {
        try {
            if (f && fs.existsSync(f)) return `data:image/${path.extname(f).slice(1) || 'png'};base64,${fs.readFileSync(f).toString('base64')}`
        } catch { /* ignore */ }
    }
    return ''
}

const fmtDate = (d, fmt) => {
    if (!d) return ''
    const x = new Date(d)
    const dd = String(x.getUTCDate()).padStart(2, '0'), mm = String(x.getUTCMonth() + 1).padStart(2, '0'), yy = x.getUTCFullYear()
    return /^d\/m\/Y/.test(fmt || '') || !fmt ? `${dd}/${mm}/${yy}` : `${yy}-${mm}-${dd}`
}

/** The Perfex "Organization info" block, built from company_info_format or from the invoice_company_* options. */
function organizationInfo(o) {
    const fmt = o('company_info_format')
    if (fmt) return fmt
    const lines = [o('invoice_company_name', o('companyname')), o('invoice_company_address'), [o('invoice_company_postal_code'), o('invoice_company_city')].filter(Boolean).join(' '), o('invoice_company_phonenumber'), o('company_vat') && `VAT: ${o('company_vat')}`]
    return lines.filter(Boolean).map(esc).join('<br />')
}

async function customerInfo(client, invoice, L) {
    const street = invoice.billingStreet || client?.billingStreet || client?.address
    const city = invoice.billingCity || client?.billingCity || client?.city
    const state = invoice.billingState || client?.billingState || client?.state
    const zip = invoice.billingZip || client?.billingZip || client?.zip
    const countryId = invoice.billingCountry ?? client?.billingCountry ?? client?.country
    const country = countryId ? await prisma.crmCountry.findFirst({ where: { legacyId: countryId }, select: { shortName: true } }) : null
    const lines = [`<strong>${esc(client?.company || invoice.deletedCustomerName || '')}</strong>`, street && esc(street), [city, state, zip].filter(Boolean).map(esc).join(' '), country?.shortName && esc(country.shortName), client?.phoneNumber && esc(client.phoneNumber), client?.vat && `${L.vat}: ${esc(client.vat)}`]
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

export async function renderInvoiceHtml(id, { hash, pdfHref } = {}) {
    const doc = hash ? await loadPublicDocument(id, hash) : await getInvoiceDocument(id)
    if (!doc) return null
    const { invoice, items, payments, client, currency, paid } = doc
    const o = await getOptions(['active_language', 'company_logo', 'company_logo_dark', 'companyname', 'company_info_format', 'invoice_company_name', 'invoice_company_address', 'invoice_company_city', 'invoice_company_postal_code', 'invoice_company_phonenumber', 'company_vat', 'pdf_table_heading_color', 'pdf_table_heading_text_color', 'pdf_logo_width', 'decimal_separator', 'thousand_separator', 'dateformat', 'swap_pdf_info', 'show_status_on_pdf_ei', 'show_total_paid_on_invoice', 'show_amount_due_on_invoice', 'show_transactions_on_invoice_pdf', 'show_tax_per_item', 'footer_text'])
    const L = LABELS[o('active_language') === 'french' ? 'french' : 'english']
    const sep = { decimal: o('decimal_separator', ','), thousand: o('thousand_separator', ' ') || ' ' }
    const M = (n) => money(n, currency, sep)
    const D = (d) => fmtDate(d, o('dateformat'))
    const head = o('pdf_table_heading_color', '#323a45'), headText = o('pdf_table_heading_text_color', '#ffffff')
    const perItemTax = o('show_tax_per_item') === '1'

    const totals = calcDocument({ items, discountPercent: invoice.discountPercent, discountFixed: invoice.discountPercent > 0 ? 0 : invoice.discountTotal, discountType: invoice.discountType || 'before_tax', adjustment: invoice.adjustment })
    const modes = await prisma.crmPaymentMode.findMany()
    const modeName = Object.fromEntries(modes.map((m) => [m.id, m.name]))
    const unpaid = ![2, 5].includes(invoice.status)
    const showModes = unpaid ? modes.filter((m) => m.showOnPdf && m.active !== false && m.description) : []
    const logo = logoDataUri(o('company_logo'))
    const org = organizationInfo(o)
    const bill = await customerInfo(client, invoice, L)

    const infoBlock = `<div class="info"><div class="lbl">${L.billTo}</div>${bill}<div class="dates"><div>${L.date}: <strong>${D(invoice.date)}</strong></div>${invoice.dueDate ? `<div>${L.due}: <strong>${D(invoice.dueDate)}</strong></div>` : ''}</div></div>`
    const orgBlock = `<div class="info org">${org}</div>`
    const swap = o('swap_pdf_info') === '1'

    const rows = items.map((it, i) => {
        const amount = round2((it.qty || 0) * (it.rate || 0))
        return `<tr><td class="n">${i + 1}</td><td><strong>${stripTags(it.description)}</strong>${it.longDescription ? `<div class="long">${/<[a-z][\s\S]*>|&lt;\/?[a-z]/i.test(it.longDescription) ? safeHtml(it.longDescription) : esc(it.longDescription).replace(/\n/g, '<br />')}</div>` : ''}</td><td class="r">${it.qty}${it.unit ? ` ${esc(it.unit)}` : ''}</td><td class="r">${M(it.rate)}</td>${perItemTax ? `<td class="r">${(it.taxes || []).map((t) => `${esc(t.name)} ${t.rate}%`).join('<br />') || '—'}</td>` : ''}<td class="r">${M(amount)}</td></tr>`
    }).join('')

    const totalRows = [`<tr><td>${L.subtotal}</td><td>${M(invoice.subtotal)}</td></tr>`]
    if (invoice.discountTotal > 0) totalRows.push(`<tr><td>${L.discount}${invoice.discountPercent > 0 ? ` (${invoice.discountPercent}%)` : ''}</td><td>-${M(invoice.discountTotal)}</td></tr>`)
    for (const t of totals.taxes) totalRows.push(`<tr><td>${esc(t.name)} (${t.rate}%)</td><td>${M(t.total)}</td></tr>`)
    if (Number(invoice.adjustment)) totalRows.push(`<tr><td>${L.adjustment}</td><td>${M(invoice.adjustment)}</td></tr>`)
    totalRows.push(`<tr class="grand"><td>${L.total}</td><td>${M(invoice.total)}</td></tr>`)
    if (payments.length && o('show_total_paid_on_invoice', '1') === '1') totalRows.push(`<tr><td>${L.paid}</td><td>-${M(paid)}</td></tr>`)
    if (o('show_amount_due_on_invoice') === '1' && invoice.status !== 5) totalRows.push(`<tr class="grand"><td>${L.due2}</td><td>${M(invoice.total - paid)}</td></tr>`)

    const payTable = payments.length && o('show_transactions_on_invoice_pdf', '1') === '1'
        ? `<h4>${L.payments}</h4><table class="plain"><tr><th>${L.no}</th><th>${L.mode}</th><th>${L.pdate}</th><th class="r">${L.pamount}</th></tr>${payments.map((p) => `<tr><td>${p.legacyId ?? ''}</td><td>${esc(modeName[p.paymentModeId] || p.paymentMethod || '')}${p.transactionId ? ` - ${esc(p.transactionId)}` : ''}</td><td>${D(p.paymentDate)}</td><td class="r">${M(p.amount)}</td></tr>`).join('')}</table>`
        : ''
    const modesBlock = showModes.length ? `<h4>${L.pay}</h4>${showModes.map((m) => `<div class="mode"><strong>${esc(m.name)}</strong><div>${m.description}</div></div>`).join('')}` : ''
    const status = o('show_status_on_pdf_ei') === '1' ? `<div class="status" style="color:${STATUS_COLOR[invoice.status]}">${L.status[invoice.status] || ''}</div>` : ''

    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoice.displayNumber)}</title><style>
@page{size:A4;margin:14mm 14mm 16mm 14mm}
*{box-sizing:border-box}body{margin:0;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:10pt;line-height:1.45;color:#303030}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.top img{width:${Number(o('pdf_logo_width', 220)) * 1.5 || 330}px;max-width:62%;height:auto}
.logo{text-align:right}.title{text-align:left}.title h1{margin:0;font-size:27pt;letter-spacing:.5px;color:#111}.title .num{font-weight:700;color:#4e4e4e;font-size:12pt}.status{margin-top:4px;font-weight:700;text-transform:uppercase}
.cols{display:flex;gap:30px;margin-bottom:20px}.cols>.info{flex:1}.lbl{font-weight:700;margin-bottom:2px}.org{color:#424242}.dates{margin-top:12px}
table{width:100%;border-collapse:collapse}.items th{background:${head};color:${headText};text-align:left;padding:8px 8px;font-size:9.5pt}.items td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
.n{width:28px;color:#6b7280}.r{text-align:right;white-space:nowrap}.items th.r{text-align:right}.long{color:#6b7280;font-size:9pt;margin-top:2px}
.tot{width:52%;margin:14px 0 0 auto}.tot td{padding:6px 8px;text-align:right}.tot td:first-child{font-weight:700}.tot tr.grand td{background:#e5e7eb;font-weight:700;font-size:11pt}
h4{margin:20px 0 6px;font-size:10.5pt}.plain th{text-align:left;border-bottom:1px solid #111;padding:5px 6px}.plain td{padding:5px 6px}.plain .r,.plain th.r{text-align:right}
.bar{margin:-6mm 0 14px;text-align:right}.bar a{display:inline-block;background:#2563eb;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:600;font-size:10pt}@media print{.bar{display:none}}
.mode{margin-bottom:8px}.block{white-space:pre-line}tr{page-break-inside:avoid}
</style></head><body>
${pdfHref ? `<div class="bar"><a href="${pdfHref}">${L.invoice === 'FACTURE' ? 'Télécharger le PDF' : 'Download PDF'}</a></div>` : ''}<div class="top"><div class="title"><h1>${L.invoice}</h1><div class="num"># ${esc(invoice.displayNumber)}</div>${status}</div><div class="logo">${logo ? `<img src="${logo}" alt="">` : `<strong style="font-size:18pt">${esc(o('companyname'))}</strong>`}</div></div>
<div class="cols">${swap ? infoBlock + orgBlock : orgBlock + infoBlock}</div>
<table class="items"><thead><tr><th class="n">#</th><th>${L.item}</th><th class="r">${L.qty}</th><th class="r">${L.rate}</th>${perItemTax ? `<th class="r">${L.tax}</th>` : ''}<th class="r">${L.amount}</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot">${totalRows.join('')}</table>
${payTable}${modesBlock}
${invoice.clientNote ? `<h4>${L.note}</h4><div class="block">${esc(invoice.clientNote)}</div>` : ''}
${invoice.terms ? `<h4>${L.terms}</h4><div class="block">${safeHtml(invoice.terms)}</div>` : ''}
</body></html>`
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

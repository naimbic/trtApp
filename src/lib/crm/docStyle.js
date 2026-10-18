import { getOptions } from '@/lib/crm/mailer'

/** Settings → PDF / Sales: everything that changes how printed documents look, read in one go. */
const KEYS = ['active_language', 'decimal_separator', 'thousand_separator', 'remove_decimals_on_zero', 'items_table_amounts_exclude_currency_symbol', 'remove_tax_name_from_item_table', 'show_tax_per_item', 'pdf_font', 'pdf_font_size', 'pdf_logo_width', 'pdf_table_heading_color', 'pdf_table_heading_text_color', 'swap_pdf_info', 'show_page_number_on_pdf', 'total_to_words_enabled', 'total_to_words_lowercase', 'dateformat', 'default_timezone', 'e_sign_legal_text', 'company_signature_url', 'company_logo_url', 'company_logo', 'companyname',
    ...['invoice', 'estimate', 'proposal', 'contract', 'purchase_order', 'credit_note'].flatMap((k) => [`${k}_logo_url`, `pdf_format_${k}`, `show_pdf_signature_${k}`]), 'pdf_format_payment', 'pdf_format_statement']

const FONTS = { freesans: '"Helvetica Neue",Helvetica,Arial,sans-serif', helvetica: 'Helvetica,Arial,sans-serif', dejavusans: '"DejaVu Sans",Verdana,sans-serif', times: '"Times New Roman",Times,serif', courier: '"Courier New",Courier,monospace' }

export async function pdfSettings(kind = 'invoice') {
    const o = await getOptions(KEYS)
    const format = o(`pdf_format_${kind}`, 'A4-PORTRAIT')
    const [size, orient] = format.split('-')
    return {
        o, kind,
        lang: o('active_language') === 'french' ? 'french' : 'english',
        sep: { decimal: o('decimal_separator', ','), thousand: o('thousand_separator', ' ') },
        trimZero: o('remove_decimals_on_zero') === '1',
        itemsNoSymbol: o('items_table_amounts_exclude_currency_symbol') === '1',
        hideTaxName: o('remove_tax_name_from_item_table') === '1',
        perItemTax: o('show_tax_per_item') === '1',
        font: FONTS[o('pdf_font', 'freesans')] || FONTS.freesans,
        fontSize: Math.min(Math.max(Number(o('pdf_font_size', '10')) || 10, 7), 16),
        logoWidth: Number(o('pdf_logo_width', '220')) || 220,
        head: o('pdf_table_heading_color', '#323a45') || '#323a45',
        headText: o('pdf_table_heading_text_color', '#ffffff') || '#ffffff',
        swap: o('swap_pdf_info') === '1',
        pageNumbers: o('show_page_number_on_pdf') === '1',
        words: { on: o('total_to_words_enabled') === '1', lower: o('total_to_words_lowercase') === '1' },
        dateFormat: o('dateformat', 'd/m/Y|%d/%m/%Y'), timezone: o('default_timezone') || undefined,
        legalText: o('e_sign_legal_text'),
        showSignature: o(`show_pdf_signature_${kind}`) === '1',
        logoKeys: [`${kind}_logo_url`, 'company_logo_url'],
        /** CSS @page + base typography + optional page numbers. */
        pageCss: () => `@page{size:${size === 'LETTER' ? 'letter' : size.toLowerCase()} ${orient === 'LANDSCAPE' ? 'landscape' : 'portrait'};margin:14mm 14mm 16mm 14mm${o('show_page_number_on_pdf') === '1' ? ';@bottom-center{content:counter(page) " / " counter(pages);font-size:8pt;color:#8a8a8a}' : ''}}`,
        baseCss() { return `*{box-sizing:border-box}body{margin:0;font-family:${this.font};font-size:${this.fontSize}pt;line-height:1.45;color:#303030}` },
    }
}

/** 1234.5 → "1 234,50" using the separators from Settings (and no decimals when "hide zero decimals" is on). */
export function formatNumber(n, s) {
    const v = Number(n) || 0
    let [i, d] = Math.abs(v).toFixed(2).split('.')
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, s.sep.thousand)
    const body = s.trimZero && d === '00' ? i : `${i}${s.sep.decimal}${d}`
    return `${v < 0 ? '-' : ''}${body}`
}
export function formatMoney(n, cur, s, { noSymbol = false } = {}) {
    const v = formatNumber(n, s)
    if (noSymbol) return v
    const sym = cur?.symbol || cur?.name || ''
    return cur?.placement === 'before' ? `${sym}${v}` : `${v} ${sym}`.trim()
}

/**
 * The Rapport "paper" look for every sales document (invoice, estimate, proposal, purchase order, contract), on screen and in the PDF:
 * small spaced labels, hairlines, a plain table, a bold total with a thick rule and, on invoices, a stamp. On screen the page is a warm
 * paper card; when printing (the PDF) it is the plain page. Appended after each document's own CSS.
 */
export const paperCss = () => `
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif;color:#17191a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media screen{html{background:rgba(255,255,255,.004)}/* not fully transparent, or the page would paint the whole canvas with the paper colour */body:not(.pub){position:relative;max-width:none;margin:0;padding:46px 52px;background:#fbf8f2;border-radius:20px;box-shadow:0 30px 60px -30px rgba(60,40,20,.35)}
body.pub{background:#ebe8e1}.pub .card,.card{background:#fbf8f2;border-color:#e3ded4;border-radius:20px;box-shadow:0 30px 60px -30px rgba(60,40,20,.3);position:relative}.pub .bar,.bar{border-color:#e3ded4;background:#fbf8f2}}
.hdr{padding-bottom:6px}.hdr .hr h1{margin:0;font-size:.78em;text-transform:uppercase;letter-spacing:.16em;color:#676a66;font-weight:700}
.hdr .hr .num{font-size:1.9em;font-weight:800;letter-spacing:-.02em;color:#17191a;font-variant-numeric:tabular-nums}.hdr .hr .status{font-size:.8em;letter-spacing:.1em}
.hdr .hl .info,.org{color:#4a4d49}.info{color:#4a4d49}.info strong{color:#17191a}
.lbl{font-size:.72em;text-transform:uppercase;letter-spacing:.12em;color:#676a66;font-weight:700;margin-bottom:3px}
.dates{display:flex;flex-wrap:wrap;gap:4px 22px;padding:10px 0;margin-top:12px;border-top:1px solid #e3ded4;border-bottom:1px solid #e3ded4;color:#676a66}.dates strong{color:#17191a;font-variant-numeric:tabular-nums}.hdr .hr .info{text-align:right}.hdr .hr .dates{justify-content:flex-end}
.items{border-collapse:collapse}.items th{background:transparent!important;color:#676a66!important;font-size:.76em;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:9px 8px;border-bottom:1px solid #e3ded4}
.items td>strong:first-child{white-space:pre-line}.items td{padding:11px 8px;border-bottom:1px solid #e3ded4;font-variant-numeric:tabular-nums}.items .n{color:#a29f95}.long{color:#676a66}
.tot{width:min(300px,100%)}.tot td{padding:5px 0;background:transparent!important;border:0;color:#4a4d49;font-weight:500;font-variant-numeric:tabular-nums}
.tot tr.grand td{border-top:2px solid #17191a;padding-top:9px;color:#17191a;font-weight:800;font-size:1.15em}
.words{color:#676a66}h4{margin:22px 0 6px;font-size:.76em;text-transform:uppercase;letter-spacing:.12em;color:#676a66}.plain th{color:#676a66;font-size:.76em;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e3ded4!important}.plain td{border-bottom:1px solid #eee9de}
.stamp{position:absolute;left:56px;top:182px;transform:rotate(-11deg);border:3px solid #2f7d62;color:#2f7d62;border-radius:12px;padding:5px 18px;font-weight:800;font-size:22pt;letter-spacing:.14em;text-transform:uppercase;opacity:.82;pointer-events:none;mix-blend-mode:multiply}
.stamp.late{border-color:#c8431f;color:#c8431f;font-size:18pt}.stamp.mute{border-color:#8b8f93;color:#8b8f93;font-size:18pt}
@media print{html,body{background:transparent!important}body{max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border-radius:0!important}.stamp{top:34mm;left:3mm}}
@media(max-width:640px){.stamp{left:16px;top:170px}}`

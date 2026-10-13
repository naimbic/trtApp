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

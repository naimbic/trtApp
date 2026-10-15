// Pure sales calculations replicating Perfex CRM 3.4 sales_helper behaviour.
// No I/O, no dependencies. Money is rounded to 2 decimals.

export const round2 = (n) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return 0
    // epsilon guards against binary artefacts such as 1.005 -> 1.00
    return Math.round((x + Math.sign(x) * Number.EPSILON) * 100) / 100
}

export const INVOICE_STATUS = { UNPAID: 1, PAID: 2, PARTIALLY: 3, OVERDUE: 4, CANCELLED: 5, DRAFT: 6 }

/**
 * Compute document totals (invoice / estimate / proposal / credit note).
 *
 * @param {object} p
 * @param {{qty:number, rate:number, taxes?:{name?:string, rate:number}[]}[]} p.items
 * @param {number} [p.discountPercent]  percentage discount (wins over discountFixed when > 0)
 * @param {'before_tax'|'after_tax'|''} [p.discountType]  Perfex discount_type; '' behaves like after_tax
 * @param {number} [p.discountFixed]    fixed discount amount
 * @param {number} [p.adjustment]
 * @param {'exclusive'|'inclusive'|'none'} [p.taxMode]  exclusive (default, Perfex): tax added on top;
 *        inclusive: line rate already contains tax; none: ignore taxes
 * @returns {{subtotal:number, discountTotal:number, taxes:{name:string,rate:number,total:number}[], totalTax:number, total:number}}
 */
export function calcDocument({
    items = [],
    discountPercent = 0,
    discountType = 'before_tax',
    discountFixed = 0,
    adjustment = 0,
    taxMode = 'exclusive',
} = {}) {
    const pct = Number(discountPercent) || 0
    const fixed = Number(discountFixed) || 0
    const before = discountType === 'before_tax'

    // 1) line amounts and subtotal
    const lines = items.map((it) => {
        let amount = round2((Number(it.qty) || 0) * (Number(it.rate) || 0))
        const taxes = taxMode === 'none' ? [] : it.taxes || []
        if (taxMode === 'inclusive' && taxes.length) {
            const sumRate = taxes.reduce((s, t) => s + (Number(t.rate) || 0), 0)
            amount = round2(amount / (1 + sumRate / 100))
        }
        return { amount, taxes }
    })
    const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0))

    // 2) before_tax discount reduces each line's taxable amount
    let discountBefore = 0
    if (before) discountBefore = pct > 0 ? round2((subtotal * pct) / 100) : round2(fixed)

    // 3) taxes per line, rounded to 2 decimals, aggregated by name + rate
    const taxMap = new Map()
    let totalTax = 0
    for (const l of lines) {
        let base = l.amount
        if (before && subtotal !== 0) {
            base = pct > 0 ? l.amount - (l.amount * pct) / 100 : l.amount - (l.amount / subtotal) * discountBefore
        }
        for (const t of l.taxes) {
            const rate = Number(t.rate) || 0
            const tax = round2((base / 100) * rate)
            const name = t.name || `${rate}%`
            const key = `${name}|${rate}`
            const cur = taxMap.get(key) || { name, rate, total: 0 }
            cur.total = round2(cur.total + tax)
            taxMap.set(key, cur)
            totalTax = round2(totalTax + tax)
        }
    }

    // 4) after_tax (or unspecified) discount applies to subtotal + tax
    let discountTotal = discountBefore
    if (!before) discountTotal = pct > 0 ? round2(((subtotal + totalTax) * pct) / 100) : round2(fixed)

    const total = round2(subtotal + totalTax - discountTotal + (Number(adjustment) || 0))
    return { subtotal, discountTotal, taxes: [...taxMap.values()], totalTax, total }
}

const dateOnly = (d) => {
    const x = d instanceof Date ? d : new Date(d)
    return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())
}

/**
 * Perfex Invoices_model::update_invoice_status + overdue rule.
 * invoice: { status, total, dueDate, creditsApplied? }   payments: [{amount}]
 * Returns the Perfex status code (1 unpaid, 2 paid, 3 partially paid, 4 overdue, 5 cancelled, 6 draft).
 * Cancelled invoices never change; drafts stay draft until a payment exists.
 */
export function invoiceStatusFromPayments(invoice, payments = [], now = new Date()) {
    if (invoice.status === INVOICE_STATUS.CANCELLED) return INVOICE_STATUS.CANCELLED
    const paid = round2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))
    const credits = round2(Number(invoice.creditsApplied) || 0)
    const total = round2(invoice.total)
    if (invoice.status === INVOICE_STATUS.DRAFT && paid === 0 && credits === 0) return INVOICE_STATUS.DRAFT

    const left = round2(total - paid - credits)
    if (left <= 0) return INVOICE_STATUS.PAID
    const partially = left < total
    const overdue = invoice.dueDate && dateOnly(invoice.dueDate) < dateOnly(now)
    if (overdue) return INVOICE_STATUS.OVERDUE
    return partially ? INVOICE_STATUS.PARTIALLY : INVOICE_STATUS.UNPAID
}

/**
 * Perfex sales_number_format / format_invoice_number.
 * format 1: prefix + padded number               -> INV-000042
 * format 2: prefix + year + '/' + padded number  -> INV-2019/000042
 * format 3: prefix + padded number + '-' + yy    -> INV-000042-19
 * format 4: prefix + padded number + '-mm-yyyy'  -> INV-042-10-2019
 * Drafts display as prefix + 'DRAFT'. `padding` is the `number_padding_prefixes` option.
 */
export function formatDocumentNumber({ prefix = '', number, numberFormat = 1, date, padding = 6, draft = false } = {}) {
    // a prefix written like "FA -" reads "FA - 100-10-2026" (space after the dash); dates use dashes, never slashes
    const raw = prefix ?? ''
    const pre = /\s-$/.test(raw) ? `${raw} ` : raw
    if (draft) return `${pre}DRAFT`
    const padded = String(number ?? 0).padStart(padding, '0')
    const d = date ? (date instanceof Date ? date : new Date(date)) : new Date()
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    switch (Number(numberFormat)) {
        case 2: return `${pre}${yyyy}-${padded}`
        case 3: return `${pre}${padded}-${String(yyyy).slice(2)}`
        case 4: return `${pre}${padded}-${mm}-${yyyy}`
        default: return `${pre}${padded}`
    }
}

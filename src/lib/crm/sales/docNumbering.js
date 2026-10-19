import prisma from '@/lib/prisma'

/**
 * Numbering rules for invoices (and the other numbered documents), driven by the Settings → Billing options:
 * prefix, number format, next number, restart (never / yearly / monthly), "delete only the last one" and
 * "take the number back on delete". Drafts that carry placeholder numbers (>= 1e9) never count.
 */
const REAL = 1_000_000_000
export const KINDS = {
    invoice: { model: 'crmInvoice', label: 'invoice', prefix: 'invoice_prefix', defPrefix: 'INV-', format: 'invoice_number_format', next: 'next_invoice_number', reset: 'invoice_number_reset', onlyLast: 'delete_only_on_last_invoice', decrement: 'invoice_number_decrement_on_delete' },
    purchase_order: { model: 'crmPurchaseOrder', label: 'purchase order', prefix: 'purchase_order_prefix', defPrefix: 'BC-', format: 'purchase_order_number_format', next: 'next_purchase_order_number', reset: 'purchase_order_number_reset', onlyLast: 'delete_only_on_last_purchase_order', decrement: 'purchase_order_number_decrement_on_delete' },
    estimate: { model: 'crmEstimate', label: 'estimate', prefix: 'estimate_prefix', defPrefix: 'EST-', format: 'estimate_number_format', next: 'next_estimate_number', reset: 'estimate_number_reset', onlyLast: 'delete_only_on_last_estimate', decrement: 'estimate_number_decrement_on_delete' },
}

const opt = async (name, fb = '') => (await prisma.crmOption.findUnique({ where: { name } }))?.value ?? fb
const setOpt = (name, value) => prisma.crmOption.upsert({ where: { name }, update: { value: String(value) }, create: { name, value: String(value) } })

/** Start and end of the period a date falls in, per the restart rule (null = no restart). */
function periodOf(rule, date) {
    const d = new Date(date || Date.now())
    if (rule === 'yearly') return [new Date(Date.UTC(d.getUTCFullYear(), 0, 1)), new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1))]
    if (rule === 'monthly') return [new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))]
    return null
}

async function highest(k, period) {
    const where = { number: { lt: REAL }, ...(period ? { date: { gte: period[0], lt: period[1] } } : {}) }
    const row = await prisma[k.model].findFirst({ where, orderBy: { number: 'desc' }, select: { number: true } })
    return row?.number || 0
}

/** The number, prefix and format a new document gets. Also moves the "next number" setting forward. */
export async function allocateNumber(kind, date) {
    const k = KINDS[kind]
    const rule = await opt(k.reset, 'never')
    const period = periodOf(rule, date)
    let number
    if (period) number = (await highest(k, period)) + 1
    else {
        const next = Number(await opt(k.next, '0')) || 0
        number = next > 0 ? next : (await highest(k, null)) + 1
    }
    await setOpt(k.next, number + 1)
    return { number, prefix: await opt(k.prefix, k.defPrefix), numberFormat: Number(await opt(k.format, '1')) || 1 }
}

/** Throws a message string when the document may not be deleted under the "only the last one" rule. */
export async function checkDeletable(kind, doc) {
    const k = KINDS[kind]
    if ((await opt(k.onlyLast, '0')) !== '1' || doc.number >= REAL) return null
    const period = periodOf(await opt(k.reset, 'never'), doc.date)
    if (doc.number < (await highest(k, period))) return `Only the last ${k.label} can be deleted (Settings → Billing).`
    return null
}

/** After a delete: take the number back when the rule is on and the deleted document was the last one. */
export async function afterDelete(kind, doc) {
    const k = KINDS[kind]
    if ((await opt(k.decrement, '0')) !== '1' || doc.number >= REAL) return
    const next = Number(await opt(k.next, '0')) || 0
    if (next === doc.number + 1) await setOpt(k.next, doc.number)
}

/**
 * A draft that came from Perfex carries the placeholder number 1000000000. The moment it stops being a draft (a payment, "mark as sent"...)
 * it gets the next real number, prefix and format, like a new document. Returns the document's number info (changed or not).
 */
export async function ensureRealNumber(kind, doc) {
    if (!doc || !(doc.number >= REAL)) return null
    const k = KINDS[kind]
    const { number, prefix, numberFormat } = await allocateNumber(kind, doc.date)
    await prisma[k.model].update({ where: { id: doc.id }, data: { number, prefix, numberFormat } })
    return { number, prefix, numberFormat }
}

import prisma from '@/lib/prisma'

/**
 * Numbering rules for invoices (and the other numbered documents), driven by the Settings → Billing options:
 * prefix, number format, next number, restart (never / yearly / monthly), "delete only the last one" and
 * "take the number back on delete". Drafts that carry placeholder numbers (>= 1e9) never count.
 */
const REAL = 1_000_000_000
export const KINDS = {
    invoice: { model: 'crmInvoice', label: 'invoice', prefix: 'invoice_prefix', defPrefix: 'FA -', defFormat: '4', defReset: 'yearly', format: 'invoice_number_format', next: 'next_invoice_number', reset: 'invoice_number_reset', onlyLast: 'delete_only_on_last_invoice', decrement: 'invoice_number_decrement_on_delete' },
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

const keyOf = (period) => period[0].toISOString().slice(0, 7)

/** The number, prefix and format a new document gets. Also moves the "next number" setting forward.
 *  With a restart rule (every year / every month) the "Next number" of Settings still counts inside the running period: the number is the one
 *  written there, not "the highest number of the period + 1" (one stray high number, typed by hand or imported, used to pull every following
 *  document up to it). A new period starts again after the highest number already used in it (normally from 1); a document dated in another
 *  period continues that period and leaves the setting alone. A number already taken in the period is skipped. */
export async function allocateNumber(kind, date) {
    const k = KINDS[kind]
    const rule = await opt(k.reset, k.defReset || 'never')
    const period = periodOf(rule, date)
    const next = Number(await opt(k.next, '0')) || 0
    let number
    let keep = true // move the setting forward
    if (period) {
        const key = keyOf(period), nowKey = keyOf(periodOf(rule, new Date()))
        // which period the "next number" belongs to: the one we wrote it for, or today's when somebody typed it in Settings (or it was never tracked)
        const [autoKey, autoNum] = String(await opt(`${k.next}_auto`, '')).split(':')
        const nextKey = next > 0 && String(next) !== autoNum ? nowKey : autoKey
        number = next > 0 && nextKey === key ? next : (await highest(k, period)) + 1
        for (let i = 0; i < 500 && await prisma[k.model].findFirst({ where: { number, date: { gte: period[0], lt: period[1] } }, select: { id: true } }); i++) number++
        keep = key === nowKey || nextKey === key
        if (keep) await setOpt(`${k.next}_auto`, `${key}:${number + 1}`)
    } else number = next > 0 ? next : (await highest(k, null)) + 1
    if (keep) await setOpt(k.next, number + 1)
    return { number, prefix: await opt(k.prefix, k.defPrefix), numberFormat: Number(await opt(k.format, k.defFormat || '1')) || 1 }
}

/** Throws a message string when the document may not be deleted under the "only the last one" rule. */
export async function checkDeletable(kind, doc) {
    const k = KINDS[kind]
    if ((await opt(k.onlyLast, '0')) !== '1' || doc.number >= REAL) return null
    const period = periodOf(await opt(k.reset, k.defReset || 'never'), doc.date)
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

const isAdmin = (authority = []) => authority.includes('admin') || authority.includes('crm.admin')
const COUNTER = { crmInvoice: 'invoice', crmEstimate: 'estimate', crmPurchaseOrder: 'purchase_order' }

/**
 * Administrators and super admins may type the number of a document themselves.
 * Returns { number } (the number to apply, or null: nothing to change) or { problem } (message). Call before writing; apply with applyManualNumber.
 */
export async function manualNumber(model, input, authority) {
    const raw = input?.number
    if (!isAdmin(authority) || raw === undefined || raw === null || raw === '') return { number: null }
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n >= REAL) return { problem: 'The number must be a whole number above 0' }
    const hasPrefix = !!COUNTER[model] // proposals have no prefix
    const cur = input.id ? await prisma[model].findUnique({ where: { id: input.id }, select: hasPrefix ? { number: true, prefix: true, date: true, numberFormat: true } : { number: true, date: true } }) : null
    if (cur && cur.number === n) return { number: null }
    // the same number in another year is not a clash when numbering restarts every year (or the number on paper carries the year): 1 of 2027 is not 1 of 2017
    let period = null
    if (hasPrefix) {
        const k = KINDS[COUNTER[model]]
        const rule = await opt(k.reset, k.defReset || 'never')
        const fmt = Number(cur?.numberFormat ?? (await opt(k.format, k.defFormat || '1'))) || 1
        const when = input.date || cur?.date || new Date()
        period = periodOf(rule === 'never' ? (fmt === 4 ? 'monthly' : fmt === 2 || fmt === 3 ? 'yearly' : 'never') : rule, when)
    }
    const clash = await prisma[model].findFirst({ where: { number: n, ...(input.id ? { id: { not: input.id } } : {}), ...(cur && hasPrefix ? { prefix: cur.prefix } : {}), ...(period ? { date: { gte: period[0], lt: period[1] } } : {}) }, select: { id: true } })
    if (clash) return { problem: `The number ${n} is already used by another document${period ? ' in the same period' : ''}` }
    return { number: n }
}

/** Writes the number chosen with manualNumber and keeps the "next number" setting right: ahead of a higher number, and back down when the
 *  last document is given a lower number (a wrong 1000 corrected to 112 makes the next one 113, not 1001). */
export async function applyManualNumber(model, id, number) {
    if (!number) return
    const kind = COUNTER[model]
    const before = kind ? await prisma[model].findUnique({ where: { id }, select: { number: true, date: true } }) : null
    await prisma[model].update({ where: { id }, data: { number } })
    if (!kind) return
    const k = KINDS[kind]
    const next = Number(await opt(k.next, '0')) || 0
    if (number >= next) await setOpt(k.next, number + 1)
    else if (before && before.number + 1 === next) {
        const top = await highest(k, periodOf(await opt(k.reset, k.defReset || 'never'), before.date))
        if (top + 1 < next) await setOpt(k.next, top + 1)
    }
}

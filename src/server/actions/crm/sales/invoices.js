'use server'

import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { calcDocument, round2, formatDocumentNumber, invoiceStatusFromPayments, INVOICE_STATUS } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { allocateNumber, checkDeletable, afterDelete, ensureRealNumber, manualNumber, applyManualNumber } from '@/lib/crm/sales/docNumbering'
import { lockProblem } from '@/lib/crm/docLock'

const REL = 'invoice'
const plain = (v) => JSON.parse(JSON.stringify(v))
const fail = (message) => ({ success: false, message })

const option = async (name, fallback) => {
    const row = await prisma.crmOption.findUnique({ where: { name } })
    return row?.value ?? fallback
}

const logActivity = async (invoiceId, description, staffId) => {
    try {
        await prisma.crmSalesActivity.create({
            data: { relType: REL, relId: invoiceId, description, staffId: staffId || undefined, date: new Date() },
        })
    } catch {
        /* activity logging must never break a write */
    }
}

const loadLines = async (invoiceId) => {
    const lines = await prisma.crmItemable.findMany({
        where: { relType: REL, relId: invoiceId },
        orderBy: { itemOrder: 'asc' },
        include: { taxes: true },
    })
    return lines.map((l) => ({
        id: l.id,
        description: l.description,
        longDescription: l.longDescription || '',
        qty: l.qty,
        rate: l.rate,
        unit: l.unit || '',
        taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })),
    }))
}

const paidSum = async (invoiceId) => {
    const rows = await prisma.crmPayment.findMany({ where: { invoiceId }, select: { amount: true } })
    return round2(rows.reduce((s, p) => s + (p.amount || 0), 0))
}

/** Recompute and persist the Perfex status from payments (cancelled stays cancelled). */
const refreshStatus = async (invoiceId) => {
    const invoice = await prisma.crmInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return null
    const payments = await prisma.crmPayment.findMany({ where: { invoiceId }, select: { amount: true } })
    const status = invoiceStatusFromPayments(invoice, payments)
    if (status !== invoice.status) await prisma.crmInvoice.update({ where: { id: invoiceId }, data: { status } })
    if (status !== INVOICE_STATUS.DRAFT) await ensureRealNumber('invoice', invoice) // a draft with a placeholder number gets its real one now
    return status
}

/** The bank account assigned to a client (profile), used for its documents when none is chosen. */
const clientBank = async (clientId) => (clientId ? (await prisma.crmClient.findUnique({ where: { id: clientId }, select: { bankAccountId: true } }))?.bankAccountId : null) || null

/** Lookups for the editor: taxes, currencies, payment modes. */
export async function getInvoiceLookups() {
    await requirePermission('invoices', 'view')
    const [taxes, currencies, paymentModes] = await Promise.all([
        prisma.crmTax.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmCurrency.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmPaymentMode.findMany({ orderBy: { name: 'asc' } }),
    ])
    const o = async (n, fb = '') => (await prisma.crmOption.findUnique({ where: { name: n } }))?.value ?? fb
    const defaultTaxes = [...String(await o('default_tax')).matchAll(/s:\d+:"([^"]*)"/g)].map((m) => { const [name, rate] = m[1].split('|'); return { name, rate: Number(rate) } })
    return plain({
        numbering: { prefix: await o('invoice_prefix', 'INV-'), numberFormat: Number(await o('invoice_number_format', '1')) || 1, padding: await numberPadding() },
        defaults: { dueAfter: await o('invoice_due_after'), clientNote: await o('predefined_clientnote_invoice'), terms: await o('predefined_terms_invoice'), taxes: defaultTaxes },
        taxes: taxes.map((t) => ({ name: t.name, rate: t.taxRate })),
        currencies: currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, isDefault: c.isDefault, placement: c.placement })),
        paymentModes: paymentModes.map((m) => ({ id: m.id, name: m.name })),
    })
}

/** Full invoice for the view/edit pages. */
export async function getInvoiceDocument(id) {
    await requirePermission('invoices', 'view')
    const invoice = await prisma.crmInvoice.findUnique({ where: { id } })
    if (!invoice) return null
    const [items, payments, client, currency, activity] = await Promise.all([
        loadLines(id),
        prisma.crmPayment.findMany({ where: { invoiceId: id }, orderBy: { paymentDate: 'desc' } }),
        invoice.clientId ? prisma.crmClient.findUnique({ where: { id: invoice.clientId }, select: { id: true, company: true } }) : null,
        invoice.currencyId ? prisma.crmCurrency.findUnique({ where: { id: invoice.currencyId } }) : null,
        prisma.crmSalesActivity.findMany({ where: { relType: REL, relId: id }, orderBy: { date: 'desc' }, take: 50 }),
    ])
    const paid = round2(payments.reduce((s, p) => s + (p.amount || 0), 0))
    // a copy made by a recurring invoice points back to it; the recurring invoice itself points to its latest copy
    const pad = await numberPadding()
    const label = (r) => r && { id: r.id, displayNumber: formatDocumentNumber({ prefix: r.prefix, number: r.number, numberFormat: r.numberFormat, date: r.date, padding: pad }), date: r.date }
    const pick = { id: true, number: true, prefix: true, numberFormat: true, date: true }
    const [original, latest] = await Promise.all([
        invoice.isRecurringFrom ? prisma.crmInvoice.findUnique({ where: { id: invoice.isRecurringFrom }, select: pick }) : null,
        invoice.recurring > 0 ? prisma.crmInvoice.findFirst({ where: { isRecurringFrom: id }, orderBy: { createdAt: 'desc' }, select: pick }) : null,
    ])
    return plain({
        recurringFrom: label(original),
        lastGenerated: label(latest),
        invoice: {
            ...invoice,
            displayNumber: formatDocumentNumber({
                prefix: invoice.prefix,
                number: invoice.number,
                numberFormat: invoice.numberFormat,
                date: invoice.date,
                padding: await numberPadding(),
                draft: invoice.status === INVOICE_STATUS.DRAFT,
            }),
        },
        items,
        payments,
        client,
        currency,
        activity,
        paid,
        balance: round2(invoice.total - paid),
    })
}

/**
 * Create or update an invoice with its lines. Totals are always computed server-side.
 * input: { id?, clientId, date, dueDate, currencyId, discountPercent, discountFixed, discountType,
 *          adjustment, clientNote, adminNote, terms, draft, items: [{description, longDescription, qty, rate, unit, taxes:[{name,rate}]}] }
 */
export async function saveInvoice(input) {
    const isNew = !input.id
    const session = await requirePermission('invoices', isNew ? 'create' : 'edit')
    const staffId = await getStaffId(session)
    if (!isNew) {
        const was = await prisma.crmInvoice.findUnique({ where: { id: input.id }, select: { status: true } })
        const lock = lockProblem({ authority: session.user.authority || [], locked: was?.status === INVOICE_STATUS.PAID, force: input.force, noun: 'paid invoice' })
        if (lock) return fail(lock)
    }

    if (!input.clientId) return fail('Client is required')
    const items = (input.items || []).filter((i) => String(i.description || '').trim())
    if (!items.length) return fail('Add at least one line item')

    const discountType = input.discountType || 'before_tax'
    const totals = calcDocument({
        items,
        discountPercent: input.discountPercent,
        discountFixed: input.discountFixed,
        discountType,
        adjustment: input.adjustment,
    })
    const pct = Number(input.discountPercent) || 0

    const data = {
        clientId: input.clientId,
        date: input.date ? new Date(input.date) : new Date(),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        currencyId: input.currencyId || null,
        ...(input.bankAccountId !== undefined ? { bankAccountId: input.bankAccountId || (await clientBank(input.clientId)) } : {}), // none chosen: the bank assigned to the client
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        total: totals.total,
        discountPercent: pct,
        discountTotal: totals.discountTotal,
        discountType,
        adjustment: Number(input.adjustment) || 0,
        clientNote: input.clientNote || null,
        adminNote: input.adminNote || null,
        terms: input.terms || null,
        // "send reminders to the client" (default on) is kept as the Perfex flag that cancels the overdue ones
        ...(input.remindClient !== undefined ? { cancelOverdueReminders: input.remindClient === false } : {}),
        // recurring: repeat every N days / weeks / months / years, for a number of cycles (0 = until stopped)
        ...(input.recurring !== undefined && !input.isRecurringCopy ? (() => {
            const n = Math.max(0, Math.min(Math.floor(Number(input.recurring)) || 0, 365))
            return { recurring: n, recurringType: n ? (['day', 'week', 'month', 'year'].includes(input.recurringType) ? input.recurringType : 'month') : null, customRecurring: n > 0, cycles: n ? Math.max(0, Math.floor(Number(input.cycles)) || 0) : 0 }
        })() : {}),
    }

    const manual = await manualNumber('crmInvoice', input, session.user.authority || [])
    if (manual.problem) return fail(manual.problem)
    let invoice
    if (isNew) {
        // prefix, format, next number and the restart rule all come from Settings → Billing → Invoices
        const { number, prefix, numberFormat } = await allocateNumber('invoice', data.date)
        invoice = await prisma.crmInvoice.create({
            data: {
                ...data,
                number,
                prefix,
                numberFormat,
                status: input.draft ? INVOICE_STATUS.DRAFT : INVOICE_STATUS.UNPAID,
                addedFrom: staffId || undefined,
                // Settings → Sales: the person who creates the invoice is its sale agent
                ...(!data.saleAgentId && staffId && (await readSettings(['automatically_set_logged_in_staff_sales_agent'])).on('automatically_set_logged_in_staff_sales_agent') ? { saleAgentId: staffId } : {}),
                hash: crypto.randomUUID().replace(/-/g, ''),
            },
        })
    } else {
        const existing = await prisma.crmInvoice.findUnique({ where: { id: input.id } })
        if (!existing) return fail('Invoice not found')
        if (existing.isRecurringFrom) for (const k of ['recurring', 'recurringType', 'customRecurring', 'cycles']) delete data[k] // a copy does not repeat itself
        invoice = await prisma.crmInvoice.update({ where: { id: input.id }, data })
        const oldLines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: invoice.id }, select: { id: true } })
        await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: invoice.id } })
        await prisma.crmItemable.deleteMany({ where: { id: { in: oldLines.map((l) => l.id) } } })
    }

    await applyManualNumber('crmInvoice', invoice.id, manual.number)
    for (const [idx, it] of items.entries()) {
        const line = await prisma.crmItemable.create({
            data: {
                relType: REL,
                relId: invoice.id,
                description: String(it.description).trim(),
                longDescription: it.longDescription || null,
                qty: Number(it.qty) || 0,
                rate: Number(it.rate) || 0,
                unit: it.unit || null,
                itemOrder: idx + 1,
            },
        })
        for (const t of it.taxes || []) {
            await prisma.crmItemTax.create({
                data: { itemableId: line.id, relType: REL, relId: invoice.id, taxName: t.name || `${t.rate}%`, taxRate: Number(t.rate) || 0 },
            })
        }
    }

    if (!isNew) await refreshStatus(invoice.id)
    await logActivity(invoice.id, isNew ? 'Invoice created' : 'Invoice updated', staffId)
    return { success: true, id: invoice.id }
}

/** Record a payment and update the invoice status like Perfex. */
export async function recordPayment(invoiceId, { amount, paymentModeId, paymentDate, note, transactionId } = {}) {
    const session = await requirePermission('payments', 'create')
    const staffId = await getStaffId(session)

    const invoice = await prisma.crmInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return fail('Invoice not found')
    if (invoice.status === INVOICE_STATUS.CANCELLED) return fail('Cannot add a payment to a cancelled invoice')

    const value = round2(amount)
    if (!(value > 0)) return fail('Amount must be greater than zero')
    const balance = round2(invoice.total - (await paidSum(invoiceId)))
    if (value > balance) return fail(`Amount exceeds the balance due (${balance.toFixed(2)})`)

    await prisma.crmPayment.create({
        data: {
            invoiceId,
            amount: value,
            paymentModeId: paymentModeId || undefined,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            note: note || null,
            transactionId: transactionId || null,
        },
    })
    await refreshStatus(invoiceId)
    await logActivity(invoiceId, `Payment of ${value.toFixed(2)} recorded`, staffId)
    return { success: true }
}

export async function deletePayment(paymentId, force = false) {
    const session = await requirePermission('payments', 'delete')
    const staffId = await getStaffId(session)
    const payment = await prisma.crmPayment.findUnique({ where: { id: paymentId } })
    if (!payment) return fail('Payment not found')
    const inv = payment.invoiceId ? await prisma.crmInvoice.findUnique({ where: { id: payment.invoiceId }, select: { status: true } }) : null
    const lock = lockProblem({ authority: session.user.authority || [], locked: inv?.status === INVOICE_STATUS.PAID, force, noun: 'payment of a paid invoice' })
    if (lock) return fail(lock)
    await prisma.crmPayment.delete({ where: { id: paymentId } })
    if (payment.invoiceId) {
        // A draft only stays a draft while it has no payments, so re-evaluate from UNPAID.
        const invoice = await prisma.crmInvoice.findUnique({ where: { id: payment.invoiceId } })
        if (invoice && invoice.status !== INVOICE_STATUS.CANCELLED && invoice.status !== INVOICE_STATUS.DRAFT) {
            await prisma.crmInvoice.update({ where: { id: invoice.id }, data: { status: INVOICE_STATUS.UNPAID } })
        }
        await refreshStatus(payment.invoiceId)
        await logActivity(payment.invoiceId, `Payment of ${(payment.amount || 0).toFixed(2)} deleted`, staffId)
    }
    return { success: true }
}

/** action: 'cancel' | 'uncancel' | 'markSent' | 'markUnpaid' (draft -> unpaid). */
export async function setInvoiceState(invoiceId, action, force = false) {
    const session = await requirePermission('invoices', 'edit')
    const staffId = await getStaffId(session)
    const invoice = await prisma.crmInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return fail('Invoice not found')
    const lock = lockProblem({ authority: session.user.authority || [], locked: invoice.status === INVOICE_STATUS.PAID, force, noun: 'paid invoice' })
    if (lock) return fail(lock)

    if (action === 'cancel') {
        if ((await paidSum(invoiceId)) > 0) return fail('Cannot cancel an invoice that has payments')
        await prisma.crmInvoice.update({ where: { id: invoiceId }, data: { status: INVOICE_STATUS.CANCELLED } })
        await logActivity(invoiceId, 'Invoice cancelled', staffId)
    } else if (action === 'uncancel') {
        await prisma.crmInvoice.update({ where: { id: invoiceId }, data: { status: INVOICE_STATUS.UNPAID } })
        await refreshStatus(invoiceId)
        await logActivity(invoiceId, 'Invoice marked as not cancelled', staffId)
    } else if (action === 'draft') {
        if ((await paidSum(invoiceId)) > 0) return fail('Cannot send an invoice that has payments back to draft')
        await prisma.crmInvoice.update({ where: { id: invoiceId }, data: { status: INVOICE_STATUS.DRAFT, sent: false, dateSend: null } })
        await logActivity(invoiceId, 'Invoice moved back to draft', staffId)
    } else if (action === 'markSent') {
        await prisma.crmInvoice.update({
            where: { id: invoiceId },
            data: {
                sent: true,
                dateSend: new Date(),
                ...(invoice.status === INVOICE_STATUS.DRAFT ? { status: INVOICE_STATUS.UNPAID } : {}),
            },
        })
        await refreshStatus(invoiceId)
        await logActivity(invoiceId, 'Invoice marked as sent', staffId)
    } else {
        return fail('Unknown action')
    }
    return { success: true }
}

const isCrmAdminAuth = (authority = []) => authority.includes('admin') || authority.includes('crm.admin')

/** Delete an invoice (one with payments only by an administrator, after confirming) (Perfex also removes its lines, taxes and activity). */
export async function deleteInvoice(id, force = false) {
    const session = await requirePermission('invoices', 'delete')
    const invoice = await prisma.crmInvoice.findUnique({ where: { id } })
    if (!invoice) return fail('Invoice not found')
    const paymentCount = await prisma.crmPayment.count({ where: { invoiceId: id } })
    if (paymentCount > 0) {
        // administrators and super admins may delete an invoice together with its payments, after confirming
        if (!isCrmAdminAuth(session.user.authority || [])) return fail('This invoice has payments. Delete the payments first, or cancel the invoice instead.')
        if (!force) return fail(`LOCKED_CONFIRM: This invoice has ${paymentCount} payment(s). Deleting it deletes them too and can upset your accounts; confirm to go on.`)
        await prisma.crmPayment.deleteMany({ where: { invoiceId: id } })
    }
    const blocked = await checkDeletable('invoice', invoice)
    if (blocked) return fail(blocked)
    const lines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: id }, select: { id: true } })
    await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmItemable.deleteMany({ where: { id: { in: lines.map((l) => l.id) } } })
    await prisma.crmSalesActivity.deleteMany({ where: { relType: REL, relId: id } })
    // estimates / proposals that were converted into this invoice become convertible again
    await prisma.crmEstimate.updateMany({ where: { invoiceId: id }, data: { invoiceId: null, invoicedDate: null } })
    await prisma.crmProposal.updateMany({ where: { invoiceId: id }, data: { invoiceId: null, dateConverted: null } })
    await prisma.crmPurchaseOrder.updateMany({ where: { invoiceId: id }, data: { invoiceId: null, invoicedDate: null } })
    await prisma.crmExpense.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } })
    await prisma.crmInvoice.delete({ where: { id } })
    await afterDelete('invoice', invoice)
    void session
    return { success: true }
}

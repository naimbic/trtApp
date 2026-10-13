'use server'

import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { calcDocument, formatDocumentNumber } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { allocateNumber, checkDeletable, afterDelete } from '@/lib/crm/sales/docNumbering'
import { createInvoiceFromDocument, createPurchaseOrderFromEstimate } from '@/lib/crm/sales/convert'

const REL = 'purchase_order'
const plain = (v) => JSON.parse(JSON.stringify(v))
const fail = (message) => ({ success: false, message })
const logActivity = (id, description, staffId) => prisma.crmSalesActivity.create({ data: { relType: REL, relId: id, description, staffId: staffId || undefined, date: new Date() } }).catch(() => {})

const loadLines = async (id) => {
    const lines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: id }, orderBy: { itemOrder: 'asc' }, include: { taxes: true } })
    return lines.map((l) => ({ id: l.id, description: l.description, longDescription: l.longDescription || '', qty: l.qty, rate: l.rate, unit: l.unit || '', taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })) }))
}

export async function getPurchaseOrderDefaults() {
    await requirePermission('purchase_orders', 'view')
    const rows = await prisma.crmOption.findMany({ where: { name: { in: ['purchase_order_due_after', 'predefined_clientnote_purchase_order', 'predefined_terms_purchase_order', 'default_tax'] } } })
    const o = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    const taxes = [...String(o.default_tax || '').matchAll(/s:\d+:"([^"]*)"/g)].map((m) => { const [name, rate] = m[1].split('|'); return { name, rate: Number(rate) } })
    return { deliveryIn: o.purchase_order_due_after ?? '', clientNote: o.predefined_clientnote_purchase_order || '', terms: o.predefined_terms_purchase_order || '', taxes }
}

export async function getPurchaseOrderDocument(id) {
    await requirePermission('purchase_orders', 'view')
    const p = await prisma.crmPurchaseOrder.findUnique({ where: { id } })
    if (!p) return null
    const [items, client, currency, activity, invoice, estimate] = await Promise.all([
        loadLines(id),
        p.clientId ? prisma.crmClient.findUnique({ where: { id: p.clientId }, select: { id: true, company: true } }) : null,
        p.currencyId ? prisma.crmCurrency.findUnique({ where: { id: p.currencyId } }) : null,
        prisma.crmSalesActivity.findMany({ where: { relType: REL, relId: id }, orderBy: { date: 'desc' }, take: 50 }),
        p.invoiceId ? prisma.crmInvoice.findUnique({ where: { id: p.invoiceId }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true } }) : null,
        p.estimateId ? prisma.crmEstimate.findUnique({ where: { id: p.estimateId }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true } }) : null,
    ])
    const padding = await numberPadding()
    const num = (x) => formatDocumentNumber({ prefix: x.prefix, number: x.number, numberFormat: x.numberFormat, date: x.date, padding })
    return plain({ order: { ...p, displayNumber: num(p) }, items, client, currency, activity, invoice: invoice ? { id: invoice.id, displayNumber: num(invoice) } : null, estimate: estimate ? { id: estimate.id, displayNumber: num(estimate) } : null })
}

export async function savePurchaseOrder(input) {
    const isNew = !input.id
    const session = await requirePermission('purchase_orders', isNew ? 'create' : 'edit')
    const staffId = await getStaffId(session)
    if (!input.clientId) return fail('Client is required')
    const items = (input.items || []).filter((i) => String(i.description || '').trim())
    if (!items.length) return fail('Add at least one line item')
    const discountType = input.discountType || 'before_tax'
    const totals = calcDocument({ items, discountPercent: input.discountPercent, discountFixed: input.discountFixed, discountType, adjustment: input.adjustment })
    const data = {
        clientId: input.clientId, date: input.date ? new Date(input.date) : new Date(), deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null, currencyId: input.currencyId || null,
        subtotal: totals.subtotal, totalTax: totals.totalTax, total: totals.total, discountPercent: Number(input.discountPercent) || 0, discountTotal: totals.discountTotal, discountType,
        adjustment: Number(input.adjustment) || 0, clientNote: input.clientNote || null, adminNote: input.adminNote || null, terms: input.terms || null, referenceNo: input.referenceNo || null,
    }
    let order
    if (isNew) {
        const { number, prefix, numberFormat } = await allocateNumber('purchase_order', data.date)
        order = await prisma.crmPurchaseOrder.create({ data: { ...data, number, prefix, numberFormat, status: 1, sent: false, hash: crypto.randomUUID().replace(/-/g, ''), addedFrom: staffId || undefined, saleAgentId: staffId || undefined } })
    } else {
        const existing = await prisma.crmPurchaseOrder.findUnique({ where: { id: input.id } })
        if (!existing) return fail('Purchase order not found')
        if (existing.invoiceId) return fail('This purchase order was already invoiced and can no longer be changed')
        order = await prisma.crmPurchaseOrder.update({ where: { id: input.id }, data })
        const old = await prisma.crmItemable.findMany({ where: { relType: REL, relId: order.id }, select: { id: true } })
        await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: order.id } })
        await prisma.crmItemable.deleteMany({ where: { id: { in: old.map((l) => l.id) } } })
    }
    for (const [idx, it] of items.entries()) {
        const line = await prisma.crmItemable.create({ data: { relType: REL, relId: order.id, description: String(it.description).trim(), longDescription: it.longDescription || null, qty: Number(it.qty) || 0, rate: Number(it.rate) || 0, unit: it.unit || null, itemOrder: idx + 1 } })
        for (const t of it.taxes || []) await prisma.crmItemTax.create({ data: { itemableId: line.id, relType: REL, relId: order.id, taxName: t.name || `${t.rate}%`, taxRate: Number(t.rate) || 0 } })
    }
    await logActivity(order.id, isNew ? 'Purchase order created' : 'Purchase order updated', staffId)
    return { success: true, id: order.id }
}

/** action: markDraft | markSent | markConfirmed | markDelivered | markCancelled */
export async function setPurchaseOrderState(id, action) {
    const session = await requirePermission('purchase_orders', 'edit')
    const staffId = await getStaffId(session)
    const p = await prisma.crmPurchaseOrder.findUnique({ where: { id } })
    if (!p) return fail('Purchase order not found')
    const map = { markDraft: [{ status: 1 }, 'Marked as draft'], markSent: [{ status: 2, sent: true, dateSend: new Date() }, 'Marked as sent'], markConfirmed: [{ status: 3 }, 'Marked as confirmed'], markDelivered: [{ status: 4 }, 'Marked as delivered'], markCancelled: [{ status: 5 }, 'Marked as cancelled'] }
    const m = map[action]
    if (!m) return fail('Unknown action')
    await prisma.crmPurchaseOrder.update({ where: { id }, data: m[0] })
    await logActivity(id, m[1], staffId)
    return { success: true }
}

export async function deletePurchaseOrder(id) {
    await requirePermission('purchase_orders', 'delete')
    const p = await prisma.crmPurchaseOrder.findUnique({ where: { id } })
    if (!p) return fail('Purchase order not found')
    if (p.invoiceId) return fail('This purchase order was invoiced. Delete the invoice first if you really need to remove it.')
    const blocked = await checkDeletable('purchase_order', p)
    if (blocked) return fail(blocked)
    const lines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: id }, select: { id: true } })
    await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmItemable.deleteMany({ where: { id: { in: lines.map((l) => l.id) } } })
    await prisma.crmSalesActivity.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmPurchaseOrder.delete({ where: { id } })
    await afterDelete('purchase_order', p)
    return { success: true }
}

export async function convertPurchaseOrderToInvoice(id) {
    const session = await requirePermission('invoices', 'create')
    await requirePermission('purchase_orders', 'view')
    const staffId = await getStaffId(session)
    const p = await prisma.crmPurchaseOrder.findUnique({ where: { id } })
    if (!p) return fail('Purchase order not found')
    if (p.invoiceId) return fail('This purchase order was already invoiced')
    const padding = await numberPadding()
    try {
        const inv = await createInvoiceFromDocument('purchase_order', p, { label: formatDocumentNumber({ prefix: p.prefix, number: p.number, numberFormat: p.numberFormat, date: p.date, padding }), staffId, actor: 'Staff' })
        return { success: true, invoiceId: inv.id }
    } catch (err) { return fail(err.message) }
}

/** Creates a purchase order from an estimate (button on the estimate page). */
export async function purchaseOrderFromEstimate(estimateId) {
    const session = await requirePermission('purchase_orders', 'create')
    await requirePermission('estimates', 'view')
    const staffId = await getStaffId(session)
    const e = await prisma.crmEstimate.findUnique({ where: { id: estimateId } })
    if (!e) return fail('Estimate not found')
    const padding = await numberPadding()
    try {
        const po = await createPurchaseOrderFromEstimate(e, { label: formatDocumentNumber({ prefix: e.prefix, number: e.number, numberFormat: e.numberFormat, date: e.date, padding }), staffId, actor: 'Staff' })
        return { success: true, id: po.id }
    } catch (err) { return fail(err.message) }
}

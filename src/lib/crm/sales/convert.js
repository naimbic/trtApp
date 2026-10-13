import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { allocateNumber } from '@/lib/crm/sales/docNumbering'

const LINK = { estimate: 'crmEstimate', purchase_order: 'crmPurchaseOrder' }
const copyLines = async (fromType, fromId, toType, toId) => {
    const lines = await prisma.crmItemable.findMany({ where: { relType: fromType, relId: fromId }, include: { taxes: true } })
    for (const l of lines) {
        const nl = await prisma.crmItemable.create({ data: { relType: toType, relId: toId, description: l.description, longDescription: l.longDescription, qty: l.qty, rate: l.rate, unit: l.unit, itemOrder: l.itemOrder } })
        for (const t of l.taxes) await prisma.crmItemTax.create({ data: { itemableId: nl.id, relType: toType, relId: toId, taxName: t.taxName, taxRate: t.taxRate } })
    }
}
const activity = (relType, relId, description, actor, staffId) => prisma.crmSalesActivity.create({ data: { relType, relId, description, fullName: actor, staffId: staffId || undefined, date: new Date() } })

/** Creates an unpaid invoice with the lines of an estimate or purchase order and links the two. Returns the invoice. */
export async function createInvoiceFromDocument(kind, doc, { label, staffId = null, actor = 'System' } = {}) {
    if (doc.invoiceId) throw Object.assign(new Error('This document was already invoiced'), { status: 400 })
    const now = new Date()
    const dueAfter = Number((await prisma.crmOption.findUnique({ where: { name: 'invoice_due_after' } }))?.value) || 0
    const { number, prefix, numberFormat } = await allocateNumber('invoice', now)
    const d = doc
    const inv = await prisma.crmInvoice.create({ data: {
        clientId: d.clientId, number, prefix, numberFormat, date: now, dueDate: dueAfter > 0 ? new Date(now.getTime() + dueAfter * 86400000) : null, currencyId: d.currencyId,
        subtotal: d.subtotal, totalTax: d.totalTax, total: d.total, discountPercent: d.discountPercent, discountTotal: d.discountTotal, discountType: d.discountType, adjustment: d.adjustment,
        clientNote: d.clientNote, terms: d.terms, adminNote: label ? `Created from ${kind === 'estimate' ? 'estimate' : 'purchase order'} ${label}` : null,
        status: 1, hash: crypto.randomUUID().replace(/-/g, ''), sent: false, addedFrom: staffId || d.saleAgentId || d.addedFrom || undefined, saleAgentId: d.saleAgentId || undefined, projectId: d.projectId || undefined,
    } })
    await copyLines(kind, d.id, 'invoice', inv.id)
    await prisma[LINK[kind]].update({ where: { id: d.id }, data: { invoiceId: inv.id, invoicedDate: now } })
    await activity('invoice', inv.id, `Invoice created from ${kind === 'estimate' ? 'estimate' : 'purchase order'} ${label || ''}`.trim(), actor, staffId)
    await activity(kind, d.id, `Invoice ${prefix}${number} created`, actor, staffId)
    return { ...inv, prefix, number }
}
export const createInvoiceFromEstimate = (estimate, opts = {}) => createInvoiceFromDocument('estimate', estimate, { ...opts, label: opts.estimateNumber })

/** Creates a purchase order (draft) with the lines of an estimate. */
export async function createPurchaseOrderFromEstimate(estimate, { label, staffId = null, actor = 'Staff' } = {}) {
    const existing = await prisma.crmPurchaseOrder.findFirst({ where: { estimateId: estimate.id } })
    if (existing) throw Object.assign(new Error('A purchase order already exists for this estimate'), { status: 400 })
    const now = new Date()
    const days = Number((await prisma.crmOption.findUnique({ where: { name: 'purchase_order_due_after' } }))?.value) || 0
    const { number, prefix, numberFormat } = await allocateNumber('purchase_order', now)
    const e = estimate
    const po = await prisma.crmPurchaseOrder.create({ data: {
        clientId: e.clientId, number, prefix, numberFormat, date: now, deliveryDate: days > 0 ? new Date(now.getTime() + days * 86400000) : null, currencyId: e.currencyId,
        subtotal: e.subtotal, totalTax: e.totalTax, total: e.total, discountPercent: e.discountPercent, discountTotal: e.discountTotal, discountType: e.discountType, adjustment: e.adjustment,
        clientNote: e.clientNote, terms: e.terms, referenceNo: e.referenceNo, adminNote: label ? `Created from estimate ${label}` : null, estimateId: e.id,
        status: 1, sent: false, hash: crypto.randomUUID().replace(/-/g, ''), addedFrom: staffId || e.addedFrom || undefined, saleAgentId: e.saleAgentId || undefined, projectId: e.projectId || undefined,
    } })
    await copyLines('estimate', e.id, 'purchase_order', po.id)
    await activity('purchase_order', po.id, `Created from estimate ${label || ''}`.trim(), actor, staffId)
    await activity('estimate', e.id, `Purchase order ${prefix}${number} created`, actor, staffId)
    return { ...po, prefix, number }
}

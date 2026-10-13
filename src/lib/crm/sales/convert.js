import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { allocateNumber } from '@/lib/crm/sales/docNumbering'

/** Creates an unpaid invoice with the same lines as an estimate and links the two. Returns the invoice. */
export async function createInvoiceFromEstimate(estimate, { estimateNumber, staffId = null, actor = 'System' } = {}) {
    if (estimate.invoiceId) throw Object.assign(new Error('This estimate was already invoiced'), { status: 400 })
    const now = new Date()
    const dueAfter = Number((await prisma.crmOption.findUnique({ where: { name: 'invoice_due_after' } }))?.value) || 0
    const { number, prefix, numberFormat } = await allocateNumber('invoice', now)
    const e = estimate
    const inv = await prisma.crmInvoice.create({ data: {
        clientId: e.clientId, number, prefix, numberFormat, date: now, dueDate: dueAfter > 0 ? new Date(now.getTime() + dueAfter * 86400000) : null, currencyId: e.currencyId,
        subtotal: e.subtotal, totalTax: e.totalTax, total: e.total, discountPercent: e.discountPercent, discountTotal: e.discountTotal, discountType: e.discountType, adjustment: e.adjustment,
        clientNote: e.clientNote, terms: e.terms, adminNote: estimateNumber ? `Created from estimate ${estimateNumber}` : null, billingStreet: e.billingStreet, billingCity: e.billingCity, billingState: e.billingState, billingZip: e.billingZip, billingCountry: e.billingCountry,
        status: 1, hash: crypto.randomUUID().replace(/-/g, ''), sent: false, addedFrom: staffId || e.saleAgentId || e.addedFrom || undefined, saleAgentId: e.saleAgentId || undefined, projectId: e.projectId || undefined,
    } })
    const lines = await prisma.crmItemable.findMany({ where: { relType: 'estimate', relId: e.id }, include: { taxes: true } })
    for (const l of lines) {
        const nl = await prisma.crmItemable.create({ data: { relType: 'invoice', relId: inv.id, description: l.description, longDescription: l.longDescription, qty: l.qty, rate: l.rate, unit: l.unit, itemOrder: l.itemOrder } })
        for (const t of l.taxes) await prisma.crmItemTax.create({ data: { itemableId: nl.id, relType: 'invoice', relId: inv.id, taxName: t.taxName, taxRate: t.taxRate } })
    }
    await prisma.crmEstimate.update({ where: { id: e.id }, data: { invoiceId: inv.id, invoicedDate: now } })
    await prisma.crmSalesActivity.create({ data: { relType: 'invoice', relId: inv.id, description: `Invoice created from estimate ${estimateNumber || ''}`.trim(), fullName: actor, staffId: staffId || undefined, date: now } })
    await prisma.crmSalesActivity.create({ data: { relType: 'estimate', relId: e.id, description: `Invoice ${prefix}${number} created`, fullName: actor, staffId: staffId || undefined, date: now } })
    return { ...inv, prefix, number }
}

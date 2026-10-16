'use server'

import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { calcDocument, formatDocumentNumber } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { allocateNumber, checkDeletable, afterDelete } from '@/lib/crm/sales/docNumbering'
import { createInvoiceFromEstimate } from '@/lib/crm/sales/convert'

const REL = 'estimate'
const plain = (v) => JSON.parse(JSON.stringify(v))
const fail = (message) => ({ success: false, message })

const logActivity = (id, description, staffId) => prisma.crmSalesActivity.create({ data: { relType: REL, relId: id, description, staffId: staffId || undefined, date: new Date() } }).catch(() => {})

const loadLines = async (id) => {
    const lines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: id }, orderBy: { itemOrder: 'asc' }, include: { taxes: true } })
    return lines.map((l) => ({ id: l.id, description: l.description, longDescription: l.longDescription || '', qty: l.qty, rate: l.rate, unit: l.unit || '', taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })) }))
}

/** Defaults for a new estimate (Settings → Billing → Estimates). */
export async function getEstimateDefaults() {
    await requirePermission('estimates', 'view')
    const rows = await prisma.crmOption.findMany({ where: { name: { in: ['estimate_due_after', 'predefined_clientnote_estimate', 'predefined_terms_estimate', 'default_tax'] } } })
    const o = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    const taxes = [...String(o.default_tax || '').matchAll(/s:\d+:"([^"]*)"/g)].map((m) => { const [name, rate] = m[1].split('|'); return { name, rate: Number(rate) } })
    return { validFor: o.estimate_due_after ?? '', clientNote: o.predefined_clientnote_estimate || '', terms: o.predefined_terms_estimate || '', taxes }
}

export async function getEstimateDocument(id) {
    await requirePermission('estimates', 'view')
    const e = await prisma.crmEstimate.findUnique({ where: { id } })
    if (!e) return null
    const [items, client, currency, comments, activity, invoice] = await Promise.all([
        loadLines(id),
        e.clientId ? prisma.crmClient.findUnique({ where: { id: e.clientId }, select: { id: true, company: true } }) : null,
        e.currencyId ? prisma.crmCurrency.findUnique({ where: { id: e.currencyId } }) : null,
        prisma.crmEstimateComment.findMany({ where: { estimateId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.crmSalesActivity.findMany({ where: { relType: REL, relId: id }, orderBy: { date: 'desc' }, take: 50 }),
        e.invoiceId ? prisma.crmInvoice.findUnique({ where: { id: e.invoiceId }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true } }) : null,
    ])
    const padding = await numberPadding()
    const num = (x) => formatDocumentNumber({ prefix: x.prefix, number: x.number, numberFormat: x.numberFormat, date: x.date, padding })
    return plain({ estimate: { ...e, displayNumber: num(e) }, items, client, currency, comments, activity, invoice: invoice ? { id: invoice.id, displayNumber: num(invoice) } : null })
}

export async function saveEstimate(input) {
    const isNew = !input.id
    const session = await requirePermission('estimates', isNew ? 'create' : 'edit')
    const staffId = await getStaffId(session)
    if (!input.clientId) return fail('Client is required')
    const items = (input.items || []).filter((i) => String(i.description || '').trim())
    if (!items.length) return fail('Add at least one line item')
    const discountType = input.discountType || 'before_tax'
    const totals = calcDocument({ items, discountPercent: input.discountPercent, discountFixed: input.discountFixed, discountType, adjustment: input.adjustment })
    const data = {
        clientId: input.clientId, date: input.date ? new Date(input.date) : new Date(), expiryDate: input.expiryDate ? new Date(input.expiryDate) : null, currencyId: input.currencyId || null,
        subtotal: totals.subtotal, totalTax: totals.totalTax, total: totals.total, discountPercent: Number(input.discountPercent) || 0, discountTotal: totals.discountTotal, discountType,
        adjustment: Number(input.adjustment) || 0, clientNote: input.clientNote || null, adminNote: input.adminNote || null, terms: input.terms || null, referenceNo: input.referenceNo || null,
    }
    let estimate
    if (isNew) {
        const { number, prefix, numberFormat } = await allocateNumber('estimate', data.date)
        estimate = await prisma.crmEstimate.create({ data: { ...data, number, prefix, numberFormat, status: 1, sent: false, hash: crypto.randomUUID().replace(/-/g, ''), addedFrom: staffId || undefined, saleAgentId: data.saleAgentId || (staffId && (await readSettings(['automatically_set_logged_in_staff_sales_agent'])).on('automatically_set_logged_in_staff_sales_agent') ? staffId : undefined) } })
    } else {
        const existing = await prisma.crmEstimate.findUnique({ where: { id: input.id } })
        if (!existing) return fail('Estimate not found')
        if (existing.invoiceId) return fail('This estimate was already invoiced and can no longer be changed')
        estimate = await prisma.crmEstimate.update({ where: { id: input.id }, data })
        const old = await prisma.crmItemable.findMany({ where: { relType: REL, relId: estimate.id }, select: { id: true } })
        await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: estimate.id } })
        await prisma.crmItemable.deleteMany({ where: { id: { in: old.map((l) => l.id) } } })
    }
    for (const [idx, it] of items.entries()) {
        const line = await prisma.crmItemable.create({ data: { relType: REL, relId: estimate.id, description: String(it.description).trim(), longDescription: it.longDescription || null, qty: Number(it.qty) || 0, rate: Number(it.rate) || 0, unit: it.unit || null, itemOrder: idx + 1 } })
        for (const t of it.taxes || []) await prisma.crmItemTax.create({ data: { itemableId: line.id, relType: REL, relId: estimate.id, taxName: t.name || `${t.rate}%`, taxRate: Number(t.rate) || 0 } })
    }
    await logActivity(estimate.id, isNew ? 'Estimate created' : 'Estimate updated', staffId)
    return { success: true, id: estimate.id }
}

/** action: markDraft | markSent | markAccepted | markDeclined */
export async function setEstimateState(id, action) {
    const session = await requirePermission('estimates', 'edit')
    const staffId = await getStaffId(session)
    const e = await prisma.crmEstimate.findUnique({ where: { id } })
    if (!e) return fail('Estimate not found')
    const map = { markDraft: [{ status: 1 }, 'Marked as draft'], markSent: [{ status: 2, sent: true, dateSend: new Date() }, 'Marked as sent'], markAccepted: [{ status: 4 }, 'Marked as accepted'], markDeclined: [{ status: 3 }, 'Marked as declined'] }
    const m = map[action]
    if (!m) return fail('Unknown action')
    if (e.invoiceId && action !== 'markAccepted') return fail('This estimate was already invoiced')
    await prisma.crmEstimate.update({ where: { id }, data: m[0] })
    await logActivity(id, m[1], staffId)
    return { success: true }
}

export async function deleteEstimate(id) {
    await requirePermission('estimates', 'delete')
    const e = await prisma.crmEstimate.findUnique({ where: { id } })
    if (!e) return fail('Estimate not found')
    if (e.invoiceId) return fail('This estimate was invoiced. Delete the invoice first if you really need to remove it.')
    const blocked = await checkDeletable('estimate', e)
    if (blocked) return fail(blocked)
    const lines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: id }, select: { id: true } })
    await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmItemable.deleteMany({ where: { id: { in: lines.map((l) => l.id) } } })
    await prisma.crmSalesActivity.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmEstimateComment.deleteMany({ where: { estimateId: id } })
    await prisma.crmEstimate.delete({ where: { id } })
    await afterDelete('estimate', e)
    return { success: true }
}

export async function convertEstimate(id) {
    const session = await requirePermission('invoices', 'create')
    await requirePermission('estimates', 'view')
    const staffId = await getStaffId(session)
    const e = await prisma.crmEstimate.findUnique({ where: { id } })
    if (!e) return fail('Estimate not found')
    if (e.invoiceId) return fail('This estimate was already invoiced')
    const padding = await numberPadding()
    try {
        const inv = await createInvoiceFromEstimate(e, { estimateNumber: formatDocumentNumber({ prefix: e.prefix, number: e.number, numberFormat: e.numberFormat, date: e.date, padding }), staffId, actor: 'Staff' })
        return { success: true, invoiceId: inv.id }
    } catch (err) { return fail(err.message) }
}

export async function addEstimateComment(id, content) {
    const session = await requirePermission('estimates', 'edit')
    const staffId = await getStaffId(session)
    const text = String(content || '').trim().slice(0, 2000)
    if (!text) return fail('Write your reply first')
    const staff = staffId ? await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true } }) : null
    await prisma.crmEstimateComment.create({ data: { estimateId: id, content: text, authorName: `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim() || session.user.name || 'Team', staffId: staffId || undefined } })
    return { success: true }
}

export async function deleteEstimateComment(commentId) {
    await requirePermission('estimates', 'edit')
    await prisma.crmEstimateComment.delete({ where: { id: commentId } }).catch(() => {})
    return { success: true }
}

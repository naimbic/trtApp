'use server'

import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { assertDocVisible, requireAnySalesView } from '@/lib/crm/docAccess'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { calcDocument, formatDocumentNumber } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { manualNumber, applyManualNumber } from '@/lib/crm/sales/docNumbering'
import { createInvoiceFromDocument, createEstimateFromProposal } from '@/lib/crm/sales/convert'
import { displayNumber, loadItems, nextProposalNumber } from '@/lib/crm/proposalDoc'

const REL = 'proposal'
const plain = (v) => JSON.parse(JSON.stringify(v))
const fail = (message) => ({ success: false, message })
const logActivity = (id, description, staffId) => prisma.crmSalesActivity.create({ data: { relType: REL, relId: id, description, staffId: staffId || undefined, date: new Date() } }).catch(() => {})

export async function getProposalDefaults() {
    await requirePermission('proposals', 'view')
    const rows = await prisma.crmOption.findMany({ where: { name: { in: ['proposal_due_after', 'default_tax'] } } })
    const o = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    const taxes = [...String(o.default_tax || '').matchAll(/s:\d+:"([^"]*)"/g)].map((m) => { const [name, rate] = m[1].split('|'); return { name, rate: Number(rate) } })
    return { openFor: o.proposal_due_after ?? '', taxes }
}

/** Fills the "prepared for" block from a client or a lead. */
export async function proposalPrefill(relType, relId) {
    await requirePermission('proposals', 'create')
    if (relType === 'customer') {
        const c = await prisma.crmClient.findUnique({ where: { id: relId } })
        if (!c) return {}
        const ct = await prisma.crmContact.findFirst({ where: { clientId: c.id, active: true }, orderBy: { isPrimary: 'desc' } })
        return { proposalTo: c.company || '', address: c.billingStreet || c.address || '', city: c.billingCity || c.city || '', state: c.billingState || c.state || '', zip: c.billingZip || c.zip || '', country: c.billingCountry ?? c.country ?? null, email: ct?.email || '', phone: ct?.phoneNumber || c.phoneNumber || '' }
    }
    const l = await prisma.crmLead.findUnique({ where: { id: relId } })
    if (!l) return {}
    return { proposalTo: l.company || l.name || '', address: l.address || '', city: l.city || '', state: l.state || '', zip: l.zip || '', country: l.country ?? null, email: l.email || '', phone: l.phoneNumber || '' }
}

export async function getProposalDocument(id) {
    const session = await requirePermission('proposals', 'view')
    await assertDocVisible(session, 'proposal', id)
    const p = await prisma.crmProposal.findUnique({ where: { id } })
    if (!p) return null
    const [items, currency, comments, activity, invoice, estimate, client, lead] = await Promise.all([
        loadItems(id),
        p.currencyId ? prisma.crmCurrency.findUnique({ where: { id: p.currencyId } }) : null,
        prisma.crmProposalComment.findMany({ where: { proposalId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.crmSalesActivity.findMany({ where: { relType: REL, relId: id }, orderBy: { date: 'desc' }, take: 50 }),
        p.invoiceId ? prisma.crmInvoice.findUnique({ where: { id: p.invoiceId }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true } }) : null,
        p.estimateId ? prisma.crmEstimate.findUnique({ where: { id: p.estimateId }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true } }) : null,
        p.relType === 'customer' && p.relId ? prisma.crmClient.findUnique({ where: { id: p.relId }, select: { id: true, company: true } }) : null,
        p.relType === 'lead' && p.relId ? prisma.crmLead.findUnique({ where: { id: p.relId }, select: { id: true, name: true, company: true } }) : null,
    ])
    const padding = await numberPadding()
    const num = (x) => formatDocumentNumber({ prefix: x.prefix, number: x.number, numberFormat: x.numberFormat, date: x.date, padding })
    return plain({ proposal: { ...p, displayNumber: await displayNumber(p) }, items, currency, comments, activity, client, lead, invoice: invoice ? { id: invoice.id, displayNumber: num(invoice) } : null, estimate: estimate ? { id: estimate.id, displayNumber: num(estimate) } : null })
}

export async function saveProposal(input) {
    const isNew = !input.id
    const session = await requirePermission('proposals', isNew ? 'create' : 'edit')
    if (!isNew) await assertDocVisible(session, 'proposal', input.id)
    const staffId = await getStaffId(session)
    if (!String(input.subject || '').trim()) return fail('Subject is required')
    if (!['customer', 'lead'].includes(input.relType) || !/^[0-9a-f]{24}$/i.test(input.relId || '')) return fail('Choose the client or lead this proposal is for')
    if (!String(input.proposalTo || '').trim()) return fail('Who is the proposal for?')
    const items = (input.items || []).filter((i) => String(i.description || '').trim())
    const discountType = input.discountType || 'before_tax'
    const totals = calcDocument({ items, discountPercent: input.discountPercent, discountFixed: input.discountFixed, discountType, adjustment: input.adjustment })
    const t = (v, n = 200) => String(v ?? '').trim().slice(0, n) || null
    const data = {
        subject: t(input.subject), content: String(input.content ?? '').slice(0, 200000) || null, relType: input.relType, relId: input.relId, proposalTo: t(input.proposalTo), address: t(input.address, 300), city: t(input.city, 80), state: t(input.state, 80), zip: t(input.zip, 20),
        country: input.country != null && input.country !== '' ? Number(input.country) : null, email: t(input.email), phone: t(input.phone, 40), date: input.date ? new Date(input.date) : new Date(), openTill: input.openTill ? new Date(input.openTill) : null, currencyId: input.currencyId || null,
        subtotal: totals.subtotal, totalTax: totals.totalTax, total: totals.total, discountPercent: Number(input.discountPercent) || 0, discountTotal: totals.discountTotal, discountType, adjustment: Number(input.adjustment) || 0,
        allowComments: input.allowComments !== false, assignedId: input.assignedId || null,
        ...(input.remindClient !== undefined ? { remindClient: input.remindClient !== false } : {}),
    }
    const manual = await manualNumber('crmProposal', input, session.user.authority || [])
    if (manual.problem) return fail(manual.problem)
    let proposal
    if (isNew) {
        proposal = await prisma.crmProposal.create({ data: { ...data, number: await nextProposalNumber(), status: 6, hash: crypto.randomUUID().replace(/-/g, ''), addedFrom: staffId || undefined, assignedId: data.assignedId || staffId || undefined } })
    } else {
        const existing = await prisma.crmProposal.findUnique({ where: { id: input.id } })
        if (!existing) return fail('Proposal not found')
        if (existing.invoiceId) return fail('This proposal was already invoiced and can no longer be changed')
        proposal = await prisma.crmProposal.update({ where: { id: input.id }, data })
        const old = await prisma.crmItemable.findMany({ where: { relType: REL, relId: proposal.id }, select: { id: true } })
        await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: proposal.id } })
        await prisma.crmItemable.deleteMany({ where: { id: { in: old.map((l) => l.id) } } })
    }
    await applyManualNumber('crmProposal', proposal.id, manual.number)
    for (const [idx, it] of items.entries()) {
        const line = await prisma.crmItemable.create({ data: { relType: REL, relId: proposal.id, description: String(it.description).trim(), longDescription: it.longDescription || null, qty: Number(it.qty) || 0, rate: Number(it.rate) || 0, unit: it.unit || null, itemOrder: idx + 1 } })
        for (const tx of it.taxes || []) await prisma.crmItemTax.create({ data: { itemableId: line.id, relType: REL, relId: proposal.id, taxName: tx.name || `${tx.rate}%`, taxRate: Number(tx.rate) || 0 } })
    }
    await logActivity(proposal.id, isNew ? 'Proposal created' : 'Proposal updated', staffId)
    return { success: true, id: proposal.id }
}

/** action: markDraft | markOpen | markSent | markRevised | markAccepted | markDeclined */
export async function setProposalState(id, action) {
    const session = await requirePermission('proposals', 'edit')
    await assertDocVisible(session, 'proposal', id)
    const staffId = await getStaffId(session)
    const p = await prisma.crmProposal.findUnique({ where: { id } })
    if (!p) return fail('Proposal not found')
    const map = { markDraft: [{ status: 6 }, 'Marked as draft'], markOpen: [{ status: 1 }, 'Marked as open'], markSent: [{ status: 4 }, 'Marked as sent'], markRevised: [{ status: 5 }, 'Marked as revised'], markAccepted: [{ status: 3 }, 'Marked as accepted'], markDeclined: [{ status: 2 }, 'Marked as declined'] }
    const m = map[action]
    if (!m) return fail('Unknown action')
    await prisma.crmProposal.update({ where: { id }, data: m[0] })
    await logActivity(id, m[1], staffId)
    return { success: true }
}

export async function deleteProposal(id) {
    const session = await requirePermission('proposals', 'delete')
    await assertDocVisible(session, 'proposal', id)
    const p = await prisma.crmProposal.findUnique({ where: { id } })
    if (!p) return fail('Proposal not found')
    if (p.invoiceId) return fail('This proposal was invoiced. Delete the invoice first if you really need to remove it.')
    const lines = await prisma.crmItemable.findMany({ where: { relType: REL, relId: id }, select: { id: true } })
    await prisma.crmItemTax.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmItemable.deleteMany({ where: { id: { in: lines.map((l) => l.id) } } })
    await prisma.crmSalesActivity.deleteMany({ where: { relType: REL, relId: id } })
    await prisma.crmProposalComment.deleteMany({ where: { proposalId: id } })
    await prisma.crmProposal.delete({ where: { id } })
    return { success: true }
}

/** to: 'estimate' | 'invoice' */
export async function convertProposal(id, to) {
    const session = await requirePermission(to === 'invoice' ? 'invoices' : 'estimates', 'create')
    await assertDocVisible(session, 'proposal', id)
    await requirePermission('proposals', 'view')
    const staffId = await getStaffId(session)
    const p = await prisma.crmProposal.findUnique({ where: { id } })
    if (!p) return fail('Proposal not found')
    const label = await displayNumber(p)
    try {
        if (to === 'estimate') { const e = await createEstimateFromProposal(p, { label, staffId }); return { success: true, estimateId: e.id } }
        if (p.relType !== 'customer') return fail('This proposal is for a lead. Make the lead a client first.')
        const inv = await createInvoiceFromDocument('proposal', p, { label, staffId, actor: 'Staff' })
        return { success: true, invoiceId: inv.id }
    } catch (err) { return fail(err.message) }
}

export async function addProposalComment(id, content) {
    const session = await requirePermission('proposals', 'edit')
    await assertDocVisible(session, 'proposal', id)
    const staffId = await getStaffId(session)
    const text = String(content || '').trim().slice(0, 2000)
    if (!text) return fail('Write your reply first')
    const staff = staffId ? await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true } }) : null
    await prisma.crmProposalComment.create({ data: { proposalId: id, content: text, authorName: `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim() || session.user.name || 'Team', staffId: staffId || undefined } })
    return { success: true }
}

export async function deleteProposalComment(commentId) {
    const session = await requirePermission('proposals', 'edit')
    const own = await prisma.crmProposalComment.findUnique({ where: { id: commentId }, select: { proposalId: true } })
    if (own?.proposalId) await assertDocVisible(session, 'proposal', own.proposalId)
    await prisma.crmProposalComment.delete({ where: { id: commentId } }).catch(() => {})
    return { success: true }
}

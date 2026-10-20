import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { PermissionError, viewScope, getStaffId, requirePermission } from '@/lib/crm/permissions'

/**
 * Who a sales document belongs to, for people who only have "View own" on its feature. The lists use the same rules
 * (estimatesApi / invoicesApi / proposalsApi / purchaseOrdersApi), so what a list hides cannot be opened by its id either.
 */
const KINDS = {
    estimate: { feature: 'estimates', model: 'crmEstimate', fields: ['addedFrom', 'saleAgentId'] },
    invoice: { feature: 'invoices', model: 'crmInvoice', fields: ['addedFrom'], assigned: ['allow_staff_view_invoices_assigned', 'saleAgentId'] },
    proposal: { feature: 'proposals', model: 'crmProposal', fields: ['addedFrom'], assigned: ['allow_staff_view_proposals_assigned', 'assignedId'] },
    contract: { feature: 'contracts', model: 'crmContract', fields: ['addedFrom'] },
    purchase_order: { feature: 'purchase_orders', model: 'crmPurchaseOrder', fields: ['addedFrom', 'saleAgentId'] },
}

/** Throws 403 unless the signed-in person may open this document: everything with "View", only their own with "View own". */
export async function assertDocVisible(session, kind, id) {
    const k = KINDS[kind]
    if (!k) throw new Error(`Unknown document kind ${kind}`)
    const authority = session?.user?.authority || []
    const scope = viewScope(authority, k.feature)
    if (scope === 'all') return
    if (scope !== 'own') throw new PermissionError('Forbidden', 403)
    const me = await getStaffId(session)
    const owners = k.fields.map((f) => ({ [f]: me }))
    if (k.assigned && (await readSettings([k.assigned[0]])).on(k.assigned[0])) owners.push({ [k.assigned[1]]: me })
    const found = me && id ? await prisma[k.model].findFirst({ where: { AND: [{ id }, { OR: owners }] }, select: { id: true } }).catch(() => null) : null
    if (!found) throw new PermissionError('Forbidden', 403)
}

/** Sales editors (invoice, estimate, proposal, purchase order...) share one set of lookups (taxes, currencies, numbering): any sales feature opens them. */
const SALES_FEATURES = ['invoices', 'estimates', 'proposals', 'purchase_orders', 'contracts', 'credit_notes', 'subscriptions', 'expenses', 'payments']
export async function requireAnySalesView() {
    let last
    for (const f of SALES_FEATURES) {
        try { return await requirePermission(f, 'view') } catch (e) { last = e; if (e.status === 401) throw e }
    }
    throw last
}

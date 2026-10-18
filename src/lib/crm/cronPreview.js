import prisma from '@/lib/prisma'

// The extra facts shown next to each line of the cron preview (client, who would get the email, amount, dates). Read only: unlike
// composing the real email, this creates no short link and no hash, so a preview still changes nothing.
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null)
const FLAG = { invoice: 'invoiceEmails', estimate: 'estimateEmails', contract: 'contractEmails', proposal: null }
const money = (n, cur) => {
    const v = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const s = cur?.symbol || cur?.name || ''
    return cur?.placement === 'after' || !s ? `${v}${s ? ` ${s}` : ''}` : `${s} ${v}`
}
/** Whole days from `a` to `b` (positive when b is later). */
export const daysFrom = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

/** Who the email goes to: the client's active contacts with an email (the ones ticked for this kind of document, else the primary one). */
export function pickRecipients(contacts, flag) {
    const list = contacts.filter((c) => c.email).map((c) => ({ email: c.email, name: [c.firstName, c.lastName].filter(Boolean).join(' '), checked: flag ? c[flag] !== false && (c[flag] || c.isPrimary) : c.isPrimary }))
    if (list.length && !list.some((r) => r.checked)) list[0].checked = true
    return list.filter((r) => r.checked)
}

/** { client, to: [emails], noEmail, amount, dueDate, days, daysLabel } for one document; null when it cannot be read. */
export async function docInfo(kind, id, today = new Date()) {
    let doc, clientId = null, dueDate = null, amount = null, fallback = null, cur = null
    if (kind === 'invoice') {
        doc = await prisma.crmInvoice.findUnique({ where: { id } })
        if (!doc) return null
        clientId = doc.clientId; dueDate = doc.dueDate
        const paid = (await prisma.crmPayment.findMany({ where: { invoiceId: id }, select: { amount: true } })).reduce((a, p) => a + (p.amount || 0), 0)
        cur = doc.currencyId ? await prisma.crmCurrency.findUnique({ where: { id: doc.currencyId } }) : null
        amount = `${money(Math.max(0, (doc.total || 0) - paid), cur)} due`
    } else if (kind === 'estimate') {
        doc = await prisma.crmEstimate.findUnique({ where: { id } })
        if (!doc) return null
        clientId = doc.clientId; dueDate = doc.expiryDate
        cur = doc.currencyId ? await prisma.crmCurrency.findUnique({ where: { id: doc.currencyId } }) : null
        amount = money(doc.total, cur)
    } else if (kind === 'proposal') {
        doc = await prisma.crmProposal.findUnique({ where: { id } })
        if (!doc) return null
        clientId = doc.relType === 'customer' ? doc.relId : null; dueDate = doc.openTill; fallback = doc.email
        cur = doc.currencyId ? await prisma.crmCurrency.findUnique({ where: { id: doc.currencyId } }) : null
        amount = money(doc.total, cur)
    } else if (kind === 'contract') {
        doc = await prisma.crmContract.findUnique({ where: { id } })
        if (!doc) return null
        clientId = doc.clientId; dueDate = doc.dateEnd
        amount = doc.contractValue != null ? money(doc.contractValue, null) : null
    } else return null
    const client = clientId ? await prisma.crmClient.findUnique({ where: { id: clientId }, select: { company: true } }) : null
    const contacts = clientId ? await prisma.crmContact.findMany({ where: { clientId, active: true }, orderBy: { isPrimary: 'desc' } }) : []
    let to = pickRecipients(contacts, FLAG[kind]).map((r) => r.email)
    if (!to.length && fallback) to = [fallback]
    const days = dueDate ? daysFrom(dueDate, today) : null // positive: that many days past the date
    const daysLabel = days === null ? null : kind === 'invoice' ? (days > 0 ? `${days} day${days === 1 ? '' : 's'} overdue` : days === 0 ? 'due today' : `due in ${-days} day${days === -1 ? '' : 's'}`) : days > 0 ? `ended ${days} day${days === 1 ? '' : 's'} ago` : days === 0 ? 'ends today' : `ends in ${-days} day${days === -1 ? '' : 's'}`
    return { client: client?.company || (kind === 'proposal' ? doc.proposalTo : null) || null, to, noEmail: to.length === 0, amount, dueDate: day(dueDate), days, daysLabel }
}

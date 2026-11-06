// "Possible duplicate": leads and clients that share the email, the phone or the company of what is being typed.
import prisma from '@/lib/prisma'
import { requirePermission, viewScope } from '@/lib/crm/permissions'
import { normEmail, normPhone, normCompany, reasons } from '@/lib/crm/duplicatesCalc'

const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const LIMIT = 5

export async function findDuplicates({ email, phone, company, leadId, clientId } = {}) {
    const session = await requirePermission('leads', 'view')
    const authority = session.user.authority || []
    const probe = { email: normEmail(email), phone: normPhone(phone), company: normCompany(company) }
    if (!probe.email && !probe.phone && !probe.company) return { list: [] }
    const out = []
    // leads (a lead that was converted is shown as the client it became)
    const lw = []
    if (probe.email) lw.push({ email: { equals: probe.email, mode: 'insensitive' } })
    if (probe.company) lw.push({ company: { contains: String(company).trim().split(/\s+/)[0], mode: 'insensitive' } })
    if (probe.phone) lw.push({ phoneNumber: { not: null } })
    const leads = await prisma.crmLead.findMany({ where: { OR: lw, ...(oid(leadId) ? { id: { not: leadId } } : {}) }, select: { id: true, name: true, company: true, email: true, phoneNumber: true, lost: true, junk: true, clientId: true }, take: probe.phone ? 4000 : 300 })
    for (const l of leads) {
        const why = reasons({ email, phone, company }, { email: l.email, phone: l.phoneNumber, company: l.company })
        if (why.length) out.push({ type: 'lead', id: l.id, title: l.company || l.name, sub: l.company ? l.name : '', why, link: `/crm/leads/${l.id}`, note: l.clientId ? 'Already a client' : l.lost ? 'Lost' : l.junk ? 'Junk' : '' })
    }
    // clients and their contacts (only for people who may see clients)
    if (viewScope(authority, 'customers')) {
        const cw = []
        if (probe.company) cw.push({ company: { contains: String(company).trim().split(/\s+/)[0], mode: 'insensitive' } })
        if (probe.phone) cw.push({ phoneNumber: { not: null } })
        const clients = cw.length ? await prisma.crmClient.findMany({ where: { OR: cw, ...(oid(clientId) ? { id: { not: clientId } } : {}) }, select: { id: true, company: true, phoneNumber: true }, take: probe.phone ? 4000 : 300 }) : []
        const seen = new Set()
        for (const c of clients) {
            const why = reasons({ phone, company }, { phone: c.phoneNumber, company: c.company })
            if (why.length) { seen.add(c.id); out.push({ type: 'client', id: c.id, title: c.company, sub: '', why, link: `/crm/clients/${c.id}`, note: '' }) }
        }
        if (probe.email) {
            const contacts = await prisma.crmContact.findMany({ where: { email: { equals: probe.email, mode: 'insensitive' }, ...(oid(clientId) ? { clientId: { not: clientId } } : {}) }, select: { clientId: true, firstName: true, lastName: true }, take: 10 })
            const ids = [...new Set(contacts.map((c) => c.clientId).filter((id) => id && !seen.has(id)))]
            const cl = ids.length ? await prisma.crmClient.findMany({ where: { id: { in: ids } }, select: { id: true, company: true } }) : []
            for (const c of cl) out.push({ type: 'client', id: c.id, title: c.company, sub: '', why: ['email'], link: `/crm/clients/${c.id}`, note: '' })
        }
    }
    return { list: out.slice(0, LIMIT) }
}

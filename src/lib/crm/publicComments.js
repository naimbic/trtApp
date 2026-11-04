import prisma from '@/lib/prisma'

/** The people (and tags) a lead or a client can @mention / #tag in a comment on a public proposal, estimate or contract: only with the link of that document. */
export async function publicTeam(kind, id, hash) {
    const load = {
        proposal: async () => (await import('@/lib/crm/proposalPublic')).loadProposalDoc(id, hash),
        estimate: async () => (await import('@/lib/crm/estimatePublic')).loadEstimateDoc(id, hash),
        contract: async () => (await import('@/lib/crm/contractPublic')).loadContractDoc(id, hash),
    }[kind]
    const doc = load ? await load().catch(() => null) : null
    if (!doc) throw Object.assign(new Error('Not found'), { status: 404 })
    // the client side of this document can be named too: the contacts of its client, or the lead
    const raw = doc.proposal || doc.estimate || doc.contract || {}
    const clientId = raw.clientId || doc.client?.id || (raw.relType === 'customer' ? raw.relId : null)
    const leadId = raw.relType === 'lead' ? raw.relId : null
    const people = []
    if (clientId) {
        const cl = await prisma.crmClient.findUnique({ where: { id: clientId }, select: { company: true } }).catch(() => null)
        const cs = await prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true, firstName: true, lastName: true }, take: 50 }).catch(() => [])
        cs.forEach((c) => people.push({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ') }))
        if (cl?.company) people.push({ id: `c-${clientId}`, name: cl.company })
    } else if (leadId && /^[0-9a-f]{24}$/i.test(leadId)) {
        const ld = await prisma.crmLead.findUnique({ where: { id: leadId }, select: { name: true, company: true } }).catch(() => null)
        if (ld?.name) people.push({ id: `l-${leadId}`, name: ld.name })
        if (ld?.company && ld.company !== ld.name) people.push({ id: `lc-${leadId}`, name: ld.company })
    }
    const [staff, tags] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true }, take: 300 }),
        prisma.crmTag.findMany({ orderBy: { name: 'asc' }, select: { name: true }, take: 300 }),
    ])
    return {
        staff: staff.map((s) => ({ id: s.id, name: [s.firstName, s.lastName].filter(Boolean).join(' ') })).filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
        contacts: people.filter((x) => x.name),
        tags: [...new Set(tags.map((t) => t.name).filter(Boolean))],
    }
}

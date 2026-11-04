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
    const [staff, tags] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true }, take: 300 }),
        prisma.crmTag.findMany({ orderBy: { name: 'asc' }, select: { name: true }, take: 300 }),
    ])
    return {
        staff: staff.map((s) => ({ id: s.id, name: [s.firstName, s.lastName].filter(Boolean).join(' ') })).filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
        tags: [...new Set(tags.map((t) => t.name).filter(Boolean))],
    }
}

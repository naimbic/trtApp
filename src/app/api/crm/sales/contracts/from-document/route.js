import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { assertDocVisible } from '@/lib/crm/docAccess'
import { displayNumber as proposalNumber } from '@/lib/crm/proposalDoc'
import { createContractFromDocument } from '@/lib/crm/sales/convert'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { errorResponse } from '@/lib/crm/crud'

// POST { kind: 'estimate' | 'proposal', id } → { id } of the draft contract made for that document's client (the same one if it was made before)
export async function POST(request) {
    try {
        const { kind, id } = await request.json()
        if (kind !== 'estimate' && kind !== 'proposal') return NextResponse.json({ error: 'Unknown document' }, { status: 400 })
        const session = await requirePermission('contracts', 'create')
        await requirePermission(kind === 'estimate' ? 'estimates' : 'proposals', 'view')
        await assertDocVisible(session, kind, id)
        const staffId = await getStaffId(session)
        const doc = await (kind === 'estimate' ? prisma.crmEstimate : prisma.crmProposal).findUnique({ where: { id } })
        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        const label = kind === 'proposal' ? await proposalNumber(doc) : docNumberOf(doc, await numberPadding(), 1)
        return NextResponse.json(await createContractFromDocument(kind, doc, { label, staffId }))
    } catch (e) { return errorResponse(e) }
}

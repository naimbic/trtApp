import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { PROPOSAL } from '@/lib/crm/proposalDoc'

/**
 * The address of a proposal inside the CRM (/crm/proposals/<id>) opens the public page, without signing in, when the proposal
 * is for a lead and has been sent (Sent, Open or Revised). Anything else answers 404 and the visitor goes to the sign-in page.
 */
export async function GET(_request, { params }) {
    const { id } = await params
    const no = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    if (!/^[0-9a-f]{24}$/i.test(id || '')) return no()
    const p = await prisma.crmProposal.findUnique({ where: { id }, select: { id: true, relType: true, status: true, hash: true } })
    if (!p || p.relType !== 'lead' || ![PROPOSAL.SENT, PROPOSAL.OPEN, PROPOSAL.REVISED].includes(p.status)) return no()
    let hash = p.hash
    if (!hash) { hash = crypto.randomUUID().replace(/-/g, ''); await prisma.crmProposal.update({ where: { id }, data: { hash } }) }
    return NextResponse.json({ url: `/api/crm/public/proposal/${id}/${hash}` }, { headers: { 'Cache-Control': 'no-store' } })
}

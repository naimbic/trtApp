import { NextResponse } from 'next/server'
import { declineProposal } from '@/lib/crm/proposalPublic'

export async function POST(request, { params }) {
    const { id, hash } = await params
    try {
        return NextResponse.json(await declineProposal(id, hash, await request.json().catch(() => ({})), request))
    } catch (e) {
        return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
    }
}

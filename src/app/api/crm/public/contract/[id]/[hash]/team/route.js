import { NextResponse } from 'next/server'
import { publicTeam } from '@/lib/crm/publicComments'

export const dynamic = 'force-dynamic'

// the team members and tags offered by @ and # in the comment box of this public document (only with its link)
export async function GET(_request, { params }) {
    const { id, hash } = await params
    try { return NextResponse.json(await publicTeam('contract', id, hash)) } catch (e) { return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 }) }
}

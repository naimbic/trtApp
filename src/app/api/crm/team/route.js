import { NextResponse } from 'next/server'
import { listTeam, createMember } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams
        return NextResponse.json(await listTeam({ search: sp.get('search') || '', status: sp.get('status') || 'all' }))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await createMember(await request.json()), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}

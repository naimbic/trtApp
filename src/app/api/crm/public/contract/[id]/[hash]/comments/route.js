import { NextResponse } from 'next/server'
import { commentContract } from '@/lib/crm/contractPublic'

export async function POST(request, { params }) {
    const { id, hash } = await params
    try {
        return NextResponse.json(await commentContract(id, hash, await request.json().catch(() => ({})), request))
    } catch (e) {
        return NextResponse.json({ error: e.message || 'Error' }, { status: e.status || 500 })
    }
}

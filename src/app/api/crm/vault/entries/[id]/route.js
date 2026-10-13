import { NextResponse } from 'next/server'
import { getEntry, saveEntry, deleteEntry } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

const noStore = { headers: { 'Cache-Control': 'no-store' } }

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getEntry((await params).id), noStore) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveEntry(await request.json(), (await params).id, request)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deleteEntry((await params).id, request)) } catch (e) { return errorResponse(e) }
}

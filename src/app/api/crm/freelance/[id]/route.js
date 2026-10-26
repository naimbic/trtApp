import { NextResponse } from 'next/server'
import { getFreelance, saveFreelance, deleteFreelance } from '@/lib/crm/freelanceApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getFreelance((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveFreelance(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteFreelance((await params).id)) } catch (e) { return errorResponse(e) }
}

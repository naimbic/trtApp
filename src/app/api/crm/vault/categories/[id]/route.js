import { NextResponse } from 'next/server'
import { saveCategory, deleteCategory } from '@/lib/crm/vaultApi'
import { errorResponse } from '@/lib/crm/crud'

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveCategory(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteCategory((await params).id)) } catch (e) { return errorResponse(e) }
}

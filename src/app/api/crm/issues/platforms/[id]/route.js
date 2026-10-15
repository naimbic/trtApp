import { NextResponse } from 'next/server'
import { savePlatform, deletePlatform } from '@/lib/crm/issuesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function PUT(request, { params }) {
    try { return NextResponse.json(await savePlatform(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
    try { return NextResponse.json(await deletePlatform((await params).id)) } catch (e) { return errorResponse(e) }
}

import { NextResponse } from 'next/server'
import { getLead, saveLead, deleteLead } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getLead((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveLead(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteLead((await params).id)) } catch (e) { return errorResponse(e) }
}

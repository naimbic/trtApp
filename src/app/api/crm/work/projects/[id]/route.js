import { NextResponse } from 'next/server'
import { getProject, saveProject, deleteProject } from '@/lib/crm/projectsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getProject((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveProject(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteProject((await params).id)) } catch (e) { return errorResponse(e) }
}

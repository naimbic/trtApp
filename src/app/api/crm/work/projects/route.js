import { NextResponse } from 'next/server'
import { listProjects, saveProject } from '@/lib/crm/projectsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listProjects(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveProject(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}

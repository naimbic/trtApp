import { NextResponse } from 'next/server'
import { projectDashboard } from '@/lib/crm/projectsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await projectDashboard()) } catch (e) { return errorResponse(e) }
}

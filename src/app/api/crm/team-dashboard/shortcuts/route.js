import { NextResponse } from 'next/server'
import { setShortcuts } from '@/lib/crm/teamDashboard'
import { errorResponse } from '@/lib/crm/crud'

// PUT { keys: [...] } pins pages to the person's dashboard; { reset: true } goes back to the default set
export async function PUT(request) {
    try { return NextResponse.json(await setShortcuts(await request.json())) } catch (e) { return errorResponse(e) }
}

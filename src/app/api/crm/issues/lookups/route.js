import { NextResponse } from 'next/server'
import { issueLookups } from '@/lib/crm/issuesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await issueLookups()) } catch (e) { return errorResponse(e) }
}

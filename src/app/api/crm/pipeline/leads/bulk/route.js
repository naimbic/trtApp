import { NextResponse } from 'next/server'
import { bulkLeads } from '@/lib/crm/leadsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { ids: [...], action: 'status' | 'source' | 'assign' | 'lost' | 'junk' | 'restore' | 'delete', value } → { done, failed: [{ id, error }] }
export async function POST(request) {
    try { return NextResponse.json(await bulkLeads(await request.json())) } catch (e) { return errorResponse(e) }
}

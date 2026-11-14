import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { notesForClient } from '@/lib/crm/sales/noteLanguage'
import { errorResponse } from '@/lib/crm/crud'

// the client note and terms a new estimate or invoice starts with, in the language of the client
export async function GET(request) {
    try {
        const p = new URL(request.url).searchParams
        const kind = p.get('kind') === 'estimate' ? 'estimate' : 'invoice'
        await requirePermission(kind === 'estimate' ? 'estimates' : 'invoices', 'view')
        return NextResponse.json(await notesForClient(kind, p.get('clientId')))
    } catch (e) {
        return errorResponse(e)
    }
}

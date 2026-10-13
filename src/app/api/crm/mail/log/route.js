import { NextResponse } from 'next/server'
import { listMailLog } from '@/lib/crm/mailApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const p = new URL(request.url).searchParams
        return NextResponse.json(await listMailLog({ pageIndex: Number(p.get('pageIndex')) || 1, pageSize: Number(p.get('pageSize')) || 20, status: p.get('status') || undefined }))
    } catch (e) {
        return errorResponse(e)
    }
}

import { NextResponse } from 'next/server'
import { listTemplates } from '@/lib/crm/mailApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const p = new URL(request.url).searchParams
        return NextResponse.json(await listTemplates({ type: p.get('type') || undefined, language: p.get('language') || undefined, query: p.get('query') || undefined }))
    } catch (e) {
        return errorResponse(e)
    }
}

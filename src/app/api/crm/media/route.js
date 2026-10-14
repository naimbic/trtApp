import { NextResponse } from 'next/server'
import { listMedia, mediaAction } from '@/lib/crm/mediaApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const p = new URL(request.url).searchParams
        return NextResponse.json(await listMedia({ parentId: p.get('parentId') || undefined, query: p.get('query') || undefined, relType: p.get('relType') || undefined, relId: p.get('relId') || undefined, kind: p.get('kind') || undefined, flat: p.get('flat') === '1', foldersOnly: p.get('foldersOnly') === '1', recent: p.get('recent') || undefined, pageIndex: Number(p.get('pageIndex')) || 1, pageSize: Math.min(Number(p.get('pageSize')) || 60, 200) }))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await mediaAction(await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}

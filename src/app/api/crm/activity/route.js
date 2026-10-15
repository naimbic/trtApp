import { NextResponse } from 'next/server'
import { activityFeed } from '@/lib/crm/activityApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        const q = request.nextUrl.searchParams
        return NextResponse.json(await activityFeed({ kind: q.get('kind'), id: q.get('id'), types: q.get('types'), before: q.get('before'), limit: q.get('limit') }))
    } catch (e) {
        return errorResponse(e)
    }
}

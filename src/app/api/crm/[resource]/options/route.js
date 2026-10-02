import { NextResponse } from 'next/server'
import { listOptions, errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const { resource } = await params
        const sp = request.nextUrl.searchParams
        const ids = sp.get('ids') ? sp.get('ids').split(',') : undefined
        return NextResponse.json(await listOptions(resource, { query: sp.get('query') || '', ids }))
    } catch (e) {
        return errorResponse(e)
    }
}

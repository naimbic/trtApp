import { NextResponse } from 'next/server'
import { listRecords, createRecord, errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try {
        const { resource } = await params
        const sp = Object.fromEntries(request.nextUrl.searchParams)
        // `where.<field>=value` style filters, e.g. ?where.clientId=abc
        const where = {}
        for (const [k, v] of Object.entries(sp)) {
            if (k.startsWith('where.')) {
                where[k.slice(6)] = v === 'true' ? true : v === 'false' ? false : v
                delete sp[k]
            }
        }
        return NextResponse.json(await listRecords(resource, { ...sp, where }))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request, { params }) {
    try {
        const { resource } = await params
        const body = await request.json()
        return NextResponse.json(await createRecord(resource, body), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}

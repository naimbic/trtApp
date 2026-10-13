import { NextResponse } from 'next/server'
import { listRoles, createRole } from '@/lib/crm/access'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await listRoles())
    } catch (e) {
        return errorResponse(e)
    }
}

export async function POST(request) {
    try {
        return NextResponse.json(await createRole(await request.json()), { status: 201 })
    } catch (e) {
        return errorResponse(e)
    }
}

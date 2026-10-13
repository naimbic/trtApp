import { NextResponse } from 'next/server'
import { getCompany, saveCompany } from '@/lib/crm/company'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getCompany())
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request) {
    try {
        return NextResponse.json(await saveCompany(await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}

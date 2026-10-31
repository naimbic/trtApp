import { NextResponse } from 'next/server'
import { getSenderAccounts, saveSenderAccounts } from '@/lib/crm/mailApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await getSenderAccounts()) } catch (e) { return errorResponse(e) }
}

export async function PUT(request) {
    try { return NextResponse.json(await saveSenderAccounts(await request.json())) } catch (e) { return errorResponse(e) }
}

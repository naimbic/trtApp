import { NextResponse } from 'next/server'
import { expenseLookups } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await expenseLookups()) } catch (e) { return errorResponse(e) }
}

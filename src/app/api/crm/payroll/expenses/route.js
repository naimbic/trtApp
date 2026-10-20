import { NextResponse } from 'next/server'
import { createExpensesForPayments } from '@/lib/crm/payroll'
import { errorResponse } from '@/lib/crm/crud'

export async function POST() {
    try { return NextResponse.json(await createExpensesForPayments()) } catch (e) { return errorResponse(e) }
}

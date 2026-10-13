import { NextResponse } from 'next/server'
import { listExpenses, saveExpense } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listExpenses(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveExpense(await request.json()), { status: 201 }) } catch (e) { return errorResponse(e) }
}

import { NextResponse } from 'next/server'
import { expenseToInvoice } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(_r, { params }) {
    try { return NextResponse.json(await expenseToInvoice((await params).id)) } catch (e) { return errorResponse(e) }
}

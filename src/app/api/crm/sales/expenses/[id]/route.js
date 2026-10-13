import { NextResponse } from 'next/server'
import { getExpense, saveExpense, deleteExpense } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getExpense((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveExpense(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteExpense((await params).id)) } catch (e) { return errorResponse(e) }
}

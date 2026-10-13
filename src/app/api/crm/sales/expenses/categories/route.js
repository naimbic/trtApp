import { NextResponse } from 'next/server'
import { createCategory } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await createCategory((await request.json()).name), { status: 201 }) } catch (e) { return errorResponse(e) }
}

import { NextResponse } from 'next/server'
import { moveExpenses } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { ids, categoryId } puts expenses in another category (a drag on the Expenses page)
export async function POST(request) { try { return NextResponse.json(await moveExpenses(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }

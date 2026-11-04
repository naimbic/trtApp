import { NextResponse } from 'next/server'
import { saveCategory, deleteCategory, reorderCategories } from '@/lib/crm/expensesApi'
import { errorResponse } from '@/lib/crm/crud'

// the groups (categories) of the Expenses page: POST { name, color } · PUT { id, name, color } · PATCH { ids } their order · DELETE ?id=
export async function POST(request) { try { return NextResponse.json(await saveCategory(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function PUT(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await saveCategory(b, b.id)) } catch (e) { return errorResponse(e) } }
export async function PATCH(request) { try { return NextResponse.json(await reorderCategories((await request.json().catch(() => ({}))).ids)) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await deleteCategory(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) } }

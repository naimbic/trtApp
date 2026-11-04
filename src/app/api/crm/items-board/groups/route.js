import { NextResponse } from 'next/server'
import { saveGroup, deleteGroup } from '@/lib/crm/itemsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { name, color } a group · PUT { id, name, color } rename or recolour · DELETE ?id= (its items stay, without a group)
export async function POST(request) { try { return NextResponse.json(await saveGroup(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function PUT(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await saveGroup(b, b.id)) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await deleteGroup(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) } }

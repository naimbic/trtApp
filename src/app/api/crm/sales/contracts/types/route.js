import { NextResponse } from 'next/server'
import { saveContractType, deleteContractType, reorderContractTypes } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

// the groups (contract types) of the Contracts page: POST { name, color, defaultMonths, isDefault, isActive } · PUT { id, ... } · PATCH { ids } their order · DELETE ?id=
export async function POST(request) { try { return NextResponse.json(await saveContractType(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function PUT(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await saveContractType(b, b.id)) } catch (e) { return errorResponse(e) } }
export async function PATCH(request) { try { return NextResponse.json(await reorderContractTypes((await request.json().catch(() => ({}))).ids)) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await deleteContractType(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) } }

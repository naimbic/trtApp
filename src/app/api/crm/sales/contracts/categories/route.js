import { NextResponse } from 'next/server'
import { saveContractCategory, deleteContractCategory, addContractCatalogue } from '@/lib/crm/contractCategoriesApi'
import { errorResponse } from '@/lib/crm/crud'

// the categories of the contract types (they are listed with the contracts, in stats.categories): POST { name } or { catalogue: true } · PUT { id, name } · DELETE ?id=
export async function POST(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(b.catalogue ? await addContractCatalogue() : await saveContractCategory(b), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function PUT(request) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await saveContractCategory(b, String(b.id || ''))) } catch (e) { return errorResponse(e) } }
export async function DELETE(request) { try { return NextResponse.json(await deleteContractCategory(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) } }

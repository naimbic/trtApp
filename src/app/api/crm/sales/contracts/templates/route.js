import { NextResponse } from 'next/server'
import { listContractTemplates, getContractTemplate, saveContractTemplate, deleteContractTemplate, addStarterTemplates } from '@/lib/crm/contractTemplatesApi'
import { errorResponse } from '@/lib/crm/crud'

// Contract templates: GET the list (?id= one, with its text) · POST { name, description, content, typeId, active } or { starters: true } · PUT { id, ... } · DELETE ?id=
export async function GET(request) {
    try {
        const id = request.nextUrl.searchParams.get('id')
        return NextResponse.json(id ? await getContractTemplate(id) : await listContractTemplates())
    } catch (e) { return errorResponse(e) }
}
export async function POST(request) {
    try {
        const body = await request.json()
        return NextResponse.json(body?.starters ? await addStarterTemplates() : await saveContractTemplate(body), { status: 201 })
    } catch (e) { return errorResponse(e) }
}
export async function PUT(request) {
    try {
        const body = await request.json()
        return NextResponse.json(await saveContractTemplate(body, String(body?.id || '')))
    } catch (e) { return errorResponse(e) }
}
export async function DELETE(request) {
    try {
        return NextResponse.json(await deleteContractTemplate(request.nextUrl.searchParams.get('id')))
    } catch (e) { return errorResponse(e) }
}

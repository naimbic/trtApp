import { NextResponse } from 'next/server'
import { listSpace, revealItem, saveItem, deleteItem, convertItem } from '@/lib/crm/mySpaceApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// My space of the chat. GET ?owner=&q= the list (owner: somebody else's, read only, needs the right) · GET ?reveal=<id> the text of a secret item
// POST { ...fields } add · POST { action: 'convert', id, to: 'task' | 'note' } · PUT { id, ...fields } change · DELETE ?id=
export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams
        if (p.get('reveal')) return NextResponse.json(await revealItem(p.get('reveal')))
        return NextResponse.json(await listSpace({ owner: p.get('owner') || '', q: p.get('q') || '' }))
    } catch (e) { return errorResponse(e) }
}
export async function POST(request) {
    try {
        const b = await request.json()
        if (b.action === 'convert') return NextResponse.json(await convertItem(b.id, b.to))
        return NextResponse.json(await saveItem(b), { status: 201 })
    } catch (e) { return errorResponse(e) }
}
export async function PUT(request) {
    try { const b = await request.json(); return NextResponse.json(await saveItem(b, b.id)) } catch (e) { return errorResponse(e) }
}
export async function DELETE(request) {
    try { return NextResponse.json(await deleteItem(request.nextUrl.searchParams.get('id'))) } catch (e) { return errorResponse(e) }
}

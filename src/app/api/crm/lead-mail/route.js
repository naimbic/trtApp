import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listMailboxes, saveMailbox, deleteMailbox, importLog, testMailbox, previewMailbox, checkNow } from '@/lib/crm/leadMail'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request) {
    try {
        const id = new URL(request.url).searchParams.get('log')
        return NextResponse.json(id ? { list: await importLog(id) } : await listMailboxes())
    } catch (e) {
        return errorResponse(e)
    }
}

// One endpoint, one action per call; every action needs the "Settings" permission (the mailbox password belongs to administrators)
export async function POST(request) {
    try {
        const b = await request.json()
        switch (b.action) {
            case 'save': return NextResponse.json(await saveMailbox(b.data || {}, b.id || null))
            case 'delete': return NextResponse.json(await deleteMailbox(b.id))
            case 'test': return NextResponse.json(await testMailbox({ ...(b.data || {}), id: b.id }))
            case 'preview': return NextResponse.json(await previewMailbox(b.id))
            case 'run': return NextResponse.json(await checkNow(b.id))
            default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }
    } catch (e) {
        return errorResponse(e)
    }
}

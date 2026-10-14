import { NextResponse } from 'next/server'
import { setPresence } from '@/lib/crm/chatApi'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try { return NextResponse.json(await setPresence((await request.json().catch(() => ({}))).state)) } catch (e) { return errorResponse(e) }
}

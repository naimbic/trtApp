import { NextResponse } from 'next/server'
import { decideAppointment } from '@/lib/crm/appointments'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try { return NextResponse.json(await decideAppointment((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) }
}

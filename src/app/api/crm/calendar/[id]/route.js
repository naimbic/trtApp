import { NextResponse } from 'next/server'
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/crm/calendar'

const fail = (e) => (e instanceof SyntaxError ? NextResponse.json({ error: 'The request could not be read' }, { status: 400 }) : NextResponse.json({ error: e.message || String(e) }, { status: e.status || 500 }))

export async function PATCH(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await updateCalendarEvent(id, await request.json()))
    } catch (e) {
        return fail(e)
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await deleteCalendarEvent(id))
    } catch (e) {
        return fail(e)
    }
}

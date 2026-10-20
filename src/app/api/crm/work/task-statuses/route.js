import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTaskStatuses, saveTaskStatuses, resetTaskStatuses } from '@/lib/crm/taskStatuses'
import { errorResponse } from '@/lib/crm/crud'

// Everybody signed in reads the names and colours (they are printed on every task); only Settings editors change them.
export async function GET() {
    try {
        if (!(await auth())?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        return NextResponse.json({ statuses: await getTaskStatuses() })
    } catch (e) { return errorResponse(e) }
}

export async function PUT(request) {
    try { return NextResponse.json({ statuses: await saveTaskStatuses(await request.json()) }) } catch (e) { return errorResponse(e) }
}

export async function DELETE() {
    try { return NextResponse.json({ statuses: await resetTaskStatuses() }) } catch (e) { return errorResponse(e) }
}

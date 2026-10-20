import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTaskStatuses } from '@/lib/crm/taskStatuses'
import { errorResponse } from '@/lib/crm/crud'

// Names and colours are printed on every task, so everybody signed in reads them. They are edited in Settings -> Tasks -> Statuses
// (the generic /api/crm/task-statuses list, like the lead statuses).
export async function GET() {
    try {
        if (!(await auth())?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        return NextResponse.json({ statuses: await getTaskStatuses() })
    } catch (e) { return errorResponse(e) }
}

import { NextResponse } from 'next/server'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { sendMyDigest } from '@/lib/crm/digest'
import { errorResponse } from '@/lib/crm/crud'

// POST: send me today's summary now (to see what it looks like)
export async function POST() {
    try {
        const session = await requirePermission(null)
        const staffId = await getStaffId(session)
        if (!staffId) return NextResponse.json({ error: 'Only a team member has a summary' }, { status: 403 })
        const r = await sendMyDigest(staffId)
        return NextResponse.json(r, { status: r.error ? 400 : 200 })
    } catch (e) { return errorResponse(e) }
}

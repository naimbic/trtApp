import { NextResponse } from 'next/server'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { testOwnChannel } from '@/lib/crm/channels'
import { errorResponse } from '@/lib/crm/crud'
import { rateLimit } from '@/lib/rateLimit'

// POST { channel: 'telegram' | 'whatsapp' }: a test message to the channel saved in your own profile
export async function POST(request) {
    try {
        const session = await requirePermission(null)
        rateLimit(`chtest:${session.user.id}`, 6, 60000)
        const staffId = await getStaffId(session)
        const { channel } = await request.json()
        const r = await testOwnChannel(staffId, channel === 'whatsapp' ? 'whatsapp' : 'telegram')
        return r.sent ? NextResponse.json({ success: true }) : NextResponse.json({ error: r.error }, { status: 400 })
    } catch (e) {
        return errorResponse(e)
    }
}

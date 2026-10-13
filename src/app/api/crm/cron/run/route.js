import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { runCron } from '@/lib/crm/cron'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 300

export async function POST(request) {
    try {
        await requirePermission('settings', 'edit')
        const b = await request.json().catch(() => ({}))
        return NextResponse.json(await runCron({ trigger: 'manual', force: b.force !== false, dry: !!b.dry }))
    } catch (e) {
        return errorResponse(e)
    }
}

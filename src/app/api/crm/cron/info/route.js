import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { cronInfo } from '@/lib/crm/cron'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        await requirePermission('settings', 'edit') // the command contains the secret key
        const { key, ...info } = await cronInfo()
        return NextResponse.json(info)
    } catch (e) {
        return errorResponse(e)
    }
}

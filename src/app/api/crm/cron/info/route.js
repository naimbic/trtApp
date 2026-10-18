import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/crm/permissions'
import { cronInfo } from '@/lib/crm/cron'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        await requirePermission('settings', 'edit') // the command contains the secret key
        // the address the administrator is using right now, so the command is right even if PUBLIC_URL still names an old domain
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
        const proto = request.headers.get('x-forwarded-proto') || (host && /^(localhost|127\.)/.test(host) ? 'http' : 'https')
        const { key, ...info } = await cronInfo({ origin: host ? `${proto}://${host}` : undefined })
        return NextResponse.json(info)
    } catch (e) {
        return errorResponse(e)
    }
}

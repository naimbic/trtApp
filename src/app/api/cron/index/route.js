import { NextResponse } from 'next/server'
import { runCron, cronKeyValid } from '@/lib/crm/cron'

export const maxDuration = 300

// Public, protected by the cron key: schedule this address (see Settings → Cron job).
export async function GET(request) {
    const key = new URL(request.url).searchParams.get('key')
    if (!(await cronKeyValid(key))) return new NextResponse('Forbidden', { status: 403 })
    const r = await runCron({ trigger: 'http' })
    return new NextResponse(`${r.ok ? 'OK' : 'ERRORS'} (${r.ms} ms)\n${r.lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

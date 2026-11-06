import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { errorResponse } from '@/lib/crm/crud'
import { isCrmAdmin, PermissionError } from '@/lib/crm/permissions'
import { listBackups, runBackup, backupStatus } from '@/lib/crm/backup'
import { lastAlerts } from '@/lib/crm/alerts'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function admin() {
    const s = await auth()
    if (!s?.user?.id) throw new PermissionError('Unauthorized', 401)
    if (!isCrmAdmin(s.user.authority || [])) throw new PermissionError('Only administrators see the backups', 403)
}

// GET: the status, the list of backups and the last alerts · POST: back up now
export async function GET() {
    try { await admin(); const [status, list, alerts] = await Promise.all([backupStatus(), listBackups().catch(() => []), lastAlerts()]); return NextResponse.json({ status, list, alerts }) } catch (e) { return errorResponse(e) }
}
export async function POST() {
    try { await admin(); return NextResponse.json(await runBackup({ reason: 'manual' })) } catch (e) { return errorResponse(e) }
}

import { auth } from '@/auth'
import { errorResponse } from '@/lib/crm/crud'
import { isCrmAdmin, PermissionError } from '@/lib/crm/permissions'
import { backupStream } from '@/lib/crm/backup'

export const dynamic = 'force-dynamic'

// Download one backup file (administrators only)
export async function GET(_r, { params }) {
    try {
        const s = await auth()
        if (!s?.user?.id) throw new PermissionError('Unauthorized', 401)
        if (!isCrmAdmin(s.user.authority || [])) throw new PermissionError('Only administrators download backups', 403)
        const { body, size } = await backupStream((await params).name)
        return new Response(body.transformToWebStream(), { headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${(await params).name}"`, ...(size ? { 'Content-Length': String(size) } : {}), 'Cache-Control': 'no-store' } })
    } catch (e) { return errorResponse(e) }
}

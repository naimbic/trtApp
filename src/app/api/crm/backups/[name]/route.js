import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { errorResponse } from '@/lib/crm/crud'
import { isCrmAdmin, PermissionError } from '@/lib/crm/permissions'
import { backupLink } from '@/lib/crm/backup'

export const dynamic = 'force-dynamic'

// Download one backup (administrators only): a redirect to a 5-minute link of the file storage, so the file never goes through the server
export async function GET(_r, { params }) {
    try {
        const s = await auth()
        if (!s?.user?.id) throw new PermissionError('Unauthorized', 401)
        if (!isCrmAdmin(s.user.authority || [])) throw new PermissionError('Only administrators download backups', 403)
        return NextResponse.redirect(await backupLink((await params).name), 302)
    } catch (e) { return errorResponse(e) }
}

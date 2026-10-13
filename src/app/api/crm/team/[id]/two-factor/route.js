import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin, PermissionError } from '@/lib/crm/permissions'
import { resetTwoFactor } from '@/lib/crm/twoFactor'
import { errorResponse } from '@/lib/crm/crud'

// Administrators can remove a member's two-step verification (lost phone). The member sets it up again after signing in.
export async function DELETE(_request, { params }) {
    try {
        const session = await requirePermission('staff', 'edit')
        if (!isCrmAdmin(session.user.authority || [])) throw new PermissionError('Only an administrator can do this', 403)
        const { id } = await params
        const staff = await prisma.crmStaff.findUnique({ where: { id }, select: { userId: true } })
        if (!staff?.userId) throw new PermissionError('This member has no sign-in account', 404)
        return NextResponse.json(await resetTwoFactor(staff.userId))
    } catch (e) {
        return errorResponse(e)
    }
}

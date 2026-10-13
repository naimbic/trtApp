import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { isCrmAdmin } from '@/lib/crm/permissions'

// The signed-in user with their role label, for the sidebar footer and the profile menu.
export async function GET() {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = isCrmAdmin(session.user.authority || [])
    const staff = await prisma.crmStaff.findFirst({ where: { userId: session.user.id }, include: { role: true } }).catch(() => null)
    return NextResponse.json({
        name: session.user.name || [staff?.firstName, staff?.lastName].filter(Boolean).join(' ') || session.user.email,
        email: session.user.email,
        role: admin ? 'Super admin' : staff?.role?.name || 'Staff',
        admin,
    })
}

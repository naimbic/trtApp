import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { isCrmAdmin } from '@/lib/crm/permissions'
import { codeOfLanguage } from '@/lib/crm/langCodes'
import { DEFAULT_PREFS, realPicture } from '@/lib/crm/profile'

// The signed-in user with their role label, for the sidebar footer and the profile menu.
export async function GET() {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } }).catch(() => null)
    const admin = isCrmAdmin(session.user.authority || [])
    const staff = await prisma.crmStaff.findFirst({ where: { userId: session.user.id }, include: { role: true } }).catch(() => null)
    return NextResponse.json({
        name: session.user.name || [staff?.firstName, staff?.lastName].filter(Boolean).join(' ') || session.user.email,
        email: session.user.email,
        image: realPicture(dbUser?.image) || realPicture(staff?.profileImage),
        role: admin ? 'Super admin' : staff?.role?.name || 'Staff',
        admin,
        loginAs: session.user.imp ? { by: session.user.imp.name || '' } : null,
        language: codeOfLanguage(staff?.defaultLanguage), // the language the person chose in the profile or the menu: it follows them on every browser
        display: (() => { try { return { ...DEFAULT_PREFS.display, ...(JSON.parse(staff?.preferences || '{}').display || {}) } } catch { return DEFAULT_PREFS.display } })(),
    })
}

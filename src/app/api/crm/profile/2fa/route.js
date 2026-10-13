import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { errorResponse } from '@/lib/crm/crud'
import { PermissionError } from '@/lib/crm/permissions'
import * as tf from '@/lib/crm/twoFactor'

async function me() {
    const session = await auth()
    if (!session?.user?.id) throw new PermissionError('Unauthorized', 401)
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true } })
    if (!user) throw new PermissionError('Unauthorized', 401)
    return user
}

export async function GET() {
    try {
        const u = await me()
        return NextResponse.json({ ...(await tf.twoFactorStatus(u.id)), address: u.email })
    } catch (e) {
        return errorResponse(e)
    }
}

// One endpoint, one action per call (all need a signed-in user; turning things off also needs the password)
export async function POST(request) {
    try {
        const u = await me()
        const b = await request.json()
        switch (b.action) {
            case 'app-begin': return NextResponse.json(await tf.beginApp(u.id, u.email))
            case 'app-enable': return NextResponse.json(await tf.enableApp(u.id, b.code))
            case 'app-disable': return NextResponse.json(await tf.disableApp(u.id, b.password))
            case 'email-send': return NextResponse.json(await tf.sendEmailSetupCode(u.id))
            case 'email-enable': return NextResponse.json(await tf.enableEmail(u.id, b.code))
            case 'email-disable': return NextResponse.json(await tf.disableEmail(u.id, b.password))
            case 'recovery': return NextResponse.json(await tf.regenerateRecovery(u.id, b.password))
            default: throw new PermissionError('Unknown action', 400)
        }
    } catch (e) {
        return errorResponse(e)
    }
}

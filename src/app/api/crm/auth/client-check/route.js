import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'
import { requestIp } from '@/lib/crm/viewTracking'

export const dynamic = 'force-dynamic'

// POST { email, password } — public. After a failed team sign-in: do these details belong to a client area account? Only a correct password answers yes.
export async function POST(request) {
    try {
        const b = await request.json().catch(() => ({}))
        const email = String(b.email || '').trim().toLowerCase()
        const password = String(b.password || '')
        if (!email || !password) return NextResponse.json({ client: false })
        rateLimit(`client-check:${requestIp(request) || 'x'}`, 20, 10 * 60 * 1000)
        const rows = (await prisma.crmContact.findMany({ where: { email: { contains: email, mode: 'insensitive' }, active: true } })).filter((c) => String(c.email || '').trim().toLowerCase() === email)
        for (const c of rows) if (c.passwordHash && (await bcrypt.compare(password, c.passwordHash))) return NextResponse.json({ client: true })
        return NextResponse.json({ client: false })
    } catch { return NextResponse.json({ client: false }) }
}

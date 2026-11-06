import { NextResponse } from 'next/server'
import { recordPing } from '@/lib/crm/workHours'
import { errorResponse } from '@/lib/crm/crud'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { requestIp } from '@/lib/crm/viewTracking'

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}))
        const out = await recordPing({ input: body?.input })
        // the address a team member works from is remembered: the views of public pages from it are not counted as a client's
        const ip = requestIp(request)
        if (ip) auth().then(async (s) => { if (s?.user?.id) { const st = await prisma.crmStaff.findFirst({ where: { userId: s.user.id }, select: { id: true, lastIp: true } }); if (st && st.lastIp !== ip) await prisma.crmStaff.update({ where: { id: st.id }, data: { lastIp: ip } }) } }).catch(() => {})
        return NextResponse.json(out)
    } catch (e) {
        return errorResponse(e)
    }
}

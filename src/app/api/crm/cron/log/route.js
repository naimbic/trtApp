import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/crm/permissions'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        await requirePermission('settings', 'view')
        const list = await prisma.crmCronRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 })
        return NextResponse.json({ list: list.map(({ lines, ...r }) => r) })
    } catch (e) {
        return errorResponse(e)
    }
}

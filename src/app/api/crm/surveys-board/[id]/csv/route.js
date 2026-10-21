import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { surveyCsv } from '@/lib/crm/surveys'

export async function GET(_r, { params }) {
    try {
        const { name, csv } = await surveyCsv((await params).id)
        return new NextResponse(`\ufeff${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
    } catch (e) { return errorResponse(e) }
}

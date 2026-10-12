import { NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/crm/dashboard'

export async function GET() {
    try {
        const data = await getDashboardMetrics()
        if (!data) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
    }
}

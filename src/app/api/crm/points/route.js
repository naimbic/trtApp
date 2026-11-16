import { NextResponse } from 'next/server'
import { pointsHome, givePoints } from '@/lib/crm/pointsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await pointsHome()) } catch (e) { return errorResponse(e) }
}
export async function POST(request) {
    try { return NextResponse.json(await givePoints(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) }
}

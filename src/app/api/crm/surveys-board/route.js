import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { surveysBoard, saveSurvey } from '@/lib/crm/surveys'

export async function GET() {
    try { return NextResponse.json(await surveysBoard()) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveSurvey({ ...(await request.json()), id: null }), { status: 201 }) } catch (e) { return errorResponse(e) }
}

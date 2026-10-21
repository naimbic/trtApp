import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { setSurveyActive } from '@/lib/crm/surveys'

export async function POST(request, { params }) {
    try { return NextResponse.json(await setSurveyActive((await params).id, (await request.json()).active)) } catch (e) { return errorResponse(e) }
}

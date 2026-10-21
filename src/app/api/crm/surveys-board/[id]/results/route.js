import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { surveyResults } from '@/lib/crm/surveys'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await surveyResults((await params).id)) } catch (e) { return errorResponse(e) }
}

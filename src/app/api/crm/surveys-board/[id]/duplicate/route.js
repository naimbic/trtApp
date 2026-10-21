import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { duplicateSurvey } from '@/lib/crm/surveys'

export async function POST(_r, { params }) {
    try { return NextResponse.json(await duplicateSurvey((await params).id), { status: 201 }) } catch (e) { return errorResponse(e) }
}

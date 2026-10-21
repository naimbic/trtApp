import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { getSurveyForEdit, saveSurvey, deleteSurvey } from '@/lib/crm/surveys'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await getSurveyForEdit((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveSurvey({ ...(await request.json()), id: (await params).id })) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteSurvey((await params).id)) } catch (e) { return errorResponse(e) }
}

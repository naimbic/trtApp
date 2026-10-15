import { NextResponse } from 'next/server'
import { listIssues, saveIssue } from '@/lib/crm/issuesApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try { return NextResponse.json(await listIssues(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
    try { return NextResponse.json(await saveIssue(await request.json(), null), { status: 201 }) } catch (e) { return errorResponse(e) }
}

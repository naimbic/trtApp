import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listComments, addComment } from '@/lib/crm/clientIdeasApi'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) { try { return NextResponse.json(await listComments(request.nextUrl.searchParams.get('clientId'), (await params).id)) } catch (e) { return errorResponse(e) } }
export async function POST(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await addComment(b.clientId, (await params).id, b), { status: 201 }) } catch (e) { return errorResponse(e) } }

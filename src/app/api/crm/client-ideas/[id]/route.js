import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { saveIdea, deleteIdea } from '@/lib/crm/clientIdeasApi'

export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await saveIdea(b.clientId, b, (await params).id)) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { return NextResponse.json(await deleteIdea(request.nextUrl.searchParams.get('clientId'), (await params).id)) } catch (e) { return errorResponse(e) } }

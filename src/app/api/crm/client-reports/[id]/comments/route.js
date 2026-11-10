import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listComments, addComment, editComment, deleteComment, reactComment, mentionComment } from '@/lib/crm/clientReportsApi'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) { try { return NextResponse.json(await listComments(request.nextUrl.searchParams.get('clientId'), (await params).id)) } catch (e) { return errorResponse(e) } }
export async function POST(request, { params }) { try { const b = await request.json().catch(() => ({})); if (b.react) return NextResponse.json(await reactComment(b.clientId, (await params).id, b)); if (b.mention) return NextResponse.json(await mentionComment(b.clientId, (await params).id, b)); return NextResponse.json(await addComment(b.clientId, (await params).id, b), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function PUT(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await editComment(b.clientId, (await params).id, b)) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { const q = request.nextUrl.searchParams; return NextResponse.json(await deleteComment(q.get('clientId'), (await params).id, q.get('commentId'))) } catch (e) { return errorResponse(e) } }

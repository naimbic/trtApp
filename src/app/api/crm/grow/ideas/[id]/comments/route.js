import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { ideaComments, addComment, deleteComment } from '@/lib/crm/growApi'

export async function GET(_r, { params }) { try { return NextResponse.json(await ideaComments((await params).id)) } catch (e) { return errorResponse(e) } }
export async function POST(request, { params }) { try { return NextResponse.json(await addComment((await params).id, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { return NextResponse.json(await deleteComment((await params).id, request.nextUrl.searchParams.get('commentId'))) } catch (e) { return errorResponse(e) } }

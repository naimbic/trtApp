import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listNoteComments, addNoteComment, editNoteComment, deleteNoteComment } from '@/lib/crm/notesApi'

export const dynamic = 'force-dynamic'

export async function GET(_r, { params }) { try { return NextResponse.json(await listNoteComments((await params).id)) } catch (e) { return errorResponse(e) } }
export async function POST(request, { params }) { try { return NextResponse.json(await addNoteComment((await params).id, await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }
export async function PUT(request, { params }) { try { return NextResponse.json(await editNoteComment((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { return NextResponse.json(await deleteNoteComment((await params).id, request.nextUrl.searchParams.get('commentId'))) } catch (e) { return errorResponse(e) } }

import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { getNote, saveNote, deleteNote } from '@/lib/crm/notesApi'

export const dynamic = 'force-dynamic'

export async function GET(_r, { params }) { try { return NextResponse.json(await getNote((await params).id)) } catch (e) { return errorResponse(e) } }
export async function PATCH(request, { params }) { try { return NextResponse.json(await saveNote(await request.json().catch(() => ({})), (await params).id)) } catch (e) { return errorResponse(e) } }
export async function DELETE(_r, { params }) { try { return NextResponse.json(await deleteNote((await params).id)) } catch (e) { return errorResponse(e) } }

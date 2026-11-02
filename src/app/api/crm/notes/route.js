import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { listNotes, saveNote } from '@/lib/crm/notesApi'

export const dynamic = 'force-dynamic'

export async function GET(request) { try { const q = request.nextUrl.searchParams; return NextResponse.json(await listNotes({ q: q.get('q') || '', archived: q.get('archived') === '1', label: q.get('label') || '', board: q.get('board') === '1', limit: q.get('limit') || 500 })) } catch (e) { return errorResponse(e) } }
export async function POST(request) { try { return NextResponse.json(await saveNote(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }

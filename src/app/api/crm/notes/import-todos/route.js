import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { importTodos } from '@/lib/crm/notesApi'

export const dynamic = 'force-dynamic'

export async function POST() { try { return NextResponse.json(await importTodos()) } catch (e) { return errorResponse(e) } }

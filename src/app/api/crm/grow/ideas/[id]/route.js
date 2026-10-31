import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { saveIdea, deleteIdea } from '@/lib/crm/growApi'

export async function PUT(request, { params }) { try { return NextResponse.json(await saveIdea(await request.json().catch(() => ({})), (await params).id)) } catch (e) { return errorResponse(e) } }
export async function DELETE(_r, { params }) { try { return NextResponse.json(await deleteIdea((await params).id)) } catch (e) { return errorResponse(e) } }

import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { updateMine, removeMine } from '@/lib/crm/myRemindersApi'

export async function PATCH(request, { params }) { try { return NextResponse.json(await updateMine((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(_r, { params }) { try { return NextResponse.json(await removeMine((await params).id)) } catch (e) { return errorResponse(e) } }

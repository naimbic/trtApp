import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { updateView, deleteView } from '@/lib/crm/savedViewsApi'

export async function PATCH(request, { params }) { try { return NextResponse.json(await updateView((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(_r, { params }) { try { return NextResponse.json(await deleteView((await params).id)) } catch (e) { return errorResponse(e) } }

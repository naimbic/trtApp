import { NextResponse } from 'next/server'
import { updateClient, deleteClient } from '@/lib/crm/oauth'
import { errorResponse } from '@/lib/crm/crud'

export async function PUT(request, { params }) { try { return NextResponse.json(await updateClient((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { return NextResponse.json(await deleteClient((await params).id)) } catch (e) { return errorResponse(e) } }

import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { saveScheduled, deleteScheduled, sendScheduledNow } from '@/lib/crm/scheduledMessages'

export async function PUT(request, { params }) { try { return NextResponse.json(await saveScheduled((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { return NextResponse.json(await deleteScheduled((await params).id)) } catch (e) { return errorResponse(e) } }
export async function POST(request, { params }) { try { return NextResponse.json(await sendScheduledNow((await params).id)) } catch (e) { return errorResponse(e) } }

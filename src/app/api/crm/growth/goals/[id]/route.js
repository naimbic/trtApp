import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'

import { saveGoal, deleteGoal } from '@/lib/crm/growthApi'

export async function PUT(request, { params }) { try { return NextResponse.json(await saveGoal((await params).id, await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }
export async function DELETE(request, { params }) { try { return NextResponse.json(await deleteGoal((await params).id)) } catch (e) { return errorResponse(e) } }

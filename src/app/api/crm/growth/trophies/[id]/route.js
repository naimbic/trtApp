import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { payTrophy } from '@/lib/crm/growthApi'

export async function PUT(request, { params }) { try { const b = await request.json().catch(() => ({})); return NextResponse.json(await payTrophy((await params).id, b.paid !== false)) } catch (e) { return errorResponse(e) } }

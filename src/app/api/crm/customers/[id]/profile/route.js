import { NextResponse } from 'next/server'
import { clientProfile } from '@/lib/crm/clientProfileApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) {
    try { return NextResponse.json(await clientProfile((await params).id)) } catch (e) { return errorResponse(e) }
}

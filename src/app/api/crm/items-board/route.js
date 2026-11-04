import { NextResponse } from 'next/server'
import { getBoard } from '@/lib/crm/itemsApi'
import { errorResponse } from '@/lib/crm/crud'

export const dynamic = 'force-dynamic'

// The Items page: every group with its items in order, the items without a group, the taxes and the currency
export async function GET() { try { return NextResponse.json(await getBoard()) } catch (e) { return errorResponse(e) } }

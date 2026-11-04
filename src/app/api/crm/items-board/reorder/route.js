import { NextResponse } from 'next/server'
import { reorder } from '@/lib/crm/itemsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { groupId, ids } the items of a group in order (an item dropped from another group joins it) · { groups: [ids] } the order of the groups
export async function POST(request) { try { return NextResponse.json(await reorder(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }

import { NextResponse } from 'next/server'
import { suggest } from '@/lib/crm/itemsApi'
import { errorResponse } from '@/lib/crm/crud'

export const maxDuration = 120

// POST { prompt, groupId?, count?, language? } the AI proposes items for the catalogue (nothing is saved)
export async function POST(request) { try { return NextResponse.json(await suggest(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }

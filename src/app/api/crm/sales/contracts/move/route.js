import { NextResponse } from 'next/server'
import { moveContracts } from '@/lib/crm/contractsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { ids, typeId } puts contracts in another type (a drag on the Contracts page)
export async function POST(request) { try { return NextResponse.json(await moveContracts(await request.json().catch(() => ({})))) } catch (e) { return errorResponse(e) } }

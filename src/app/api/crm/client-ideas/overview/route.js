import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { ideasByStatus } from '@/lib/crm/clientIdeasApi'

export const dynamic = 'force-dynamic'

// The ideas of every client the person may see, optionally one status: the status pages.
export async function GET(request) { try { return NextResponse.json(await ideasByStatus({ status: request.nextUrl.searchParams.get('status') || '' })) } catch (e) { return errorResponse(e) } }

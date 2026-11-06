import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { findDuplicates } from '@/lib/crm/duplicatesApi'

export const dynamic = 'force-dynamic'

// GET ?email=&phone=&company=&leadId=&clientId= → { list: [{ type, id, title, sub, why: ['email'|'phone'|'company'], link, note }] }
export async function GET(request) { try { return NextResponse.json(await findDuplicates(Object.fromEntries(request.nextUrl.searchParams))) } catch (e) { return errorResponse(e) } }

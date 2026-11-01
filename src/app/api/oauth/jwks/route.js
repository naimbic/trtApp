import { NextResponse } from 'next/server'
import { jwks } from '@/lib/crm/oauth'

export const dynamic = 'force-dynamic'
export async function GET() { return NextResponse.json(await jwks(), { headers: { 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' } }) }

import { NextResponse } from 'next/server'
import { discovery } from '@/lib/crm/oauth'

export const dynamic = 'force-dynamic'
export async function GET() { return NextResponse.json(discovery(), { headers: { 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' } }) }

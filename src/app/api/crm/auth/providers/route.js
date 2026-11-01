import { NextResponse } from 'next/server'
import { socialProviders } from '@/lib/crm/socialLogin'

export const dynamic = 'force-dynamic'

// GET -> { password: true, google, github }: the ways to sign in that the sign-in page shows (a provider with no keys stays hidden)
export async function GET() {
    return NextResponse.json({ password: true, ...socialProviders() })
}

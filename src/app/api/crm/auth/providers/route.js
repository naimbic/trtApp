import { NextResponse } from 'next/server'
import { trtagencyConfig } from '@/lib/crm/trtagency/config'
import { socialProviders } from '@/lib/crm/socialLogin'

export const dynamic = 'force-dynamic'

// GET -> { password: true, google, github, trtagency }: the ways to sign in that the sign-in page shows (a provider with no keys stays hidden)
export async function GET() {
    const t = trtagencyConfig()
    return NextResponse.json({ password: true, ...socialProviders(), trtagency: !!t && !t.error })
}

import { NextResponse } from 'next/server'
import { trtagencyConfig } from '@/lib/crm/trtagency/config'

export const dynamic = 'force-dynamic'

// GET -> { enabled }: the sign-in page shows the "Sign in with trtAgency" button only when this server is set up for it
export async function GET() {
    const cfg = trtagencyConfig()
    return NextResponse.json({ enabled: !!cfg && !cfg.error })
}

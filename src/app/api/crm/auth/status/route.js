import { NextResponse } from 'next/server'
import { lockState, MAX_ATTEMPTS } from '@/lib/crm/loginGuard'

// GET /api/crm/auth/status?email=… — public; says whether sign-in is temporarily locked for that email.
export async function GET(request) {
    const email = request.nextUrl.searchParams.get('email') || ''
    const s = await lockState(email)
    return NextResponse.json({ locked: s.locked, minutes: s.locked ? Math.max(1, Math.ceil(s.remainingMs / 60000)) : 0, maxAttempts: MAX_ATTEMPTS })
}

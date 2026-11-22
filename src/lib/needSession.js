import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/** For the older addresses that had no check of their own: answers 401 unless someone is signed in. Returns null when the caller may go on. */
export async function needSession() {
    const session = await auth()
    return session?.user?.id ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import getSrcumboardMembers from '@/server/actions/getSrcumboardMembers'

export async function GET() {
    const denied = await needSession()
    if (denied) return denied
    try {
        const scrumboardMembers = await getSrcumboardMembers()

        return NextResponse.json(scrumboardMembers)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}

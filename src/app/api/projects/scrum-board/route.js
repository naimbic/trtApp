import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import getScrumboardData from '@/server/actions/getScrumboardData'

export async function GET() {
    const denied = await needSession()
    if (denied) return denied
    try {
        const scrumboardData = await getScrumboardData()

        return NextResponse.json(scrumboardData)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}

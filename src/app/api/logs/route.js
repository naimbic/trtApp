import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import getLogs from '@/server/actions/getLogs'

export async function GET(request) {
    const denied = await needSession()
    if (denied) return denied
    const searchParams = request.nextUrl.searchParams
    const activityIndex = searchParams.get('activityIndex')
    const filter = searchParams.get('filter')

    try {
        const response = await getLogs(activityIndex, filter)
        return NextResponse.json(response)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}

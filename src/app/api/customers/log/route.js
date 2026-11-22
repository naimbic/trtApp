import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { customerActivityLog } from '@/mock/data/logData'

export async function GET() {
    const denied = await needSession()
    if (denied) return denied
    try {
        return NextResponse.json(customerActivityLog)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}

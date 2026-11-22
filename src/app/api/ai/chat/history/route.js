import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { chatHistoryData } from '@/mock/data/aiData'

export async function GET() {
    const denied = await needSession()
    if (denied) return denied
    try {
        return NextResponse.json(chatHistoryData)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}

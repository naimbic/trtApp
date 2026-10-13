import { NextResponse } from 'next/server'
import { getProfile, updateProfile } from '@/lib/crm/profile'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getProfile())
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request) {
    try {
        return NextResponse.json(await updateProfile(await request.json()))
    } catch (e) {
        return errorResponse(e)
    }
}

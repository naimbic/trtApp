import { NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/crm/settings/settingsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) {
    try {
        return NextResponse.json(await getSettings(new URL(request.url).searchParams.get('group')))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function PUT(request) {
    try {
        const b = await request.json()
        return NextResponse.json(await saveSettings(b.group, b.values))
    } catch (e) {
        return errorResponse(e)
    }
}

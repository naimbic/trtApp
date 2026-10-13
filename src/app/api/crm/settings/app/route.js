import { NextResponse } from 'next/server'
import { getAppSettings } from '@/lib/crm/settings/settingsApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try {
        return NextResponse.json(await getAppSettings())
    } catch (e) {
        return errorResponse(e)
    }
}

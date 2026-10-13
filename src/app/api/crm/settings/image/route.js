import { NextResponse } from 'next/server'
import { setSettingImage, clearSettingImage } from '@/lib/crm/settings/settingsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST ?key=…  multipart {file}  or  json {mediaId}   |   DELETE ?key=…
export async function POST(request) {
    try {
        const key = new URL(request.url).searchParams.get('key')
        if ((request.headers.get('content-type') || '').includes('application/json')) return NextResponse.json(await setSettingImage(key, { mediaId: (await request.json()).mediaId }))
        const form = await request.formData()
        return NextResponse.json(await setSettingImage(key, { file: form.get('file') }))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(request) {
    try {
        return NextResponse.json(await clearSettingImage(new URL(request.url).searchParams.get('key')))
    } catch (e) {
        return errorResponse(e)
    }
}

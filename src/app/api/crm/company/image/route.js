import { NextResponse } from 'next/server'
import { setCompanyImage, removeCompanyImage } from '@/lib/crm/company'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request) {
    try {
        const kind = new URL(request.url).searchParams.get('kind')
        const form = await request.formData()
        return NextResponse.json(await setCompanyImage(kind, form.get('file')))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(request) {
    try {
        return NextResponse.json(await removeCompanyImage(new URL(request.url).searchParams.get('kind')))
    } catch (e) {
        return errorResponse(e)
    }
}

import { NextResponse } from 'next/server'
import { uploadMemberDoc, removeMemberDoc } from '@/lib/crm/team'
import { errorResponse } from '@/lib/crm/crud'

export async function POST(request, { params }) {
    try {
        const { id } = await params
        const form = await request.formData()
        return NextResponse.json(await uploadMemberDoc(id, form.get('kind'), form.get('file')))
    } catch (e) {
        return errorResponse(e)
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await removeMemberDoc(id, request.nextUrl.searchParams.get('kind')))
    } catch (e) {
        return errorResponse(e)
    }
}

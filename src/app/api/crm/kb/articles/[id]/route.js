import { NextResponse } from 'next/server'
import { getArticle, saveArticle, deleteArticle, patchArticle } from '@/lib/crm/kbApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request, { params }) {
    try { return NextResponse.json(await getArticle((await params).id, { raw: request.nextUrl.searchParams.get('raw') === '1' })) } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
    try { return NextResponse.json(await saveArticle(await request.json(), (await params).id)) } catch (e) { return errorResponse(e) }
}

export async function DELETE(_r, { params }) {
    try { return NextResponse.json(await deleteArticle((await params).id)) } catch (e) { return errorResponse(e) }
}

export async function PATCH(request, { params }) {
    try { return NextResponse.json(await patchArticle((await params).id, await request.json())) } catch (e) { return errorResponse(e) }
}

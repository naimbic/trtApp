import { NextResponse } from 'next/server'
import { saveWebhook, deleteWebhook, testWebhook, webhookDeliveries } from '@/lib/crm/webhooks'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) { try { return NextResponse.json(await webhookDeliveries((await params).id)) } catch (e) { return errorResponse(e) } }
export async function PUT(request, { params }) { try { return NextResponse.json(await saveWebhook(await request.json().catch(() => ({})), (await params).id)) } catch (e) { return errorResponse(e) } }
export async function POST(_r, { params }) { try { return NextResponse.json(await testWebhook((await params).id)) } catch (e) { return errorResponse(e) } }
export async function DELETE(_r, { params }) { try { return NextResponse.json(await deleteWebhook((await params).id)) } catch (e) { return errorResponse(e) } }

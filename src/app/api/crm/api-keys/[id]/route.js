import { NextResponse } from 'next/server'
import { revokeKey, keyLog } from '@/lib/crm/apiKeys'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(_r, { params }) { try { return NextResponse.json(await keyLog((await params).id)) } catch (e) { return errorResponse(e) } }
export async function DELETE(_r, { params }) { try { return NextResponse.json(await revokeKey((await params).id)) } catch (e) { return errorResponse(e) } }

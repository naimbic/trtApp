import { NextResponse } from 'next/server'
import { bulkCreate } from '@/lib/crm/itemsApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { groupId, items: [{ description, longDescription, unit, rate }] } adds several items at once
export async function POST(request) { try { return NextResponse.json(await bulkCreate(await request.json().catch(() => ({}))), { status: 201 }) } catch (e) { return errorResponse(e) } }

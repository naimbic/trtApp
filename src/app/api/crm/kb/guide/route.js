import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/crm/crud'
import { guideStatus, installGuide } from '@/lib/crm/helpGuide'

export async function GET() { try { return NextResponse.json(await guideStatus()) } catch (e) { return errorResponse(e) } }
export async function POST() { try { return NextResponse.json(await installGuide()) } catch (e) { return errorResponse(e) } }

import { NextResponse } from 'next/server'
import { oldUnpaidInvoices } from '@/server/actions/crm/sales/invoices'
import { errorResponse } from '@/lib/crm/crud'

export async function GET(request) { try { return NextResponse.json(await oldUnpaidInvoices(request.nextUrl.searchParams.get('years') || 2)) } catch (e) { return errorResponse(e) } }

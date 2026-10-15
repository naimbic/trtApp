import { NextResponse } from 'next/server'
import { clientBilling } from '@/lib/crm/clientProfileApi'
import { errorResponse } from '@/lib/crm/crud'

// GET /api/crm/customers/:id/billing?range=12m|…|custom&from&to&currencyId — invoiced/paid/count with the previous period
export async function GET(request, { params }) {
    try {
        const { id } = await params
        return NextResponse.json(await clientBilling(id, Object.fromEntries(request.nextUrl.searchParams)))
    } catch (e) {
        return errorResponse(e)
    }
}

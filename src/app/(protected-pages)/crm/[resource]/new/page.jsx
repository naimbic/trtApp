import { notFound, redirect } from 'next/navigation'
import { getResource } from '@/lib/crm/resources'
import { requirePermission } from '@/lib/crm/permissions'
import ResourceCreate from '../../_components/ResourceCreate'
import InvoiceEditor from '../../_components/sales/InvoiceEditor'
import { getInvoiceLookups } from '@/server/actions/crm/sales/invoices'

export default async function Page({ params, searchParams }) {
    const { resource: key } = await params
    const resource = getResource(key)
    if (!resource || resource.readOnly) notFound()
    try {
        await requirePermission(resource.feature, 'create')
    } catch {
        redirect('/access-denied')
    }
    const initialValues = await searchParams // e.g. ?clientId=... prefills relation fields
    if (key === 'invoices') {
        return <InvoiceEditor lookups={await getInvoiceLookups()} initialValues={initialValues || {}} />
    }
    return <ResourceCreate resource={resource} initialValues={initialValues} />
}

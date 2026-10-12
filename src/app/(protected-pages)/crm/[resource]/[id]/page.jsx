import { notFound, redirect } from 'next/navigation'
import { getResource } from '@/lib/crm/resources'
import { getRecord } from '@/lib/crm/crud'
import { hasCap } from '@/lib/crm/permissions'
import { auth } from '@/auth'
import ResourceDetail from '../../_components/ResourceDetail'
import InvoiceEditor from '../../_components/sales/InvoiceEditor'
import InvoiceView from '../../_components/sales/InvoiceView'
import { getInvoiceDocument, getInvoiceLookups } from '@/server/actions/crm/sales/invoices'

export default async function Page({ params, searchParams }) {
    const { resource: key, id } = await params
    const resource = getResource(key)
    if (!resource) notFound()
    let record
    try {
        record = await getRecord(key, id)
    } catch (e) {
        if (e.status === 404) notFound()
        if (e.status === 403 || e.status === 401) redirect('/access-denied')
        throw e
    }
    const session = await auth()
    const authority = session?.user?.authority || []
    if (key === 'invoices') {
        const doc = await getInvoiceDocument(id)
        if (!doc) notFound()
        const lookups = await getInvoiceLookups()
        const edit = (await searchParams)?.edit === '1' && hasCap(authority, 'invoices', 'edit') && doc.invoice.status !== 5
        if (edit) return <InvoiceEditor lookups={lookups} document={doc} />
        return (
            <InvoiceView
                data={doc}
                paymentModes={lookups.paymentModes}
                caps={{
                    edit: hasCap(authority, 'invoices', 'edit'),
                    payments: hasCap(authority, 'payments', 'create'),
                    deletePayments: hasCap(authority, 'payments', 'delete'),
                }}
            />
        )
    }
    const childResources = (resource.children || [])
        .map((c) => {
            const child = getResource(c.resource)
            return child ? { ...child, fk: c.fk, where: c.where || {}, tabLabel: c.label } : null
        })
        .filter(Boolean)
    return (
        <ResourceDetail
            resource={resource}
            record={JSON.parse(JSON.stringify(record))}
            childResources={childResources}
            canEdit={hasCap(authority, resource.feature, 'edit')}
        />
    )
}

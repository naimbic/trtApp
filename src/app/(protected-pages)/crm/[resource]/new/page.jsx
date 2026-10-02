import { notFound, redirect } from 'next/navigation'
import { getResource } from '@/lib/crm/resources'
import { requirePermission } from '@/lib/crm/permissions'
import ResourceCreate from '../../_components/ResourceCreate'

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
    return <ResourceCreate resource={resource} initialValues={initialValues} />
}

import { notFound, redirect } from 'next/navigation'
import { getResource } from '@/lib/crm/resources'
import { getRecord } from '@/lib/crm/crud'
import { hasCap } from '@/lib/crm/permissions'
import { auth } from '@/auth'
import ResourceDetail from '../../_components/ResourceDetail'

export default async function Page({ params }) {
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

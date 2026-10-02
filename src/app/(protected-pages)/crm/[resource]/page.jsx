import { notFound, redirect } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import { getResource } from '@/lib/crm/resources'
import { requirePermission, hasCap } from '@/lib/crm/permissions'
import ResourceList from '../_components/ResourceList'

export default async function Page({ params }) {
    const { resource: key } = await params
    const resource = getResource(key)
    if (!resource) notFound()
    let session
    try {
        session = await requirePermission(resource.feature, 'view')
    } catch {
        redirect('/access-denied')
    }
    const authority = session.user.authority || []
    return (
        <Container>
            <AdaptiveCard>
                <ResourceList
                    resource={resource}
                    canCreate={hasCap(authority, resource.feature, 'create')}
                    canEdit={hasCap(authority, resource.feature, 'edit')}
                    canDelete={hasCap(authority, resource.feature, 'delete')}
                />
            </AdaptiveCard>
        </Container>
    )
}

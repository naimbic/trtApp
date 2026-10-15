import { useState } from 'react'
import { useParams } from 'react-router'
import { TbPlus, TbPencil } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { getResource } from '@/lib/crm/resources'
import { customNavItems } from '@/lib/crm/custom-nav'
import ResourceTable from './kit/ResourceTable'
import RecordDrawer from './kit/RecordDrawer'
import { useCan } from './kit/api'
import { tr } from '@/utils/t'

// Generic screen for every CRM resource: search, filters, sorting, paging and a create/edit drawer,
// all driven by the resource registry (src/lib/crm/resources). Hand-built screens take precedence in the routes.
const ResourcePage = () => {
    const { resource: key } = useParams()
    const resource = getResource(key)
    const can = useCan()
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const [reload, setReload] = useState(0)

    if (!resource) {
        const custom = customNavItems.find((i) => i.key === key)
        return (
            <Container>
                <AdaptiveCard>{custom ? tr("{title} is not available in the new template yet.", { title: custom.title }) : tr("Unknown CRM screen “{key}”.", { key: key })}</AdaptiveCard>
            </Container>
        )
    }

    const canCreate = !resource.readOnly && can(resource.feature, 'create')
    const canEdit = !resource.readOnly && can(resource.feature, 'edit')
    const canDelete = !resource.readOnly && can(resource.feature, 'delete')

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>{resource.plural}</h3>
                    <p className="text-sm text-gray-500">{resource.group}</p>
                </div>
                {canCreate && <Button variant="solid" icon={<TbPlus />} onClick={() => setDrawer({ open: true, id: null })}>{tr("New")} {resource.label.toLowerCase()}</Button>}
            </div>
            <AdaptiveCard>
                <ResourceTable
                    key={resource.key}
                    resource={resource}
                    reloadKey={reload}
                    onRowClick={(row) => setDrawer({ open: true, id: row.id })}
                    rowActions={(row) => <Tooltip title={canEdit ? tr("Edit") : tr("View")}><Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => setDrawer({ open: true, id: row.id })} /></Tooltip>}
                />
            </AdaptiveCard>
            <RecordDrawer
                key={resource.key}
                resource={resource}
                open={drawer.open}
                id={drawer.id}
                canEdit={drawer.id ? canEdit : canCreate}
                canDelete={canDelete}
                onClose={() => setDrawer((d) => ({ ...d, open: false }))}
                onSaved={() => setReload((n) => n + 1)}
                onDeleted={() => setReload((n) => n + 1)}
            />
        </Container>
    )
}

export default ResourcePage

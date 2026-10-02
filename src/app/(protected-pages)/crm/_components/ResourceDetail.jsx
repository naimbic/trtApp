'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tabs from '@/components/ui/Tabs'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbArrowLeft, TbPencil } from 'react-icons/tb'
import ResourceForm from './ResourceForm'
import ResourceList from './ResourceList'
import { renderValue } from './format'

const { TabList, TabNav, TabContent } = Tabs

/** props: resource, record, childResources: [{ ...childConfig, fk, tabLabel }] */
const ResourceDetail = ({ resource, record, childResources = [], canEdit = true }) => {
    const router = useRouter()
    const search = useSearchParams()
    const [editing, setEditing] = useState(search.get('edit') === '1' && canEdit && !resource.readOnly)
    const [saving, setSaving] = useState(false)
    const title = record[resource.titleField] ?? record.id

    const save = async (values) => {
        setSaving(true)
        try {
            const res = await fetch(`/api/crm/${resource.key}/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Save failed')
            toast.push(<Notification type="success">{resource.label} saved</Notification>, { placement: 'top-center' })
            setEditing(false)
            router.refresh()
        } catch (e) {
            toast.push(<Notification type="danger">{e.message}</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    const summary = (
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
            {(resource.fields || []).filter((f) => !f.hidden).map((f) => (
                <div key={f.key} className="flex flex-col">
                    <span className="text-xs text-gray-500">{f.label}</span>
                    <span className="font-semibold break-words">{renderValue(f, record, resource) || '—'}</span>
                </div>
            ))}
        </div>
    )

    return (
        <Container>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => router.push(`/crm/${resource.key}`)} />
                        <h3>{title}</h3>
                    </div>
                    {canEdit && !resource.readOnly && !editing && (
                        <Button icon={<TbPencil />} onClick={() => setEditing(true)}>Edit</Button>
                    )}
                </div>
                {editing ? (
                    <ResourceForm resource={resource} defaultValues={record} onSubmit={save} submitting={saving} onCancel={() => setEditing(false)} />
                ) : (
                    <AdaptiveCard>
                        <Tabs defaultValue="details">
                            <TabList>
                                <TabNav value="details">Details</TabNav>
                                {childResources.map((c) => <TabNav key={c.key} value={c.key}>{c.tabLabel || c.plural}</TabNav>)}
                            </TabList>
                            <div className="p-4">
                                <TabContent value="details">{summary}</TabContent>
                                {childResources.map((c) => (
                                    <TabContent key={c.key} value={c.key}>
                                        <ResourceList
                                            compact
                                            resource={c}
                                            fixedWhere={{ ...(c.where || {}), [c.fk]: record.id }}
                                            newHref={`/crm/${c.key}/new?${new URLSearchParams({ ...(c.where || {}), [c.fk]: record.id })}`}
                                        />
                                    </TabContent>
                                ))}
                            </div>
                        </Tabs>
                    </AdaptiveCard>
                )}
            </div>
        </Container>
    )
}

export default ResourceDetail

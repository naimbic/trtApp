'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/shared/Container'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ResourceForm from './ResourceForm'

const ResourceCreate = ({ resource, initialValues = {} }) => {
    const router = useRouter()
    const [saving, setSaving] = useState(false)

    const submit = async (values) => {
        setSaving(true)
        try {
            const res = await fetch(`/api/crm/${resource.key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Create failed')
            toast.push(<Notification type="success">{resource.label} created</Notification>, { placement: 'top-center' })
            router.push(`/crm/${resource.key}/${json.id}`)
        } catch (e) {
            toast.push(<Notification type="danger">{e.message}</Notification>, { placement: 'top-center' })
            setSaving(false)
        }
    }

    return (
        <Container>
            <h3 className="mb-4">New {resource.label}</h3>
            <ResourceForm resource={resource} defaultValues={initialValues} onSubmit={submit} submitting={saving} onCancel={() => router.back()} />
        </Container>
    )
}

export default ResourceCreate

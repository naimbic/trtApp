import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import Card from '@/components/ui/Card'
import { getResource } from '@/lib/crm/resources'
import { customNavItems } from '@/lib/crm/custom-nav'

// Placeholder for every CRM screen while they are ported one by one.
const ResourcePage = () => {
    const { resource: key } = useParams()
    const resource = getResource(key)
    const custom = customNavItems.find((i) => i.key === key)
    const [total, setTotal] = useState(null)

    useEffect(() => {
        setTotal(null)
        if (!resource) return
        fetch(`/api/crm/${key}?pageSize=1`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setTotal(d?.total ?? d?.count ?? (Array.isArray(d) ? d.length : null)))
            .catch(() => setTotal(null))
    }, [key, resource])

    if (!resource && !custom) return <Card>Unknown CRM screen “{key}”.</Card>
    return (
        <Card>
            <h3>{resource?.plural || custom?.title}</h3>
            <p className="mt-2 text-gray-500">
                {resource ? `${resource.group} · ${total === null ? 'loading…' : `${total} record(s)`}` : custom.group}
            </p>
            <p className="mt-4 text-sm text-gray-400">This screen is not ported to the new template yet.</p>
        </Card>
    )
}

export default ResourcePage

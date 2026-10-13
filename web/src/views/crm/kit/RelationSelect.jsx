import { useEffect, useState } from 'react'
import Select from '@/components/ui/Select'

/** Async picker for a `relation` field (options come from /api/crm/<resource>/options). value = id | null. */
const RelationSelect = ({ resource, value, onChange, disabled, size }) => {
    const [options, setOptions] = useState([])
    const [loading, setLoading] = useState(false)

    const load = async (query = '', ids) => {
        setLoading(true)
        try {
            const p = new URLSearchParams()
            if (query) p.set('query', query)
            if (ids) p.set('ids', ids)
            const res = await fetch(`/api/crm/${resource}/options?${p}`, { credentials: 'include' })
            const data = res.ok ? await res.json() : []
            setOptions((prev) => {
                const map = new Map(prev.map((o) => [o.value, o]))
                data.forEach((o) => map.set(o.value, o))
                return [...map.values()]
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load('', value || undefined)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resource, value])

    return (
        <Select
            isClearable
            size={size}
            isDisabled={disabled}
            isLoading={loading}
            options={options}
            value={options.find((o) => o.value === value) || null}
            onInputChange={(q) => q && load(q)}
            onChange={(o) => onChange(o ? o.value : null)}
            placeholder="Search…"
        />
    )
}

export default RelationSelect

'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tooltip from '@/components/ui/Tooltip'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { TbPencil, TbEye, TbTrash, TbPlus } from 'react-icons/tb'
import { renderValue } from './format'

const fetcher = async (url) => {
    const res = await fetch(url)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
}

/**
 * Generic list. props: resource (config), fixedWhere ({field: value}) for child tabs,
 * canCreate/canEdit/canDelete booleans, compact (no title/card chrome).
 */
const ResourceList = ({ resource, fixedWhere = {}, canCreate = true, canEdit = true, canDelete = true, compact = false, newHref }) => {
    const router = useRouter()
    const [page, setPage] = useState(1)
    const [size, setSize] = useState(10)
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState({ key: '', order: '' })
    const [filters, setFilters] = useState({})
    const [toDelete, setToDelete] = useState(null)

    const qs = useMemo(() => {
        const p = new URLSearchParams({ pageIndex: String(page), pageSize: String(size) })
        if (query) p.set('query', query)
        if (sort.key) { p.set('sortKey', sort.key); p.set('order', sort.order || 'asc') }
        Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.set(k, String(v)))
        Object.entries(fixedWhere).forEach(([k, v]) => p.set(`where.${k}`, String(v)))
        return p.toString()
    }, [page, size, query, sort, filters, fixedWhere])

    const { data, error, isLoading, mutate } = useSWR(`/api/crm/${resource.key}?${qs}`, fetcher, { keepPreviousData: true })
    const base = `/crm/${resource.key}`

    const columns = useMemo(() => {
        const cols = (resource.columns || []).map((c) => ({
            header: c.label,
            accessorKey: c.key,
            enableSorting: c.type !== 'relation' && c.type !== 'json',
            cell: ({ row }) => {
                const value = renderValue(c, row.original, resource)
                return c.link ? (
                    <Link className="hover:text-primary font-semibold text-gray-900 dark:text-gray-100" href={`${base}/${row.original.id}`}>
                        {value || '—'}
                    </Link>
                ) : (
                    value
                )
            },
        }))
        cols.push({
            header: '',
            id: 'action',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-3 text-xl">
                    <Tooltip title="View"><span role="button" className="cursor-pointer" onClick={() => router.push(`${base}/${row.original.id}`)}><TbEye /></span></Tooltip>
                    {canEdit && !resource.readOnly && (
                        <Tooltip title="Edit"><span role="button" className="cursor-pointer" onClick={() => router.push(`${base}/${row.original.id}?edit=1`)}><TbPencil /></span></Tooltip>
                    )}
                    {canDelete && !resource.readOnly && (
                        <Tooltip title="Delete"><span role="button" className="cursor-pointer text-red-500" onClick={() => setToDelete(row.original)}><TbTrash /></span></Tooltip>
                    )}
                </div>
            ),
        })
        return cols
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resource, canEdit, canDelete])

    const confirmDelete = async () => {
        try {
            const res = await fetch(`/api/crm/${resource.key}/${toDelete.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
            toast.push(<Notification type="success">{resource.label} deleted</Notification>, { placement: 'top-center' })
            mutate()
        } catch (e) {
            toast.push(<Notification type="danger">{e.message}</Notification>, { placement: 'top-center' })
        } finally {
            setToDelete(null)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {!compact && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <h3>{resource.plural}</h3>
                    {canCreate && !resource.readOnly && (
                        <Button variant="solid" icon={<TbPlus />} onClick={() => router.push(newHref || `${base}/new`)}>
                            New {resource.label}
                        </Button>
                    )}
                </div>
            )}
            <div className="flex flex-col md:flex-row gap-2">
                <Input
                    className="md:max-w-xs"
                    placeholder={`Search ${resource.plural.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                />
                {(resource.filters || []).map((f) => (
                    <Select
                        key={f.key}
                        className="md:min-w-44"
                        isClearable
                        placeholder={f.label}
                        options={f.options || []}
                        value={(f.options || []).find((o) => String(o.value) === String(filters[f.key])) || null}
                        onChange={(o) => { setFilters((s) => ({ ...s, [f.key]: o ? o.value : '' })); setPage(1) }}
                    />
                ))}
            </div>
            {error && <div className="text-red-500">{error.message}</div>}
            <DataTable
                columns={columns}
                data={data?.list || []}
                noData={!isLoading && !(data?.list || []).length}
                loading={isLoading}
                pagingData={{ total: data?.total || 0, pageIndex: page, pageSize: size }}
                onPaginationChange={setPage}
                onSelectChange={(n) => { setSize(Number(n)); setPage(1) }}
                onSort={(s) => setSort({ key: s.key, order: s.order })}
            />
            <ConfirmDialog
                isOpen={Boolean(toDelete)}
                type="danger"
                title={`Delete ${resource.label}`}
                confirmButtonColor="red-600"
                onClose={() => setToDelete(null)}
                onRequestClose={() => setToDelete(null)}
                onCancel={() => setToDelete(null)}
                onConfirm={confirmDelete}
            >
                <p>This cannot be undone.</p>
            </ConfirmDialog>
        </div>
    )
}

export default ResourceList

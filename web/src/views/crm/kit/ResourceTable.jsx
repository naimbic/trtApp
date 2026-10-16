import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbSearch, TbArrowUp, TbArrowDown } from 'react-icons/tb'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import cn from '@/utils/classNames'
import { api, qs } from './api'
import { renderCell } from './format'
import { useAppSettings } from '@/store/appSettingsStore'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const SIZES = [10, 25, 50, 100, 200].map((n) => ({ value: n, label: `${n} / page` }))

/**
 * Server-side table for any CRM resource config (search, sort, filters, paging).
 * props: resource, where, columns, onRowClick, reloadKey, toolbar, rowActions(row), onData(data), emptyText, hideFilters (filter keys not to show)
 */
const ResourceTable = ({ resource, where = {}, columns, onRowClick, reloadKey = 0, toolbar, rowActions, onData, emptyText = tr("No records found"), hideFilters = [] }) => {
    const cols = useMemo(() => columns || resource.columns || [], [columns, resource])
    const [query, setQuery] = useState('')
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)
    const app = useAppSettings()
    const [pageSize, setPageSize] = useState(10)
    // the rows per page chosen in Settings → General become the starting size of every table
    useEffect(() => { const n = Number(app?.tables_pagination_limit); if (n >= 5 && n <= 200) setPageSize(n) }, [app?.tables_pagination_limit])
    const [sort, setSort] = useState(null)
    // Lists that have an Active/Inactive filter open on "Active" by default.
    const defaultFilters = () => ((resource.filters || []).some((f) => f.key === 'active') ? { active: 'true' } : {})
    const [filters, setFilters] = useState(defaultFilters)
    useEffect(() => { setFilters(defaultFilters()); setPage(1) }, [resource.key]) // eslint-disable-line react-hooks/exhaustive-deps
    const [data, setData] = useState({ list: [], total: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const t = setTimeout(() => { setQ(query.trim()); setPage(1) }, 300)
        return () => clearTimeout(t)
    }, [query])

    const whereKey = JSON.stringify(where)
    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = { query: q, pageIndex: page, pageSize, sortKey: sort?.key, order: sort?.order, ...filters }
            for (const [k, v] of Object.entries(JSON.parse(whereKey))) params[`where.${k}`] = v
            const d = await api(`/api/crm/${resource.key}?${qs(params)}`)
            setData(d)
            setError('')
            onData?.(d)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resource.key, q, page, pageSize, sort, filters, whereKey, reloadKey])
    useEffect(() => { load() }, [load])

    const toggleSort = (c) => {
        if (c.type === 'relation') return
        setSort((s) => (s?.key === c.key ? (s.order === 'asc' ? { key: c.key, order: 'desc' } : null) : { key: c.key, order: 'asc' }))
    }

    return (
        <div>
            {/* one row: search, filters (they shrink to fit) and the action button */}
            <div className="mb-4 flex items-center gap-2">
                <div className="w-52 shrink-0">
                    <Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search {v1}", { v1: resource.plural?.toLowerCase() || '' })} value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                {(resource.filters || []).filter((f) => !hideFilters.includes(f.key)).map((f) => (
                    <div key={f.key} className="min-w-[7rem] max-w-[11rem] flex-1">
                        <Select
                            size="sm"
                            isClearable
                            placeholder={f.label}
                            options={f.options || []}
                            value={(f.options || []).find((o) => String(o.value) === String(filters[f.key])) || null}
                            onChange={(o) => { setFilters((s) => ({ ...s, [f.key]: o ? o.value : undefined })); setPage(1) }}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={{ menuPortal: (b) => ({ ...b, zIndex: 10000 }) }}
                        />
                    </div>
                ))}
                <div className="ml-auto flex shrink-0 items-center gap-2">{toolbar}</div>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}

            <div className="overflow-x-auto">
                <Table hoverable={!!onRowClick}>
                    <THead>
                        <Tr>
                            {cols.map((c) => (
                                <Th key={c.key} className={cn(c.type !== 'relation' && 'cursor-pointer select-none', ['money', 'number'].includes(c.type) && 'text-right')} onClick={() => toggleSort(c)}>
                                    <span className="inline-flex items-center gap-1">
                                        {c.label}
                                        {sort?.key === c.key && (sort.order === 'asc' ? <TbArrowUp /> : <TbArrowDown />)}
                                    </span>
                                </Th>
                            ))}
                            {rowActions && <Th className="text-right">{tr("Actions")}</Th>}
                        </Tr>
                    </THead>
                    <TBody>
                        {data.list.map((row) => (
                            <Tr key={row.id} className={cn(onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(row)}>
                                {cols.map((c) => (
                                    <Td key={c.key} className={cn(['money', 'number'].includes(c.type) && 'text-right', c.link && 'font-semibold heading-text')}>{c.render ? c.render(row) : renderCell(c, row, resource)}</Td>
                                ))}
                                {rowActions && <Td className="text-right" onClick={(e) => e.stopPropagation()}>{rowActions(row)}</Td>}
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{emptyText}</div>}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-gray-500">{data.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, data.total), total: data.total }) : ''}</span>
                <div className="flex items-center gap-3">
                    <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                    <div className="w-32">
                        <Select size="sm" isSearchable={false} options={SIZES} value={SIZES.find((s) => s.value === pageSize)} onChange={(o) => { setPageSize(o.value); setPage(1) }} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ResourceTable

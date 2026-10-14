import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch } from 'react-icons/tb'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Pagination from '@/components/ui/Pagination'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import cn from '@/utils/classNames'
import { api, qs } from '../kit/api'
import { usePageRange } from '@/store/pageFilterStore'
import NewTicketDialog from './NewTicketDialog'

dayjs.extend(relativeTime)
const { Tr, Th, Td, THead, TBody } = Table

export const StatusDot = ({ s }) => s ? <span className="inline-flex items-center gap-2 whitespace-nowrap"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span> : null
const PRIORITY = { low: 'text-gray-500', medium: 'text-blue-600', high: 'text-orange-600' }

const TicketsList = () => {
    const nav = useNavigate()
    const [data, setData] = useState({ list: [], total: 0, counts: {}, statuses: [], priorities: [], departments: [], staff: [], can: {} })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [statusId, setStatusId] = useState(null)
    const [priorityId, setPriorityId] = useState(null)
    const [departmentId, setDepartmentId] = useState(null)
    const [assignedId, setAssignedId] = useState(null)
    const [open, setOpen] = useState(true)
    const [mine, setMine] = useState(false)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [dialog, setDialog] = useState(false)
    const pageSize = 20
    const [range] = usePageRange('tickets')

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/support/tickets?${qs({ query, statusId: statusId || '', priorityId: priorityId || '', departmentId: departmentId || '', assignedId: assignedId || '', open: open && !statusId ? '1' : '', mine: mine ? '1' : '', from: range[0] ? dayjs(range[0]).format('YYYY-MM-DD') : '', to: range[1] ? dayjs(range[1]).format('YYYY-MM-DD') : '', pageIndex: page, pageSize })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, statusId, priorityId, departmentId, assignedId, open, mine, page, range])
    useEffect(() => { load() }, [load])

    const opt = (list) => list.map((x) => ({ value: x.id, label: x.name }))
    const sel = (list, v) => opt(list).find((o) => o.value === v) || null

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>Tickets</h3><p className="text-sm text-gray-500">{data.total} ticket{data.total === 1 ? '' : 's'}</p></div>
                {data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => setDialog(true)}>New ticket</Button>}
            </div>

            <div className="mb-4 flex flex-wrap gap-3">
                {data.statuses.map((s) => (
                    <button key={s.id} onClick={() => { setStatusId(statusId === s.id ? null : s.id); setPage(1) }} className={cn('rounded-xl border bg-white px-4 py-2 text-left transition dark:bg-gray-800', statusId === s.id ? 'border-primary shadow' : 'border-gray-200 hover:shadow dark:border-gray-700')}>
                        <div className="text-xl font-bold heading-text">{data.counts[s.id] ?? 0}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</div>
                    </button>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder="Search subject, #number, email" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-44"><Select size="sm" isClearable placeholder="Any priority" options={opt(data.priorities)} value={sel(data.priorities, priorityId)} onChange={(o) => { setPriorityId(o?.value || null); setPage(1) }} /></div>
                <div className="w-52"><Select size="sm" isClearable placeholder="Any department" options={opt(data.departments)} value={sel(data.departments, departmentId)} onChange={(o) => { setDepartmentId(o?.value || null); setPage(1) }} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder="Anyone" options={opt(data.staff)} value={sel(data.staff, assignedId)} onChange={(o) => { setAssignedId(o?.value || null); setMine(false); setPage(1) }} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={mine} onChange={(c) => { setMine(c); if (c) setAssignedId(null); setPage(1) }} />Mine</label>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={open && !statusId} disabled={!!statusId} onChange={(c) => { setOpen(c); setPage(1) }} />Hide closed</label>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table>
                    <THead><Tr><Th>#</Th><Th>Subject</Th><Th>Client</Th><Th>Department</Th><Th>Status</Th><Th>Priority</Th><Th>Assigned</Th><Th>Last reply</Th></Tr></THead>
                    <TBody>
                        {data.list.map((t) => (
                            <Tr key={t.id} className="cursor-pointer" onClick={() => nav(`/crm/tickets/${t.id}`)}>
                                <Td className="text-gray-500">{t.number}</Td>
                                <Td className="max-w-[360px]"><div className={cn('truncate', t.unread ? 'font-bold' : 'font-semibold')}>{t.subject}</div>{t.replies > 0 && <div className="text-xs text-gray-400">{t.replies} repl{t.replies === 1 ? 'y' : 'ies'}</div>}</Td>
                                <Td><div className="max-w-[200px] truncate">{t.client?.name || t.contact || '—'}</div>{t.client && t.contact && <div className="text-xs text-gray-400">{t.contact}</div>}</Td>
                                <Td>{t.department || '—'}</Td>
                                <Td><StatusDot s={t.status} /></Td>
                                <Td className={PRIORITY[(t.priority || '').toLowerCase()] || ''}>{t.priority || '—'}</Td>
                                <Td>{t.assigned?.name || '—'}</Td>
                                <Td className="whitespace-nowrap text-gray-500" title={t.lastReply ? dayjs(t.lastReply).format('DD MMM YYYY HH:mm') : ''}>{t.lastReply ? dayjs(t.lastReply).fromNow() : 'No reply'}</Td>
                            </Tr>
                        ))}
                        {!loading && !data.list.length && <Tr><Td colSpan={8} className="py-10 text-center text-gray-500">No tickets match</Td></Tr>}
                    </TBody>
                </Table>
            </div>
            {data.total > pageSize && <div className="mt-4 flex justify-end"><Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} /></div>}
            <NewTicketDialog open={dialog} onClose={() => setDialog(false)} lookups={data} onCreated={(id) => nav(`/crm/tickets/${id}`)} />
        </Container>
    )
}

export default TicketsList

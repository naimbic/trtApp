import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { TbPlus, TbSearch, TbWorld, TbMessage } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Pagination from '@/components/ui/Pagination'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import cn from '@/utils/classNames'
import { api, qs } from '../kit/api'
import { People } from '../tasks/shared'
import { STATUS, PRIORITY, TYPE, PriorityTag, StatusTag, TypeLabel, Labels } from './shared'
import { NewIssueDialog, PlatformsDialog, opts, pick } from './IssueDialogs'
import { tr, trn } from '@/utils/t'

dayjs.extend(relativeTime)
const { Tr, Th, Td, THead, TBody } = Table
const portal = { menuPortalTarget: document.body, menuPosition: 'fixed', styles: { menuPortal: (b) => ({ ...b, zIndex: 10000 }) } }
const CHIPS = [['active', tr('Active')], ['all', tr('All')], ...STATUS.map((s) => [s.value, s.label])]

const IssuesList = () => {
    const nav = useNavigate()
    const [data, setData] = useState({ list: [], total: 0, counts: {}, can: {} })
    const [lookups, setLookups] = useState({ staff: [], platforms: [], labels: [], can: {} })
    const [status, setStatus] = useState('active')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [platform, setPlatform] = useState(null)
    const [priority, setPriority] = useState(null)
    const [type, setType] = useState(null)
    const [assignee, setAssignee] = useState(null)
    const [mine, setMine] = useState(false)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [dialog, setDialog] = useState(false)
    const [plats, setPlats] = useState(false)
    const pageSize = 20

    const loadLookups = useCallback(() => api('/api/crm/issues/lookups').then(setLookups).catch((e) => setError(e.message)), [])
    useEffect(() => { loadLookups() }, [loadLookups])
    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/issues?${qs({ status, query, platform: platform || '', priority: priority || '', type: type || '', assignee: assignee || '', mine: mine ? '1' : '', page, pageSize })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [status, query, platform, priority, type, assignee, mine, page])
    useEffect(() => { load() }, [load])

    const total = useMemo(() => Object.values(data.counts).reduce((n, x) => n + x, 0), [data.counts])
    const countOf = (k) => (k === 'all' ? total : k === 'active' ? (data.counts.open || 0) + (data.counts.in_progress || 0) + (data.counts.in_review || 0) : data.counts[k] || 0)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr('Issues')}</h3><p className="text-sm text-gray-500">{tr('Problems and requests to follow on our platforms and websites')}</p></div>
                <div className="flex gap-2">
                    <Button icon={<TbWorld />} onClick={() => setPlats(true)}>{tr('Platforms')}</Button>
                    {lookups.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => setDialog(true)}>{tr('New issue')}</Button>}
                </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {CHIPS.map(([k, label]) => (
                    <button key={k} type="button" onClick={() => { setStatus(k); setPage(1) }} className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold transition', status === k ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-primary dark:border-gray-600')}>
                        {label} <span className="ml-1 text-xs opacity-70">{countOf(k)}</span>
                    </button>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-72"><Input size="sm" value={search} prefix={<TbSearch className="text-lg" />} placeholder={tr('Search an issue or a number')} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-48"><Select size="sm" isClearable {...portal} placeholder={tr('Platform')} options={opts(lookups.platforms)} value={pick(lookups.platforms, platform)} onChange={(o) => { setPlatform(o?.value || null); setPage(1) }} /></div>
                <div className="w-36"><Select size="sm" isClearable isSearchable={false} {...portal} placeholder={tr('Priority')} options={opts(PRIORITY)} value={pick(PRIORITY, priority)} onChange={(o) => { setPriority(o?.value || null); setPage(1) }} /></div>
                <div className="w-40"><Select size="sm" isClearable isSearchable={false} {...portal} placeholder={tr('Type')} options={opts(TYPE)} value={pick(TYPE, type)} onChange={(o) => { setType(o?.value || null); setPage(1) }} /></div>
                <div className="w-48"><Select size="sm" isClearable {...portal} placeholder={tr('Assigned to')} options={opts(lookups.staff)} value={pick(lookups.staff, assignee)} onChange={(o) => { setAssignee(o?.value || null); setPage(1) }} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={mine} onChange={(c) => { setMine(c); setPage(1) }} />{tr('Mine')}</label>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table>
                    <THead><Tr><Th className="w-16">#</Th><Th>{tr('Issue')}</Th><Th>{tr('Platform')}</Th><Th>{tr('Type')}</Th><Th>{tr('Priority')}</Th><Th>{tr('Status')}</Th><Th>{tr('Assigned to')}</Th><Th>{tr('Updated')}</Th></Tr></THead>
                    <TBody>
                        {data.list.map((i) => (
                            <Tr key={i.id} className="cursor-pointer" onClick={() => nav(`/crm/issues/${i.id}`)}>
                                <Td className="font-mono text-gray-500">#{i.number}</Td>
                                <Td className="max-w-[420px]"><div className="truncate font-semibold heading-text">{i.title}</div><div className="mt-0.5 flex items-center gap-2"><Labels list={i.labels} />{i.comments > 0 && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><TbMessage />{i.comments}</span>}</div></Td>
                                <Td>{i.platform ? <span className="whitespace-nowrap">{i.platform.name}</span> : <span className="text-gray-300">—</span>}</Td>
                                <Td><TypeLabel type={i.type} /></Td>
                                <Td><PriorityTag priority={i.priority} /></Td>
                                <Td><StatusTag status={i.status} /></Td>
                                <Td>{i.assignees.length ? <People list={i.assignees} /> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="whitespace-nowrap text-xs text-gray-500" title={dayjs(i.updatedAt).format('YYYY-MM-DD HH:mm')}>{dayjs(i.updatedAt).fromNow()}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
                {!loading && !data.list.length && <div className="py-12 text-center text-gray-400">{tr('No issue matches')}</div>}
            </div>
            {data.total > pageSize && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-gray-500">{trn(data.total, 'issue')}</span><Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} /></div>}

            <NewIssueDialog open={dialog} lookups={lookups} onClose={() => setDialog(false)} onCreated={(r) => { setDialog(false); nav(`/crm/issues/${r.id}`) }} />
            <PlatformsDialog open={plats} lookups={lookups} onClose={() => setPlats(false)} onChanged={loadLookups} />
        </Container>
    )
}

export default IssuesList

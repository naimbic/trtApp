/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbActivity, TbUsers, TbBuilding, TbExternalLink } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Pagination from '@/components/ui/Pagination'
import cn from '@/utils/classNames'
import { api } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { TYPES, GROUPS, local } from './ActivityPage'
import { tr } from '@/utils/t'

const PAGE = 24
const RANGES = { today: 0, week: 6, month: 29 }

/** Super admin: everything that happened in the CRM, by day, filtered by team member and client. */
const AllActivity = () => {
    const navigate = useNavigate()
    const [range, setRange] = useState('week')
    const [staffId, setStaffId] = useState('')
    const [clientId, setClientId] = useState('')
    const [on, setOn] = useState(GROUPS.map((g) => g[0]))
    const [data, setData] = useState(null)
    const [page, setPage] = useState(1)
    const [busy, setBusy] = useState(true)
    const [error, setError] = useState('')

    const types = useMemo(() => (on.length === GROUPS.length ? '' : GROUPS.filter((g) => on.includes(g[0])).flatMap((g) => g[2]).join(',') || 'none'), [on])
    const load = useCallback(async () => {
        setBusy(true)
        try {
            const q = new URLSearchParams({ from: dayjs().subtract(RANGES[range], 'day').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD'), ...(staffId ? { staffId } : {}), ...(clientId ? { clientId } : {}), ...(types ? { types } : {}) })
            setData(await api(`/api/crm/activity/all?${q}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setBusy(false) }
    }, [range, staffId, clientId, types])
    useEffect(() => { load() }, [load])
    useEffect(() => { setPage(1) }, [range, staffId, clientId, types])

    const events = useMemo(() => data?.events || [], [data])
    const shown = useMemo(() => events.slice((page - 1) * PAGE, page * PAGE), [events, page])
    const days = useMemo(() => {
        const out = []
        shown.forEach((e) => { const d = dayjs(e.date).format('YYYY-MM-DD'); if (out[out.length - 1]?.d !== d) out.push({ d, list: [] }); out[out.length - 1].list.push(e) })
        return out
    }, [shown])
    const counts = data?.counts || {}
    const groupCount = (g) => g[2].reduce((n, t) => n + (counts[t] || 0), 0)
    const staffOptions = (data?.staff || []).map((m) => ({ value: m.id, label: m.name }))
    const clientOptions = (data?.clients || []).map((c) => ({ value: c.id, label: c.name }))
    const people = new Set(events.map((e) => e.who?.id).filter(Boolean)).size

    return (
        <Container>
            <InvoiceHead
                title={tr('All activity')}
                stats={[
                    { icon: <TbActivity />, label: tr('Events in this period'), value: String(data?.total ?? '–') },
                    { icon: <TbUsers />, label: tr('Team members involved'), value: String(data ? people : '–') },
                    { icon: <TbBuilding />, label: tr('Clients involved'), value: String(data ? data.clients.length : '–') },
                ]}
            />
            <div className="cx-tools">
                <Segment size="sm" value={range} onChange={(v) => v && setRange(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="today">{tr('Today')}</Segment.Item><Segment.Item value="week">{tr('7 days')}</Segment.Item><Segment.Item value="month">{tr('30 days')}</Segment.Item>
                </Segment>
                <div className="w-48"><Select size="sm" isClearable placeholder={tr('All team members')} options={staffOptions} value={staffOptions.find((o) => o.value === staffId) || null} onChange={(o) => setStaffId(o?.value || '')} /></div>
                <div className="w-48"><Select size="sm" isClearable placeholder={tr('All clients')} options={clientOptions} value={clientOptions.find((o) => o.value === clientId) || null} onChange={(o) => setClientId(o?.value || '')} /></div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
                {GROUPS.map((g) => {
                    const active = on.includes(g[0])
                    return (
                        <button key={g[0]} type="button" onClick={() => setOn((cur) => (cur.includes(g[0]) ? cur.filter((x) => x !== g[0]) : [...cur, g[0]]))} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', 'text-gray-500 dark:text-gray-400', active ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-600')}>
                            {tr(g[1])} <span className="ml-1 opacity-70">{groupCount(g)}</span>
                        </button>
                    )
                })}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {days.map((day) => (
                <section key={day.d} className="mb-6">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h5 className="uppercase">{dayjs(day.d).format('dddd, DD MMMM YYYY')}</h5>
                        <span className="text-xs text-gray-400">{tr('{n} events', { n: day.list.length })}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {day.list.map((e) => {
                            const [icon, tone] = TYPES[e.type] || TYPES.system
                            return (
                                <div key={e.id} className="flex h-[148px] flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-start gap-3">
                                        <Avatar size={30} shape="circle" className={cn('shrink-0', tone)}>{icon}</Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="line-clamp-2 font-semibold leading-snug text-gray-900 dark:text-gray-100">{local(e.title)}</div>
                                            <div className="mt-0.5 line-clamp-1 text-sm text-gray-500">{e.detail ? local(e.detail) : ' '}</div>
                                        </div>
                                        <span className="shrink-0 text-xs text-gray-400">{dayjs(e.date).format('HH:mm')}</span>
                                    </div>
                                    <div className="mt-auto flex items-center gap-2 text-xs text-gray-500">
                                        <button type="button" className="inline-flex min-w-0 items-center gap-1.5 hover:text-primary" onClick={() => e.who?.id && setStaffId(e.who.id)}>
                                            <Avatar size={20} shape="circle" src={e.who?.image || undefined}>{e.who?.image ? null : (e.who?.name || '?').slice(0, 1).toUpperCase()}</Avatar>
                                            <span className="truncate">{e.who?.name || tr('Client or system')}</span>
                                        </button>
                                        {e.client?.name && <button type="button" className="inline-flex min-w-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 hover:text-primary dark:bg-gray-700" onClick={() => setClientId(e.client.id)}><TbBuilding className="shrink-0" /><span className="truncate">{e.client.name}</span></button>}
                                        <span className="flex-1" />
                                        {e.link && <button type="button" onClick={() => navigate(e.link)} className="shrink-0 text-lg text-gray-400 hover:text-primary" title={tr('Open')}><TbExternalLink /></button>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            ))}
            {!busy && !events.length && !error && <div className="py-10 text-center text-gray-400">{tr('No activity to show')}</div>}
            {events.length > PAGE && <div className="mt-2 flex justify-end"><Pagination total={events.length} pageSize={PAGE} currentPage={page} onChange={setPage} /></div>}
            {busy && !events.length && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
        </Container>
    )
}

export default AllActivity

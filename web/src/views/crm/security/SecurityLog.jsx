/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbShieldX, TbWorldOff, TbBolt, TbKeyOff, TbLock, TbMapPin } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Segment from '@/components/ui/Segment'
import Pagination from '@/components/ui/Pagination'
import cn from '@/utils/classNames'
import { api } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { tr } from '@/utils/t'

// kind: [icon, colour, title, what it means]
const KINDS = {
    cross_site: [<TbWorldOff key="i" />, 'bg-red-100 text-red-600 dark:bg-red-500/15', 'Request from another website', 'A page of another website tried to change something here; it was refused'],
    flood: [<TbBolt key="i" />, 'bg-amber-100 text-amber-600 dark:bg-amber-500/15', 'Too many requests', 'Someone who is not signed in sent too many requests; they were slowed down'],
    login_failed: [<TbKeyOff key="i" />, 'bg-sky-100 text-sky-600 dark:bg-sky-500/15', 'Wrong password', 'A sign-in with a wrong password or code'],
    login_locked: [<TbLock key="i" />, 'bg-purple-100 text-purple-600 dark:bg-purple-500/15', 'Account locked', 'Too many wrong passwords: sign-in is locked for 15 minutes'],
}
const ORDER = Object.keys(KINDS)

/** Administrators: what the server refused or found suspicious, by day. */
const SecurityLog = () => {
    const [days, setDays] = useState('7')
    const [kind, setKind] = useState('')
    const [page, setPage] = useState(1)
    const [data, setData] = useState(null)
    const [busy, setBusy] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setBusy(true)
        try {
            setData(await api(`/api/crm/security/events?${new URLSearchParams({ days, page: String(page), ...(kind ? { kind } : {}) })}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setBusy(false) }
    }, [days, kind, page])
    useEffect(() => { load() }, [load])
    useEffect(() => { setPage(1) }, [days, kind])

    const list = useMemo(() => data?.list || [], [data])
    const byDay = useMemo(() => {
        const out = []
        list.forEach((e) => { const d = dayjs(e.createdAt).format('YYYY-MM-DD'); if (out[out.length - 1]?.d !== d) out.push({ d, list: [] }); out[out.length - 1].list.push(e) })
        return out
    }, [list])
    const counts = data?.counts || {}
    const all = ORDER.reduce((n, k) => n + (counts[k] || 0), 0)

    return (
        <Container>
            <InvoiceHead
                title={tr('Security log')}
                stats={[
                    { icon: <TbShieldX />, label: tr('Events in this period'), value: String(data ? all : '–') },
                    { icon: <TbLock />, label: tr('Accounts locked'), value: String(data ? counts.login_locked || 0 : '–') },
                    { icon: <TbMapPin />, label: tr('Different addresses'), value: String(data ? data.addresses : '–') },
                ]}
            />
            <div className="cx-tools">
                <Segment size="sm" value={days} onChange={(v) => v && setDays(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="1">{tr('Today')}</Segment.Item><Segment.Item value="7">{tr('7 days')}</Segment.Item><Segment.Item value="30">{tr('30 days')}</Segment.Item>
                </Segment>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
                {['', ...ORDER].map((k) => (
                    <button key={k || 'all'} type="button" title={k ? tr(KINDS[k][3]) : undefined} onClick={() => setKind(k)} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', kind === k ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300')}>
                        {k ? tr(KINDS[k][2]) : tr('All')} <span className="ml-1 opacity-70">{k ? counts[k] || 0 : all}</span>
                    </button>
                ))}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="grid grid-cols-1 items-start gap-x-5 lg:grid-cols-2">
                {byDay.map((day) => (
                    <section key={day.d} className="mb-5 min-w-0">
                        <div className="mb-2 font-semibold uppercase text-gray-900 dark:text-gray-100">{dayjs(day.d).format('dddd, DD MMMM YYYY')}</div>
                        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                            {day.list.map((e) => {
                                const [icon, tone, title, hint] = KINDS[e.kind] || KINDS.flood
                                const what = [e.method && e.path ? `${e.method} ${e.path}` : '', e.detail || ''].filter(Boolean).join(' · ')
                                return (
                                    <div key={e.id} className="flex items-center gap-3 px-4 py-2.5" title={tr(hint)}>
                                        <span className="w-11 shrink-0 text-xs text-gray-400">{dayjs(e.createdAt).format('HH:mm')}</span>
                                        <Avatar size={26} shape="circle" className={cn('shrink-0', tone)}>{icon}</Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{tr(title)}</div>
                                            {what && <div className="truncate text-xs text-gray-500" dir="ltr">{what}</div>}
                                        </div>
                                        {e.ip && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs tabular-nums text-gray-500 dark:bg-gray-700" dir="ltr">{e.ip}</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </div>
            {!busy && !list.length && !error && <div className="py-10 text-center text-gray-400">{tr('Nothing suspicious in this period')}</div>}
            {busy && !list.length && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            {data && data.total > data.pageSize && <div className="mt-2 flex justify-end"><Pagination total={data.total} pageSize={data.pageSize} currentPage={page} onChange={setPage} /></div>}
        </Container>
    )
}

export default SecurityLog

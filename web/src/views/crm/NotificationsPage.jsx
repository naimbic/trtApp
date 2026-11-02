import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { PiBellRingingDuotone, PiCheckCircleDuotone } from 'react-icons/pi'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import classNames from '@/utils/classNames'
import { NotifRow, useOpenNotif } from '@/components/template/Notification/Notification'
import { kindLabel } from '@/components/template/Notification/notifKit'
import { useNotifs } from '@/store/notifStore'
import { tr } from '@/utils/t'

const day = (d) => { const n = dayjs().startOf('day').diff(dayjs(d).startOf('day'), 'day'); return n <= 0 ? tr('Today') : n === 1 ? tr('Yesterday') : n < 7 ? dayjs(d).format('dddd') : dayjs(d).format('DD MMM YYYY') }

/** Everything that needs the signed-in person's attention: unread first, by kind, grouped by day. Click an item to land on it. */
const NotificationsPage = () => {
    const { items, counts, loaded, load, setRead, markAll } = useNotifs()
    const [tab, setTab] = useState('unread')
    const [kind, setKind] = useState('')
    useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load() }, 60000); return () => clearInterval(t) }, [load])
    const open = useOpenNotif()
    const inTab = useMemo(() => items.filter((i) => (tab === 'unread' ? !i.read : tab === 'read' ? i.read : true)), [items, tab])
    const kinds = useMemo(() => { const m = {}; for (const i of inTab) m[i.kind] = (m[i.kind] || 0) + 1; return m }, [inTab])
    const shown = inTab.filter((i) => !kind || i.kind === kind)
    const groups = useMemo(() => { const g = []; for (const i of shown) { const k = day(i.date); const last = g[g.length - 1]; if (last && last.k === k) last.list.push(i); else g.push({ k, list: [i] }) } return g }, [shown])
    const readCount = items.length - counts.unread
    const tabs = [['unread', tr('Unread'), counts.unread], ['read', tr('Read'), readCount], ['all', tr('All'), items.length]]
    useEffect(() => { if (kind && !kinds[kind]) setKind('') }, [kinds, kind])

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr('Notifications')}</h3><p className="text-sm text-gray-500">{loaded ? (counts.unread ? tr('{n} new', { n: counts.unread }) : tr('You are all caught up')) : ''}</p></div>
                <Button size="sm" icon={<PiCheckCircleDuotone />} disabled={!counts.unread} onClick={markAll}>{tr('Mark all as read')}</Button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                    {tabs.map(([k, label, n]) => <button key={k} type="button" onClick={() => setTab(k)} className={classNames('rounded-lg px-3 py-1 font-semibold transition', tab === k ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700')}>{label}<span className="ms-1.5 text-xs opacity-80">{n}</span></button>)}
                </div>
                {Object.keys(kinds).length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        {['', ...Object.keys(kinds)].map((k) => <button key={k || 'all'} type="button" onClick={() => setKind(k)} className={classNames('rounded-full px-2.5 py-1 text-xs font-semibold transition', kind === k ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300')}>{k ? kindLabel(k) : tr('All kinds')}{k && <span className="ms-1 opacity-70">{kinds[k]}</span>}</button>)}
                    </div>
                )}
                {tab === 'unread' && shown.length > 0 && kind && <Button size="xs" className="ms-auto" onClick={() => setRead(shown.map((i) => i.id), true)}>{tr('Mark these as read')}</Button>}
            </div>
            {!loaded && <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}</div>}
            {loaded && (
                <Card bodyClass="p-2">
                    {groups.length ? groups.map((g) => (
                        <div key={g.k}>
                            <div className="px-3 pb-0.5 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{g.k}</div>
                            {g.list.map((i) => <NotifRow key={i.id} i={i} onOpen={open} onToggle={(x) => setRead([x.id], !x.read)} />)}
                        </div>
                    )) : (
                        <div className="py-14 text-center"><PiBellRingingDuotone className="mx-auto mb-2 text-6xl text-gray-300" /><h6 className="font-semibold">{tab === 'unread' ? tr('You are all caught up') : tr('Nothing here')}</h6><p className="mt-1 text-sm text-gray-500">{tr('New tickets, tasks, payments and answers show up here.')}</p></div>
                    )}
                </Card>
            )}
        </Container>
    )
}

export default NotificationsPage

import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { PiBellRingingDuotone, PiCheckCircleDuotone } from 'react-icons/pi'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { NotifRow, NotifFilters, useOpenNotif } from '@/components/template/Notification/Notification'
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
    useEffect(() => { if (kind && !kinds[kind]) setKind('') }, [kinds, kind])

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr('Notifications')}</h3><p className="text-sm text-gray-500">{loaded ? (counts.unread ? tr('{n} new', { n: counts.unread }) : tr('You are all caught up')) : ''}</p></div>
                <Button size="sm" icon={<PiCheckCircleDuotone />} disabled={!counts.unread} onClick={markAll}>{tr('Mark all as read')}</Button>
            </div>
            <div className="mb-3 flex items-center gap-2">
                <NotifFilters tab={tab} setTab={setTab} kind={kind} setKind={setKind} counts={{ unread: counts.unread }} kinds={kinds} className="min-w-0 flex-1" />
                {tab === 'unread' && shown.length > 0 && kind && <Button size="xs" className="mb-1 shrink-0" onClick={() => setRead(shown.map((i) => i.id), true)}>{tr('Mark these as read')}</Button>}
            </div>
            {!loaded && <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}</div>}
            {loaded && (
                <Card bodyClass="p-2.5">
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

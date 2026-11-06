import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { PiBellRingingDuotone, PiCheckCircleDuotone } from 'react-icons/pi'
import { TbArrowBackUp, TbArrowUpRight, TbCheck, TbMailOpened, TbMail, TbSend } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Tooltip from '@/components/ui/Tooltip'
import RemindMenu from '@/components/template/Notification/RemindMenu'
import { NotifFilters, useOpenNotif } from '@/components/template/Notification/Notification'
import { look, kindLabel, recordLabel, replyTarget } from '@/components/template/Notification/notifKit'
import { useNotifs } from '@/store/notifStore'
import { api, notify } from './kit/api'
import { tr } from '@/utils/t'

const day = (d) => { const n = dayjs().startOf('day').diff(dayjs(d).startOf('day'), 'day'); return n <= 0 ? tr('Today') : n === 1 ? tr('Yesterday') : n < 7 ? dayjs(d).format('dddd') : dayjs(d).format('DD MMM YYYY') }
const box = 'h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'
const PRESETS = [['today', 'Today', 0], ['5', 'Last 5 days', 4], ['14', '14 days', 13], ['30', '30 days', 29]]

/** One notification as a card: what happened, the detail, who and about what, when; read, remind and answer without opening it. */
const Card1 = ({ i, onOpen, onToggle }) => {
    const [Icon, cls] = look(i)
    const [reply, setReply] = useState(null) // text being written
    const [busy, setBusy] = useState(false)
    const [internal, setInternal] = useState(false)
    const target = replyTarget(i.link)
    const record = recordLabel(i.link)
    const send = async () => {
        if (!reply.trim()) return
        setBusy(true)
        try {
            if (target.type === 'task') await api(`/api/crm/work/tasks/${target.id}/comments`, { method: 'POST', body: { content: reply.trim() } })
            else if (target.type === 'ticket') await api(`/api/crm/support/tickets/${target.id}/reply`, { method: 'POST', body: { message: reply.trim(), internal } })
            else await api(`/api/crm/pipeline/leads/${target.id}/notes`, { method: 'POST', body: { content: reply.trim() } })
            notify('success', target.type === 'ticket' ? (internal ? tr('Note added') : tr('Reply sent to the client')) : tr('Comment sent')); setReply(null); if (!i.read) onToggle(i)
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const act = 'grid size-8 place-items-center rounded-lg text-lg text-gray-500 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700'
    return (
        <div className={`my-1 rounded-xl border px-3 py-2.5 transition ${i.read ? 'border-transparent bg-transparent' : 'border-primary/20 bg-primary/[0.04]'} hover:border-gray-200 dark:hover:border-gray-600`}>
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1 sm:flex-nowrap">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl ${cls}`}><Icon /></span>
                <button type="button" onClick={() => onOpen(i)} className="min-w-0 flex-1 basis-0 text-start">
                    <div className={`text-sm leading-snug ${i.read ? 'font-medium text-gray-600 dark:text-gray-300' : 'font-bold heading-text'}`}>{!i.read && <span className="me-1.5 inline-block size-2 rounded-full bg-primary align-middle" />}{tr(i.title)}</div>
                    {i.detail && <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-gray-500">{i.detail}</div>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{kindLabel(i.kind)}</span>
                        {record && <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{record}</span>}
                        {i.from && <span>{tr('from')} <b className="font-semibold text-gray-500">{i.from}</b></span>}
                        <span title={dayjs(i.date).format('dddd D MMMM YYYY, HH:mm')}>{dayjs(i.date).format('ddd D MMM, HH:mm')} · {dayjs(i.date).fromNow()}</span>
                    </div>
                </button>
                <div className="flex w-full shrink-0 items-center gap-0.5 ps-12 sm:w-auto sm:ps-0">
                    <Tooltip title={i.read ? tr('Mark as unread') : tr('Mark as read')}><button type="button" aria-label={i.read ? tr('Mark as unread') : tr('Mark as read')} className={act} onClick={() => onToggle(i)}>{i.read ? <TbMail /> : <TbMailOpened />}</button></Tooltip>
                    <RemindMenu i={i} className={act} />
                    {target && <Tooltip title={tr('Reply')}><button type="button" aria-label={tr('Reply')} className={act} onClick={() => setReply((r) => (r === null ? '' : null))}><TbArrowBackUp /></button></Tooltip>}
                    {i.link && <Tooltip title={tr('Open')}><button type="button" aria-label={tr('Open')} className={act} onClick={() => onOpen(i)}><TbArrowUpRight /></button></Tooltip>}
                </div>
            </div>
            {reply !== null && (
                <div className="mt-2 flex items-end gap-2 ps-12">
                    <textarea autoFocus rows={2} className="min-h-[56px] flex-1 rounded-lg border border-gray-200 bg-white p-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800" placeholder={target.type === 'task' ? tr('Write a comment on the task…') : target.type === 'ticket' ? (internal ? tr('Write a note for the team…') : tr('Write a reply to the client…')) : tr('Write a note on the lead…')} value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} />
                    <div className="flex flex-col items-end gap-1.5">{target.type === 'ticket' && <label className="flex items-center gap-1.5 text-xs text-gray-500"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />{tr('Internal note (the client does not see it)')}</label>}<Button size="sm" variant="solid" icon={<TbSend />} loading={busy} disabled={!reply.trim()} onClick={send}>{target.type === 'ticket' && !internal ? tr('Send to the client') : tr('Send')}</Button></div>
                </div>
            )}
        </div>
    )
}

/** Everything that needs the signed-in person's attention, newest first, the last 5 days by default (change the dates); read, remind or answer from the card. */
const NotificationsPage = () => {
    const { items, counts, loaded, load, setRead, markAll } = useNotifs()
    const [tab, setTab] = useState('all')
    const [kind, setKind] = useState('')
    const [preset, setPreset] = useState('5')
    const [from, setFrom] = useState(dayjs().subtract(4, 'day').format('YYYY-MM-DD'))
    const [to, setTo] = useState('')
    const days = from ? Math.ceil(dayjs().diff(dayjs(from), 'day', true)) + 1 : 180
    useEffect(() => { load(days); const t = setInterval(() => { if (!document.hidden) load(days) }, 60000); return () => clearInterval(t) }, [load, days])
    const open = useOpenNotif()
    const pick = ([k, , back]) => { setPreset(k); setFrom(dayjs().subtract(back, 'day').format('YYYY-MM-DD')); setTo('') }
    const inRange = useMemo(() => {
        const a = from ? +dayjs(from).startOf('day') : 0, b = to ? +dayjs(to).endOf('day') : Infinity
        return items.filter((i) => { const t = +new Date(i.date); return t >= a && t <= b }).sort((x, y) => +new Date(y.date) - +new Date(x.date))
    }, [items, from, to])
    const inTab = useMemo(() => inRange.filter((i) => (tab === 'unread' ? !i.read : tab === 'read' ? i.read : true)), [inRange, tab])
    const kinds = useMemo(() => { const m = {}; for (const i of inTab) m[i.kind] = (m[i.kind] || 0) + 1; return m }, [inTab])
    const shown = inTab.filter((i) => !kind || i.kind === kind)
    const unreadShown = shown.filter((i) => !i.read)
    const groups = useMemo(() => { const g = []; for (const i of shown) { const k = day(i.date); const last = g[g.length - 1]; if (last && last.k === k) last.list.push(i); else g.push({ k, list: [i] }) } return g }, [shown])
    useEffect(() => { if (kind && !kinds[kind]) setKind('') }, [kinds, kind])
    const chip = (on) => `rounded-full px-3 py-1 text-xs font-semibold transition ${on ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr('Notifications')}</h3><p className="text-sm text-gray-500">{loaded ? `${counts.unread ? tr('{n} new', { n: counts.unread }) : tr('You are all caught up')} · ${tr('{n} shown', { n: shown.length })}` : ''}</p></div>
                <div className="flex flex-wrap gap-2">
                    {unreadShown.length > 0 && <Button size="sm" icon={<TbCheck />} onClick={() => setRead(unreadShown.map((i) => i.id), true)}>{tr('Mark these as read')} ({unreadShown.length})</Button>}
                    <Button size="sm" icon={<PiCheckCircleDuotone />} disabled={!counts.unread} onClick={markAll}>{tr('Mark all as read')}</Button>
                </div>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                {PRESETS.map((p) => <button key={p[0]} type="button" className={chip(preset === p[0])} onClick={() => pick(p)}>{tr(p[1])}</button>)}
                <button type="button" className={chip(preset === 'all')} onClick={() => { setPreset('all'); setFrom(''); setTo('') }}>{tr('All dates')}</button>
                <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-600" />
                <input type="date" aria-label={tr('From')} className={box} value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPreset('custom') }} />
                <span className="text-gray-400">→</span>
                <input type="date" aria-label={tr('To')} className={box} value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPreset('custom') }} />
            </div>
            <div className="mb-3"><NotifFilters tab={tab} setTab={setTab} kind={kind} setKind={setKind} counts={{ unread: unreadShown.length }} kinds={kinds} className="min-w-0" /></div>
            {!loaded && <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} />)}</div>}
            {loaded && (
                <Card bodyClass="p-2.5">
                    {groups.length ? groups.map((g) => (
                        <div key={g.k}>
                            <div className="px-3 pb-0.5 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{g.k}</div>
                            {g.list.map((i) => <Card1 key={i.id} i={i} onOpen={open} onToggle={(x) => setRead([x.id], !x.read)} />)}
                        </div>
                    )) : (
                        <div className="py-14 text-center"><PiBellRingingDuotone className="mx-auto mb-2 text-6xl text-gray-300" /><h6 className="font-semibold">{tab === 'unread' ? tr('You are all caught up') : tr('Nothing here for these dates')}</h6></div>
                    )}
                </Card>
            )}
        </Container>
    )
}

export default NotificationsPage

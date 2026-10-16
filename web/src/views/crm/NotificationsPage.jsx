import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PiBellRingingDuotone } from 'react-icons/pi'
import { HiOutlineMailOpen } from 'react-icons/hi'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import classNames from '@/utils/classNames'
import { useSessionUser } from '@/store/authStore'
import { KIND, TONE } from '@/components/template/Notification/Notification'
import { api } from './kit/api'
import { tr } from '@/utils/t'

dayjs.extend(relativeTime)
const KIND_LABEL = () => ({ ticket: tr('Tickets'), task: tr('Tasks'), reminder: tr('Reminders'), payment: tr('Payments'), invoice: tr('Invoices'), estimate: tr('Estimates'), proposal: tr('Proposals'), lead: tr('Leads'), view: tr('Views') })

/** Everything that needs the signed-in person's attention, the full list behind the bell. */
const NotificationsPage = () => {
    const nav = useNavigate()
    const uid = useSessionUser((s) => s.user.userId || s.user.email || 'me')
    const storeKey = `notif.seen.${uid}`
    const [items, setItems] = useState(null)
    const [error, setError] = useState('')
    const [kind, setKind] = useState('')
    const [seen, setSeen] = useState(() => { try { return Number(localStorage.getItem(storeKey)) || 0 } catch { return 0 } })
    const load = useCallback(() => api('/api/crm/notifications').then((r) => { setItems(r.items || []); setError('') }).catch((e) => setError(e.message)), [])
    useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load() }, 60000); return () => clearInterval(t) }, [load])

    const markAll = () => { const now = Date.now(); setSeen(now); try { localStorage.setItem(storeKey, String(now)) } catch { /* private mode */ } window.dispatchEvent(new Event('notif-seen')) }
    const kinds = [...new Set((items || []).map((i) => i.kind))]
    const shown = (items || []).filter((i) => !kind || i.kind === kind)
    const unread = (items || []).filter((i) => +new Date(i.date) > seen).length

    return (
        <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr('Notifications')}</h3><p className="text-gray-500">{items ? (unread ? tr('{n} new', { n: unread }) : tr('You are all caught up')) : ''}</p></div>
                <Button size="sm" icon={<HiOutlineMailOpen />} disabled={!unread} onClick={markAll}>{tr('Mark all as read')}</Button>
            </div>
            {kinds.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {['', ...kinds].map((k) => <button key={k || 'all'} type="button" onClick={() => setKind(k)} className={classNames('rounded-full px-3 py-1 text-sm font-semibold transition', kind === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300')}>{k ? KIND_LABEL()[k] || k : tr('All')}</button>)}
                </div>
            )}
            {error && !items && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}
            {!items && !error && <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={68} />)}</div>}
            {items && (
                <Card bodyClass="p-2">
                    {shown.length ? shown.map((i, idx) => {
                        const [Icon, cls] = KIND[i.kind] || [PiBellRingingDuotone, 'bg-gray-100 text-gray-600']
                        const isNew = +new Date(i.date) > seen
                        return (
                            <div key={i.id}>
                                <div role={i.link ? 'button' : undefined} onClick={() => i.link && nav(i.link)} className={classNames('flex items-center gap-3 rounded-xl px-4 py-3', i.link && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700')}>
                                    <span className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl', TONE[i.tone] && i.kind !== 'ticket' && i.kind !== 'reminder' ? TONE[i.tone] : cls)}><Icon /></span>
                                    <div className="min-w-0 flex-1">
                                        <div className={classNames('text-sm leading-snug', isNew ? 'font-bold heading-text' : 'font-semibold')}>{tr(i.title)}</div>
                                        {i.detail && <div className="truncate text-xs text-gray-500">{i.detail}</div>}
                                    </div>
                                    <div className="shrink-0 text-end text-xs text-gray-400">{dayjs(i.date).fromNow()}{isNew && <span className="ms-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}</div>
                                </div>
                                {idx < shown.length - 1 && <div className="mx-4 border-b border-gray-100 dark:border-gray-700" />}
                            </div>
                        )
                    }) : (
                        <div className="py-16 text-center"><PiBellRingingDuotone className="mx-auto mb-2 text-6xl text-gray-300" /><h6 className="font-semibold">{tr('You are all caught up')}</h6><p className="mt-1 text-sm text-gray-500">{tr('New tickets, tasks, payments and answers show up here.')}</p></div>
                    )}
                </Card>
            )}
        </Container>
    )
}

export default NotificationsPage

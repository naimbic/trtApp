import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PiBellRingingDuotone, PiCheckCircleDuotone, PiEnvelopeSimpleOpenDuotone, PiEnvelopeSimpleDuotone, PiCheckBold } from 'react-icons/pi'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Dropdown from '@/components/ui/Dropdown'
import ScrollBar from '@/components/ui/ScrollBar'
import useResponsive from '@/utils/hooks/useResponsive'
import { useNotifs } from '@/store/notifStore'
import NotificationToggle from './NotificationToggle'
import { look, kindLabel } from './notifKit'
import { tr } from '@/utils/t'

dayjs.extend(relativeTime)
export { KIND, TONE } from './notifKit'
const POLL = 60000

/** One compact line: icon, what happened, about what, when. Click opens the item (and reads it). */
export const NotifRow = ({ i, onOpen, onToggle }) => {
    const [Icon, cls] = look(i)
    return (
        <div role="button" tabIndex={0} onClick={() => onOpen(i)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(i) }} className="group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className={classNames('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg', cls)}><Icon /></span>
            <div className="min-w-0 flex-1">
                <div className={classNames('truncate text-[13px] leading-tight', i.read ? 'font-medium text-gray-600 dark:text-gray-300' : 'font-bold heading-text')}>{tr(i.title)}</div>
                <div className="flex items-center gap-1.5 text-[11px] leading-tight text-gray-400"><span className="min-w-0 flex-1 truncate">{i.detail}</span><span className="shrink-0">{dayjs(i.date).fromNow(true)}</span></div>
            </div>
            <button type="button" title={i.read ? tr('Mark as unread') : tr('Mark as read')} aria-label={i.read ? tr('Mark as unread') : tr('Mark as read')} onClick={(e) => { e.stopPropagation(); onToggle(i) }} className="hidden size-6 shrink-0 place-items-center rounded-full text-base text-gray-400 hover:bg-white hover:text-primary group-hover:grid dark:hover:bg-gray-600">{i.read ? <PiEnvelopeSimpleDuotone /> : <PiEnvelopeSimpleOpenDuotone />}</button>
            {!i.read && <span className="size-2 shrink-0 rounded-full bg-primary group-hover:hidden" />}
        </div>
    )
}

/** What a click on a notification does: it is read, then you land on the task, lead, ticket, chat... it is about. */
export const useOpenNotif = (after) => {
    const navigate = useNavigate()
    const setRead = useNotifs((s) => s.setRead)
    return (i) => { if (!i.read) setRead([i.id], true); after?.(); if (i.link) navigate(i.link) }
}

const _Notification = ({ className }) => {
    const { larger } = useResponsive()
    const { items, counts, loaded, load, setRead, markAll } = useNotifs()
    const [tab, setTab] = useState('unread')
    const [kind, setKind] = useState('')
    const ref = useRef(null)
    useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load() }, POLL); return () => clearInterval(t) }, [load])
    const open = useOpenNotif(() => ref.current?.handleDropdownClose?.())
    const inTab = tab === 'unread' ? items.filter((i) => !i.read) : tab === 'read' ? items.filter((i) => i.read) : items
    const kinds = {}
    for (const i of inTab) kinds[i.kind] = (kinds[i.kind] || 0) + 1
    const shown = inTab.filter((i) => !kind || i.kind === kind).slice(0, 30)

    return (
        <Dropdown ref={ref} renderTitle={<NotificationToggle dot={counts.unread > 0} className={className} />} menuClass="min-w-[310px] md:min-w-[400px]" placement={larger.md ? 'bottom-end' : 'bottom'} onOpen={() => { setTab('unread'); setKind(''); load() }}>
            <Dropdown.Item variant="header">
                <div className="flex items-center gap-1 px-1.5 pb-1">
                    {[['unread', tr('Unread'), counts.unread], ['read', tr('Read'), null], ['all', tr('All'), null]].map(([k, label, n]) => (
                        <button key={k} type="button" onClick={(e) => { e.stopPropagation(); setTab(k); setKind('') }} className={classNames('rounded-full px-3 py-1 text-xs font-semibold transition', tab === k ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}>{label}{n ? <span className="ms-1.5 opacity-80">{n}</span> : null}</button>
                    ))}
                    <span className="flex-1" />
                    <button type="button" title={tr('Mark all as read')} aria-label={tr('Mark all as read')} disabled={!counts.unread} onClick={(e) => { e.stopPropagation(); markAll() }} className="grid size-7 place-items-center rounded-full text-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"><PiCheckCircleDuotone /></button>
                </div>
            </Dropdown.Item>
            {Object.keys(kinds).length > 1 && (
                <div className="flex flex-wrap gap-1 px-3 pb-1.5" onClick={(e) => e.stopPropagation()}>
                    {['', ...Object.keys(kinds)].map((k) => <button key={k || 'all'} type="button" onClick={() => setKind(k)} className={classNames('rounded-full px-2 py-0.5 text-[11px] font-semibold transition', kind === k ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300')}>{k ? kindLabel(k) : tr('All kinds')}{k && <span className="ms-1 opacity-70">{kinds[k]}</span>}</button>)}
                </div>
            )}
            <ScrollBar className="max-h-[340px] overflow-y-auto px-1">
                {shown.map((i) => <NotifRow key={i.id} i={i} onOpen={open} onToggle={(x) => setRead([x.id], !x.read)} />)}
                {loaded && !shown.length && (
                    <div className="flex h-[200px] items-center justify-center text-center"><div><PiBellRingingDuotone className="mx-auto mb-1 text-5xl text-gray-300" /><h6 className="text-sm font-semibold">{tab === 'unread' ? tr('You are all caught up') : tr('Nothing yet')}</h6><p className="mt-0.5 text-xs text-gray-500">{tr('New tickets, tasks, payments and answers show up here.')}</p></div></div>
                )}
            </ScrollBar>
            <div className="border-t border-gray-100 px-3 py-2 text-center dark:border-gray-700"><Link to="/crm/notifications" onClick={() => ref.current?.handleDropdownClose?.()} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><PiCheckBold />{tr('See all notifications')}</Link></div>
        </Dropdown>
    )
}

export default withHeaderItem(_Notification)

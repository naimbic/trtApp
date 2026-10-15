import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PiLifebuoyDuotone, PiChecksDuotone, PiAlarmDuotone, PiCurrencyCircleDollarDuotone, PiFileTextDuotone, PiPresentationChartDuotone, PiTargetDuotone, PiEyeDuotone, PiWarningCircleDuotone, PiBellRingingDuotone } from 'react-icons/pi'
import { HiOutlineMailOpen } from 'react-icons/hi'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Dropdown from '@/components/ui/Dropdown'
import ScrollBar from '@/components/ui/ScrollBar'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import useResponsive from '@/utils/hooks/useResponsive'
import { useSessionUser } from '@/store/authStore'
import NotificationToggle from './NotificationToggle'
import { tr } from '@/utils/t'

dayjs.extend(relativeTime)

const KIND = {
    ticket: [PiLifebuoyDuotone, 'bg-purple-100 text-purple-600'], task: [PiChecksDuotone, 'bg-sky-100 text-sky-600'], reminder: [PiAlarmDuotone, 'bg-amber-100 text-amber-600'],
    payment: [PiCurrencyCircleDollarDuotone, 'bg-emerald-100 text-emerald-600'], invoice: [PiWarningCircleDuotone, 'bg-red-100 text-red-600'], estimate: [PiFileTextDuotone, 'bg-amber-100 text-amber-600'],
    proposal: [PiPresentationChartDuotone, 'bg-purple-100 text-purple-600'], lead: [PiTargetDuotone, 'bg-blue-100 text-blue-600'], view: [PiEyeDuotone, 'bg-gray-100 text-gray-600'],
}
const TONE = { red: 'bg-red-100 text-red-600', green: 'bg-emerald-100 text-emerald-600' }
const POLL = 60000

const _Notification = ({ className }) => {
    const navigate = useNavigate()
    const { larger } = useResponsive()
    const uid = useSessionUser((s) => s.user.userId || s.user.email || 'me')
    const storeKey = `notif.seen.${uid}`
    const [items, setItems] = useState([])
    const [seen, setSeen] = useState(() => { try { return Number(localStorage.getItem(storeKey)) || 0 } catch { return 0 } })
    const [loaded, setLoaded] = useState(false)
    const ref = useRef(null)

    const load = useCallback(async () => {
        try {
            const r = await fetch('/api/crm/notifications', { credentials: 'include' })
            if (r.ok) setItems((await r.json()).items || [])
        } catch { /* offline: keep the last list */ } finally { setLoaded(true) }
    }, [])
    useEffect(() => { load(); const t = setInterval(load, POLL); return () => clearInterval(t) }, [load])

    const unread = items.filter((i) => +new Date(i.date) > seen).length
    const markAll = () => { const now = Date.now(); setSeen(now); try { localStorage.setItem(storeKey, String(now)) } catch { /* private mode */ } }
    const open = (i) => { ref.current?.handleDropdownClose?.(); if (i.link) navigate(i.link) }

    return (
        <Dropdown ref={ref} renderTitle={<NotificationToggle dot={unread > 0} className={className} />} menuClass="min-w-[300px] md:min-w-[380px]" placement={larger.md ? 'bottom-end' : 'bottom'} onOpen={load}>
            <Dropdown.Item variant="header">
                <div className="mb-1 flex items-center justify-between px-2">
                    <h6>{tr("Notifications")}{unread > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{unread} {tr("new")}</span>}</h6>
                    <Button variant="plain" shape="circle" size="sm" icon={<HiOutlineMailOpen className="text-xl" />} title={tr("Mark all as read")} onClick={markAll} />
                </div>
            </Dropdown.Item>
            <ScrollBar className="h-[360px] overflow-y-auto">
                {items.map((i, idx) => {
                    const [Icon, cls] = KIND[i.kind] || [PiBellRingingDuotone, 'bg-gray-100 text-gray-600']
                    const isNew = +new Date(i.date) > seen
                    return (
                        <div key={i.id}>
                            <div role="button" onClick={() => open(i)} className="relative flex cursor-pointer gap-3 rounded-xl px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <span className={classNames('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl', TONE[i.tone] && i.kind !== 'ticket' && i.kind !== 'reminder' ? TONE[i.tone] : cls)}><Icon /></span>
                                <div className="min-w-0 flex-1 pr-4">
                                    <div className={classNames('text-sm leading-snug', isNew ? 'font-bold heading-text' : 'font-semibold')}>{i.title}</div>
                                    {i.detail && <div className="truncate text-xs text-gray-500">{i.detail}</div>}
                                    <div className="mt-0.5 text-xs text-gray-400">{dayjs(i.date).fromNow()}</div>
                                </div>
                                {isNew && <Badge className="absolute right-4 top-5" innerClass="bg-primary" />}
                            </div>
                            {idx < items.length - 1 && <div className="mx-4 border-b border-gray-100 dark:border-gray-700" />}
                        </div>
                    )
                })}
                {loaded && !items.length && (
                    <div className="flex h-[340px] items-center justify-center text-center">
                        <div><PiBellRingingDuotone className="mx-auto mb-2 text-6xl text-gray-300" /><h6 className="font-semibold">{tr("You are all caught up")}</h6><p className="mt-1 text-sm text-gray-500">{tr("New tickets, tasks, payments and answers show up here.")}</p></div>
                    </div>
                )}
            </ScrollBar>
        </Dropdown>
    )
}

export default withHeaderItem(_Notification)

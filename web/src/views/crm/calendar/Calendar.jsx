import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import CalendarView from '@/components/shared/CalendarView'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Segment from '@/components/ui/Segment'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbPlus, TbRefresh, TbVideo, TbMapPin, TbUser, TbBuilding, TbUsers } from 'react-icons/tb'
import Tooltip from '@/components/ui/Tooltip'
import { CATEGORIES } from './EventDialog'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EventDialog from './EventDialog'
import SyncDialog from './SyncDialog'
import useMe from '@/utils/hooks/useMe'
import './calendar.css'

const LAYER_META = {
    events: { label: 'Events', dot: 'bg-blue-400' },
    tasks: { label: 'Tasks', dot: 'bg-orange-400' },
    invoices: { label: 'Invoices', dot: 'bg-red-400' },
    projects: { label: 'Projects', dot: 'bg-purple-400' },
    estimates: { label: 'Estimates', dot: 'bg-yellow-400' },
    proposals: { label: 'Proposals', dot: 'bg-green-400' },
    contracts: { label: 'Contracts', dot: 'bg-sky-400' },
}

const notify = (type, msg) => toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })

const api = async (url, init) => {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
    return json
}

const TYPE_LABEL = { tasks: 'Task', invoices: 'Invoice', projects: 'Project', estimates: 'Estimate', proposals: 'Proposal', contracts: 'Contract' }

const Row = ({ icon: Icon, children }) => (children ? <div className="flex items-start gap-1.5 text-xs"><Icon className="mt-0.5 shrink-0 text-sm opacity-70" /><span className="min-w-0 break-words">{children}</span></div> : null)

const EventTip = ({ ev, timeText }) => {
    const p = ev.extendedProps
    if (p.type !== 'events') {
        return (
            <div className="flex max-w-xs flex-col gap-1">
                <div className="font-semibold">{p.rawTitle || ev.title}</div>
                <div className="text-xs opacity-80">{p.detail || TYPE_LABEL[p.type]}</div>
                <Row icon={TbBuilding}>{p.clientName}</Row>
                <div className="text-xs opacity-60">Click to open</div>
            </div>
        )
    }
    const cat = CATEGORIES.find((c) => c.value === p.category) || CATEGORIES[0]
    return (
        <div className="flex max-w-xs flex-col gap-1">
            <div className="font-semibold">{p.rawTitle}</div>
            <div className="text-xs opacity-80">{cat.label} · {p.allDay ? 'All day' : timeText || ''}</div>
            <Row icon={TbBuilding}>{p.clientName}</Row>
            <Row icon={TbUsers}>{[...(p.attendees || []).map((a) => a.name), ...(p.attendeeEmails || [])].filter(Boolean).join(', ')}</Row>
            <Row icon={TbMapPin}>{p.location}</Row>
            <Row icon={TbVideo}>{p.meetingUrl && 'Video meeting · click to open and join'}</Row>
            {p.description && <div className="line-clamp-3 text-xs opacity-80">{p.description}</div>}
            <Row icon={TbUser}>{p.owner && `Organiser: ${p.owner}`}</Row>
            <div className="text-xs opacity-60">{p.canEdit === false ? 'Click to view' : 'Click to edit'}</div>
        </div>
    )
}

// Same look as the template's CalendarView events (coloured pill, time + bold title), plus a hover tooltip.
const COLOR_BG = { red: 'bg-[#fbddd9]', orange: 'bg-[#ffc6ab]', yellow: 'bg-[#ffd993]', green: 'bg-[#bee9d3]', blue: 'bg-[#bce9fb]', purple: 'bg-[#ccbbfc]' }
const renderEvent = (arg) => {
    const ev = arg.event
    const { isStart, isEnd } = arg
    return (
        <Tooltip title={<EventTip ev={ev} timeText={arg.timeText} />} placement="top">
            <div className={`custom-calendar-event ${COLOR_BG[ev.extendedProps.eventColor] || ''} text-gray-900 ${isEnd && !isStart ? 'rounded-tl-none! rounded-bl-none!' : ''} ${!isEnd && isStart ? 'rounded-tr-none! rounded-br-none!' : ''}`}>
                {!(isEnd && !isStart) && <span>{arg.timeText}</span>}
                <span className="ml-1 font-bold rtl:mr-1">{ev.extendedProps.rawTitle || ev.title}</span>
            </div>
        </Tooltip>
    )
}

const Calendar = () => {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [available, setAvailable] = useState(Object.keys(LAYER_META))
    const [shown, setShown] = useState(Object.keys(LAYER_META))
    const [loading, setLoading] = useState(false)
    const [dialog, setDialog] = useState({ open: false, selected: { type: 'NEW' } })
    const [saving, setSaving] = useState(false)
    const [staff, setStaff] = useState([])
    const me = useMe()
    const display = me?.display || {}
    const [app, setApp] = useState({})
    useEffect(() => { api('/api/crm/settings/app').then(setApp).catch(() => {}) }, [])
    const firstDay = display.weekStart !== undefined && display.weekStart !== '' ? Number(display.weekStart) : Number(app.calendar_first_day ?? 1)
    const hour12 = (display.timeFormat || (app.time_format === '12' ? '12h' : '24h')) === '12h'
    const [params, setParams] = useSearchParams()
    const [syncOpen, setSyncOpen] = useState(params.get('sync') === '1')
    useEffect(() => { if (params.get('sync') === '1') { setSyncOpen(true); setParams({}, { replace: true }) } }, [params, setParams])
    const [confirmDel, setConfirmDel] = useState(false)
    const range = useRef(null)
    useEffect(() => { api('/api/crm/calendar/lookups').then((d) => setStaff(d.staff)).catch(() => {}) }, [])

    const load = useCallback(async (r = range.current) => {
        if (!r) return
        setLoading(true)
        try {
            const d = await api(`/api/crm/calendar?from=${encodeURIComponent(r.start)}&to=${encodeURIComponent(r.end)}`)
            setItems(d.items)
            setAvailable(d.layers)
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const visible = useMemo(() => items.filter((i) => shown.includes(i.type)), [items, shown])

    const onDatesSet = (arg) => {
        range.current = { start: arg.start.toISOString(), end: arg.end.toISOString() }
        load()
    }

    const onSelect = ({ start, end, allDay }) => {
        // a single clicked day: default to a one-hour event at 09:00
        const s = allDay ? dayjs(start).hour(9).minute(0) : dayjs(start)
        const e = allDay && dayjs(end).diff(dayjs(start), 'day') <= 1 ? s.add(1, 'hour') : dayjs(end)
        setDialog({ open: true, selected: { type: 'NEW', start: s.format(), end: e.format() } })
    }

    const onEventClick = ({ event }) => {
        const p = event.extendedProps
        if (p.type !== 'events') {
            if (p.href) navigate(p.href)
            return
        }
        setDialog({
            open: true,
            selected: {
                type: 'EDIT', id: p.rawId, title: p.rawTitle, description: p.description, start: p.rawStart, end: p.rawEnd, allDay: p.allDay,
                eventColor: p.eventColor, isPublic: p.isPublic, location: p.location, meetingUrl: p.meetingUrl, clientId: p.clientId,
                category: p.category, projectId: p.projectId, attendeeIds: p.attendeeIds, attendeeEmails: p.attendeeEmails, reminderBefore: p.reminderBefore, reminderBeforeType: p.reminderBeforeType,
                editable: p.canEdit, owner: p.owner,
            },
        })
    }

    const onMove = async (arg) => {
        const p = arg.event.extendedProps
        if (p.type !== 'events') return arg.revert()
        const allDay = arg.event.allDay
        const noon = (d) => dayjs(d).hour(12).minute(0).second(0).millisecond(0)
        try {
            await api(`/api/crm/calendar/${p.rawId}`, { method: 'PATCH', body: JSON.stringify(allDay ? { allDay, start: noon(arg.event.start).toISOString(), end: noon(arg.event.end ? dayjs(arg.event.end).subtract(1, 'day') : arg.event.start).toISOString() } : { allDay, start: arg.event.start.toISOString(), end: arg.event.end ? arg.event.end.toISOString() : null }) })
            notify('success', 'Event moved')
            load()
        } catch (e) {
            arg.revert()
            notify('danger', e.message)
        }
    }

    const submit = async (values) => {
        setSaving(true)
        try {
            const res = dialog.selected.type === 'EDIT' ? await api(`/api/crm/calendar/${dialog.selected.id}`, { method: 'PATCH', body: JSON.stringify(values) }) : await api('/api/crm/calendar', { method: 'POST', body: JSON.stringify(values) })
            notify('success', `${dialog.selected.type === 'EDIT' ? 'Event updated' : 'Event created'}${res?.invited ? ` · invitation sent to ${res.invited} ${res.invited > 1 ? 'people' : 'person'}` : ''}`)
            setDialog({ open: false, selected: { type: 'NEW' } })
            load()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        setConfirmDel(false)
        setSaving(true)
        try {
            await api(`/api/crm/calendar/${dialog.selected.id}`, { method: 'DELETE' })
            notify('success', 'Event deleted')
            setDialog({ open: false, selected: { type: 'NEW' } })
            load()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Container className="h-full">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3>Calendar</h3>
                    <p className="text-sm text-gray-500">Your events plus due dates from tasks, invoices, projects and more{loading ? ' · loading…' : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setDialog({ open: true, selected: { type: 'NEW', start: dayjs().add(1, 'hour').startOf('hour').format(), end: dayjs().add(2, 'hour').startOf('hour').format() } })}>New event</Button>
                    <Button size="sm" icon={<TbRefresh />} onClick={() => setSyncOpen(true)}>Sync with Google / Apple</Button>
                </div>
                <Segment selectionType="multiple" size="sm" value={shown} onChange={setShown}>
                    {available.map((k) => (
                        <Segment.Item key={k} value={k}>
                            <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${LAYER_META[k].dot}`} />{LAYER_META[k].label}</span>
                        </Segment.Item>
                    ))}
                </Segment>
            </div>
            <AdaptiveCard>
                <CalendarView eventContent={renderEvent} key={`${app.default_view_calendar}-${firstDay}`} initialView={app.default_view_calendar || 'dayGridMonth'} dayMaxEvents={Number(app.calendar_events_limit) || 3} firstDay={firstDay} eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12 }} slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12 }} editable selectable events={visible} datesSet={onDatesSet} select={onSelect} eventClick={onEventClick} eventDrop={onMove} eventResize={onMove} />
            </AdaptiveCard>
            <SyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} />
            <ConfirmDialog isOpen={confirmDel} type="danger" title="Delete this event?" confirmText="Delete" onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>The event is removed for everyone who was invited.</p>
            </ConfirmDialog>
            <EventDialog
                open={dialog.open}
                selected={dialog.selected}
                saving={saving}
                onSubmit={submit}
                onDelete={() => setConfirmDel(true)} staff={staff}
                onClose={() => setDialog((d) => ({ ...d, open: false }))}
            />
        </Container>
    )
}

export default Calendar

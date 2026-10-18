import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import CalendarView from '@/components/shared/CalendarView'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbPlus, TbRefresh, TbVideo, TbMapPin, TbUser, TbBuilding, TbUsers, TbChevronLeft, TbChevronRight, TbCalendarEvent, TbCalendarWeek, TbAlertTriangle } from 'react-icons/tb'
import { InvoiceHead } from '../sales/InvoiceInsights'
import Tooltip from '@/components/ui/Tooltip'
import { CATEGORIES } from './EventDialog'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EventDialog from './EventDialog'
import SyncDialog from './SyncDialog'
import useMe from '@/utils/hooks/useMe'
import './calendar.css'
import { tr } from '@/utils/t'
import { localTitle } from './titles'

const LAYER_META = {
    events: { label: tr("Events"), dot: 'bg-blue-400' },
    reminders: { label: tr("Reminders"), dot: 'bg-amber-400' },
    tasks: { label: tr("Tasks"), dot: 'bg-orange-400' },
    invoices: { label: tr("Invoices"), dot: 'bg-red-400' },
    projects: { label: tr("Projects"), dot: 'bg-purple-400' },
    estimates: { label: tr("Estimates"), dot: 'bg-yellow-400' },
    proposals: { label: tr("Proposals"), dot: 'bg-green-400' },
    contracts: { label: tr("Contracts"), dot: 'bg-sky-400' },
}

const notify = (type, msg) => toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })
// one toast per problem: a failing request (offline, server restarting) must never pile up hundreds of "Failed to fetch"
let lastFail = { msg: '', at: 0 }
const notifyOnce = (msg) => { const now = Date.now(); if (lastFail.msg === msg && now - lastFail.at < 20000) return; lastFail = { msg, at: now }; notify('danger', msg) }

const api = async (url, init) => {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || tr("Request failed ({status})", { status: res.status }))
    return json
}

const TYPE_LABEL = { tasks: tr("Task"), invoices: tr("Invoice"), projects: tr("Project"), estimates: tr("Estimate"), proposals: tr("Proposal"), contracts: tr("Contract") }

const Row = ({ icon: Icon, children }) => (children ? <div className="flex items-start gap-1.5 text-xs"><Icon className="mt-0.5 shrink-0 text-sm opacity-70" /><span className="min-w-0 break-words">{children}</span></div> : null)

const EventTip = ({ ev, timeText }) => {
    const p = ev.extendedProps
    if (p.type !== 'events') {
        return (
            <div className="flex max-w-xs flex-col gap-1">
                <div className="font-semibold">{p.rawTitle || ev.title}</div>
                <div className="text-xs opacity-80">{p.detail || TYPE_LABEL[p.type]}</div>
                <Row icon={TbBuilding}>{p.clientName}</Row>
                <div className="text-xs opacity-60">{tr("Click to open")}</div>
            </div>
        )
    }
    const cat = CATEGORIES.find((c) => c.value === p.category) || CATEGORIES[0]
    return (
        <div className="flex max-w-xs flex-col gap-1">
            <div className="font-semibold">{localTitle(p.rawTitle)}</div>
            <div className="text-xs opacity-80">{cat.label} · {p.allDay ? tr("All day") : timeText || ''}</div>
            <Row icon={TbBuilding}>{p.clientName}</Row>
            <Row icon={TbUsers}>{[...(p.attendees || []).map((a) => a.name), ...(p.attendeeEmails || [])].filter(Boolean).join(', ')}</Row>
            <Row icon={TbMapPin}>{p.location}</Row>
            <Row icon={TbVideo}>{p.meetingUrl && tr("Video meeting · click to open and join")}</Row>
            {p.description && <div className="line-clamp-3 text-xs opacity-80">{p.description}</div>}
            <Row icon={TbUser}>{p.owner && tr("Organiser: {owner}", { owner: p.owner })}</Row>
            <div className="text-xs opacity-60">{p.canEdit === false ? tr("Click to view") : tr("Click to edit")}</div>
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
                <span className="ml-1 font-bold rtl:mr-1">{localTitle(ev.extendedProps.rawTitle || ev.title)}</span>
            </div>
        </Tooltip>
    )
}


const KIND_DOT = { events: '#3b82f6', reminders: '#f59e0b', tasks: '#f97316', invoices: '#ef4444', projects: '#8b5cf6', estimates: '#eab308', proposals: '#22c55e', contracts: '#0ea5e9' }
const dayOf = (d) => dayjs(d).format('YYYY-MM-DD')
const initialsOf = (n = '') => n.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()

/** Does an item fall on this day? (all-day items end the day before their exclusive end date) */
const onDay = (it, day) => {
    const s = dayOf(it.start)
    if (!it.end) return s === day
    const e = it.allDay ? dayjs(it.end).subtract(1, 'day').format('YYYY-MM-DD') : dayOf(it.end)
    return s <= day && day <= (e < s ? s : e)
}

const Calendar = () => {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [overdue, setOverdue] = useState([])
    const [available, setAvailable] = useState(Object.keys(LAYER_META))
    const [shown, setShown] = useState(Object.keys(LAYER_META))
    const [people, setPeople] = useState([]) // staff ids; empty = everyone
    const [loading, setLoading] = useState(false)
    const [dialog, setDialog] = useState({ open: false, selected: { type: 'NEW' } })
    const [saving, setSaving] = useState(false)
    const [staff, setStaff] = useState([])
    const [selectedDay, setSelectedDay] = useState(dayOf(new Date()))
    const [title, setTitle] = useState('')
    const [viewName, setViewName] = useState('dayGridMonth')
    const calRef = useRef(null)
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
    const seq = useRef(0)
    useEffect(() => { api('/api/crm/calendar/lookups').then((d) => setStaff(d.staff)).catch(() => {}) }, [])

    const load = useCallback(async (r = range.current) => {
        if (!r) return
        const mine = ++seq.current
        setLoading(true)
        try {
            const d = await api(`/api/crm/calendar?from=${encodeURIComponent(r.start)}&to=${encodeURIComponent(r.end)}`)
            if (mine !== seq.current) return // a newer request is on its way
            setItems(d.items)
            setOverdue(d.overdue || [])
            setAvailable(d.layers)
        } catch (e) {
            if (mine === seq.current) notifyOnce(e.message)
        } finally {
            if (mine === seq.current) setLoading(false)
        }
    }, [])

    const keep = useCallback((it) => shown.includes(it.type) && (!people.length || (it.who || []).some((w) => people.includes(w))), [shown, people])
    const visible = useMemo(() => items.filter(keep), [items, keep])
    const lateItems = useMemo(() => overdue.filter(keep), [overdue, keep])
    const agenda = useMemo(() => visible.filter((it) => onDay(it, selectedDay)).sort((a, b) => String(a.start).localeCompare(String(b.start))), [visible, selectedDay])
    const today = dayOf(new Date())
    const todayCount = visible.filter((it) => onDay(it, today)).length
    const weekStartFixed = dayjs().subtract((dayjs().day() - firstDay + 7) % 7, 'day')
    const weekCount = visible.filter((it) => { const s = dayOf(it.start); return s >= weekStartFixed.format('YYYY-MM-DD') && s <= weekStartFixed.add(6, 'day').format('YYYY-MM-DD') }).length

    // only a new date range loads; the same range (a re-render, a resize) never asks the server again
    const onDatesSet = (arg) => {
        setTitle(arg.view.title)
        setViewName(arg.view.type)
        const next = { start: arg.start.toISOString(), end: arg.end.toISOString() }
        if (range.current && range.current.start === next.start && range.current.end === next.end) return
        range.current = next
        load()
    }
    const goto = (what) => { const a = calRef.current?.getApi(); if (!a) return; what === 'today' ? a.today() : what === 'prev' ? a.prev() : a.next(); if (what === 'today') setSelectedDay(today) }
    const changeView = (v) => { calRef.current?.getApi().changeView(v); setViewName(v) }

    const openNew = (day) => {
        const base = dayjs(day || selectedDay).hour(9).minute(0)
        setDialog({ open: true, selected: { type: 'NEW', start: base.format(), end: base.add(1, 'hour').format() } })
    }
    const onSelect = ({ start, end, allDay }) => {
        // a click on a day selects it (it fills the agenda); dragging over several days or hours makes an event
        if (allDay && dayjs(end).diff(dayjs(start), 'day') <= 1) { setSelectedDay(dayOf(start)); calRef.current?.getApi().unselect(); return }
        setDialog({ open: true, selected: { type: 'NEW', start: dayjs(start).format(), end: dayjs(end).format() } })
    }

    const openItem = (p) => {
        if (p.type !== 'events') { if (p.href) navigate(p.href); return }
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
    const onEventClick = ({ event }) => openItem(event.extendedProps)

    const onMove = async (arg) => {
        const p = arg.event.extendedProps
        if (p.type !== 'events') return arg.revert()
        const allDay = arg.event.allDay
        const noon = (d) => dayjs(d).hour(12).minute(0).second(0).millisecond(0)
        try {
            await api(`/api/crm/calendar/${p.rawId}`, { method: 'PATCH', body: JSON.stringify(allDay ? { allDay, start: noon(arg.event.start).toISOString(), end: noon(arg.event.end ? dayjs(arg.event.end).subtract(1, 'day') : arg.event.start).toISOString() } : { allDay, start: arg.event.start.toISOString(), end: (arg.event.end || arg.event.start).toISOString() }) })
            notify('success', tr("Event moved"))
            load()
        } catch (e) {
            arg.revert()
            notifyOnce(e.message)
        }
    }

    const submit = async (values) => {
        setSaving(true)
        try {
            const res = dialog.selected.type === 'EDIT' ? await api(`/api/crm/calendar/${dialog.selected.id}`, { method: 'PATCH', body: JSON.stringify(values) }) : await api('/api/crm/calendar', { method: 'POST', body: JSON.stringify(values) })
            notify('success', `${dialog.selected.type === 'EDIT' ? tr("Event updated") : tr("Event created")}${res?.invited ? tr(" · invitation sent to {invited} {v2}", { invited: res.invited, v2: res.invited > 1 ? 'people' : 'person' }) : ''}`)
            setDialog({ open: false, selected: { type: 'NEW' } })
            load()
        } catch (e) {
            notifyOnce(e.message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        setConfirmDel(false)
        setSaving(true)
        try {
            await api(`/api/crm/calendar/${dialog.selected.id}`, { method: 'DELETE' })
            notify('success', tr("Event deleted"))
            setDialog({ open: false, selected: { type: 'NEW' } })
            load()
        } catch (e) {
            notifyOnce(e.message)
        } finally {
            setSaving(false)
        }
    }

    const togglePerson = (id) => setPeople((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    const toggleKind = (k) => setShown((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
    const timeOf = (it) => (it.allDay ? tr("All day") : dayjs(it.start).format(hour12 ? 'h:mm A' : 'HH:mm'))
    const dayLabel = dayjs(selectedDay).format('dddd, D MMMM')
    const daysLate = (d) => Math.max(1, dayjs(today).diff(dayjs(d), 'day'))

    const Row = ({ it, late }) => (
        <li><button type="button" className="sch-row" onClick={() => openItem({ ...it, ...(it.extendedProps || {}) })}>
            <i className="sch-row__dot" style={{ background: KIND_DOT[it.type] }} />
            <span className="sch-row__txt"><b>{localTitle(it.rawTitle || it.title)}</b><small>{late ? `${it.detail || TYPE_LABEL[it.type] || ''} · ${tr("{n} days late", { n: daysLate(it.start) })}` : `${it.type === 'events' ? timeOf(it) : (it.detail || TYPE_LABEL[it.type] || '')}${it.clientName ? ` · ${it.clientName}` : ''}`}</small></span>
            {late && <TbAlertTriangle className="sch-row__late" />}
        </button></li>
    )
    const selectedDayClass = (arg) => (dayOf(arg.date) === selectedDay ? ['is-selected'] : [])

    return (
        <Container className="h-full">
            <InvoiceHead
                title={tr("Schedule")}
                action={<span className="flex flex-wrap items-center gap-2"><Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => openNew()}>{tr("New event")}</Button><Button size="sm" icon={<TbRefresh />} onClick={() => setSyncOpen(true)}>{tr("Sync with Google / Apple")}</Button></span>}
                stats={[
                    { icon: <TbCalendarEvent />, label: tr("Today"), value: String(todayCount) },
                    { icon: <TbCalendarWeek />, label: tr("This week"), value: String(weekCount) },
                    { icon: <TbAlertTriangle />, label: tr("Overdue, unfinished"), value: String(lateItems.length), badge: lateItems.length ? <span className="badge badge--tomato">{tr("needs attention")}</span> : null },
                ]}
            />
            <div className="sch-filters">
                <div className="sch-chips" role="group" aria-label={tr("Team")}>
                    {staff.map((m) => (
                        <button key={m.id} type="button" className="sch-chip" aria-pressed={people.includes(m.id)} onClick={() => togglePerson(m.id)} title={m.name}>
                            {m.image ? <img src={m.image} alt="" /> : <span className="sch-chip__av">{initialsOf(m.name)}</span>}<span className="sch-chip__name">{m.name.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
                <span className="sch-sep" aria-hidden="true" />
                <div className="sch-chips" role="group" aria-label={tr("Show")}>
                    {available.map((k) => (
                        <button key={k} type="button" className="sch-chip" aria-pressed={shown.includes(k)} onClick={() => toggleKind(k)}><i className="sch-chip__dot" style={{ background: KIND_DOT[k] }} />{LAYER_META[k].label}</button>
                    ))}
                </div>
            </div>
            <div className="sch-grid">
                <section className="card sch-cal">
                    <header className="sch-cal__bar">
                        <h2 className="sch-period" aria-live="polite">{title}{loading ? <span className="sch-loading">·</span> : null}</h2>
                        <div className="sch-nav">
                            <button type="button" className="sch-ibtn" onClick={() => goto('prev')} aria-label={tr("Previous")}><TbChevronLeft /></button>
                            <button type="button" className="sch-today" onClick={() => goto('today')}>{tr("Today")}</button>
                            <button type="button" className="sch-ibtn" onClick={() => goto('next')} aria-label={tr("Next")}><TbChevronRight /></button>
                        </div>
                        <div className="sch-seg" role="group" aria-label={tr("Calendar view")}>
                            {[['dayGridMonth', tr("Month")], ['timeGridWeek', tr("Week")], ['timeGridDay', tr("Day")]].map(([v, l]) => <button key={v} type="button" aria-pressed={viewName === v} onClick={() => changeView(v)}>{l}</button>)}
                        </div>
                    </header>
                    <CalendarView ref={calRef} headerToolbar={false} eventContent={renderEvent} key={`${app.default_view_calendar}-${firstDay}`} initialView={app.default_view_calendar || 'dayGridMonth'} dayMaxEvents={Number(app.calendar_events_limit) || 3} firstDay={firstDay} eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12 }} slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12 }} editable selectable events={visible} datesSet={onDatesSet} select={onSelect} eventClick={onEventClick} eventDrop={onMove} eventResize={onMove} dayCellClassNames={selectedDayClass} height="auto" />
                </section>
                <aside className="sch-side">
                    <section className="card sch-agenda">
                        <header className="sch-card__head"><div><h2>{tr("Agenda")}</h2><p>{dayLabel}{selectedDay === today ? ` · ${tr("Today")}` : ''}</p></div><button type="button" className="sch-ibtn" onClick={() => openNew(selectedDay)} aria-label={tr("Add an event on this day")} title={tr("Add an event on this day")}><TbPlus /></button></header>
                        <ul className="sch-list">{agenda.map((it) => <Row key={it.id} it={it} />)}</ul>
                        {!agenda.length && <p className="sch-empty">{tr("Nothing planned for this day.")}</p>}
                    </section>
                    <section className="card sch-late">
                        <header className="sch-card__head"><div><h2>{tr("Overdue")}</h2><p>{lateItems.length ? tr("{n} still open", { n: lateItems.length }) : tr("Nothing is late")}</p></div></header>
                        <ul className="sch-list">{lateItems.slice(0, 12).map((it) => <Row key={it.id} it={it} late />)}</ul>
                        {lateItems.length > 12 && <p className="sch-empty">{tr("+{n} more", { n: lateItems.length - 12 })}</p>}
                    </section>
                </aside>
            </div>
            <SyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} />
            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr("Delete this event?")} confirmText={tr("Delete")} onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{tr("The event is removed for everyone who was invited.")}</p>
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

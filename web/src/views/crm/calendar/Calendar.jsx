import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import CalendarView from '@/components/shared/CalendarView'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Segment from '@/components/ui/Segment'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import EventDialog from './EventDialog'

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

const Calendar = () => {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [available, setAvailable] = useState(Object.keys(LAYER_META))
    const [shown, setShown] = useState(Object.keys(LAYER_META))
    const [loading, setLoading] = useState(false)
    const [dialog, setDialog] = useState({ open: false, selected: { type: 'NEW' } })
    const [saving, setSaving] = useState(false)
    const range = useRef(null)

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
            selected: { type: 'EDIT', id: p.rawId, title: event.title, description: p.description, start: event.start?.toISOString(), end: event.end?.toISOString(), eventColor: p.eventColor, isPublic: p.isPublic },
        })
    }

    const onMove = async (arg) => {
        const p = arg.event.extendedProps
        if (p.type !== 'events') return arg.revert()
        try {
            await api(`/api/crm/calendar/${p.rawId}`, { method: 'PATCH', body: JSON.stringify({ start: arg.event.start.toISOString(), end: arg.event.end ? arg.event.end.toISOString() : null }) })
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
            if (dialog.selected.type === 'EDIT') await api(`/api/crm/calendar/${dialog.selected.id}`, { method: 'PATCH', body: JSON.stringify(values) })
            else await api('/api/crm/calendar', { method: 'POST', body: JSON.stringify(values) })
            notify('success', dialog.selected.type === 'EDIT' ? 'Event updated' : 'Event created')
            setDialog({ open: false, selected: { type: 'NEW' } })
            load()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!confirm('Delete this event?')) return
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
                <Segment selectionType="multiple" size="sm" value={shown} onChange={setShown}>
                    {available.map((k) => (
                        <Segment.Item key={k} value={k}>
                            <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${LAYER_META[k].dot}`} />{LAYER_META[k].label}</span>
                        </Segment.Item>
                    ))}
                </Segment>
            </div>
            <AdaptiveCard>
                <CalendarView editable selectable events={visible} datesSet={onDatesSet} select={onSelect} eventClick={onEventClick} eventDrop={onMove} eventResize={onMove} />
            </AdaptiveCard>
            <EventDialog
                open={dialog.open}
                selected={dialog.selected}
                saving={saving}
                onSubmit={submit}
                onDelete={remove}
                onClose={() => setDialog((d) => ({ ...d, open: false }))}
            />
        </Container>
    )
}

export default Calendar

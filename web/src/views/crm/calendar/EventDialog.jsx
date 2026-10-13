import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { components } from 'react-select'
import { TbBrandGoogle, TbCalendar, TbCalendarPlus, TbChecks, TbDownload, TbFlag, TbBell, TbMapPin, TbPhone, TbUsers, TbVideo, TbWand } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import { Form, FormItem } from '@/components/ui/Form'
import RelationSelect from '../kit/RelationSelect'

const { Control } = components

export const COLORS = [
    { value: 'red', label: 'red', color: 'bg-red-400' },
    { value: 'orange', label: 'orange', color: 'bg-orange-400' },
    { value: 'yellow', label: 'yellow', color: 'bg-yellow-400' },
    { value: 'green', label: 'green', color: 'bg-green-400' },
    { value: 'blue', label: 'blue', color: 'bg-blue-400' },
    { value: 'purple', label: 'purple', color: 'bg-purple-400' },
]
export const CATEGORIES = [
    { value: 'meeting', label: 'Meeting', icon: TbUsers },
    { value: 'call', label: 'Call', icon: TbPhone },
    { value: 'visit', label: 'Visit', icon: TbMapPin },
    { value: 'deadline', label: 'Deadline', icon: TbFlag },
    { value: 'reminder', label: 'Reminder', icon: TbBell },
    { value: 'other', label: 'Other', icon: TbCalendar },
]
const UNITS = [{ value: 'minutes', label: 'minutes' }, { value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }, { value: 'weeks', label: 'weeks' }]

const ColorOption = ({ innerProps, label, data, isSelected }) => (
    <div className={`flex items-center justify-between rounded-lg p-2 ${isSelected ? 'bg-gray-100 dark:bg-gray-500' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`} {...innerProps}>
        <div className="flex items-center"><Badge className={data.color} /><span className="ml-2 capitalize">{label}</span></div>
        {isSelected && <TbChecks className="text-emerald-500 text-xl" />}
    </div>
)
const ColorControl = ({ children, ...props }) => {
    const selected = props.getValue()[0]
    return <Control className="capitalize" {...props}>{selected && <Badge className={`${selected.color} ltr:ml-4`} />}{children}</Control>
}

const gDate = (d, allDay) => (allDay ? dayjs(d).format('YYYYMMDD') : dayjs(d).utc().format('YYYYMMDD[T]HHmmss[Z]'))
const googleLink = (v) => {
    const s = v.start, e = v.end || dayjs(v.start).add(1, v.allDay ? 'day' : 'hour').toDate()
    const end = v.allDay ? dayjs(e).add(1, 'day').toDate() : e
    const details = [v.description, v.meetingUrl && `Meeting link: ${v.meetingUrl}`].filter(Boolean).join('\n\n')
    const q = new URLSearchParams({ action: 'TEMPLATE', text: v.title || 'Event', dates: `${gDate(s, v.allDay)}/${gDate(end, v.allDay)}`, details, location: v.location || '' })
    return `https://calendar.google.com/calendar/render?${q}`
}
const jitsi = () => `https://meet.jit.si/TRT-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`

const EMPTY = { category: 'meeting', projectId: null, title: '', description: '', start: null, end: null, color: 'blue', isPublic: false, allDay: false, location: '', meetingUrl: '', clientId: null, attendeeIds: [], attendeeEmails: '', reminderBefore: '', reminderBeforeType: 'minutes', sendInvites: false, inviteClient: false }

/** props: open, selected {type:'NEW'|'EDIT', ...event}, staff [{id,name}], saving, onSubmit(values), onDelete(), onClose() */
const EventDialog = ({ open, selected, staff = [], saving, onSubmit, onDelete, onClose }) => {
    const [v, setV] = useState(EMPTY)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!selected) return
        setError('')
        setV({
            ...EMPTY,
            title: selected.title || '',
            description: selected.description || '',
            start: selected.start ? dayjs(selected.start).toDate() : null,
            end: selected.end ? dayjs(selected.end).toDate() : null,
            color: selected.eventColor || 'blue',
            isPublic: !!selected.isPublic,
            allDay: !!selected.allDay,
            category: selected.category || 'meeting',
            projectId: selected.projectId || null,
            location: selected.location || '',
            meetingUrl: selected.meetingUrl || '',
            clientId: selected.clientId || null,
            attendeeIds: selected.attendeeIds || [],
            attendeeEmails: (selected.attendeeEmails || []).join(', '),
            reminderBefore: selected.reminderBefore ?? '',
            reminderBeforeType: selected.reminderBeforeType || 'minutes',
        })
    }, [selected])

    const edit = selected?.type === 'EDIT'
    const readOnly = edit && selected.editable === false
    const set = (patch) => setV((x) => ({ ...x, ...patch }))
    const staffOpts = staff.map((s) => ({ value: s.id, label: s.name }))
    const hasGuests = v.attendeeIds.length > 0 || v.attendeeEmails.trim() || v.clientId

    const submit = (e) => {
        e.preventDefault()
        if (!v.title.trim()) return setError('Event title is required')
        if (!v.start) return setError('Please select a start date')
        if (v.end && v.end < v.start) return setError('End must be after the start')
        setError('')
        const noon = (d) => (d ? dayjs(d).hour(12).minute(0).second(0).millisecond(0).toDate() : null)
        const start = v.allDay ? noon(v.start) : v.start
        const end = v.allDay ? noon(v.end || v.start) : v.end
        onSubmit({
            title: v.title.trim(), description: v.description, start: start.toISOString(), end: end ? end.toISOString() : null, color: v.color, isPublic: v.isPublic,
            allDay: v.allDay, category: v.category, projectId: v.projectId, location: v.location, meetingUrl: v.meetingUrl.trim(), clientId: v.clientId, attendeeIds: v.attendeeIds, attendeeEmails: v.attendeeEmails,
            reminderBefore: v.reminderBefore === '' ? null : Number(v.reminderBefore), reminderBeforeType: v.reminderBeforeType,
            sendInvites: v.sendInvites && !!hasGuests, inviteClient: v.sendInvites && v.inviteClient && !!v.clientId,
        })
    }

    const Picker = v.allDay ? DatePicker : DatePicker.DateTimepicker

    return (
        <Dialog isOpen={open} width={680} onClose={onClose} onRequestClose={onClose}>
            <div className="mb-4 flex flex-wrap items-center gap-2 pr-10">
                <h5 className="mr-auto">{readOnly ? 'Event' : edit ? 'Edit event' : 'New event'}</h5>
                {edit && v.meetingUrl && <Button size="sm" variant="solid" icon={<TbVideo />} onClick={() => window.open(v.meetingUrl, '_blank', 'noopener')}>Join meeting</Button>}
                {edit && v.start && <Button size="sm" icon={<TbBrandGoogle />} onClick={() => window.open(googleLink(v), '_blank', 'noopener')}>Google Calendar</Button>}
                {edit && <Button size="sm" icon={<TbDownload />} onClick={() => { window.location.href = `/api/crm/calendar/ics?id=${selected.id}` }}>.ics</Button>}
            </div>
            {readOnly && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-700">You were invited to this event{selected.owner ? ` by ${selected.owner}` : ''}. Only the organiser can change it.</p>}
            <Form className="flex max-h-[68vh] flex-1 flex-col overflow-y-auto pr-1" onSubmit={submit}>
                <fieldset disabled={readOnly || saving} className="contents">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                            <button key={c.value} type="button" onClick={() => set({ category: c.value })} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${v.category === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600'}`}><c.icon className="text-sm" />{c.label}</button>
                        ))}
                    </div>
                    <FormItem label="Title" invalid={!!error && !v.title.trim()} errorMessage={error}>
                        <Input type="text" autoComplete="off" placeholder="Meeting with the client…" value={v.title} onChange={(e) => set({ title: e.target.value })} />
                    </FormItem>
                    <div className="mb-3 flex items-center gap-2 text-sm"><Switcher checked={v.allDay} onChange={(c) => set({ allDay: c })} /> All day</div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label="Start"><Picker value={v.start} onChange={(d) => set({ start: d })} /></FormItem>
                        <FormItem label="End"><Picker value={v.end} onChange={(d) => set({ end: d })} /></FormItem>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label="Client"><RelationSelect resource="clients" value={v.clientId} onChange={(id) => set({ clientId: id, inviteClient: id ? v.inviteClient : false })} /></FormItem>
                        <FormItem label="Team members">
                            <Select isMulti placeholder="Add people" options={staffOpts} value={staffOpts.filter((o) => v.attendeeIds.includes(o.value))} onChange={(o) => set({ attendeeIds: (o || []).map((x) => x.value) })} />
                        </FormItem>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label="Project"><RelationSelect resource="projects" value={v.projectId} onChange={(id) => set({ projectId: id })} /></FormItem>
                        <FormItem label="Other guests (emails)"><Input placeholder="name@company.com, other@…" value={v.attendeeEmails} onChange={(e) => set({ attendeeEmails: e.target.value })} /></FormItem>
                    </div>
                    <FormItem label="Meeting link">
                        <div className="flex gap-2">
                            <Input placeholder="https://meet.google.com/… or Zoom, Teams" value={v.meetingUrl} onChange={(e) => set({ meetingUrl: e.target.value })} />
                            {!readOnly && <Button type="button" icon={<TbWand />} onClick={() => set({ meetingUrl: jitsi() })}>Create</Button>}
                        </div>
                        {!readOnly && <p className="mt-1 text-xs text-gray-400"><b>Create</b> makes a free video room (Jitsi). For Google Meet use <a className="text-primary underline" href="https://meet.new" target="_blank" rel="noreferrer">meet.new</a> and paste the link.</p>}
                    </FormItem>
                    <FormItem label="Location"><Input placeholder="Office, address…" value={v.location} onChange={(e) => set({ location: e.target.value })} /></FormItem>
                    <FormItem label="Description"><Input textArea rows={2} placeholder="Agenda, notes…" value={v.description} onChange={(e) => set({ description: e.target.value })} /></FormItem>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label="Colour">
                            <Select options={COLORS} value={COLORS.filter((o) => o.value === v.color)} components={{ Option: ColorOption, Control: ColorControl }} onChange={(o) => set({ color: o?.value || 'blue' })} />
                        </FormItem>
                        <FormItem label="Reminder before">
                            <div className="flex gap-2">
                                <Input type="number" min="0" placeholder="—" value={v.reminderBefore} onChange={(e) => set({ reminderBefore: e.target.value })} />
                                <div className="w-36"><Select options={UNITS} value={UNITS.find((u) => u.value === v.reminderBeforeType)} onChange={(o) => set({ reminderBeforeType: o.value })} /></div>
                            </div>
                        </FormItem>
                    </div>
                    <div className="mb-2 flex items-center gap-2 text-sm"><Switcher checked={v.isPublic} onChange={(c) => set({ isPublic: c })} /> Visible to everyone in the team</div>
                    {hasGuests && !readOnly && (
                        <div className="mb-2 rounded-xl border border-gray-200 p-3 dark:border-gray-600">
                            <div className="flex items-center gap-2 text-sm"><Switcher checked={v.sendInvites} onChange={(c) => set({ sendInvites: c })} /><TbCalendarPlus className="text-lg" /> Email an invitation with the calendar file to guests</div>
                            {v.sendInvites && v.clientId && <div className="mt-2 flex items-center gap-2 text-sm"><Switcher checked={v.inviteClient} onChange={(c) => set({ inviteClient: c })} /> Also invite the client's main contact</div>}
                        </div>
                    )}
                </fieldset>
                <div className="mt-2 flex items-center gap-2">
                    {edit && !readOnly && <Button type="button" variant="plain" className="text-red-500" onClick={onDelete} disabled={saving}>Delete</Button>}
                    <div className="ml-auto flex gap-2">
                        <Button type="button" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
                        {!readOnly && <Button variant="solid" type="submit" loading={saving}>{edit ? 'Save changes' : 'Create event'}</Button>}
                    </div>
                </div>
            </Form>
        </Dialog>
    )
}

export default EventDialog

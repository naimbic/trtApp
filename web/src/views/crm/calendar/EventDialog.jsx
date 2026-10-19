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
import { Form, FormItem } from '@/components/ui/Form'
import RelationSelect from '../kit/RelationSelect'
import DateTimeRange from './DateTimeRange'
import Segment from '@/components/ui/Segment'
import { tr } from '@/utils/t'

const { Control } = components

export const COLORS = [
    { value: 'red', label: tr("red"), color: 'bg-red-400' },
    { value: 'orange', label: tr("orange"), color: 'bg-orange-400' },
    { value: 'yellow', label: tr("yellow"), color: 'bg-yellow-400' },
    { value: 'green', label: tr("green"), color: 'bg-green-400' },
    { value: 'blue', label: tr("blue"), color: 'bg-blue-400' },
    { value: 'purple', label: tr("purple"), color: 'bg-purple-400' },
]
export const CATEGORIES = [
    { value: 'meeting', label: tr("Meeting"), icon: TbUsers },
    { value: 'call', label: tr("Call"), icon: TbPhone },
    { value: 'visit', label: tr("Visit"), icon: TbMapPin },
    { value: 'deadline', label: tr("Deadline"), icon: TbFlag },
    { value: 'reminder', label: tr("Reminder"), icon: TbBell },
    { value: 'other', label: tr("Other"), icon: TbCalendar },
]
const UNITS = [{ value: 'minutes', label: tr("minutes") }, { value: 'hours', label: tr("hours") }, { value: 'days', label: tr("days") }, { value: 'weeks', label: tr("weeks") }]

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
    const details = [v.description, v.meetingUrl && tr("Meeting link: {meetingUrl}", { meetingUrl: v.meetingUrl })].filter(Boolean).join('\n\n')
    const q = new URLSearchParams({ action: 'TEMPLATE', text: v.title || tr("Event"), dates: `${gDate(s, v.allDay)}/${gDate(end, v.allDay)}`, details, location: v.location || '' })
    return `https://calendar.google.com/calendar/render?${q}`
}
const jitsi = () => `https://meet.jit.si/TRT-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`

const EMPTY = { category: 'meeting', projectId: null, title: '', description: '', start: null, end: null, color: 'blue', isPublic: false, allDay: false, location: '', meetingUrl: '', clientId: null, leadId: null, aboutType: 'client', attendeeIds: [], attendeeEmails: '', reminderBefore: '', reminderBeforeType: 'minutes', sendInvites: false, inviteClient: false }

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
            leadId: selected.leadId || null,
            aboutType: selected.leadId ? 'lead' : 'client',
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
    const hasGuests = v.attendeeIds.length > 0 || v.attendeeEmails.trim() || (v.aboutType === 'client' && v.clientId)

    const submit = (e) => {
        e.preventDefault()
        if (!v.title.trim()) return setError(tr("Event title is required"))
        if (!v.start) return setError(tr("Please select a start date"))
        if (v.end && v.end < v.start) return setError(tr("End must be after the start"))
        setError('')
        const noon = (d) => (d ? dayjs(d).hour(12).minute(0).second(0).millisecond(0).toDate() : null)
        const start = v.allDay ? noon(v.start) : v.start
        const end = v.allDay ? noon(v.end || v.start) : v.end
        onSubmit({
            title: v.title.trim(), description: v.description, start: start.toISOString(), end: end ? end.toISOString() : null, color: v.color, isPublic: v.isPublic,
            allDay: v.allDay, category: v.category, projectId: v.projectId, location: v.location, meetingUrl: v.meetingUrl.trim(), clientId: v.aboutType === 'client' ? v.clientId : null, leadId: v.aboutType === 'lead' ? v.leadId : null, attendeeIds: v.attendeeIds, attendeeEmails: v.attendeeEmails,
            reminderBefore: v.reminderBefore === '' ? null : Number(v.reminderBefore), reminderBeforeType: v.reminderBeforeType,
            sendInvites: v.sendInvites && !!hasGuests, inviteClient: v.sendInvites && v.inviteClient && v.aboutType === 'client' && !!v.clientId,
        })
    }

    return (
        <Dialog isOpen={open} width={680} height="min(calc(100vh - 48px), 860px)" contentClassName="flex flex-col overflow-hidden" onClose={onClose} onRequestClose={onClose}>
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2 pr-10">
                <h5 className="mr-auto">{readOnly ? tr("Event") : edit ? tr("Edit event") : tr("New event")}</h5>
                {edit && v.meetingUrl && <Button size="sm" variant="solid" icon={<TbVideo />} onClick={() => window.open(v.meetingUrl, '_blank', 'noopener')}>{tr("Join meeting")}</Button>}
                {edit && v.start && <Button size="sm" icon={<TbBrandGoogle />} onClick={() => window.open(googleLink(v), '_blank', 'noopener')}>{tr("Google Calendar")}</Button>}
                {edit && <Button size="sm" icon={<TbDownload />} onClick={() => { window.location.href = `/api/crm/calendar/ics?id=${selected.id}` }}>{tr(".ics")}</Button>}
            </div>
            {readOnly && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-700">{tr("You were invited to this event")}{selected.owner ? tr(" by {owner}", { owner: selected.owner }) : ''}{tr(". Only the organiser can change it.")}</p>}
            <Form className="flex min-h-0 flex-1 flex-col" containerClassName="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <fieldset disabled={readOnly || saving} className="contents">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                            <button key={c.value} type="button" onClick={() => set({ category: c.value })} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${v.category === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600'}`}><c.icon className="text-sm" />{c.label}</button>
                        ))}
                    </div>
                    <FormItem label={tr("Title")} invalid={!!error && !v.title.trim()} errorMessage={error}>
                        <Input type="text" autoComplete="off" placeholder={tr("Meeting with the client…")} value={v.title} onChange={(e) => set({ title: e.target.value })} />
                    </FormItem>
                    <div className="mb-3 flex items-center gap-2 text-sm"><Switcher checked={v.allDay} onChange={(c) => set({ allDay: c })} /> {tr("All day")}</div>
                    <FormItem label={tr("Date")}><DateTimeRange start={v.start} end={v.end} allDay={v.allDay} disabled={readOnly || saving} onChange={(r) => set(r)} /></FormItem>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label={v.aboutType === 'lead' ? tr("Lead") : tr("Client")}>
                            <div className="flex items-center gap-2">
                                <Segment size="sm" value={v.aboutType} onChange={(t) => { const x = Array.isArray(t) ? t[0] : t; if (x) set({ aboutType: x, inviteClient: false }) }}><Segment.Item value="client">{tr("Client")}</Segment.Item><Segment.Item value="lead">{tr("Lead")}</Segment.Item></Segment>
                                <div className="min-w-0 flex-1">
                                    {v.aboutType === 'lead'
                                        ? <RelationSelect key="lead" resource="leads" value={v.leadId} onChange={(id) => set({ leadId: id })} />
                                        : <RelationSelect key="client" resource="clients" value={v.clientId} onChange={(id) => set({ clientId: id, inviteClient: id ? v.inviteClient : false })} />}
                                </div>
                            </div>
                        </FormItem>
                        <FormItem label={tr("Team members")}>
                            <Select isMulti placeholder={tr("Add people")} options={staffOpts} value={staffOpts.filter((o) => v.attendeeIds.includes(o.value))} onChange={(o) => set({ attendeeIds: (o || []).map((x) => x.value) })} />
                        </FormItem>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label={tr("Project")}><RelationSelect resource="projects" value={v.projectId} onChange={(id) => set({ projectId: id })} /></FormItem>
                        <FormItem label={tr("Other guests (emails)")}><Input placeholder={tr("name@company.com, other@…")} value={v.attendeeEmails} onChange={(e) => set({ attendeeEmails: e.target.value })} /></FormItem>
                    </div>
                    <FormItem label={tr("Meeting link")}>
                        <div className="flex gap-2">
                            <Input placeholder={tr("https://meet.google.com/… or Zoom, Teams")} value={v.meetingUrl} onChange={(e) => set({ meetingUrl: e.target.value })} />
                            {!readOnly && <Button type="button" icon={<TbWand />} onClick={() => set({ meetingUrl: jitsi() })}>{tr("Create")}</Button>}
                        </div>
                        {!readOnly && <p className="mt-1 text-xs text-gray-400"><b>{tr("Create")}</b> {tr("makes a free video room (Jitsi). For Google Meet use")} <a className="text-primary underline" href="https://meet.new" target="_blank" rel="noreferrer">{tr("meet.new")}</a> {tr("and paste the link.")}</p>}
                    </FormItem>
                    <FormItem label={tr("Location")}><Input placeholder={tr("Office, address…")} value={v.location} onChange={(e) => set({ location: e.target.value })} /></FormItem>
                    <FormItem label={tr("Description")}><Input textArea rows={2} placeholder={tr("Agenda, notes…")} value={v.description} onChange={(e) => set({ description: e.target.value })} /></FormItem>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <FormItem label={tr("Colour")}>
                            <Select options={COLORS} value={COLORS.filter((o) => o.value === v.color)} components={{ Option: ColorOption, Control: ColorControl }} onChange={(o) => set({ color: o?.value || 'blue' })} />
                        </FormItem>
                        <FormItem label={tr("Reminder before")}>
                            <div className="flex gap-2">
                                <Input type="number" min="0" placeholder="—" value={v.reminderBefore} onChange={(e) => set({ reminderBefore: e.target.value })} />
                                <div className="w-36"><Select options={UNITS} value={UNITS.find((u) => u.value === v.reminderBeforeType)} onChange={(o) => set({ reminderBeforeType: o.value })} /></div>
                            </div>
                        </FormItem>
                    </div>
                    <div className="mb-2 flex items-center gap-2 text-sm"><Switcher checked={v.isPublic} onChange={(c) => set({ isPublic: c })} /> {tr("Visible to everyone in the team")}</div>
                    {hasGuests && !readOnly && (
                        <div className="mb-2 rounded-xl border border-gray-200 p-3 dark:border-gray-600">
                            <div className="flex items-center gap-2 text-sm"><Switcher checked={v.sendInvites} onChange={(c) => set({ sendInvites: c })} /><TbCalendarPlus className="text-lg" /> {tr("Email an invitation with the calendar file to guests")}</div>
                            {v.sendInvites && v.aboutType === 'client' && v.clientId && <div className="mt-2 flex items-center gap-2 text-sm"><Switcher checked={v.inviteClient} onChange={(c) => set({ inviteClient: c })} /> {tr("Also invite the client's main contact")}</div>}
                        </div>
                    )}
                </fieldset>
                </div>
                <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    {edit && !readOnly && <Button type="button" variant="plain" className="text-red-500" onClick={onDelete} disabled={saving}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2">
                        <Button type="button" onClick={onClose}>{readOnly ? tr("Close") : tr("Cancel")}</Button>
                        {!readOnly && <Button variant="solid" type="submit" loading={saving}>{edit ? tr("Save changes") : tr("Create event")}</Button>}
                    </div>
                </div>
            </Form>
        </Dialog>
    )
}

export default EventDialog

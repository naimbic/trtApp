import { useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { TbTargetArrow, TbUserCheck, TbFileInvoice, TbCash, TbFileText, TbPresentation, TbFileCertificate, TbBriefcase, TbLifebuoy, TbChecklist, TbNotes, TbEye, TbLogin, TbMail, TbCircleCheck, TbCircle, TbAlertTriangle, TbBell, TbTrash, TbExternalLink, TbUser } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import DatePicker from '@/components/ui/DatePicker'
import Switcher from '@/components/ui/Switcher'
import Tag from '@/components/ui/Tag'
import cn from '@/utils/classNames'
import { api, notify } from '../kit/api'
import { tr, trn } from '@/utils/t'

dayjs.extend(relativeTime)

const ICON = { lead: TbTargetArrow, converted: TbUserCheck, client: TbUser, invoice: TbFileInvoice, payment: TbCash, estimate: TbFileText, accepted: TbCircleCheck, proposal: TbPresentation, contract: TbFileCertificate, project: TbBriefcase, ticket: TbLifebuoy, task: TbChecklist, note: TbNotes, view: TbEye, login: TbLogin, mail: TbMail }
const TONE = { lead: 'bg-blue-100 text-blue-600', converted: 'bg-emerald-100 text-emerald-600', client: 'bg-emerald-100 text-emerald-600', invoice: 'bg-sky-100 text-sky-600', payment: 'bg-emerald-100 text-emerald-600', estimate: 'bg-amber-100 text-amber-600', accepted: 'bg-emerald-100 text-emerald-600', proposal: 'bg-purple-100 text-purple-600', contract: 'bg-pink-100 text-pink-600', project: 'bg-indigo-100 text-indigo-600', ticket: 'bg-purple-100 text-purple-600', task: 'bg-slate-100 text-slate-600', note: 'bg-amber-100 text-amber-600', view: 'bg-gray-100 text-gray-600', login: 'bg-gray-100 text-gray-600', mail: 'bg-sky-100 text-sky-600' }
const ATTN = { red: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10', amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10', blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-500/10', purple: 'border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-500/10', slate: 'border-gray-200 bg-gray-50 text-gray-700 dark:bg-gray-500/10' }
const GROUPS = [['all', tr("All")], ['money', tr("Billing")], ['sales', tr("Sales")], ['work', tr("Work")], ['notes', tr("Notes")], ['views', tr("Views & logins")]]
const GROUP_OF = { invoice: 'money', payment: 'money', mail: 'money', estimate: 'sales', proposal: 'sales', accepted: 'sales', contract: 'sales', lead: 'sales', converted: 'sales', client: 'sales', project: 'work', ticket: 'work', task: 'work', note: 'notes', view: 'views', login: 'views' }

export const Section = ({ title, action, children, className }) => (
    <div className={className}><div className="mb-3 flex items-center justify-between"><h6 className="text-gray-500">{title}</h6>{action}</div>{children}</div>
)
const when = (d) => (d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '')

/** Lead → client story: where the client came from and how fast each step happened. */
export const LeadJourney = ({ journey, lead }) => (
    <div>
        {lead && (
            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-blue-50 p-3 text-sm dark:bg-blue-500/10">
                <span className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300"><TbTargetArrow className="text-lg" />{tr("Came in as a lead")}{lead.link ? <Link to={lead.link} className="inline-flex items-center gap-1 underline">{lead.name}<TbExternalLink /></Link> : `: ${lead.name}`}</span>
                {lead.source && <span>{tr("Source")} <b>{lead.source}</b></span>}
                {lead.assigned && <span>{tr("Owner")} <b>{lead.assigned}</b></span>}
                {lead.daysToConvert !== null && <span>{tr("Converted after")} <b>{trn(lead.daysToConvert, "day")}</b></span>}
                {lead.notes > 0 && <span>{trn(lead.notes, "follow-up note")}</span>}
            </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {journey.map((s, i) => (
                <div key={s.key} className="relative">
                    <div className="flex items-center gap-2">{s.done ? <TbCircleCheck className="shrink-0 text-xl text-emerald-500" /> : <TbCircle className="shrink-0 text-xl text-gray-300" />}<span className={cn('text-sm font-semibold', !s.done && 'text-gray-400')}>{s.label}</span></div>
                    <div className="ml-7 mt-0.5 text-xs text-gray-500">{s.date ? dayjs(s.date).format('DD MMM YYYY') : s.done ? '' : tr("not yet")}</div>
                    {i < journey.length - 1 && <div className="absolute left-[10px] top-7 hidden h-px w-[calc(100%-1.5rem)] bg-transparent xl:block" />}
                </div>
            ))}
        </div>
    </div>
)

export const Attention = ({ items }) => (
    items.length ? (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {items.map((a, i) => (
                <Link key={i} to={a.link} className={cn('flex items-start gap-3 rounded-xl border p-3 text-sm transition hover:shadow', ATTN[a.tone] || ATTN.slate)}>
                    <TbAlertTriangle className="mt-0.5 shrink-0 text-lg" /><div className="min-w-0"><div className="font-semibold">{a.title}</div>{a.detail && <div className="truncate text-xs opacity-80">{a.detail}</div>}</div>
                </Link>
            ))}
        </div>
    ) : <p className="text-sm text-gray-500">{tr("Nothing needs attention. All invoices are settled and no work is waiting.")}</p>
)

/** Document views with the address they came from (proof that the client really looked at it). */
export const Engagement = ({ data, lastLogin }) => (
    <div>
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700/50"><div className="text-xl font-bold heading-text">{data.total}</div><div className="text-xs text-gray-500">{tr("document views")}</div></div>
            <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700/50"><div className="text-xl font-bold heading-text">{data.ips}</div><div className="text-xs text-gray-500">{tr("IP addresses")}</div></div>
            <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-700/50"><div className="text-sm font-bold heading-text">{data.last ? dayjs(data.last).fromNow() : '—'}</div><div className="text-xs text-gray-500">{tr("last viewed")}</div></div>
        </div>
        {lastLogin && <p className="mb-3 text-sm text-gray-500"><TbLogin className="mr-1 inline" />{tr("Last client-area login")} <b className="text-gray-700 dark:text-gray-200">{lastLogin.name}</b> · {when(lastLogin.date)}{lastLogin.ip && <> · <span className="font-mono">{lastLogin.ip}</span></>}</p>}
        {data.byDoc.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.byDoc.map((d) => (
                    <Link key={d.docId} to={d.link} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary">
                        <span className="flex min-w-0 items-center gap-2"><TbEye className="shrink-0 text-gray-400" /><span className="truncate font-semibold">{d.type} {d.label}</span></span>
                        <span className="shrink-0 text-xs text-gray-500">{d.views}× · {d.ips} {tr("IP ·")} {dayjs(d.last).format('DD MMM YYYY')}</span>
                    </Link>
                ))}
            </div>
        ) : <p className="text-sm text-gray-500">{tr("The client has not opened any invoice, estimate or proposal link yet.")}</p>}
    </div>
)

export const Reminders = ({ items, clientId, onChanged, canEdit }) => {
    const del = async (id) => { try { await api(`/api/crm/customers/${clientId}/follow-up?reminderId=${id}`, { method: 'DELETE' }); onChanged() } catch (e) { notify('danger', e.message) } }
    if (!items.length) return <p className="text-sm text-gray-500">{tr("No reminders. Use “Follow up” to schedule one.")}</p>
    return (
        <div className="space-y-2">
            {items.map((r) => (
                <div key={r.id} className="group flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-600">
                    <TbBell className={cn('mt-0.5 shrink-0 text-lg', dayjs(r.date).isBefore(dayjs()) ? 'text-gray-400' : 'text-amber-500')} />
                    <div className="min-w-0 flex-1"><div className="font-semibold">{r.description}</div><div className="text-xs text-gray-500">{when(r.date)}{r.staff ? ` · ${r.staff}` : ''}</div></div>
                    {canEdit && <button className="hidden text-red-500 group-hover:block" onClick={() => del(r.id)}><TbTrash /></button>}
                </div>
            ))}
        </div>
    )
}

export const Timeline = ({ items }) => {
    const [group, setGroup] = useState('all')
    const list = items.filter((e) => group === 'all' || GROUP_OF[e.type] === group)
    const days = {}
    for (const e of list) (days[dayjs(e.date).format('YYYY-MM-DD')] ||= []).push(e)
    const label = Object.fromEntries(GROUPS)
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Segment size="sm" value={group} onChange={(v) => setGroup(Array.isArray(v) ? v[0] : v)}>{GROUPS.map(([v, l]) => <Segment.Item key={v} value={v}>{l}</Segment.Item>)}</Segment>
                <span className="text-sm text-gray-500">{trn(list.length, "event")}</span>
            </div>
            {Object.entries(days).map(([day, evs]) => (
                <div key={day} className="mb-5">
                    <div className="mb-2 text-xs font-semibold uppercase text-gray-500">{dayjs(day).format('dddd, DD MMMM YYYY')}</div>
                    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-600">
                        {evs.map((e) => {
                            const Icon = ICON[e.type] || TbCircle
                            const row = (
                                <div className="grid grid-cols-[3rem_2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm">
                                    <span className="text-xs tabular-nums text-gray-400">{dayjs(e.date).format('HH:mm')}</span>
                                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-base', TONE[e.type] || 'bg-gray-100 text-gray-600')}><Icon /></span>
                                    <span className="min-w-0"><span className="block truncate font-semibold heading-text">{e.title}</span>{e.detail && <span className="block truncate text-xs text-gray-500">{e.detail}</span>}</span>
                                    <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 sm:inline">{label[GROUP_OF[e.type]] || tr("Other")}</span>
                                </div>
                            )
                            return e.link ? <Link key={e.id} to={e.link} className="block transition hover:bg-gray-50 dark:hover:bg-gray-700/40">{row}</Link> : <div key={e.id}>{row}</div>
                        })}
                    </div>
                </div>
            ))}
            {!list.length && <p className="py-10 text-center text-gray-500">{tr("Nothing here yet.")}</p>}
        </div>
    )
}

export const FollowUpDialog = ({ open, onClose, clientId, onSaved, initialType = 'note' }) => {
    const [type, setType] = useState(initialType)
    const [text, setText] = useState('')
    const [date, setDate] = useState(dayjs().add(1, 'day').hour(9).minute(0).toDate())
    const [mail, setMail] = useState(true)
    const [saving, setSaving] = useState(false)
    const save = async () => {
        setSaving(true)
        try {
            await api(`/api/crm/customers/${clientId}/follow-up`, { method: 'POST', body: { type, description: text, date: type === 'reminder' ? date : undefined, notifyByEmail: mail } })
            notify('success', type === 'note' ? tr("Note added") : tr("Reminder set")); setText(''); onSaved(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    return (
        <Dialog isOpen={open} width={520} onClose={onClose} onRequestClose={onClose}>
            <h4>{tr("Follow up")}</h4>
            <div className="mt-4 space-y-4">
                <Segment value={type} onChange={(v) => setType(Array.isArray(v) ? v[0] : v)}><Segment.Item value="note">{tr("Note")}</Segment.Item><Segment.Item value="reminder">{tr("Reminder")}</Segment.Item></Segment>
                <Input textArea rows={4} autoFocus placeholder={type === 'note' ? tr("What was said or agreed?") : tr("What should you remember to do?")} value={text} onChange={(e) => setText(e.target.value)} />
                {type === 'reminder' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className="form-label mb-2 block">{tr("Remind me on")}</label><DatePicker.DateTimepicker value={date} onChange={setDate} /></div>
                        <label className="flex items-end gap-2 pb-2 text-sm"><Switcher checked={mail} onChange={setMail} />{tr("Also by email")}</label>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>{tr("Cancel")}</Button><Button variant="solid" loading={saving} disabled={!text.trim()} onClick={save}>{type === 'note' ? tr("Add note") : tr("Set reminder")}</Button></div>
        </Dialog>
    )
}

export const QuickAction = ({ icon, label, onClick, href }) => (
    <button type="button" onClick={() => (href ? (window.location.href = href) : onClick?.())} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-left text-sm font-semibold transition hover:border-primary hover:text-primary dark:border-gray-600"><span className="text-lg">{icon}</span>{label}</button>
)
export { Tag }

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TbTrash, TbSend, TbMail, TbPhone, TbArrowBackUp, TbLock, TbCircleCheck, TbRefresh, TbChecklist, TbBellPlus, TbRobot, TbStarFilled, TbX, TbBell } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import RichEditor from '@/components/crm/RichEditor'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import Switcher from '@/components/ui/Switcher'
import Dialog from '@/components/ui/Dialog'
import DatePicker from '@/components/ui/DatePicker'
import TaskDrawer from '../tasks/TaskDrawer'
import { remindIn } from '../tasks/shared'
import cn from '@/utils/classNames'
import { api, notify, upload } from '../kit/api'
import { useTicketFiles, AttachButtons, FileTray, DropHint, AttachmentList, messageForm } from '@/components/crm/TicketFiles'
import { initials } from '../tasks/shared'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">{children}</label>
// legacy ticket messages are HTML from the old helpdesk: drop scripts, styles and event handlers
const clean = (h) => String(h || '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '').replace(/javascript:/gi, '')

const TicketView = () => {
    const { id } = useParams()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [reply, setReply] = useState('')
    const [notify_, setNotify] = useState(true)
    const [replyStatus, setReplyStatus] = useState(null)
    const [internal, setInternal] = useState(false)
    const tf = useTicketFiles({ notify })
    const [sending, setSending] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [taskPopup, setTaskPopup] = useState({ open: false, k: 0 })
    const [remind, setRemind] = useState(null) // { date, note }
    const end = useRef(null)

    const load = useCallback(async () => {
        try { setD(await api(`/api/crm/support/tickets/${id}`)) } catch (e) { notify('danger', e.message); nav('/crm/tickets') }
    }, [id, nav])
    useEffect(() => { setD(null); load() }, [load])
    useEffect(() => { if (d) end.current?.scrollIntoView({ block: 'nearest' }) }, [d?.thread.length]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!d) return <Container><div className="flex justify-center py-20"><Spinner size={40} /></div></Container>
    const { ticket: t, thread, lookups: lk } = d
    const opt = (list) => list.map((x) => ({ value: x.id, label: x.name }))
    const pick = (list, v) => opt(list).find((o) => o.value === v) || null
    const status = lk.statuses.find((s) => s.id === t.statusId)
    const isClosed = status?.legacyId === 5
    const patch = async (body, ok) => { try { await api(`/api/crm/support/tickets/${id}`, { method: 'PUT', body }); if (ok) notify('success', ok); await load() } catch (e) { notify('danger', e.message) } }
    const send = async (close = false) => {
        setSending(true)
        try {
            const r = await upload(`/api/crm/support/tickets/${id}/reply`, messageForm({ message: reply, statusId: replyStatus, notify: notify_, internal, close }, tf.files))
            setReply(''); setReplyStatus(null); tf.clear()
            if (internal) notify('success', tr("Internal note added"))
            else if (r.mail && !r.mail.sent) notify('warning', tr("Reply saved, but the email was not sent: {v1}", { v1: r.mail.error || 'unknown error' }))
            else notify('success', close ? tr("Reply sent and ticket closed") : r.mail ? tr("Reply sent") : tr("Reply saved"))
            await load()
        } catch (e) { notify('danger', e.message) } finally { setSending(false) }
    }
    const confirmRun = async () => {
        const c = confirm; setConfirm(null)
        try {
            if (c.type === 'ticket') { await api(`/api/crm/support/tickets/${id}`, { method: 'DELETE' }); notify('success', tr("Ticket deleted")); nav('/crm/tickets') }
            else { await api(`/api/crm/support/tickets/${id}/reply?replyId=${c.id}`, { method: 'DELETE' }); notify('success', tr("Reply deleted")); load() }
        } catch (e) { notify('danger', e.message) }
    }

    const addReminder = async () => {
        try { await api(`/api/crm/support/tickets/${id}/reminder`, { method: 'POST', body: { date: new Date(remind.date).toISOString(), note: remind.note } }); setRemind(null); notify('success', tr("Reminder set")); await load() } catch (e) { notify('danger', e.message) }
    }
    const dropReminder = async (rid) => { try { await api(`/api/crm/support/tickets/${id}/reminder?reminderId=${rid}`, { method: 'DELETE' }); await load() } catch (e) { notify('danger', e.message) } }
    const taskPreset = { name: `${tr("Ticket")} #${t.number}: ${t.subject}`, description: `${tr("From the ticket")} #${t.number}: ${window.location.origin}/crm/tickets/${t.id}`, relType: 'ticket', relId: t.id, assigneeIds: t.assignedId ? [t.assignedId] : [] }

    return (
        <Container>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
                <div className="min-w-0">
                    <div className="mb-1 text-sm text-gray-500"><Link to="/crm/tickets" className="hover:text-primary">{tr("Tickets")}</Link> · #{t.number}</div>
                    <h3 className="break-words">{t.subject}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        {status && <span className="inline-flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200"><span className="h-2 w-2 rounded-full" style={{ background: status.color }} />{status.name}</span>}
                        <span>{tr("Opened")} {dayjs(t.createdAt).format('DD MMM YYYY, HH:mm')}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {d.can.createTask && <Button size="sm" icon={<TbChecklist />} onClick={() => setTaskPopup((p) => ({ open: true, k: p.k + 1 }))}>{tr("Create a task")}</Button>}
                    <Button size="sm" icon={<TbBellPlus />} onClick={() => setRemind({ date: dayjs().add(1, 'day').hour(9).minute(0).second(0).toDate(), note: '' })}>{tr("Remind me")}</Button>
                    {d.can.edit && (isClosed ? d.openStatusId && <Button size="sm" icon={<TbRefresh />} onClick={() => patch({ statusId: d.openStatusId }, tr("Ticket reopened"))}>{tr("Reopen")}</Button> : d.closedStatusId && <Button size="sm" icon={<TbCircleCheck />} onClick={() => patch({ statusId: d.closedStatusId }, tr("Ticket closed"))}>{tr("Close ticket")}</Button>)}
                    {d.can.delete && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm({ type: 'ticket' })}>{tr("Delete")}</Button>}
                </div>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="min-w-0 flex-1 space-y-4">
                    {thread.map((m) => (
                        <div key={m.id} className={cn('flex gap-3', m.staff && 'flex-row-reverse')}>
                            <Avatar size={36} shape="circle" src={m.staff?.image || undefined} className={m.staff ? 'bg-primary text-white' : ''}>{initials(m.name)}</Avatar>
                            <div className={cn('group max-w-[88%] rounded-2xl p-4', m.internal ? 'rounded-tr-sm border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : m.staff ? 'rounded-tr-sm bg-primary/10 dark:bg-primary/20' : 'rounded-tl-sm bg-gray-100 dark:bg-gray-700/50')}>
                                <div className="mb-2 flex items-center justify-between gap-4 text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{m.name}{m.staff ? tr(" · team") : ''}{m.first ? tr(" · opened the ticket") : ''}{m.auto && <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-600"><TbRobot />{tr("automatic message")}</span>}{m.internal && <span className="ml-2 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><TbLock />{tr("internal note, only your team sees this")}</span>}</span><span className="flex items-center gap-2">{dayjs(m.date).format('DD MMM YYYY, HH:mm')}{!m.first && d.can.delete && <button className="hidden text-red-500 group-hover:inline" title={tr("Delete reply")} onClick={() => setConfirm({ type: 'reply', id: m.id })}><TbTrash /></button>}</span></div>
                                <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: clean(m.html) }} />
                                <AttachmentList items={m.attachments} />
                            </div>
                        </div>
                    ))}
                    <div ref={end} />

                    {d.can.reply && (
                        <div className="relative" {...tf.dropProps}>
                            <DropHint tf={tf} />
                            <Card className={internal ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-500/5' : ''}>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <h5 className="flex items-center gap-2">{internal ? <><TbLock className="text-amber-600" />{tr("Internal note")}</> : tr("Reply")}</h5>
                                    {lk.predefined.length > 0 && <div className="w-56"><Select size="sm" isClearable placeholder={tr("Insert a saved reply")} options={lk.predefined.map((r) => ({ value: r.id, label: r.name }))} value={null} onChange={(o) => { const r = lk.predefined.find((x) => x.id === o?.value); if (r) setReply((x) => (x ? `${x}\n\n${r.message}` : r.message)) }} /></div>}
                                </div>
                                <div onPaste={tf.onPaste}><RichEditor minHeight={140} images={false} mentions={internal} placeholder={internal ? tr("Write a note for your team (the client never sees it)") : tr("Write your reply. Paste a screenshot (Ctrl+V) or drop files here.")} value={reply} onChange={setReply} /></div>
                                <FileTray tf={tf} />
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <AttachButtons tf={tf} />
                                    {!internal && <div className="w-48"><Select size="sm" isClearable placeholder={tr("Status: Answered")} options={opt(lk.statuses)} value={pick(lk.statuses, replyStatus)} onChange={(o) => setReplyStatus(o?.value || null)} /></div>}
                                    <label className="flex items-center gap-2 text-sm"><Switcher checked={internal} onChange={setInternal} />{tr("Internal note")}</label>
                                    {!internal && <label className="flex items-center gap-2 text-sm"><Switcher checked={notify_} onChange={setNotify} />{tr("Email the client")}</label>}
                                    <div className="ml-auto flex items-center gap-2">
                                        {!internal && d.closedStatusId && !isClosed && <Button disabled={sending || (!reply.trim() && !tf.items.length)} onClick={() => send(true)}>{tr("Send and close")}</Button>}
                                        <Button variant="solid" icon={internal ? <TbLock /> : <TbSend />} loading={sending} disabled={!reply.trim() && !tf.items.length} onClick={() => send(false)}>{internal ? tr("Add note") : tr("Send reply")}</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                <div className="space-y-4 lg:w-[320px] lg:shrink-0">
                    <Card>
                        <h5 className="mb-4">{tr("Details")}</h5>
                        <div className="space-y-4">
                            <div><L>{tr("Status")}</L><Select isDisabled={!d.can.edit} options={opt(lk.statuses)} value={pick(lk.statuses, t.statusId)} onChange={(o) => patch({ statusId: o.value }, tr("Status updated"))} /></div>
                            <div><L>{tr("Priority")}</L><Select isDisabled={!d.can.edit} isClearable options={opt(lk.priorities)} value={pick(lk.priorities, t.priorityId)} onChange={(o) => patch({ priorityId: o?.value || null })} /></div>
                            <div><L>{tr("Department")}</L><Select isDisabled={!d.can.edit} isClearable options={opt(lk.departments)} value={pick(lk.departments, t.departmentId)} onChange={(o) => patch({ departmentId: o?.value || null })} /></div>
                            {lk.services.length > 0 && <div><L>{tr("Service")}</L><Select isDisabled={!d.can.edit} isClearable options={opt(lk.services)} value={pick(lk.services, t.serviceId)} onChange={(o) => patch({ serviceId: o?.value || null })} /></div>}
                            <div><L>{tr("Assigned to")}</L><Select isDisabled={!d.can.edit} isClearable options={opt(lk.staff)} value={pick(lk.staff, t.assignedId)} onChange={(o) => patch({ assignedId: o?.value || null }, o ? tr("Assigned") : tr("Unassigned"))} /></div>
                        </div>
                    </Card>
                    <Card>
                        <h5 className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2"><TbChecklist />{tr("Tasks")}</span>{d.can.createTask && <button type="button" className="text-xs font-normal text-primary hover:underline" onClick={() => setTaskPopup((p) => ({ open: true, k: p.k + 1 }))}>{tr("Create a task")}</button>}</h5>
                        {d.tasks.length ? <div className="space-y-1.5">{d.tasks.map((k) => <Link key={k.id} to={`/crm/tasks/${k.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm hover:text-primary dark:bg-gray-700/40"><span className="truncate">{k.name}</span><span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', k.status === 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700')}>{k.status === 5 ? tr("Complete") : tr("Open")}</span></Link>)}</div> : <p className="text-sm text-gray-400">{tr("No task for this ticket yet.")}</p>}
                    </Card>
                    <Card>
                        <h5 className="mb-3 flex items-center gap-2"><TbBell />{tr("My reminders")}</h5>
                        {d.reminders.length ? <div className="space-y-1.5">{d.reminders.map((r) => { const g = remindIn(r.date); return <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-gray-700/40"><span className="min-w-0"><span className="block truncate font-semibold">{dayjs(r.date).format('DD MMM YYYY, HH:mm')}{!r.done && <span className={`ms-1 rounded-full px-1.5 py-px text-[10px] font-bold ${g.tone}`}>{g.text}</span>}</span>{r.note && <span className="block truncate text-xs text-gray-500">{r.note}</span>}{r.done && <span className="text-xs text-emerald-600">{tr("Sent")}</span>}</span><button type="button" aria-label={tr("Remove")} className="shrink-0 text-gray-400 hover:text-red-500" onClick={() => dropReminder(r.id)}><TbX /></button></div> })}</div> : <p className="text-sm text-gray-400">{tr("No reminder on this ticket.")}</p>}
                    </Card>
                    {t.rating && (
                        <Card>
                            <h5 className="mb-2">{tr("Client satisfaction")}</h5>
                            <div className="flex items-center gap-1 text-xl text-amber-400">{[1, 2, 3, 4, 5].map((n) => <TbStarFilled key={n} className={n <= t.rating ? '' : 'text-gray-300'} />)}<span className="ms-2 text-sm font-semibold text-gray-600">{t.rating}/5</span></div>
                            {t.ratingComment && <p className="mt-2 text-sm italic text-gray-500">“{t.ratingComment}”</p>}
                        </Card>
                    )}
                    <Card>
                        <h5 className="mb-4">{tr("Client")}</h5>
                        <div className="space-y-2 text-sm">
                            {t.client ? <Link className="font-semibold hover:text-primary" to={`/crm/clients/${t.client.id}`}>{t.client.company}</Link> : <span className="text-gray-500">{tr("No client record")}</span>}
                            {t.contact && <div className="font-semibold heading-text">{t.contact.name}</div>}
                            {t.contact?.email && <div className="flex items-center gap-2 text-gray-500"><TbMail />{t.contact.email}</div>}
                            {t.contact?.phone && <div className="flex items-center gap-2 text-gray-500"><TbPhone />{t.contact.phone}</div>}
                            {t.project && <div className="pt-2"><L>{tr("Project")}</L><Link className="hover:text-primary" to={`/crm/projects/${t.project.id}`}>{t.project.name}</Link></div>}
                            {t.lastReply && <div className="flex items-center gap-2 pt-2 text-xs text-gray-400"><TbArrowBackUp />{tr("Last reply")} {dayjs(t.lastReply).format('DD MMM YYYY, HH:mm')}</div>}
                        </div>
                    </Card>
                </div>
            </div>

            <TaskDrawer open={taskPopup.open} id={null} staff={lk.staff} refreshKey={taskPopup.k} presets={taskPreset} onClose={() => setTaskPopup((p) => ({ ...p, open: false }))} onChanged={load} />
            <Dialog isOpen={!!remind} width={460} onClose={() => setRemind(null)} onRequestClose={() => setRemind(null)}>
                <h5 className="mb-1">{tr("Remind me about this ticket")}</h5>
                <p className="mb-4 text-sm text-gray-500">{tr("Only you are told: on the bell, by email and on Telegram or WhatsApp (if set in your profile) at the first run of the automatic tasks after that time.")}</p>
                {remind && (
                    <div className="space-y-3">
                        <div><L>{tr("Date and time")}</L><DatePicker.DateTimepicker value={remind.date} onChange={(x) => setRemind({ ...remind, date: x || remind.date })} /></div>
                        <div><L>{tr("Note (optional)")}</L><Input textArea rows={2} value={remind.note} onChange={(e) => setRemind({ ...remind, note: e.target.value })} /></div>
                    </div>
                )}
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setRemind(null)}>{tr("Cancel")}</Button><Button variant="solid" onClick={addReminder}>{tr("Set the reminder")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!confirm} type="danger" title={confirm?.type === 'ticket' ? tr("Delete this ticket?") : tr("Delete this reply?")} confirmText={tr("Delete")} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={confirmRun}>
                <p>{confirm?.type === 'ticket' ? tr("The ticket, all its replies and attachments are removed for good.") : tr("This reply is removed from the conversation for good.")}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default TicketView

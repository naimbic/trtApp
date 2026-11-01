import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbCalendarTime, TbPlus, TbSend, TbPencil, TbTrash, TbRepeat, TbUsers, TbUserShield, TbMessages } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import cn from '@/utils/classNames'
import { api, notify, useCan } from '../kit/api'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const AUD = { team: ['The Team room (everybody sees it)', <TbMessages key="t" />], admins: ['Private message to each administrator', <TbUserShield key="a" />], all: ['Private message to each team member', <TbUsers key="l" />], selected: ['Private message to chosen people', <TbUsers key="s" />] }
const REP = { none: 'Once', daily: 'Every day', weekdays: 'Every weekday (Mon to Fri)', weekly: 'Every week', monthly: 'Every month' }
const local = (d) => dayjs(d).format('YYYY-MM-DDTHH:mm')
const soon = () => local(dayjs().add(1, 'hour').startOf('hour'))

const ScheduledMessages = () => {
    const can = useCan()
    const [d, setD] = useState(null)
    const [dlg, setDlg] = useState(null)
    const [del, setDel] = useState(null)
    const [busy, setBusy] = useState(false)
    const load = useCallback(() => api('/api/crm/scheduled-messages').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const staff = d?.staff || []
    const staffOpts = useMemo(() => staff.map((s) => ({ value: s.id, label: s.name })), [staff])
    const audOpts = Object.entries(AUD).map(([value, [label]]) => ({ value, label: tr(label) }))
    const repOpts = Object.entries(REP).map(([value, label]) => ({ value, label: tr(label) }))
    const open = (m) => setDlg(m ? { id: m.id, title: m.title, body: m.body, audience: m.audience, staffIds: m.staffIds, repeat: m.repeat, sendAt: m.nextAt ? local(m.nextAt) : soon() } : { title: '', body: '', audience: 'team', staffIds: [], repeat: 'none', sendAt: soon() })
    const save = async () => {
        setBusy(true)
        try { await api(dlg.id ? `/api/crm/scheduled-messages/${dlg.id}` : '/api/crm/scheduled-messages', { method: dlg.id ? 'PUT' : 'POST', body: { ...dlg, sendAt: new Date(dlg.sendAt).toISOString() } }); notify('success', tr("Message saved")); setDlg(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const patch = (m, body) => api(`/api/crm/scheduled-messages/${m.id}`, { method: 'PUT', body }).then(load).catch((e) => notify('danger', e.message))
    const sendNow = (m) => api(`/api/crm/scheduled-messages/${m.id}`, { method: 'POST' }).then((r) => { notify('success', tr("Sent to {n} conversation(s)", { n: r.sent })); load() }).catch((e) => notify('danger', e.message))
    return (
        <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="flex items-center gap-2"><TbCalendarTime className="text-primary" />{tr("Scheduled messages")}</h3><p className="max-w-3xl text-sm text-gray-500">{tr("Messages the CRM posts in the team chat by itself at the date and time you choose, once or repeating: announcements, rules, reminders, the weekly meeting. They appear as sent by you.")}</p></div>
                {can('scheduled_messages', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New message")}</Button>}
            </div>
            {!d ? <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p> : !d.list.length ? <Card><p className="py-8 text-center text-gray-400">{tr("No scheduled message yet.")}</p></Card> : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {d.list.map((m) => (
                        <Card key={m.id} className={cn(!m.active && 'opacity-60')}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2"><b className="text-base">{m.title}</b><span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{AUD[m.audience]?.[1]}{m.audience === 'selected' ? `${m.staffIds.length} ${tr("people")}` : tr(AUD[m.audience]?.[0].split(' (')[0])}</span><span className="inline-flex items-center gap-1 text-xs text-gray-500"><TbRepeat />{tr(REP[m.repeat])}</span></div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{m.body.length > 220 ? `${m.body.slice(0, 220)}…` : m.body}</p>
                                    <p className="mt-2 text-xs text-gray-500">{m.active && m.nextAt ? `${tr("Next")}: ${dayjs(m.nextAt).format('DD MMM YYYY, HH:mm')}` : tr("Done or switched off")}{m.lastSentAt ? ` · ${tr("last sent")} ${dayjs(m.lastSentAt).format('DD MMM, HH:mm')} (${m.sentCount}×)` : ''}</p>
                                </div>
                                {can('scheduled_messages', 'edit') && <Switcher checked={m.active} onChange={(v) => patch(m, { active: v })} />}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {can('scheduled_messages', 'edit') && <Button size="xs" icon={<TbSend />} onClick={() => sendNow(m)}>{tr("Send now")}</Button>}
                                {can('scheduled_messages', 'edit') && <Button size="xs" icon={<TbPencil />} onClick={() => open(m)}>{tr("Edit")}</Button>}
                                {can('scheduled_messages', 'delete') && <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(m)}>{tr("Delete")}</Button>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <Dialog isOpen={!!dlg} width={640} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-4">{dlg?.id ? tr("Edit the message") : tr("New scheduled message")}</h5>
                {dlg && (
                    <div className="space-y-3">
                        <div><L>{tr("Title (only you see it)")}</L><Input autoFocus value={dlg.title} placeholder={tr("Monday meeting")} onChange={(e) => setDlg({ ...dlg, title: e.target.value })} /></div>
                        <div><L>{tr("Message")}</L><Input textArea rows={4} value={dlg.body} placeholder={tr("Good morning team, the weekly meeting is at 10:00 on meet.trtcrm.com/internal")} onChange={(e) => setDlg({ ...dlg, body: e.target.value })} /><p className="mt-1 text-end text-xs text-gray-400">{dlg.body.length}/2000</p></div>
                        <div><L>{tr("Send to")}</L><Select size="sm" isSearchable={false} options={audOpts} value={audOpts.find((o) => o.value === dlg.audience)} onChange={(o) => setDlg({ ...dlg, audience: o.value })} /></div>
                        {dlg.audience === 'selected' && <div><L>{tr("People")}</L><Select size="sm" isMulti options={staffOpts} value={staffOpts.filter((o) => dlg.staffIds.includes(o.value))} onChange={(o) => setDlg({ ...dlg, staffIds: (o || []).map((x) => x.value) })} /></div>}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div><L>{dlg.repeat === 'none' ? tr("Send on") : tr("First time, at")}</L><Input type="datetime-local" value={dlg.sendAt} onChange={(e) => setDlg({ ...dlg, sendAt: e.target.value })} /></div>
                            <div><L>{tr("Repeat")}</L><Select size="sm" isSearchable={false} options={repOpts} value={repOpts.find((o) => o.value === dlg.repeat)} onChange={(o) => setDlg({ ...dlg, repeat: o.value })} /></div>
                        </div>
                        <p className="text-xs text-gray-400">{tr("It goes out at the first run of the automatic tasks after that time (Settings → Cron job), so they must run often, for example every 5 minutes.")}</p>
                    </div>
                )}
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setDlg(null)}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} onClick={save}>{tr("Save")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this message?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const m = del; setDel(null); api(`/api/crm/scheduled-messages/${m.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("Message deleted")); load() }).catch((e) => notify('danger', e.message)) }}><p>{del?.title}</p></ConfirmDialog>
        </Container>
    )
}

export default ScheduledMessages

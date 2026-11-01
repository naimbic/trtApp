import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbMessage, TbSend2, TbLink, TbCalendarTime, TbPlus, TbSend, TbPencil, TbTrash, TbRepeat, TbUsers, TbUserShield, TbMessages } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RichEditor from '@/components/crm/RichEditor'
import RelationSelect from '../kit/RelationSelect'
import Segment from '@/components/ui/Segment'
import FoldSection from '@/components/crm/FoldSection'
import cn from '@/utils/classNames'
import { api, notify, useCan } from '../kit/api'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const AUD = { team: ['The Team room (everybody sees it)', <TbMessages key="t" />], admins: ['Private message to each administrator', <TbUserShield key="a" />], all: ['Private message to each team member', <TbUsers key="l" />], selected: ['Private message to chosen people', <TbUsers key="s" />] }
const REP = { none: 'Once', daily: 'Every day', weekdays: 'Every weekday (Mon to Fri)', weekly: 'Every week', monthly: 'Every month', custom: 'Custom…' }
const UNIT = { day: 'day(s)', week: 'week(s)', month: 'month(s)', year: 'year(s)' }
// "Every 2 weeks, 5 times"
const repLabel = (r, every, unit, cycles) => `${r === 'custom' ? `${tr("Every")} ${every} ${tr(UNIT[unit] || unit)}` : tr(REP[r])}${r !== 'none' && cycles > 0 ? `, ${cycles} ${tr("time(s)")}` : ''}`
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const local = (d) => dayjs(d).format('YYYY-MM-DDTHH:mm')
const soon = () => local(dayjs().add(1, 'hour').startOf('hour'))

const ScheduledMessages = () => {
    const can = useCan()
    const [d, setD] = useState(null)
    const [dlg, setDlg] = useState(null)
    const [del, setDel] = useState(null)
    const [busy, setBusy] = useState(false)
    const [sec, setSec] = useState('msg') // the open section of the form: one at a time
    const toggle = (k) => setSec((x) => (x === k ? '' : k))
    const load = useCallback(() => api('/api/crm/scheduled-messages').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const staff = d?.staff || []
    const staffOpts = useMemo(() => staff.map((s) => ({ value: s.id, label: s.name })), [staff])
    const audOpts = Object.entries(AUD).map(([value, [label]]) => ({ value, label: tr(label) }))
    const unitOpts = Object.entries(UNIT).map(([value, label]) => ({ value, label: tr(label) }))
    const repOpts = Object.entries(REP).map(([value, label]) => ({ value, label: tr(label) }))
    const open = (m) => { setSec('msg'); setDlg(m ? { id: m.id, title: m.title, rich: m.rich || (m.body ? `<p>${m.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').split('\n').join('</p><p>')}</p>` : ''), assigneeIds: m.assigneeIds || [], clientId: m.clientId || null, leadId: m.leadId || null, aboutType: m.leadId ? 'lead' : 'client', emailClient: !!m.emailClient, makeTask: !!m.makeTask, audience: m.audience, staffIds: m.staffIds, repeat: m.repeat, every: m.every || 1, unit: m.unit || 'day', cycles: m.cycles || '', sendAt: m.nextAt ? local(m.nextAt) : soon() } : { title: '', rich: '', assigneeIds: [], clientId: null, leadId: null, aboutType: 'client', emailClient: false, makeTask: false, audience: 'team', staffIds: [], repeat: 'none', every: 1, unit: 'day', cycles: '', sendAt: soon() }) }
    const save = async () => {
        setBusy(true)
        try { await api(dlg.id ? `/api/crm/scheduled-messages/${dlg.id}` : '/api/crm/scheduled-messages', { method: dlg.id ? 'PUT' : 'POST', body: { ...dlg, body: undefined, aboutType: undefined, every: Number(dlg.every) || 1, cycles: dlg.cycles === '' ? 0 : Number(dlg.cycles), sendAt: new Date(dlg.sendAt).toISOString() } }); notify('success', tr("Message saved")); setDlg(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
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
                                    <div className="flex flex-wrap items-center gap-2"><b className="text-base">{m.title}</b><span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{AUD[m.audience]?.[1]}{m.audience === 'selected' ? `${m.staffIds.length} ${tr("people")}` : tr(AUD[m.audience]?.[0].split(' (')[0])}</span><span className="inline-flex items-center gap-1 text-xs text-gray-500"><TbRepeat />{repLabel(m.repeat, m.every, m.unit, m.cycles)}{m.cycles > 0 && m.repeat !== 'none' ? ` · ${m.runs || 0}/${m.cycles}` : ''}</span></div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{m.body.length > 220 ? `${m.body.slice(0, 220)}…` : m.body}{m.rich && /<img/i.test(m.rich) ? ' 🖼' : ''}</p>
                                    {(m.assigneeIds.length > 0 || m.makeTask || m.clientId || m.leadId) && <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">{m.assigneeIds.length > 0 && <span className="rounded-full bg-gray-200 px-1.5 py-0.5 dark:bg-gray-600">👥 {m.assigneeIds.map((id) => staff.find((s) => s.id === id)?.name?.split(' ')[0]).filter(Boolean).join(', ')}</span>}{m.makeTask && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{tr("Task")}</span>}{(m.clientId || m.leadId) && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-sky-700">{m.emailClient ? (m.leadId ? tr("Lead emailed") : tr("Client emailed")) : m.leadId ? tr("Lead") : tr("Client")}</span>}</div>}
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
            <Dialog isOpen={!!dlg} width={600} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-3">{dlg?.id ? tr("Edit the message") : tr("New scheduled message")}</h5>
                {dlg && (
                    <div className="max-h-[70vh] space-y-2 overflow-y-auto pe-1">
                        <FoldSection icon={<TbMessage />} tone="blue" title={tr("Message")} summary={dlg.title || plain(dlg.rich).slice(0, 60)} open={sec === 'msg'} onToggle={() => toggle('msg')}>
                            <div className="space-y-2.5">
                                <div><L>{tr("Title (only you see it)")}</L><Input size="sm" autoFocus value={dlg.title} placeholder={tr("Monday meeting")} onChange={(e) => setDlg({ ...dlg, title: e.target.value })} /></div>
                                <div><L>{tr("Message")}</L><RichEditor minHeight={90} value={dlg.rich} onChange={(html) => setDlg((x) => ({ ...x, rich: html }))} placeholder={tr("Good morning team, the weekly meeting is at 10:00 on meet.trtcrm.com/internal")} /><p className="mt-1 text-xs text-gray-400">{tr("@ mentions a colleague, # adds a tag, and you can paste or drop screenshots.")}</p></div>
                            </div>
                        </FoldSection>
                        <FoldSection icon={<TbSend2 />} tone="emerald" title={tr("Send to")} summary={`${tr(AUD[dlg.audience]?.[0].split(' (')[0])}${dlg.audience === 'selected' ? ` · ${dlg.staffIds.length}` : ''}`} open={sec === 'to'} onToggle={() => toggle('to')}>
                            <div className="space-y-2.5">
                                <Select size="sm" isSearchable={false} options={audOpts} value={audOpts.find((o) => o.value === dlg.audience)} onChange={(o) => setDlg({ ...dlg, audience: o.value })} />
                                {dlg.audience === 'selected' && <div><L>{tr("People")}</L><Select size="sm" isMulti options={staffOpts} value={staffOpts.filter((o) => dlg.staffIds.includes(o.value))} onChange={(o) => setDlg({ ...dlg, staffIds: (o || []).map((x) => x.value) })} /></div>}
                            </div>
                        </FoldSection>
                        <FoldSection icon={<TbCalendarTime />} tone="amber" title={tr("When")} summary={`${dlg.sendAt ? dayjs(dlg.sendAt).format('DD MMM, HH:mm') : ''} · ${repLabel(dlg.repeat, dlg.every, dlg.unit, Number(dlg.cycles) || 0)}`} open={sec === 'when'} onToggle={() => toggle('when')}>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                <div><L>{dlg.repeat === 'none' ? tr("Send on") : tr("First time, at")}</L><Input size="sm" type="datetime-local" value={dlg.sendAt} onChange={(e) => setDlg({ ...dlg, sendAt: e.target.value })} /></div>
                                <div><L>{tr("Repeat")}</L><Select size="sm" isSearchable={false} options={repOpts} value={repOpts.find((o) => o.value === dlg.repeat)} onChange={(o) => setDlg({ ...dlg, repeat: o.value })} /></div>
                            </div>
                            {dlg.repeat !== 'none' && (
                                <div className="mt-2.5 grid items-end gap-2.5 sm:grid-cols-2">
                                    {dlg.repeat === 'custom' && (
                                        <div><L>{tr("Every")}</L><div className="flex gap-2"><div className="w-24"><Input size="sm" type="number" min="1" max="365" value={dlg.every} onChange={(e) => setDlg({ ...dlg, every: e.target.value })} /></div><div className="min-w-0 flex-1"><Select size="sm" isSearchable={false} options={unitOpts} value={unitOpts.find((o) => o.value === dlg.unit)} onChange={(o) => setDlg({ ...dlg, unit: o.value })} /></div></div></div>
                                    )}
                                    <div><L>{tr("Stop after (times, empty = never)")}</L><Input size="sm" type="number" min="1" max="1000" placeholder="∞" value={dlg.cycles} onChange={(e) => setDlg({ ...dlg, cycles: e.target.value })} /></div>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-gray-400">{tr("It goes out at the first run of the automatic tasks after that time (Settings → Cron job), so they must run often, for example every 5 minutes.")}</p>
                        </FoldSection>
                        <FoldSection icon={<TbLink />} tone="violet" title={tr("When it goes out")} summary={[dlg.assigneeIds.length ? `${dlg.assigneeIds.length} ${tr("people")}` : '', dlg.makeTask ? tr("Task") : '', dlg.clientId ? tr("Client") : dlg.leadId ? tr("Lead") : ''].filter(Boolean).join(' · ') || tr("Nothing more")} open={sec === 'out'} onToggle={() => toggle('out')}>
                            <div className="space-y-2.5">
                                <div><L>{tr("Assign to the team")}</L><Select size="sm" isMulti placeholder={tr("Choose the people")} options={staffOpts} value={staffOpts.filter((o) => dlg.assigneeIds.includes(o.value))} onChange={(o) => setDlg({ ...dlg, assigneeIds: (o || []).map((x) => x.value) })} /><p className="mt-1 text-xs text-gray-400">{tr("They are told on the bell.")}</p></div>
                                <label className="flex items-center gap-3 text-sm"><Switcher checked={dlg.makeTask} onChange={(c) => setDlg({ ...dlg, makeTask: c })} />{tr("Make a task of it (for the people above)")}</label>
                                <div>
                                    <L>{dlg.aboutType === 'lead' ? tr("Lead (optional)") : tr("Client (optional)")}</L>
                                    <div className="flex items-center gap-2">
                                        <Segment size="sm" value={dlg.aboutType} onChange={(t) => { const x = Array.isArray(t) ? t[0] : t; if (x) setDlg({ ...dlg, aboutType: x, clientId: null, leadId: null, emailClient: false }) }}><Segment.Item value="client">{tr("Client")}</Segment.Item><Segment.Item value="lead">{tr("Lead")}</Segment.Item></Segment>
                                        <div className="min-w-0 flex-1">{dlg.aboutType === 'lead' ? <RelationSelect key="lead" size="sm" resource="leads" value={dlg.leadId} onChange={(id) => setDlg({ ...dlg, leadId: id, emailClient: id ? dlg.emailClient : false })} /> : <RelationSelect key="client" size="sm" resource="clients" value={dlg.clientId} onChange={(id) => setDlg({ ...dlg, clientId: id, emailClient: id ? dlg.emailClient : false })} />}</div>
                                    </div>
                                </div>
                                {(dlg.clientId || dlg.leadId) && <label className="flex items-center gap-3 text-sm"><Switcher checked={dlg.emailClient} onChange={(c) => setDlg({ ...dlg, emailClient: c })} />{dlg.aboutType === 'lead' ? tr("Also email it to the lead (with the screenshots)") : tr("Also email it to the client (with the screenshots)")}</label>}
                            </div>
                        </FoldSection>
                    </div>
                )}
                <div className="mt-4 flex justify-end gap-2"><Button size="sm" onClick={() => setDlg(null)}>{tr("Cancel")}</Button><Button size="sm" variant="solid" loading={busy} onClick={save}>{tr("Save")}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this message?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const m = del; setDel(null); api(`/api/crm/scheduled-messages/${m.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("Message deleted")); load() }).catch((e) => notify('danger', e.message)) }}><p>{del?.title}</p></ConfirmDialog>
        </Container>
    )
}

export default ScheduledMessages

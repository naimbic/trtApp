import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbMessage, TbSend2, TbLink, TbCalendarTime, TbPlus, TbSend, TbPencil, TbTrash, TbRepeat, TbUsers, TbUserShield, TbMessages, TbSparkles, TbChevronDown, TbSearch } from 'react-icons/tb'
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
const CATS = { tips: ['Tips and training', 'bg-violet-50 dark:bg-violet-500/10', 'bg-violet-500', 'text-violet-800 dark:text-violet-300'], reminders: ['Reminders', 'bg-amber-50 dark:bg-amber-500/10', 'bg-amber-500', 'text-amber-800 dark:text-amber-300'], meetings: ['Meetings', 'bg-blue-50 dark:bg-blue-500/10', 'bg-blue-500', 'text-blue-800 dark:text-blue-300'], announcements: ['Announcements', 'bg-orange-50 dark:bg-orange-500/10', 'bg-orange-500', 'text-orange-800 dark:text-orange-300'], celebrations: ['Celebrations', 'bg-pink-50 dark:bg-pink-500/10', 'bg-pink-500', 'text-pink-800 dark:text-pink-300'], other: ['Other', 'bg-emerald-50 dark:bg-emerald-500/10', 'bg-emerald-500', 'text-emerald-800 dark:text-emerald-300'] }
const IDEAS = ['How to use the CRM every day: leads, tasks and the calendar', 'How to work better as a team: update your tasks, answer tickets fast, write notes', 'A friendly reminder to log your time and close finished tasks every Friday', 'Congratulate the team on this month\'s results and thank everybody']
const TONES = { friendly: 'Friendly', professional: 'Professional', short: 'Short', motivating: 'Motivating' }
const RANGES = { all: 'All dates', today: 'Today', week: 'This week', month: 'Next 30 days', custom: 'Choose dates' }
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const local = (d) => dayjs(d).format('YYYY-MM-DDTHH:mm')
const soon = () => local(dayjs().add(1, 'hour').startOf('hour'))

const ScheduledMessages = () => {
    const can = useCan()
    const [d, setD] = useState(null)
    const [dlg, setDlg] = useState(null)
    const [del, setDel] = useState(null)
    const [busy, setBusy] = useState(false)
    const [q, setQ] = useState('')
    const [range, setRange] = useState('all')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [onlyActive, setOnlyActive] = useState(false)
    const [openCats, setOpenCats] = useState(null) // null = the first group that has messages
    const [ai, setAi] = useState({ idea: '', tone: 'friendly', busy: false })
    const writeAi = async () => {
        setAi((a) => ({ ...a, busy: true }))
        try {
            const lang = (() => { try { return localStorage.getItem('staffLang') || document.documentElement.lang || 'en' } catch { return 'en' } })()
            const r = await api('/api/crm/scheduled-messages/ai', { method: 'POST', body: { idea: ai.idea, tone: ai.tone, lang: String(lang).slice(0, 2), current: dlg?.rich || '' } })
            setDlg((x) => ({ ...x, rich: r.html, title: x.title || r.title }))
            notify('success', tr("Written. Read it, change what you want, then save."))
        } catch (e) { notify('danger', e.message) } finally { setAi((a) => ({ ...a, busy: false })) }
    }
    const [sec, setSec] = useState('msg') // the open section of the form: one at a time
    const toggle = (k) => setSec((x) => (x === k ? '' : k))
    const load = useCallback(() => api('/api/crm/scheduled-messages').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const staff = d?.staff || []
    const staffOpts = useMemo(() => staff.map((s) => ({ value: s.id, label: s.name })), [staff])
    const audOpts = Object.entries(AUD).map(([value, [label]]) => ({ value, label: tr(label) }))
    const unitOpts = Object.entries(UNIT).map(([value, label]) => ({ value, label: tr(label) }))
    const repOpts = Object.entries(REP).map(([value, label]) => ({ value, label: tr(label) }))
    const open = (m) => { setSec('msg'); setDlg(m ? { id: m.id, category: m.category || 'other', title: m.title, rich: m.rich || (m.body ? `<p>${m.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').split('\n').join('</p><p>')}</p>` : ''), assigneeIds: m.assigneeIds || [], clientId: m.clientId || null, leadId: m.leadId || null, aboutType: m.leadId ? 'lead' : 'client', emailClient: !!m.emailClient, makeTask: !!m.makeTask, audience: m.audience, staffIds: m.staffIds, repeat: m.repeat, every: m.every || 1, unit: m.unit || 'day', cycles: m.cycles || '', sendAt: m.nextAt ? local(m.nextAt) : soon() } : { category: 'other', title: '', rich: '', assigneeIds: [], clientId: null, leadId: null, aboutType: 'client', emailClient: false, makeTask: false, audience: 'team', staffIds: [], repeat: 'none', every: 1, unit: 'day', cycles: '', sendAt: soon() }) }
    const save = async () => {
        setBusy(true)
        try { await api(dlg.id ? `/api/crm/scheduled-messages/${dlg.id}` : '/api/crm/scheduled-messages', { method: dlg.id ? 'PUT' : 'POST', body: { ...dlg, body: undefined, aboutType: undefined, every: Number(dlg.every) || 1, cycles: dlg.cycles === '' ? 0 : Number(dlg.cycles), sendAt: new Date(dlg.sendAt).toISOString() } }); notify('success', tr("Message saved")); setDlg(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const patch = (m, body) => api(`/api/crm/scheduled-messages/${m.id}`, { method: 'PUT', body }).then(load).catch((e) => notify('danger', e.message))
    const sendNow = (m) => api(`/api/crm/scheduled-messages/${m.id}`, { method: 'POST' }).then((r) => { notify('success', tr("Sent to {n} conversation(s)", { n: r.sent })); load() }).catch((e) => notify('danger', e.message))
    const groups = useMemo(() => {
        const list = d?.list || []
        const now = dayjs()
        const [lo, hi] = range === 'today' ? [now.startOf('day'), now.endOf('day')] : range === 'week' ? [now.startOf('week'), now.endOf('week')] : range === 'month' ? [now.startOf('day'), now.add(30, 'day').endOf('day')] : range === 'custom' ? [from ? dayjs(from).startOf('day') : null, to ? dayjs(to).endOf('day') : null] : [null, null]
        const needle = q.trim().toLowerCase()
        const ok = (m) => {
            if (onlyActive && !m.active) return false
            if (needle && !`${m.title} ${m.body}`.toLowerCase().includes(needle)) return false
            if (lo || hi) { const t = m.nextAt || m.lastSentAt; if (!t) return false; const x = dayjs(t); if ((lo && x.isBefore(lo)) || (hi && x.isAfter(hi))) return false }
            return true
        }
        return Object.keys(CATS).map((k) => ({ key: k, items: list.filter((m) => (m.category || 'other') === k && ok(m)).sort((a, b) => (a.nextAt ? +new Date(a.nextAt) : Infinity) - (b.nextAt ? +new Date(b.nextAt) : Infinity)) })).filter((g) => g.items.length)
    }, [d, q, range, from, to, onlyActive])
    const shown = openCats ?? groups.slice(0, 1).map((g) => g.key)
    const toggleCat = (k) => setOpenCats(shown.includes(k) ? shown.filter((x) => x !== k) : [...shown, k])
    return (
        <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="flex items-center gap-2"><TbCalendarTime className="text-primary" />{tr("Scheduled messages")}</h3><p className="max-w-3xl text-sm text-gray-500">{tr("Messages the CRM posts in the team chat by itself at the date and time you choose, once or repeating: announcements, rules, reminders, the weekly meeting. They appear as sent by you.")}</p></div>
                {can('scheduled_messages', 'create') && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New message")}</Button>}
            </div>
            {d && d.list.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px] flex-1 sm:max-w-xs"><TbSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input size="sm" className="ps-9" value={q} placeholder={tr("Search a message")} onChange={(e) => setQ(e.target.value)} /></div>
                    <div className="flex flex-wrap gap-1">{Object.entries(RANGES).map(([k, label]) => <button key={k} type="button" onClick={() => setRange(k)} className={cn('rounded-full px-3 py-1 text-sm font-semibold transition', range === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200')}>{tr(label)}</button>)}</div>
                    {range === 'custom' && <div className="flex items-center gap-1.5"><Input size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span className="text-gray-400">→</span><Input size="sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>}
                    <label className="ms-auto flex cursor-pointer items-center gap-2 text-sm text-gray-500"><Switcher checked={onlyActive} onChange={setOnlyActive} />{tr("Active only")}</label>
                </div>
            )}
            {!d ? <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p> : !d.list.length ? <Card><p className="py-8 text-center text-gray-400">{tr("No scheduled message yet.")}</p></Card> : !groups.length ? <Card><p className="py-8 text-center text-gray-400">{tr("No message matches these filters.")}</p></Card> : (
                <div className="flex flex-col gap-2">
                    {groups.map((g) => {
                        const c = CATS[g.key], isOpen = shown.includes(g.key)
                        return (
                            <div key={g.key} className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-gray-700 dark:bg-gray-800">
                                <button type="button" aria-expanded={isOpen} onClick={() => toggleCat(g.key)} className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start transition hover:brightness-95', c[1])}>
                                    <span className={cn('size-2.5 shrink-0 rounded-full', c[2])} />
                                    <span className={cn('font-semibold', c[3])}>{tr(c[0])}</span>
                                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{g.items.length}</span>
                                    <span className="min-w-0 flex-1 truncate text-xs text-gray-400">{isOpen ? '' : g.items.map((m) => m.title).join(' · ')}</span>
                                    <TbChevronDown className={cn('shrink-0 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                                </button>
                                {isOpen && (
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {g.items.map((m) => (
                                            <li key={m.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5', !m.active && 'opacity-60')}>
                                                <div className="min-w-0 flex-1 basis-64">
                                                    <div className="flex flex-wrap items-center gap-2"><b className="truncate">{m.title}</b><span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{AUD[m.audience]?.[1]}{m.audience === 'selected' ? `${m.staffIds.length} ${tr("people")}` : tr(AUD[m.audience]?.[0].split(' (')[0])}</span><span className="inline-flex items-center gap-1 text-xs text-gray-500"><TbRepeat />{repLabel(m.repeat, m.every, m.unit, m.cycles)}{m.cycles > 0 && m.repeat !== 'none' ? ` · ${m.runs || 0}/${m.cycles}` : ''}</span>{m.makeTask && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-700">{tr("Task")}</span>}{(m.clientId || m.leadId) && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[11px] text-sky-700">{m.leadId ? tr("Lead") : tr("Client")}</span>}</div>
                                                    <p className="mt-0.5 truncate text-sm text-gray-500">{m.body.replace(/\s+/g, ' ')}{m.rich && /<img/i.test(m.rich) ? ' 🖼' : ''}</p>
                                                </div>
                                                <div className="text-xs text-gray-500">{m.active && m.nextAt ? <span className="font-semibold text-gray-700 dark:text-gray-200">{dayjs(m.nextAt).format('DD MMM, HH:mm')}</span> : tr("Done or switched off")}{m.lastSentAt ? <div>{tr("last sent")} {dayjs(m.lastSentAt).format('DD MMM, HH:mm')} ({m.sentCount}×)</div> : null}</div>
                                                <div className="flex items-center gap-1">
                                                    {can('scheduled_messages', 'edit') && <Button size="xs" variant="plain" title={tr("Send now")} icon={<TbSend />} onClick={() => sendNow(m)} />}
                                                    {can('scheduled_messages', 'edit') && <Button size="xs" variant="plain" title={tr("Edit")} icon={<TbPencil />} onClick={() => open(m)} />}
                                                    {can('scheduled_messages', 'delete') && <Button size="xs" variant="plain" title={tr("Delete")} className="text-red-500" icon={<TbTrash />} onClick={() => setDel(m)} />}
                                                    {can('scheduled_messages', 'edit') && <Switcher checked={m.active} onChange={(v) => patch(m, { active: v })} />}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
            <Dialog isOpen={!!dlg} width={600} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-3">{dlg?.id ? tr("Edit the message") : tr("New scheduled message")}</h5>
                {dlg && (
                    <div className="max-h-[70vh] space-y-2 overflow-y-auto pe-1">
                        <FoldSection icon={<TbMessage />} tone="blue" title={tr("Message")} summary={dlg.title || plain(dlg.rich).slice(0, 60)} open={sec === 'msg'} onToggle={() => toggle('msg')}>
                            <div className="space-y-2.5">
                                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-500/30 dark:bg-violet-500/10">
                                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300"><TbSparkles />{tr("Write it with AI")}</div>
                                    <div className="mb-1.5 flex flex-wrap gap-1">{IDEAS.map((i) => <button key={i} type="button" onClick={() => setAi((a) => ({ ...a, idea: i }))} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-violet-700 shadow-sm hover:bg-violet-100 dark:bg-gray-700 dark:text-violet-200">{tr(i)}</button>)}</div>
                                    <textarea rows={2} className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-800" value={ai.idea} placeholder={tr("What do you want to tell the team? For example: advise everybody how to use the CRM and work better")} onChange={(e) => setAi((a) => ({ ...a, idea: e.target.value }))} />
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                        <div className="flex gap-1">{Object.entries(TONES).map(([k, label]) => <button key={k} type="button" onClick={() => setAi((a) => ({ ...a, tone: k }))} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ai.tone === k ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 dark:bg-gray-700 dark:text-gray-200')}>{tr(label)}</button>)}</div>
                                        <Button size="xs" variant="solid" className="ms-auto" icon={<TbSparkles />} loading={ai.busy} disabled={ai.idea.trim().length < 8} onClick={writeAi}>{plain(dlg.rich) ? tr("Rewrite with AI") : tr("Write it")}</Button>
                                    </div>
                                </div>
                                <div className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
                                    <div><L>{tr("Title (only you see it)")}</L><Input size="sm" autoFocus value={dlg.title} placeholder={tr("Monday meeting")} onChange={(e) => setDlg({ ...dlg, title: e.target.value })} /></div>
                                    <div><L>{tr("Category")}</L><Select size="sm" isSearchable={false} options={Object.entries(CATS).map(([value, c]) => ({ value, label: tr(c[0]) }))} value={{ value: dlg.category, label: tr(CATS[dlg.category]?.[0] || 'Other') }} onChange={(o) => setDlg({ ...dlg, category: o.value })} /></div>
                                </div>
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

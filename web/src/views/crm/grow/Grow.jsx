import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { TbSparkles, TbChartBar, TbBulb, TbRepeat, TbPlus, TbSearch, TbChecklist, TbTrash, TbRobot, TbPlayerPlay, TbEye, TbFlame, TbUsers, TbCash, TbInbox, TbTargetArrow, TbMessageCircle } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import Tabs from '@/components/ui/Tabs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import cn from '@/utils/classNames'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const { TabList, TabNav, TabContent } = Tabs
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const CATS = { leads: ['Leads', 'bg-sky-100 text-sky-700'], sales: ['Sales', 'bg-indigo-100 text-indigo-700'], income: ['Income', 'bg-emerald-100 text-emerald-700'], team: ['Team', 'bg-amber-100 text-amber-700'], skills: ['Skills', 'bg-violet-100 text-violet-700'], tech: ['Tech', 'bg-slate-200 text-slate-700'], marketing: ['Marketing', 'bg-pink-100 text-pink-700'], ops: ['Operations', 'bg-orange-100 text-orange-700'], other: ['Other', 'bg-gray-100 text-gray-600'] }
const PERIOD = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', once: 'One time' }
const STATUS = { new: ['New', 'bg-sky-500'], accepted: ['Accepted', 'bg-indigo-500'], doing: ['In progress', 'bg-amber-500'], done: ['Done', 'bg-emerald-500'], dismissed: ['Dismissed', 'bg-gray-400'] }
const PRIO = { 1: ['Low', 'text-gray-500'], 2: ['Medium', 'text-sky-600'], 3: ['High', 'text-red-600'] }
const SRC = { rule: 'Routine', ai: 'AI', manual: 'Written by hand', api: 'API' }
const num = (n) => (n === null || n === undefined ? '—' : Math.round(Number(n)).toLocaleString('fr-FR').replace(/ | /g, ' '))

/* ------------------------------------------------------------ overview */
const Tile = ({ icon, tone, label, value, sub, to }) => {
    const body = (
        <div className="flex h-full items-start gap-3">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl', tone)}>{icon}</span>
            <div className="min-w-0"><div className="text-2xl font-bold leading-tight heading-text">{value}</div><div className="text-sm text-gray-500">{label}</div>{sub && <div className="mt-0.5 text-xs">{sub}</div>}</div>
        </div>
    )
    return to ? <Link to={to} className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">{body}</Link> : <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">{body}</div>
}
const Bars = ({ rows, a, b, aLabel, bLabel }) => {
    const max = Math.max(1, ...rows.flatMap((r) => [r[a] || 0, r[b] || 0]))
    return (
        <div>
            <div className="flex h-36 items-end gap-1.5">{rows.map((r) => <div key={r.label} className="flex flex-1 items-end justify-center gap-0.5" title={`${r.label}: ${num(r[a])} / ${num(r[b])}`}><i className="w-full max-w-[14px] rounded-t bg-primary/80" style={{ height: `${Math.max(2, ((r[a] || 0) / max) * 100)}%` }} /><i className="w-full max-w-[14px] rounded-t bg-emerald-400" style={{ height: `${Math.max(2, ((r[b] || 0) / max) * 100)}%` }} /></div>)}</div>
            <div className="mt-1 flex gap-1.5">{rows.map((r) => <span key={r.label} className="flex-1 text-center text-[10px] text-gray-400">{r.label}</span>)}</div>
            <div className="mt-2 flex gap-4 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary/80" />{aLabel}</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" />{bLabel}</span></div>
        </div>
    )
}

const Overview = ({ goIdeas }) => {
    const [d, setD] = useState(null)
    const [top, setTop] = useState([])
    const [error, setError] = useState('')
    useEffect(() => { api('/api/crm/grow').then(setD).catch((e) => setError(e.message)); api('/api/crm/grow/ideas?status=new').then((r) => setTop((r.list || []).slice(0, 5))).catch(() => {}) }, [])
    if (error) return <p className="py-10 text-center text-red-500">{error}</p>
    if (!d) return <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p>
    const { leads, clients, income, tasks, tickets, team } = d
    const cur = income?.mainCurrency || ''
    const ytd = income?.yearToDate
    const months = (leads?.last12Months || []).map((m) => ({ label: m.month.slice(5), created: m.created, converted: m.converted }))
    const mThis = income?.monthlyThisYear || [], mLast = income?.monthlyLastYear || []
    const inc = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), cur: mThis[i] || 0, prev: mLast[i] || 0 }))
    const att = leads?.attention || {}
    const todo = [
        att.neverContacted > 0 && [tr("leads never contacted"), att.neverContacted, '/crm/leads', 'text-red-600'],
        att.openWithoutOwner > 0 && [tr("open leads without an owner"), att.openWithoutOwner, '/crm/leads', 'text-amber-600'],
        att.noContactFor30Days > 0 && [tr("leads silent for 30 days"), att.noContactFor30Days, '/crm/leads', 'text-amber-600'],
        tasks?.overdue > 0 && [tr("overdue tasks"), tasks.overdue, '/crm/team-tasks', 'text-red-600'],
        tasks?.unassigned > 0 && [tr("open tasks nobody does"), tasks.unassigned, '/crm/team-tasks', 'text-amber-600'],
        tickets?.waitingOver24h > 0 && [tr("support requests waiting over 24 h"), tickets.waitingOver24h, '/crm/tickets', 'text-red-600'],
        d.proposals?.sentNoAnswerOver7d > 0 && [tr("proposals without an answer for 7 days"), d.proposals.sentNoAnswerOver7d, '/crm/proposals', 'text-amber-600'],
        clients?.clientsWithOverdue?.count > 0 && [tr("clients with overdue invoices"), clients.clientsWithOverdue.count, '/crm/invoices', 'text-red-600'],
        team?.withoutGoal > 0 && [tr("team members without a learning goal"), team.withoutGoal, '/crm/grow?tab=team', 'text-violet-600'],
    ].filter(Boolean)
    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Tile to="/crm/leads" icon={<TbInbox />} tone="bg-sky-100 text-sky-600" label={tr("open leads")} value={num(leads?.open)} sub={<span className="text-gray-500">{num(leads?.converted)} {tr("converted")} · {leads?.conversionRatePct ?? '—'}% {tr("conversion")}</span>} />
                <Tile icon={<TbCash />} tone="bg-emerald-100 text-emerald-600" label={`${tr("invoiced this year")} ${cur}`} value={num(ytd?.invoiced)} sub={ytd?.changePct != null && <span className={ytd.changePct >= 0 ? 'text-emerald-600' : 'text-red-600'}>{ytd.changePct >= 0 ? '+' : ''}{ytd.changePct}% {tr("vs the same period last year")}</span>} />
                <Tile to="/crm/invoices" icon={<TbFlame />} tone="bg-red-100 text-red-600" label={tr("to collect")} value={`${num(clients?.totalOutstanding)} ${cur}`} sub={<span className="text-gray-500">{num(clients?.clientsWithOverdue?.totalOverdue)} {cur} {tr("overdue")}</span>} />
                <Tile to="/crm/team-tasks" icon={<TbChecklist />} tone="bg-amber-100 text-amber-600" label={tr("open tasks")} value={num(tasks?.open)} sub={<span className={tasks?.overdue ? 'text-red-600' : 'text-gray-500'}>{num(tasks?.overdue)} {tr("overdue")} · {num(tasks?.completedLast7Days)} {tr("done this week")}</span>} />
                <Tile to="/crm/tickets" icon={<TbMessageCircle />} tone="bg-indigo-100 text-indigo-600" label={tr("open support requests")} value={num(tickets?.open)} sub={<span className="text-gray-500">{tickets?.ratingLast90Days ? `★ ${tickets.ratingLast90Days}/5 (${tickets.ratings})` : tr("no rating yet")}</span>} />
                <Tile to="/crm/clients" icon={<TbUsers />} tone="bg-violet-100 text-violet-600" label={tr("clients who bring 70% of the income")} value={clients?.top5SharePct != null ? `${clients.top5SharePct}%` : '—'} sub={<span className="text-gray-500">{tr("share of the 5 biggest clients")}</span>} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <Card><h5 className="mb-3 flex items-center gap-2"><TbTargetArrow />{tr("Needs attention")}</h5>{todo.length ? <div className="space-y-1.5">{todo.map(([label, n, to, tone]) => <Link key={label} to={to} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm transition hover:bg-primary/5 dark:bg-gray-700/40"><span>{label}</span><b className={cn('text-lg', tone)}>{n}</b></Link>)}</div> : <p className="py-4 text-center text-sm text-emerald-600">{tr("Nothing needs attention. Well done!")}</p>}</Card>
                <Card>
                    <div className="mb-3 flex items-center justify-between"><h5 className="flex items-center gap-2"><TbBulb />{tr("New ideas")}</h5><button type="button" className="text-sm text-primary hover:underline" onClick={goIdeas}>{tr("All ideas")}</button></div>
                    {top.length ? <div className="space-y-1.5">{top.map((i) => <button key={i.id} type="button" onClick={goIdeas} className="flex w-full items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-start text-sm transition hover:bg-primary/5 dark:bg-gray-700/40"><span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', i.priority === 3 ? 'bg-red-500' : i.priority === 2 ? 'bg-sky-500' : 'bg-gray-400')} /><span className="min-w-0 flex-1"><span className="block font-semibold">{i.title}</span><span className="text-xs text-gray-500">{tr(CATS[i.category]?.[0])} · {tr(PERIOD[i.period])}</span></span></button>)}</div> : <p className="py-4 text-center text-sm text-gray-400">{tr("No new idea. The routine writes some every day.")}</p>}
                </Card>
                <Card><h5 className="mb-3">{tr("Leads: created and converted, last 12 months")}</h5><Bars rows={months} a="created" b="converted" aLabel={tr("created")} bLabel={tr("converted")} /></Card>
                <Card><h5 className="mb-3">{tr("Invoiced per month: this year and last year")} {cur}</h5><Bars rows={inc} a="cur" b="prev" aLabel={tr("this year")} bLabel={tr("last year")} /></Card>
            </div>
            {(leads?.sources || []).length > 0 && (
                <Card><h5 className="mb-3">{tr("Where the leads come from")}</h5>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{leads.sources.slice(0, 6).map((s) => <div key={s.name} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700/40"><div className="flex items-center justify-between text-sm"><b>{s.name}</b><span className="text-gray-500">{s.total} {tr("leads")}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600"><i className="block h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, s.conversionRatePct)}%` }} /></div><div className="mt-1 text-xs text-gray-500">{s.conversionRatePct}% {tr("convert")}</div></div>)}</div>
                </Card>
            )}
        </div>
    )
}

/* ------------------------------------------------------------ ideas */
const IdeaCard = ({ i, onOpen }) => (
    <button type="button" onClick={() => onOpen(i)} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-start transition hover:border-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', CATS[i.category]?.[1])}>{tr(CATS[i.category]?.[0])}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">{tr(PERIOD[i.period])}</span>{i.source !== 'manual' && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">{i.source === 'ai' && <TbRobot />}{tr(SRC[i.source])}</span>}</div>
        <div className="text-sm font-semibold leading-snug">{i.title}</div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className={cn('font-semibold', PRIO[i.priority]?.[1])}>{tr(PRIO[i.priority]?.[0])}</span><span className="flex items-center gap-2 text-gray-400">{i.taskId && <TbChecklist title={tr("Has a task")} />}{i.assignees.slice(0, 3).map((a) => <span key={a.id} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{a.name.split(' ')[0]}</span>)}</span></div>
        {i.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{i.tags.slice(0, 4).map((t) => <span key={t} className="text-[10px] text-gray-400">#{t}</span>)}</div>}
    </button>
)

const IdeaDialog = ({ idea, lookups, onClose, onChanged }) => {
    const [v, setV] = useState(null)
    const [comments, setComments] = useState([])
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [del, setDel] = useState(false)
    const can = lookups.can
    const isNew = idea && !idea.id
    useEffect(() => {
        if (!idea) return
        setV({ title: idea.title || '', body: idea.body || '', category: idea.category || 'other', period: idea.period || 'once', priority: idea.priority || 2, status: idea.status || 'new', tags: (idea.tags || []).join(', '), assigneeIds: idea.assigneeIds || [], dueDate: idea.dueDate ? new Date(idea.dueDate) : null })
        setComments([]); setText('')
        if (idea.id) api(`/api/crm/grow/ideas/${idea.id}/comments`).then((r) => setComments(r.comments)).catch(() => {})
    }, [idea])
    if (!idea || !v) return null
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const dis = idea.id ? !can.edit : !can.create
    const save = async () => {
        setBusy(true)
        try { await api(idea.id ? `/api/crm/grow/ideas/${idea.id}` : '/api/crm/grow/ideas', { method: idea.id ? 'PUT' : 'POST', body: { ...v, tags: v.tags, dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null } }); notify('success', tr("Idea saved")); onChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const toTask = async () => {
        setBusy(true)
        try { const r = await api(`/api/crm/grow/ideas/${idea.id}/task`, { method: 'POST', body: { assigneeIds: v.assigneeIds, dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null } }); notify('success', tr("Task created")); onChanged(); onClose(); window.open(`/crm/tasks/${r.taskId}`, '_blank', 'noopener') } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const comment = async () => { try { await api(`/api/crm/grow/ideas/${idea.id}/comments`, { method: 'POST', body: { body: text } }); setText(''); setComments((await api(`/api/crm/grow/ideas/${idea.id}/comments`)).comments) } catch (e) { notify('danger', e.message) } }
    const catOpts = Object.entries(CATS).map(([value, [label]]) => ({ value, label: tr(label) }))
    const perOpts = Object.entries(PERIOD).map(([value, label]) => ({ value, label: tr(label) }))
    const stOpts = Object.entries(STATUS).map(([value, [label]]) => ({ value, label: tr(label) }))
    const prOpts = [1, 2, 3].map((value) => ({ value, label: tr(PRIO[value][0]) }))
    const staffOpts = lookups.staff.map((s) => ({ value: s.id, label: s.name }))
    return (
        <Dialog isOpen width={760} onClose={onClose} onRequestClose={onClose}>
            <div className="max-h-[78vh] overflow-y-auto pe-1">
                <h5 className="mb-3 flex items-center gap-2"><TbBulb />{isNew ? tr("New idea") : tr("Idea")}{idea.source && idea.source !== 'manual' && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{tr(SRC[idea.source])}</span>}</h5>
                <div className="space-y-3">
                    <div><L>{tr("Title")}</L><Input disabled={dis} value={v.title} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div><L>{tr("Details and steps")}</L>{dis ? <RichView html={v.body} /> : <RichEditor minHeight={110} value={v.body} onChange={(html) => set({ body: html })} />}</div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div><L>{tr("Category")}</L><Select size="sm" isDisabled={dis} isSearchable={false} options={catOpts} value={catOpts.find((o) => o.value === v.category)} onChange={(o) => set({ category: o.value })} /></div>
                        <div><L>{tr("Repeats")}</L><Select size="sm" isDisabled={dis} isSearchable={false} options={perOpts} value={perOpts.find((o) => o.value === v.period)} onChange={(o) => set({ period: o.value })} /></div>
                        <div><L>{tr("Priority")}</L><Select size="sm" isDisabled={dis} isSearchable={false} options={prOpts} value={prOpts.find((o) => o.value === v.priority)} onChange={(o) => set({ priority: o.value })} /></div>
                        <div><L>{tr("Status")}</L><Select size="sm" isDisabled={dis || isNew} isSearchable={false} options={stOpts} value={stOpts.find((o) => o.value === v.status)} onChange={(o) => set({ status: o.value })} /></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div><L>{tr("Assigned to")}</L><Select size="sm" isMulti isDisabled={dis} options={staffOpts} value={staffOpts.filter((o) => v.assigneeIds.includes(o.value))} onChange={(o) => set({ assigneeIds: (o || []).map((x) => x.value) })} /></div>
                        <div><L>{tr("Due date")}</L><DatePicker size="sm" disabled={dis} value={v.dueDate} onChange={(d) => set({ dueDate: d })} /></div>
                    </div>
                    <div><L>{tr("Tags (separated by commas)")}</L><Input size="sm" disabled={dis} value={v.tags} placeholder="ads, upsell, training" onChange={(e) => set({ tags: e.target.value })} /></div>
                    {idea.url && <a href={idea.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary hover:underline">{idea.url}</a>}
                </div>
                {idea.id && (
                    <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
                        <h6 className="mb-2">{tr("Comments")} {comments.length > 0 && <span className="text-gray-400">{comments.length}</span>}</h6>
                        <div className="space-y-2">{comments.map((c) => <div key={c.id} className="rounded-xl bg-gray-50 p-2.5 text-sm dark:bg-gray-700/40"><div className="mb-0.5 flex items-center justify-between text-xs text-gray-500"><b className="text-gray-700 dark:text-gray-200">{c.author}</b><span className="flex items-center gap-2">{dayjs(c.createdAt).format('DD MMM, HH:mm')}<button type="button" aria-label={tr("Delete")} className="hover:text-red-500" onClick={() => api(`/api/crm/grow/ideas/${idea.id}/comments?commentId=${c.id}`, { method: 'DELETE' }).then(() => setComments((x) => x.filter((y) => y.id !== c.id))).catch((e) => notify('danger', e.message))}><TbTrash /></button></span></div><div className="whitespace-pre-wrap">{c.body}</div></div>)}</div>
                        <div className="mt-2 flex gap-2"><Input size="sm" textArea rows={2} placeholder={tr("Add a comment")} value={text} onChange={(e) => setText(e.target.value)} /><Button size="sm" disabled={!text.trim()} onClick={comment}>{tr("Send")}</Button></div>
                    </div>
                )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {idea.id && can.delete && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(true)}>{tr("Delete")}</Button>}
                {idea.id && can.edit && can.task && !idea.taskId && <Button icon={<TbChecklist />} loading={busy} onClick={toTask}>{tr("Make a task")}</Button>}
                {idea.taskId && <Link to={`/crm/tasks/${idea.taskId}`} className="text-sm text-primary hover:underline">{tr("Open its task")}</Link>}
                <div className="ms-auto flex gap-2"><Button onClick={onClose}>{tr("Close")}</Button>{!dis && <Button variant="solid" loading={busy} onClick={save}>{tr("Save")}</Button>}</div>
            </div>
            <ConfirmDialog isOpen={del} type="danger" title={tr("Delete this idea?")} confirmText={tr("Delete")} onClose={() => setDel(false)} onCancel={() => setDel(false)} onConfirm={() => { setDel(false); api(`/api/crm/grow/ideas/${idea.id}`, { method: 'DELETE' }).then(() => { notify('success', tr("Idea deleted")); onChanged(); onClose() }).catch((e) => notify('danger', e.message)) }}><p>{idea.title}</p></ConfirmDialog>
        </Dialog>
    )
}

const Ideas = ({ openId }) => {
    const [d, setD] = useState(null)
    const [f, setF] = useState({ q: '', category: '', period: '', tag: '', mine: false, dismissed: false })
    const [sel, setSel] = useState(null)
    const load = useCallback(() => {
        const p = new URLSearchParams(); for (const k of ['q', 'category', 'period', 'tag']) if (f[k]) p.set(k, f[k]); if (f.mine) p.set('mine', '1')
        return api(`/api/crm/grow/ideas?${p}`).then(setD).catch((e) => notify('danger', e.message))
    }, [f])
    useEffect(() => { load() }, [load])
    useEffect(() => { if (openId && d) { const i = d.list.find((x) => x.id === openId); if (i) setSel(i) } }, [openId, d])
    const cols = ['new', 'accepted', 'doing', 'done', ...(f.dismissed ? ['dismissed'] : [])]
    const move = async (i, status) => { try { await api(`/api/crm/grow/ideas/${i.id}`, { method: 'PUT', body: { status } }); load() } catch (e) { notify('danger', e.message) } }
    const catOpts = [{ value: '', label: tr("All categories") }, ...Object.entries(CATS).map(([value, [label]]) => ({ value, label: tr(label) }))]
    const perOpts = [{ value: '', label: tr("All repeats") }, ...Object.entries(PERIOD).map(([value, label]) => ({ value, label: tr(label) }))]
    if (!d) return <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p>
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search ideas")} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
                <div className="w-44"><Select size="sm" isSearchable={false} options={catOpts} value={catOpts.find((o) => o.value === f.category)} onChange={(o) => setF({ ...f, category: o.value })} /></div>
                <div className="w-40"><Select size="sm" isSearchable={false} options={perOpts} value={perOpts.find((o) => o.value === f.period)} onChange={(o) => setF({ ...f, period: o.value })} /></div>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={f.mine} onChange={(c) => setF({ ...f, mine: c })} />{tr("Mine")}</label>
                <label className="flex items-center gap-2 text-sm"><Switcher checked={f.dismissed} onChange={(c) => setF({ ...f, dismissed: c })} />{tr("Dismissed")} {d.counts.dismissed ? `(${d.counts.dismissed})` : ''}</label>
                {d.can.create && <Button className="ms-auto" variant="solid" icon={<TbPlus />} onClick={() => setSel({ title: '', body: '', status: 'new', tags: [], assigneeIds: [], priority: 2, category: 'other', period: 'once', source: 'manual' })}>{tr("New idea")}</Button>}
            </div>
            {d.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{d.tags.map((t) => <button key={t.name} type="button" onClick={() => setF({ ...f, tag: f.tag === t.name ? '' : t.name })} className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition', f.tag === t.name ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300')}>#{t.name} <span className="opacity-60">{t.n}</span></button>)}</div>}
            <div className={cn('grid gap-4', cols.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
                {cols.map((c) => {
                    const items = d.list.filter((i) => i.status === c)
                    return (
                        <div key={c} className="min-w-0 rounded-2xl bg-gray-50 p-2.5 dark:bg-gray-800/60">
                            <div className="mb-2 flex items-center justify-between px-1"><span className="flex items-center gap-2 text-sm font-semibold"><i className={cn('h-2.5 w-2.5 rounded-full', STATUS[c][1])} />{tr(STATUS[c][0])}</span><span className="text-xs text-gray-400">{items.length}</span></div>
                            <div className="space-y-2">
                                {items.map((i) => (
                                    <div key={i.id} className="group relative">
                                        <IdeaCard i={i} onOpen={setSel} />
                                        {d.can.edit && c !== 'done' && c !== 'dismissed' && (
                                            <div className="absolute end-2 top-2 hidden gap-1 group-hover:flex">{c === 'new' && <button type="button" className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white" onClick={() => move(i, 'accepted')}>{tr("Accept")}</button>}<button type="button" className="rounded-md bg-gray-500 px-1.5 py-0.5 text-[10px] font-semibold text-white" onClick={() => move(i, 'dismissed')}>{tr("Dismiss")}</button></div>
                                        )}
                                    </div>
                                ))}
                                {!items.length && <p className="py-4 text-center text-xs text-gray-400">{c === 'new' ? tr("Nothing new") : '—'}</p>}
                            </div>
                        </div>
                    )
                })}
            </div>
            <IdeaDialog idea={sel} lookups={d} onClose={() => setSel(null)} onChanged={load} />
        </div>
    )
}

/* ------------------------------------------------------------ routine */
const Routine = () => {
    const [d, setD] = useState(null)
    const [busy, setBusy] = useState('')
    const [out, setOut] = useState(null)
    const [can, setCan] = useState(false)
    const load = useCallback(() => api('/api/crm/grow/routine').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load(); api('/api/crm/grow/ideas').then((r) => setCan(!!r.can.edit)).catch(() => {}) }, [load])
    if (!d) return <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p>
    const s = d.settings
    const save = async (p) => { try { await api('/api/crm/grow/routine', { method: 'PUT', body: p }); load() } catch (e) { notify('danger', e.message) } }
    const run = async (period, dry) => { setBusy(`${period}${dry ? '-dry' : ''}`); try { const r = await api('/api/crm/grow/routine', { method: 'POST', body: { period, dry } }); setOut(r.lines); load() } catch (e) { notify('danger', e.message) } finally { setBusy('') } }
    const langs = [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['ja', '日本語'], ['ar', 'العربية']].map(([value, label]) => ({ value, label }))
    const row = (label, hint, key) => <label className="flex cursor-pointer items-start gap-3 py-2"><Switcher disabled={!can} checked={!!s[key]} onChange={(c) => save({ [key]: c })} /><span><b className="block text-sm">{label}</b><span className="text-xs text-gray-500">{hint}</span></span></label>
    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <Card>
                <h5 className="mb-2 flex items-center gap-2"><TbRepeat />{tr("The routine")}</h5>
                <p className="mb-3 text-sm text-gray-500">{tr("It runs with the automatic tasks (Settings → Cron job). Every idea it writes lands on the board, and the administrators get a notification.")}</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {row(tr("Routine switched on"), tr("Turn everything below on or off."), 'enabled')}
                    {row(tr("Every day"), tr("Who to call, what is late, what to chase: from today's figures."), 'daily')}
                    {row(tr("Every week"), tr("Sources, dormant clients, proposals without an answer, risks."), 'weekly')}
                    {row(tr("Every month"), tr("Income against last year, recurring revenue, prices, skills, what is new in digital."), 'monthly')}
                    {row(tr("Also ask the AI"), tr("The AI reads the figures and adds ideas. Needs a key in Settings → AI."), 'ai')}
                    {row(tr("Let the AI search the web"), tr("For what is new in ads, SEO, AI tools and income ideas (Claude only; weekly and monthly runs)."), 'webSearch')}
                </div>
                <div className="mt-3 max-w-xs"><L>{tr("Language of the ideas")}</L><Select size="sm" isDisabled={!can} isSearchable={false} options={langs} value={langs.find((o) => o.value === s.lang)} onChange={(o) => save({ lang: o.value })} /><p className="mt-1 text-xs text-gray-400">{tr("The rules write in English and French; the AI writes in any of the five.")}</p></div>
            </Card>
            <div className="space-y-5">
                <Card>
                    <h5 className="mb-2 flex items-center gap-2"><TbRobot />{tr("AI")}</h5>
                    {d.ai ? <p className="text-sm"><span className="font-semibold text-emerald-600">{tr("Ready")}</span>: {d.ai.provider} · {d.ai.model}{d.ai.webSearch ? ` · ${tr("web search available")}` : ''}</p> : <p className="text-sm text-amber-600">{tr("No AI key yet: only the rules run. Add a key in Settings → AI.")} <Link className="text-primary underline" to="/crm/ai">{tr("AI insights")}</Link></p>}
                </Card>
                <Card>
                    <h5 className="mb-2">{tr("Run it now")}</h5>
                    <div className="space-y-2">
                        {['daily', 'weekly', 'monthly'].map((p) => (
                            <div key={p} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-2.5 text-sm dark:bg-gray-700/40">
                                <span><b>{tr(PERIOD[p])}</b><span className="ms-2 text-xs text-gray-500">{tr("last run")}: {d.last[p] || tr("never")}</span></span>
                                {can && <span className="flex gap-2"><Button size="xs" icon={<TbEye />} loading={busy === `${p}-dry`} onClick={() => run(p, true)}>{tr("Preview")}</Button><Button size="xs" variant="solid" icon={<TbPlayerPlay />} loading={busy === p} onClick={() => run(p, false)}>{tr("Run")}</Button></span>}
                            </div>
                        ))}
                    </div>
                    {out && <div className="mt-3 rounded-xl bg-gray-900 p-3 text-xs text-gray-100">{out.map((l, i) => <div key={i}>{l}</div>)}</div>}
                    <p className="mt-2 text-xs text-gray-400">{tr("An idea is never written twice for the same day, week or month.")}</p>
                </Card>
            </div>
        </div>
    )
}

const Grow = () => {
    const [sp, setSp] = useSearchParams()
    const tab = sp.get('tab') || 'overview'
    const setTab = (t) => setSp({ tab: t })
    return (
        <Container>
            <div className="mb-5"><h3 className="flex items-center gap-2"><TbSparkles className="text-primary" />{tr("Grow")}</h3><p className="text-sm text-gray-500">{tr("How the company is doing, what to do next and the ideas to grow: for the administrators.")}</p></div>
            <Tabs value={tab} onChange={setTab}>
                <TabList><TabNav value="overview" icon={<TbChartBar />}>{tr("Overview")}</TabNav><TabNav value="ideas" icon={<TbBulb />}>{tr("Ideas and advice")}</TabNav><TabNav value="routine" icon={<TbRepeat />}>{tr("Routine")}</TabNav></TabList>
                <div className="pt-5">
                    <TabContent value="overview"><Overview goIdeas={() => setTab('ideas')} /></TabContent>
                    <TabContent value="ideas"><Ideas openId={sp.get('idea')} /></TabContent>
                    <TabContent value="routine"><Routine /></TabContent>
                </div>
            </Tabs>
        </Container>
    )
}

export default Grow

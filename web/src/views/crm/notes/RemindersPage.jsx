/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import { TbBell, TbCheck, TbPlus, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AccordionCard from '@/components/crm/AccordionCard'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'
import confirmDelete from '@/components/crm/useConfirm'

// My reminders in accordions by when they come: late, today, later, done. Words and time are edited in place; the tick marks one done.
const ctl = 'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'
const box = 'h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'
const local = (d) => (d ? dayjs(d).format('YYYY-MM-DDTHH:mm') : '')
const TYPE = { task: 'Task', lead: 'Lead', customer: 'Client', ticket: 'Ticket', project: 'Project', invoice: 'Invoice', estimate: 'Estimate', proposal: 'Proposal', contract: 'Contract', expense: 'Expense', issue: 'Issue', kb_article: 'Article' }

const Edit = ({ value, type = 'text', placeholder, onCommit }) => {
    const [v, setV] = useState(value ?? '')
    useEffect(() => { setV(value ?? '') }, [value])
    return <input type={type} className={ctl} placeholder={placeholder} aria-label={placeholder} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '') && (v || type === 'text')) onCommit(v) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value ?? ''); e.currentTarget.blur() } }} />
}

const RemindersPage = () => {
    const [list, setList] = useState(null)
    const [shut, setShut] = useState({})
    const [draft, setDraft] = useState({ note: '', date: dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm') })
    const load = useCallback(() => { api('/api/crm/my-reminders/all').then((d) => setList(d.list)).catch((e) => { notify('danger', e.message); setList((l) => l || []) }) }, [])
    useEffect(() => { load() }, [load])
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load() } catch (e) { notify('danger', e.message); load() } }
    const patch = (r, body) => { setList((l) => l.map((x) => (x.id === r.id ? { ...x, ...('note' in body ? { note: body.note } : {}), ...('done' in body ? { done: body.done } : {}) } : x))); return run(() => api(`/api/crm/my-reminders/all/${r.id}`, { method: 'PATCH', body })) }
    const add = () => run(async () => { await api('/api/crm/my-reminders/all', { method: 'POST', body: { note: draft.note, date: new Date(draft.date).toISOString() } }); setDraft((d) => ({ ...d, note: '' })) }, tr('Reminder added'))

    const groups = useMemo(() => {
        const now = Date.now(), end = dayjs().endOf('day').valueOf(), start = dayjs().startOf('day').valueOf()
        const rows = list || []
        const open = rows.filter((r) => !r.done)
        const g = [
            { key: 'late', title: tr('Late'), dot: '#ef4444', tone: 'text-red-600', rows: open.filter((r) => +new Date(r.date) < start) },
            { key: 'today', title: tr('Today'), dot: '#f59e0b', rows: open.filter((r) => +new Date(r.date) >= start && +new Date(r.date) <= end) },
            { key: 'next', title: tr('Coming up'), dot: '#3b82f6', rows: open.filter((r) => +new Date(r.date) > end) },
            { key: 'done', title: tr('Done'), dot: '#10b981', rows: rows.filter((r) => r.done).sort((a, b) => +new Date(b.date) - +new Date(a.date)) },
        ]
        void now
        return g
    }, [list])
    const isShut = (g) => (g.key in shut ? shut[g.key] : g.key === 'done' || !g.rows.length)

    return (
        <Container>
            <div className="mb-3"><h3>{tr('Reminders')}</h3><p className="text-sm text-gray-500">{list ? `${tr('{n} to do', { n: groups.slice(0, 3).reduce((n, g) => n + g.rows.length, 0) })} · ${tr('{n} late', { n: groups[0].rows.length })}` : tr('Loading…')}</p></div>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); add() } }}>
                <TbBell className="text-lg text-primary" />
                <input className={`${box} min-w-[220px] flex-1`} placeholder={tr('Remind me to…')} aria-label={tr('Remind me to…')} value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
                <input type="datetime-local" aria-label={tr('When')} className={box} value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
                <Button size="sm" variant="solid" icon={<TbPlus />} disabled={!draft.note.trim() || !draft.date} onClick={add}>{tr('Add')}</Button>
            </div>
            <div className="flex flex-col gap-2.5">
                {list && !list.length && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600">{tr('No reminder yet. Add one above, or from any task, lead, client or ticket.')}</div>}
                {list && list.length > 0 && groups.map((g) => (
                    <AccordionCard key={g.key} title={g.title} tone={g.tone} dot={g.dot} count={g.rows.length} open={!isShut(g)} onToggle={() => setShut((s) => ({ ...s, [g.key]: !isShut(g) }))}>
                        {g.rows.length ? g.rows.map((r) => (
                            <div key={r.id} className="grid items-center gap-2 border-b border-gray-100 px-3 py-1 last:border-b-0 dark:border-gray-700" style={{ gridTemplateColumns: '32px minmax(160px,1fr) 190px minmax(0,150px) 40px' }}>
                                <Tooltip title={r.done ? tr('Mark as not done') : tr('Mark as done')}><button type="button" aria-label={r.done ? tr('Mark as not done') : tr('Mark as done')} onClick={() => patch(r, { done: !r.done })} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${r.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'}`}><TbCheck /></button></Tooltip>
                                <div className={r.done ? 'opacity-60' : ''}><Edit value={r.note} placeholder={tr('Reminder')} onCommit={(v) => patch(r, { note: v })} /></div>
                                <Edit type="datetime-local" value={local(r.date)} placeholder={tr('When')} onCommit={(v) => patch(r, { date: new Date(v).toISOString() })} />
                                <span className="min-w-0 truncate text-xs">{r.link ? <Link to={r.link} className="text-primary hover:underline" title={r.relLabel}>{tr(TYPE[r.relType] || 'Record')}{r.relLabel ? ` · ${r.relLabel}` : ''}</Link> : <span className="text-gray-400">—</span>}</span>
                                <Tooltip title={tr('Delete')}><Button size="xs" variant="plain" className="text-gray-400 hover:text-red-500" icon={<TbTrash />} onClick={() => confirmDelete(tr('Delete this reminder?'), () => run(() => api(`/api/crm/my-reminders/all/${r.id}`, { method: 'DELETE' }), tr('Deleted')))} /></Tooltip>
                            </div>
                        )) : <div className="px-4 py-3 text-sm text-gray-400">{tr('Nothing here.')}</div>}
                    </AccordionCard>
                ))}
            </div>
        </Container>
    )
}

export default RemindersPage

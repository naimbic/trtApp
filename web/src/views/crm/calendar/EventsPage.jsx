/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import { TbCalendarPlus, TbExternalLink, TbPlus, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AccordionCard from '@/components/crm/AccordionCard'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify, useCan } from '../kit/api'
import { tr } from '@/utils/t'

// Calendar events as accordions (by month or by category); title, times, category, colour and visibility are edited in place.
const CATS = [['meeting', 'Meeting', '#3b82f6'], ['call', 'Call', '#10b981'], ['visit', 'Visit', '#f59e0b'], ['deadline', 'Deadline', '#ef4444'], ['reminder', 'Reminder', '#8b5cf6'], ['other', 'Other', '#6b7280']]
const ctl = 'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'
const box = 'h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'
const local = (d) => (d ? dayjs(d).format('YYYY-MM-DDTHH:mm') : '')
const iso = (v) => (v ? new Date(v).toISOString() : null)

const Edit = ({ value, type = 'text', placeholder, disabled, onCommit }) => {
    const [v, setV] = useState(value ?? '')
    useEffect(() => { setV(value ?? '') }, [value])
    return <input type={type} disabled={disabled} className={ctl} placeholder={placeholder} aria-label={placeholder} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '') && (v || type === 'datetime-local')) onCommit(v) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value ?? ''); e.currentTarget.blur() } }} />
}

const EventsPage = () => {
    const can = useCan()
    const [list, setList] = useState(null)
    const [group, setGroup] = useState('month')
    const [shut, setShut] = useState({})
    const [draft, setDraft] = useState({ title: '', start: dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm'), end: '', category: 'meeting' })
    const edit = can('calendar', 'view'), now = Date.now()
    const load = useCallback(() => { api('/api/crm/events?pageIndex=1&pageSize=500&sortKey=start&order=asc').then((d) => setList(d.list || [])).catch((e) => { notify('danger', e.message); setList((l) => l || []) }) }, [])
    useEffect(() => { load() }, [load])
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load() } catch (e) { notify('danger', e.message); load() } }
    const patch = (r, body) => { setList((l) => l.map((x) => (x.id === r.id ? { ...x, ...body } : x))); return run(() => api(`/api/crm/events/${r.id}`, { method: 'PATCH', body })) }
    const add = () => run(async () => { await api('/api/crm/events', { method: 'POST', body: { title: draft.title, start: iso(draft.start), end: iso(draft.end), category: draft.category, color: CATS.find((c) => c[0] === draft.category)?.[2] } }); setDraft((d) => ({ ...d, title: '', end: '' })) }, tr('Event added'))

    const groups = useMemo(() => {
        const map = new Map()
        for (const r of list || []) {
            const key = group === 'month' ? dayjs(r.start).format('YYYY-MM') : r.category || 'other'
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(r)
        }
        const keys = [...map.keys()]
        const cur = dayjs().format('YYYY-MM')
        if (group === 'month') keys.sort((a, b) => ((a >= cur) === (b >= cur) ? (a >= cur ? a.localeCompare(b) : b.localeCompare(a)) : a >= cur ? -1 : 1)) // this month and later first, then the past, newest first
        else keys.sort((a, b) => CATS.findIndex((c) => c[0] === a) - CATS.findIndex((c) => c[0] === b))
        return keys.map((k) => {
            const cat = CATS.find((c) => c[0] === k)
            return { key: k, title: group === 'month' ? dayjs(`${k}-01`).format('MMMM YYYY') : tr(cat?.[1] || 'Other'), dot: group === 'month' ? (k < cur ? '#9ca3af' : '#3b82f6') : cat?.[2] || '#6b7280', rows: map.get(k), past: group === 'month' && k < cur }
        })
    }, [list, group])
    const isShut = (g) => (g.key in shut ? shut[g.key] : g.past)

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr('Calendar events')}</h3><p className="text-sm text-gray-500">{list ? tr('{n} events', { n: list.length }) : tr('Loading…')}</p></div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{tr('Group by')}</span>
                    <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                        {[['month', 'Month'], ['category', 'Category']].map(([k, l]) => <button key={k} type="button" onClick={() => setGroup(k)} className={`rounded-lg px-2.5 py-1 font-semibold transition ${group === k ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'}`}>{tr(l)}</button>)}
                    </div>
                    <Link to="/calendar"><Button size="sm" icon={<TbCalendarPlus />}>{tr('Open the calendar')}</Button></Link>
                </div>
            </div>
            {edit && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); add() } }}>
                    <input className={`${box} min-w-[200px] flex-1`} placeholder={tr('New event title')} aria-label={tr('Title')} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                    <select aria-label={tr('Category')} className={box} value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>{CATS.map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select>
                    <input type="datetime-local" aria-label={tr('Start')} className={box} value={draft.start} onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))} />
                    <input type="datetime-local" aria-label={tr('End')} className={box} value={draft.end} min={draft.start} onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))} />
                    <Button size="sm" variant="solid" icon={<TbPlus />} disabled={!draft.title.trim() || !draft.start} onClick={add}>{tr('Add')}</Button>
                </div>
            )}
            <div className="flex flex-col gap-2.5">
                {list && !list.length && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600">{tr('No event yet.')}</div>}
                {groups.map((g) => (
                    <AccordionCard key={g.key} title={g.title} dot={g.dot} count={g.rows.length} open={!isShut(g)} onToggle={() => setShut((s) => ({ ...s, [g.key]: !isShut(g) }))}>
                        <div className="overflow-x-auto"><div className="min-w-[900px]">
                            {g.rows.map((r) => (
                                <div key={r.id} className={`grid items-center gap-2 border-b border-gray-100 px-3 py-1 last:border-b-0 dark:border-gray-700 ${+new Date(r.end || r.start) < now ? 'opacity-70' : ''}`} style={{ gridTemplateColumns: '24px minmax(160px,1.4fr) 100px 178px 178px 70px 60px' }}>
                                    <input type="color" aria-label={tr('Color')} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" value={/^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : '#3b82f6'} onChange={(e) => setList((l) => l.map((x) => (x.id === r.id ? { ...x, color: e.target.value } : x)))} onBlur={(e) => patch(r, { color: e.target.value })} />
                                    <Edit value={r.title} placeholder={tr('Title')} disabled={!edit} onCommit={(v) => v && patch(r, { title: v })} />
                                    <select aria-label={tr('Category')} className={ctl} value={r.category || ''} onChange={(e) => patch(r, { category: e.target.value || null })}><option value="">—</option>{CATS.map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select>
                                    <Edit type="datetime-local" value={local(r.start)} placeholder={tr('Start')} disabled={!edit} onCommit={(v) => patch(r, { start: iso(v) })} />
                                    <Edit type="datetime-local" value={local(r.end)} placeholder={tr('End')} disabled={!edit} onCommit={(v) => patch(r, { end: iso(v) })} />
                                    <Tooltip title={r.isPublic ? tr('Public: everybody sees it') : tr('Private')}><span className="flex items-center gap-1 text-xs text-gray-500"><Switcher checked={!!r.isPublic} onChange={(c) => patch(r, { isPublic: c })} />{tr('Public')}</span></Tooltip>
                                    <span className="flex justify-end gap-0.5">
                                        <Tooltip title={tr('Open in the calendar')}><Link to={`/calendar?event=${r.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbExternalLink /></Link></Tooltip>
                                        <Tooltip title={tr('Delete')}><Button size="xs" variant="plain" className="text-gray-400 hover:text-red-500" icon={<TbTrash />} onClick={() => run(() => api(`/api/crm/events/${r.id}`, { method: 'DELETE' }), tr('Deleted'))} /></Tooltip>
                                    </span>
                                </div>
                            ))}
                        </div></div>
                    </AccordionCard>
                ))}
            </div>
        </Container>
    )
}

export default EventsPage

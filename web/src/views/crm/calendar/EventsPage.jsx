/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { TbCalendarPlus, TbChevronLeft, TbChevronRight, TbExternalLink, TbMapPin, TbPlus, TbSearch, TbTrash, TbUser, TbUsers, TbVideo } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AccordionCard from '@/components/crm/AccordionCard'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify, qs, useCan } from '../kit/api'
import { tr } from '@/utils/t'
import confirmDelete from '@/components/crm/useConfirm'

dayjs.extend(isoWeek)

// Calendar events of one month (fast), in accordions by week or category with a pager; two lines per event:
// the title, category and times, then the meeting link, place, client or lead, owner and guests. Everything is edited in place.
const CATS = [['meeting', 'Meeting', '#3b82f6'], ['call', 'Call', '#10b981'], ['visit', 'Visit', '#f59e0b'], ['deadline', 'Deadline', '#ef4444'], ['reminder', 'Reminder', '#8b5cf6'], ['other', 'Other', '#6b7280']]
const SIZES = [10, 25, 50]
const ctl = 'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'
const ctl2 = 'h-7 w-full rounded-lg border border-transparent bg-transparent px-2 text-xs hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'
const box = 'h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'
const local = (d) => (d ? dayjs(d).format('YYYY-MM-DDTHH:mm') : '')
const iso = (v) => (v ? new Date(v).toISOString() : null)

const Edit = ({ value, type = 'text', placeholder, disabled, small, onCommit }) => {
    const [v, setV] = useState(value ?? '')
    useEffect(() => { setV(value ?? '') }, [value])
    return <input type={type} disabled={disabled} className={small ? ctl2 : ctl} placeholder={placeholder} aria-label={placeholder} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '') && (v || type !== 'datetime-local')) onCommit(v) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value ?? ''); e.currentTarget.blur() } }} />
}

/** One group's rows with their own pager. */
const Rows = ({ rows, render }) => {
    const [page, setPage] = useState(1)
    const [size, setSize] = useState(10)
    const pages = Math.max(1, Math.ceil(rows.length / size))
    const cur = Math.min(page, pages)
    return (
        <>
            {rows.slice((cur - 1) * size, cur * size).map(render)}
            {rows.length > SIZES[0] && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-700">
                    <span>{(cur - 1) * size + 1}–{Math.min(cur * size, rows.length)} {tr('of')} {rows.length}</span>
                    <span className="flex items-center gap-1">
                        <select aria-label={tr('Rows per page')} className="h-7 rounded-lg border border-gray-200 bg-white px-1 text-xs dark:border-gray-600 dark:bg-gray-800" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1) }}>{SIZES.map((n) => <option key={n} value={n}>{n} / {tr('page')}</option>)}</select>
                        <Button size="xs" variant="plain" disabled={cur <= 1} icon={<TbChevronLeft />} aria-label={tr('Previous')} onClick={() => setPage(cur - 1)} />
                        <b className="px-1 tabular-nums">{cur} / {pages}</b>
                        <Button size="xs" variant="plain" disabled={cur >= pages} icon={<TbChevronRight />} aria-label={tr('Next')} onClick={() => setPage(cur + 1)} />
                    </span>
                </div>
            )}
        </>
    )
}

const EventsPage = () => {
    const can = useCan()
    const [month, setMonth] = useState(() => dayjs().startOf('month'))
    const [list, setList] = useState(null)
    const [group, setGroup] = useState('week')
    const [shut, setShut] = useState({})
    const [search, setSearch] = useState('')
    const [draft, setDraft] = useState({ title: '', start: dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm'), end: '', category: 'meeting', meetingUrl: '' })
    const edit = can('calendar', 'view'), now = Date.now()
    const load = useCallback(() => {
        api(`/api/crm/calendar/list?${qs({ from: month.toISOString(), to: month.add(1, 'month').toISOString() })}`).then((d) => setList(d.list || [])).catch((e) => { notify('danger', e.message); setList((l) => l || []) })
    }, [month])
    useEffect(() => { setList(null); load() }, [load])
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load() } catch (e) { notify('danger', e.message); load() } }
    const patch = (r, body) => { setList((l) => l.map((x) => (x.id === r.id ? { ...x, ...body } : x))); return run(() => api(`/api/crm/events/${r.id}`, { method: 'PATCH', body })) }
    const add = () => run(async () => { await api('/api/crm/events', { method: 'POST', body: { title: draft.title, start: iso(draft.start), end: iso(draft.end), category: draft.category, meetingUrl: draft.meetingUrl || null, color: CATS.find((c) => c[0] === draft.category)?.[2] } }); setDraft((d) => ({ ...d, title: '', end: '', meetingUrl: '' })) }, tr('Event added'))

    const shown = useMemo(() => { const n = search.trim().toLowerCase(); return (list || []).filter((r) => !n || `${r.title} ${r.about} ${r.owner} ${r.location} ${r.note}`.toLowerCase().includes(n)) }, [list, search])
    const groups = useMemo(() => {
        const map = new Map()
        for (const r of shown) {
            const key = group === 'week' ? dayjs(r.start).startOf('isoWeek').format('YYYY-MM-DD') : r.category || 'other'
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(r)
        }
        const keys = [...map.keys()]
        if (group === 'week') keys.sort()
        else keys.sort((a, b) => CATS.findIndex((c) => c[0] === a) - CATS.findIndex((c) => c[0] === b))
        return keys.map((k) => {
            const cat = CATS.find((c) => c[0] === k)
            const w = dayjs(k)
            const past = group === 'week' && w.endOf('isoWeek').valueOf() < now
            return { key: k, title: group === 'week' ? `${w.format('D MMM')} – ${w.endOf('isoWeek').format('D MMM')}` : tr(cat?.[1] || 'Other'), dot: group === 'week' ? (past ? '#9ca3af' : '#3b82f6') : cat?.[2] || '#6b7280', rows: map.get(k), past }
        })
    }, [shown, group, now])
    const isShut = (g) => (g.key in shut ? shut[g.key] : g.past)

    const row = (r) => {
        const meet = r.category === 'meeting' || !!r.meetingUrl
        return (
            <div key={r.id} className={`border-b border-gray-100 px-3 py-1.5 last:border-b-0 dark:border-gray-700 ${+new Date(r.end || r.start) < now ? 'opacity-70' : ''}`}>
                <div className="grid items-center gap-2" style={{ gridTemplateColumns: '24px minmax(160px,1.6fr) 100px 178px 178px 84px 64px' }}>
                    <input type="color" aria-label={tr('Color')} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" value={/^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : '#3b82f6'} onChange={(e) => setList((l) => l.map((x) => (x.id === r.id ? { ...x, color: e.target.value } : x)))} onBlur={(e) => patch(r, { color: e.target.value })} />
                    <Edit value={r.title} placeholder={tr('Title')} disabled={!edit || !r.mine} onCommit={(v) => v && patch(r, { title: v })} />
                    <select aria-label={tr('Category')} disabled={!r.mine} className={ctl} value={r.category || ''} onChange={(e) => patch(r, { category: e.target.value || null })}><option value="">—</option>{CATS.map(([k, l]) => <option key={k} value={k}>{tr(l)}</option>)}</select>
                    <Edit type="datetime-local" value={local(r.start)} placeholder={tr('Start')} disabled={!r.mine} onCommit={(v) => patch(r, { start: iso(v) })} />
                    <Edit type="datetime-local" value={local(r.end)} placeholder={tr('End')} disabled={!r.mine} onCommit={(v) => patch(r, { end: iso(v) })} />
                    <Tooltip title={r.isPublic ? tr('Public: everybody sees it') : tr('Private')}><span className="flex items-center gap-1 text-xs text-gray-500"><Switcher checked={r.isPublic} disabled={!r.mine} onChange={(c) => patch(r, { isPublic: c })} />{tr('Public')}</span></Tooltip>
                    <span className="flex justify-end gap-0.5">
                        <Tooltip title={tr('Open in the calendar')}><Link to={`/calendar?event=${r.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbExternalLink /></Link></Tooltip>
                        {r.mine && <Tooltip title={tr('Delete')}><Button size="xs" variant="plain" className="text-gray-400 hover:text-red-500" icon={<TbTrash />} onClick={() => confirmDelete(tr('Delete this event?'), () => run(() => api(`/api/crm/events/${r.id}`, { method: 'DELETE' }), tr('Deleted')))} /></Tooltip>}
                    </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 ps-8 text-xs text-gray-500">
                    {meet && (
                        <span className="flex w-64 items-center gap-1"><TbVideo className="shrink-0 text-blue-500" /><Edit small type="url" value={r.meetingUrl} placeholder={tr('Add a meeting link')} disabled={!r.mine} onCommit={(v) => patch(r, { meetingUrl: v || null })} />{r.meetingUrl && <a href={r.meetingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/15">{tr('Join')}</a>}</span>
                    )}
                    <span className="flex w-44 items-center gap-1"><TbMapPin className="shrink-0" /><Edit small value={r.location} placeholder={tr('Location')} disabled={!r.mine} onCommit={(v) => patch(r, { location: v || null })} /></span>
                    {r.about && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-semibold dark:bg-gray-700">{r.aboutType === 'lead' ? tr('Lead') : tr('Client')} · {r.about}</span>}
                    {r.owner && <span className="inline-flex items-center gap-1"><TbUser />{r.owner}</span>}
                    {(r.guests.length > 0 || r.outside > 0) && <span className="inline-flex items-center gap-1" title={r.guests.join(', ')}><TbUsers />{r.guests.length + r.outside}</span>}
                    {r.status === 'draft' && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">{tr('Request')}</span>}
                    {r.note && <span className="min-w-0 max-w-md flex-1 truncate" title={r.note}>{r.note}</span>}
                </div>
            </div>
        )
    }

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr('Calendar events')}</h3><p className="text-sm text-gray-500">{list ? tr('{n} events', { n: list.length }) : tr('Loading…')}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Button size="sm" icon={<TbChevronLeft />} aria-label={tr('Previous month')} onClick={() => setMonth((m) => m.subtract(1, 'month'))} />
                        <Button size="sm" onClick={() => setMonth(dayjs().startOf('month'))}>{tr('Today')}</Button>
                        <Button size="sm" icon={<TbChevronRight />} aria-label={tr('Next month')} onClick={() => setMonth((m) => m.add(1, 'month'))} />
                        <b className="ms-1 capitalize">{month.format('MMMM YYYY')}</b>
                    </div>
                    <div className="relative"><TbSearch className="absolute start-2 top-2 text-gray-400" /><input className={`${box} w-44 ps-7`} placeholder={tr('Search')} aria-label={tr('Search')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                        {[['week', 'Week'], ['category', 'Category']].map(([k, l]) => <button key={k} type="button" onClick={() => setGroup(k)} className={`rounded-lg px-2.5 py-1 font-semibold transition ${group === k ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'}`}>{tr(l)}</button>)}
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
                    {draft.category === 'meeting' && <input className={`${box} w-52`} placeholder={tr('Meeting link')} aria-label={tr('Meeting link')} value={draft.meetingUrl} onChange={(e) => setDraft((d) => ({ ...d, meetingUrl: e.target.value }))} />}
                    <Button size="sm" variant="solid" icon={<TbPlus />} disabled={!draft.title.trim() || !draft.start} onClick={add}>{tr('Add')}</Button>
                </div>
            )}
            <div className="flex flex-col gap-2.5">
                {list && !shown.length && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600">{tr('No event this month.')}</div>}
                {groups.map((g) => (
                    <AccordionCard key={`${group}-${g.key}`} title={g.title} dot={g.dot} count={g.rows.length} open={!isShut(g)} onToggle={() => setShut((s) => ({ ...s, [g.key]: !isShut(g) }))}>
                        <div className="overflow-x-auto"><div className="min-w-[900px]"><Rows rows={g.rows} render={row} /></div></div>
                    </AccordionCard>
                ))}
            </div>
        </Container>
    )
}

export default EventsPage

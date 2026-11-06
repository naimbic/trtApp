/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { TbCalendarOff, TbCalendarMonth, TbCalendarWeek, TbChevronDown, TbChevronLeft, TbChevronRight, TbList, TbPlus, TbTrash, TbX } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify, useCan } from '../kit/api'
import { tr } from '@/utils/t'

dayjs.extend(isoWeek)

// Company days off (holidays) on a calendar: month by default, week, or a list of cards. Add one with the + of any day.
const VIEWS = [['month', 'Month', TbCalendarMonth], ['week', 'Week', TbCalendarWeek], ['list', 'List', TbList]]
const ymd = (d) => dayjs(d).format('YYYY-MM-DD')
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch { return null } }
const ctl = 'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'

/** The small form that opens on a day: the reason, save, and delete when the day off already exists. */
const Pop = ({ date, item, canEdit, canDelete, onSave, onDelete, onClose, end }) => {
    const [reason, setReason] = useState(item?.reason || '')
    return (
        <div className={`absolute top-7 z-30 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800 ${end ? 'end-1' : 'start-1'}`} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1.5 flex items-center justify-between"><b className="text-sm">{dayjs(date).format('dddd D MMMM')}</b><button type="button" aria-label={tr('Close')} className="text-gray-400 hover:text-gray-600" onClick={onClose}><TbX /></button></div>
            <input
                autoFocus disabled={!canEdit} className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-900" placeholder={tr('Reason (Eid, national day…)')}
                value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canEdit) onSave(reason.trim()); if (e.key === 'Escape') onClose() }}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
                {item && canDelete ? <Button size="xs" className="text-red-500" icon={<TbTrash />} onClick={onDelete}>{tr('Delete')}</Button> : <span />}
                {canEdit && <Button size="xs" variant="solid" onClick={() => onSave(reason.trim())}>{item ? tr('Save') : tr('Add day off')}</Button>}
            </div>
        </div>
    )
}

const DaysOff = () => {
    const can = useCan()
    const [list, setList] = useState(null)
    const [view, setView] = useState(() => store('daysoff.view') || 'month')
    const [anchor, setAnchor] = useState(() => dayjs())
    const [pop, setPop] = useState(null) // { date, item }
    const [shut, setShut] = useState({})
    const canCreate = can('leave', 'create'), canEdit = can('leave', 'edit'), canDelete = can('leave', 'delete')

    const load = useCallback(() => {
        api('/api/crm/days-off?pageIndex=1&pageSize=500&sortKey=offDate&order=asc').then((d) => setList((d.list || []).map((x) => ({ id: x.id, date: String(x.offDate || '').slice(0, 10), reason: x.reason || '' })).filter((x) => x.date))).catch((e) => { notify('danger', e.message); setList((l) => l || []) })
    }, [])
    useEffect(() => { load() }, [load])
    useEffect(() => { store('daysoff.view', view) }, [view])
    const byDate = useMemo(() => { const m = {}; for (const x of list || []) (m[x.date] ||= []).push(x); return m }, [list])

    const act = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); setPop(null); load() } catch (e) { notify('danger', e.message) } }
    const add = (date, reason) => act(() => api('/api/crm/days-off', { method: 'POST', body: { offDate: date, reason } }), tr('Day off added'))
    const save = (item, body) => { setList((l) => l.map((x) => (x.id === item.id ? { ...x, ...('reason' in body ? { reason: body.reason } : {}) } : x))); return act(() => api(`/api/crm/days-off/${item.id}`, { method: 'PATCH', body }), '') }
    const remove = (item) => act(() => api(`/api/crm/days-off/${item.id}`, { method: 'DELETE' }), tr('Deleted'))

    const unit = view === 'week' ? 'week' : view === 'list' ? 'year' : 'month'
    const step = (n) => setAnchor((a) => a.add(n, unit))
    const title = view === 'month' ? anchor.format('MMMM YYYY') : view === 'week' ? `${anchor.startOf('isoWeek').format('D MMM')} – ${anchor.endOf('isoWeek').format('D MMM YYYY')}` : anchor.format('YYYY')
    const today = ymd(dayjs())

    const days = useMemo(() => {
        if (view === 'list') return []
        const start = view === 'month' ? anchor.startOf('month').startOf('isoWeek') : anchor.startOf('isoWeek')
        const n = view === 'month' ? Math.ceil((anchor.endOf('month').diff(start, 'day') + 1) / 7) * 7 : 7
        return Array.from({ length: n }, (_, i) => start.add(i, 'day'))
    }, [anchor, view])

    const cell = (d, i) => {
        const key = ymd(d), items = byDate[key] || []
        const out = view === 'month' && d.month() !== anchor.month()
        const wk = d.isoWeekday() > 5
        const open = pop?.date === key
        return (
            <div key={key} className={`group relative flex flex-col gap-1 border-b border-e border-gray-100 p-1.5 dark:border-gray-700 ${view === 'week' ? 'min-h-[300px]' : 'min-h-[104px]'} ${wk ? 'bg-gray-50/70 dark:bg-gray-900/40' : ''} ${out ? 'opacity-45' : ''}`}>
                <div className="flex items-center justify-between">
                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${key === today ? 'bg-primary text-white' : 'text-gray-500'}`}>{d.date() === 1 || view === 'week' ? d.format(view === 'week' ? 'ddd D' : 'D MMM') : d.date()}</span>
                    {canCreate && <button type="button" aria-label={tr('Add a day off on {date}', { date: d.format('D MMMM') })} title={tr('Add day off')} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-primary hover:text-white focus:opacity-100 group-hover:opacity-100" onClick={() => setPop({ date: key, item: null })}><TbPlus /></button>}
                </div>
                {items.map((x) => (
                    <button key={x.id} type="button" onClick={() => setPop({ date: key, item: x })} className="truncate rounded-md bg-rose-100 px-1.5 py-0.5 text-start text-xs font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300" title={x.reason}>{x.reason || tr('Day off')}</button>
                ))}
                {open && <Pop date={key} item={pop.item} canEdit={pop.item ? canEdit : canCreate} canDelete={canDelete} end={i % 7 > 3} onClose={() => setPop(null)} onSave={(reason) => (pop.item ? act(() => api(`/api/crm/days-off/${pop.item.id}`, { method: 'PATCH', body: { reason } }), tr('Saved')) : add(key, reason))} onDelete={() => remove(pop.item)} />}
            </div>
        )
    }

    // the list: cards, one accordion per month of the year
    const year = anchor.year()
    const months = useMemo(() => Array.from({ length: 12 }, (_, m) => ({ m, rows: (list || []).filter((x) => x.date.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)) })), [list, year])
    const total = months.reduce((n, g) => n + g.rows.length, 0)
    const [newDate, setNewDate] = useState('')

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr('Days off')}</h3><p className="text-sm text-gray-500">{tr('Company holidays: no work, no leave counted.')}{list ? ` · ${tr('{n} days off', { n: (list || []).filter((x) => x.date.startsWith(String(year))).length })} ${year}` : ''}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                        {VIEWS.map(([k, l, Icon]) => <button key={k} type="button" onClick={() => { setView(k); setPop(null) }} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${view === k ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'}`}><Icon />{tr(l)}</button>)}
                    </div>
                    {canCreate && <Button variant="solid" icon={<TbPlus />} onClick={() => { setPop({ date: today, item: null }); setView((v) => (v === 'list' ? 'month' : v)); setAnchor(dayjs()) }}>{tr('Add day off')}</Button>}
                </div>
            </div>

            <div className="mb-3 flex items-center gap-2">
                <Button size="sm" icon={<TbChevronLeft />} onClick={() => step(-1)} aria-label={tr('Previous')} />
                <Button size="sm" onClick={() => setAnchor(dayjs())}>{tr('Today')}</Button>
                <Button size="sm" icon={<TbChevronRight />} onClick={() => step(1)} aria-label={tr('Next')} />
                <h5 className="ms-2 capitalize">{title}</h5>
            </div>

            {view !== 'list' && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="min-w-[760px]">
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-900">
                            {[1, 2, 3, 4, 5, 6, 7].map((n) => <div key={n} className="py-1.5">{dayjs().isoWeekday(n).format('ddd')}</div>)}
                        </div>
                        <div className="grid grid-cols-7">{days.map(cell)}</div>
                    </div>
                </div>
            )}

            {view === 'list' && (
                <div className="flex flex-col gap-2.5">
                    {canCreate && (
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-2.5 dark:border-gray-600 dark:bg-gray-800" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.currentTarget.querySelector('button')?.click() } }}>
                            <input type="date" aria-label={tr('Date')} className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                            <NewReason disabled={!newDate} onAdd={(reason) => { add(newDate, reason).then(() => setNewDate('')) }} />
                        </div>
                    )}
                    {list && !total && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600"><TbCalendarOff className="mx-auto mb-2 text-3xl" />{tr('No day off in {year}.', { year })}</div>}
                    {months.filter((g) => g.rows.length).map((g) => {
                        const closed = !!shut[g.m]
                        return (
                            <div key={g.m} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                <button type="button" aria-expanded={!closed} onClick={() => setShut((s) => ({ ...s, [g.m]: !s[g.m] }))} className="flex w-full items-center gap-2.5 px-4 py-2 text-start hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                    <span className="font-semibold capitalize heading-text">{dayjs().month(g.m).format('MMMM')}</span>
                                    <span className="rounded-full bg-gray-100 px-2 text-xs font-bold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">{g.rows.length}</span>
                                    <span className="flex-1" /><TbChevronDown className={`text-gray-400 transition-transform ${closed ? '' : 'rotate-180'}`} />
                                </button>
                                {!closed && (
                                    <div className="grid gap-2.5 border-t border-gray-100 p-3 sm:grid-cols-2 xl:grid-cols-3 dark:border-gray-700">
                                        {g.rows.map((x) => {
                                            const d = dayjs(x.date), diff = d.startOf('day').diff(dayjs().startOf('day'), 'day')
                                            return (
                                                <div key={x.id} className={`flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 dark:border-gray-700 ${diff < 0 ? 'opacity-60' : ''}`}>
                                                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"><b className="text-lg leading-none">{d.date()}</b><span className="text-[10px] font-bold uppercase">{d.format('MMM')}</span></div>
                                                    <div className="min-w-0 flex-1">
                                                        <ReasonCell value={x.reason} disabled={!canEdit} onCommit={(v) => save(x, { reason: v })} />
                                                        <div className="ps-2 text-xs text-gray-500">{d.format('dddd')} · {diff === 0 ? tr('Today') : diff > 0 ? tr('in {n} days', { n: diff }) : tr('{n} days ago', { n: -diff })}</div>
                                                    </div>
                                                    {canDelete && <Tooltip title={tr('Delete')}><Button size="xs" variant="plain" className="text-gray-400 hover:text-red-500" icon={<TbTrash />} onClick={() => remove(x)} /></Tooltip>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </Container>
    )
}

const ReasonCell = ({ value, disabled, onCommit }) => {
    const [v, setV] = useState(value || '')
    useEffect(() => { setV(value || '') }, [value])
    return <input className={`${ctl} font-semibold`} disabled={disabled} placeholder={tr('Reason')} aria-label={tr('Reason')} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v.trim() !== (value || '')) onCommit(v.trim()) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
}

const NewReason = ({ disabled, onAdd }) => {
    const [v, setV] = useState('')
    return (
        <>
            <input className="h-8 min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900" placeholder={tr('Reason (Eid, national day…)')} value={v} onChange={(e) => setV(e.target.value)} />
            <Button size="sm" variant="solid" icon={<TbPlus />} disabled={disabled} onClick={() => { onAdd(v.trim()); setV('') }}>{tr('Add day off')}</Button>
        </>
    )
}

export default DaysOff

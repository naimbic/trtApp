/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbCheck, TbChevronDown, TbChevronLeft, TbChevronRight, TbPlus, TbTrash, TbX } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify, qs, useCan } from '../kit/api'
import { tr } from '@/utils/t'

// Leave requests as compact accordions: grouped by status, kind of leave or person, every cell edited in place, accept / refuse in one click.
const STATUS = {
    0: { label: 'Pending', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', dot: '#f59e0b' },
    1: { label: 'Accepted', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', dot: '#10b981' },
    2: { label: 'Refused', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', dot: '#f43f5e' },
}
const GROUPS = [['status', 'Status'], ['type', 'Leave type'], ['person', 'Person']]
const ctl = 'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'
const box = 'h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800'
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch { return null } }
const fmt = (s) => (s ? dayjs(s).format('DD MMM') : '—')

/** A text-like cell saved on Enter or when leaving it (Escape puts the old value back). */
const Cell = ({ value, type = 'text', disabled, placeholder, onCommit, className = '' }) => {
    const [v, setV] = useState(value ?? '')
    useEffect(() => { setV(value ?? '') }, [value])
    return (
        <input
            type={type} disabled={disabled} placeholder={placeholder} className={`${ctl} ${className}`} value={v} aria-label={placeholder}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => { if (String(v).trim() !== String(value ?? '')) onCommit(String(v).trim()) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value ?? ''); e.currentTarget.blur() } }}
        />
    )
}

const Who = ({ p }) => (
    <span className="flex min-w-0 items-center gap-2">
        <Avatar size={24} shape="circle" src={p.image || undefined}>{(p.name || '?').slice(0, 1)}</Avatar>
        <span className="truncate text-sm font-semibold">{p.name}</span>
    </span>
)

const LeaveRequests = () => {
    const can = useCan()
    const [data, setData] = useState(null)
    const [group, setGroup] = useState(() => store('leave.group') || 'status')
    const [month, setMonth] = useState('') // YYYY-MM, empty = all time
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [who, setWho] = useState('')
    const [kind, setKind] = useState('')
    const [shut, setShut] = useState({})
    const [adding, setAdding] = useState(false)
    const [draft, setDraft] = useState({})
    const [del, setDel] = useState(null)

    const period = month ? { from: `${month}-01`, to: dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD') } : { from, to }
    const load = useCallback(() => {
        api(`/api/crm/leave?${qs({ ...period, staffId: who, typeId: kind })}`).then(setData).catch((e) => { notify('danger', e.message); setData((d) => d || { list: [], types: [], staff: [], can: {} }) })
    }, [period.from, period.to, who, kind]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { load() }, [load])
    useEffect(() => { store('leave.group', group) }, [group])

    const types = data?.types || []
    const typeOf = (id) => types.find((t) => t.id === id)
    const list = data?.list || []
    const cap = data?.can || {}
    const mine = (r) => r.mine && r.status === 0
    const mayEdit = (r) => cap.edit || mine(r)

    const act = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load() } catch (e) { notify('danger', e.message); load() } }
    const patch = (r, body, ok) => {
        setData((d) => ({ ...d, list: d.list.map((x) => (x.id === r.id ? { ...x, ...body, ...(body.startTime !== undefined ? { startTime: body.startTime } : {}) } : x)) })) // shown at once
        return act(() => api(`/api/crm/leave/${r.id}`, { method: 'PATCH', body }), ok)
    }
    const decide = (r, status) => patch(r, { status }, status === 1 ? tr('Leave accepted') : status === 2 ? tr('Leave refused') : tr('Back to pending'))
    const addRow = async () => {
        if (!draft.startTime) { notify('warning', tr('Choose the first day')); return }
        try {
            await api('/api/crm/leave', { method: 'POST', body: { ...draft, endTime: draft.endTime || draft.startTime } })
            notify('success', tr('Leave request added')); setDraft({}); setAdding(false); load()
        } catch (e) { notify('danger', e.message) }
    }

    const groups = useMemo(() => {
        const map = new Map()
        const put = (key, head, r) => { if (!map.has(key)) map.set(key, { key, ...head, rows: [] }); map.get(key).rows.push(r) }
        if (group === 'status') for (const k of [0, 1, 2]) map.set(String(k), { key: String(k), title: tr(STATUS[k].label), dot: STATUS[k].dot, rows: [] })
        for (const r of list) {
            if (group === 'status') map.get(String(r.status in STATUS ? r.status : 0)).rows.push(r)
            else if (group === 'type') { const t = typeOf(r.typeId); put(r.typeId || 'none', { title: t?.name || tr('No type'), dot: t?.color || '#9ca3af' }, r) }
            else put(r.staff.id || 'none', { title: r.staff.name, dot: '#6366f1' }, r)
        }
        const arr = [...map.values()]
        if (group !== 'status') arr.sort((a, b) => a.title.localeCompare(b.title))
        return arr.filter((g) => g.rows.length || group === 'status')
    }, [list, group, types]) // eslint-disable-line react-hooks/exhaustive-deps

    const pending = list.filter((r) => r.status === 0).length
    const days = list.filter((r) => r.status === 1).reduce((n, r) => n + (r.days || 0), 0)
    const cols = `minmax(150px,1.1fr) minmax(150px,1.3fr) 130px 118px 118px 56px 92px ${cap.decide || cap.delete || list.some(mine) ? '112px' : ''}`
    const stepMonth = (n) => setMonth(dayjs(`${month || dayjs().format('YYYY-MM')}-01`).add(n, 'month').format('YYYY-MM'))
    const openAll = groups.every((g) => !shut[g.key])

    if (!can('leave', 'view_own') && !can('leave', 'view')) return <Container><div className="py-16 text-center text-gray-400">{tr('You cannot see leave requests.')}</div></Container>

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3>{tr('Leave requests')}</h3>
                    <p className="text-sm text-gray-500">{data ? `${tr('{n} requests', { n: list.length })} · ${tr('{n} pending', { n: pending })} · ${tr('{n} days accepted', { n: days })}` : tr('Loading…')}</p>
                </div>
                {cap.create && <Button variant="solid" icon={<TbPlus />} onClick={() => setAdding((a) => !a)}>{tr('New request')}</Button>}
            </div>

            {/* filters: month or dates, person, kind, grouping */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
                    <button type="button" aria-label={tr('Previous month')} className="px-2 py-1.5 text-gray-500 hover:text-primary" onClick={() => stepMonth(-1)}><TbChevronLeft /></button>
                    <input type="month" aria-label={tr('Month')} className="h-8 border-0 bg-transparent px-1 text-sm focus:outline-none" value={month} onChange={(e) => { setMonth(e.target.value); setFrom(''); setTo('') }} />
                    <button type="button" aria-label={tr('Next month')} className="px-2 py-1.5 text-gray-500 hover:text-primary" onClick={() => stepMonth(1)}><TbChevronRight /></button>
                </div>
                <span className="text-xs text-gray-400">{tr('or')}</span>
                <input type="date" aria-label={tr('From')} className={box} value={from} onChange={(e) => { setFrom(e.target.value); setMonth('') }} />
                <input type="date" aria-label={tr('To')} className={box} value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setMonth('') }} />
                {(month || from || to) && <Tooltip title={tr('All dates')}><Button size="sm" icon={<TbX />} onClick={() => { setMonth(''); setFrom(''); setTo('') }} /></Tooltip>}
                {cap.all && <select aria-label={tr('Person')} className={box} value={who} onChange={(e) => setWho(e.target.value)}><option value="">{tr('Everybody')}</option>{data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                {types.length > 0 && <select aria-label={tr('Leave type')} className={box} value={kind} onChange={(e) => setKind(e.target.value)}><option value="">{tr('All kinds')}</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                <div className="ms-auto flex items-center gap-2">
                    <span className="text-xs text-gray-400">{tr('Group by')}</span>
                    <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                        {GROUPS.map(([k, l]) => <button key={k} type="button" onClick={() => setGroup(k)} className={`rounded-lg px-2.5 py-1 font-semibold transition ${group === k ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'}`}>{tr(l)}</button>)}
                    </div>
                    {groups.length > 1 && <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setShut(openAll ? Object.fromEntries(groups.map((g) => [g.key, true])) : {})}>{openAll ? tr('Collapse all') : tr('Expand all')}</button>}
                </div>
            </div>

            {adding && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); addRow() } }}>
                    {cap.all && <select aria-label={tr('Person')} className={box} value={draft.staffId || ''} onChange={(e) => setDraft((d) => ({ ...d, staffId: e.target.value }))}><option value="">{tr('Me')}</option>{data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                    {types.length > 0 && <select aria-label={tr('Leave type')} className={box} value={draft.typeId || ''} onChange={(e) => setDraft((d) => ({ ...d, typeId: e.target.value }))}><option value="">{tr('Leave type')}</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                    <input type="date" aria-label={tr('From')} className={box} value={draft.startTime || ''} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value, endTime: d.endTime && d.endTime >= e.target.value ? d.endTime : e.target.value }))} />
                    <span className="text-gray-400">→</span>
                    <input type="date" aria-label={tr('To')} className={box} value={draft.endTime || ''} min={draft.startTime || undefined} onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))} />
                    <input className={`${box} min-w-[180px] flex-1`} placeholder={tr('Subject or reason')} value={draft.subject || ''} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
                    <Button size="sm" variant="solid" icon={<TbCheck />} onClick={addRow}>{tr('Add')}</Button>
                    <Button size="sm" onClick={() => { setAdding(false); setDraft({}) }}>{tr('Cancel')}</Button>
                </div>
            )}

            <div className="flex flex-col gap-2.5">
                {data && !list.length && <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center text-gray-400 dark:border-gray-600">{tr('No leave request for this period.')}</div>}
                {groups.map((g) => {
                    const closed = !!shut[g.key]
                    const total = g.rows.reduce((n, r) => n + (r.days || 0), 0)
                    return (
                        <div key={g.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                            <button type="button" aria-expanded={!closed} onClick={() => setShut((s) => ({ ...s, [g.key]: !s[g.key] }))} className="flex w-full items-center gap-2.5 px-4 py-2 text-start hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.dot }} />
                                <span className="font-semibold heading-text">{g.title}</span>
                                <span className="rounded-full bg-gray-100 px-2 text-xs font-bold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">{g.rows.length}</span>
                                {total > 0 && <span className="text-xs text-gray-400">{tr('{n} days', { n: total })}</span>}
                                <span className="flex-1" />
                                <TbChevronDown className={`text-gray-400 transition-transform ${closed ? '' : 'rotate-180'}`} />
                            </button>
                            {!closed && (
                                <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                                    <div className="min-w-[860px]">
                                        {g.rows.length > 0 && (
                                            <div className="grid items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400" style={{ gridTemplateColumns: cols }}>
                                                <span>{tr('Person')}</span><span>{tr('Subject')}</span><span>{tr('Leave type')}</span><span>{tr('From')}</span><span>{tr('To')}</span><span>{tr('Days')}</span><span>{tr('Status')}</span><span />
                                            </div>
                                        )}
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {g.rows.map((r) => {
                                                const st = STATUS[r.status] || STATUS[0]
                                                const edit = mayEdit(r)
                                                const t = typeOf(r.typeId)
                                                return (
                                                    <div key={r.id} className="grid items-center gap-2 px-3 py-1" style={{ gridTemplateColumns: cols }}>
                                                        <Who p={r.staff} />
                                                        <Cell value={r.subject} placeholder={tr('Subject')} disabled={!edit} onCommit={(v) => patch(r, { subject: v })} />
                                                        <span className="flex items-center gap-1.5">
                                                            {t?.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />}
                                                            <select aria-label={tr('Leave type')} disabled={!edit} className={ctl} value={r.typeId} onChange={(e) => patch(r, { typeId: e.target.value })}><option value="">—</option>{types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                                                        </span>
                                                        <Cell type="date" value={r.startTime} disabled={!edit} onCommit={(v) => v && patch(r, { startTime: v, ...(r.endTime < v ? { endTime: v } : {}) })} />
                                                        <Cell type="date" value={r.endTime} disabled={!edit} onCommit={(v) => v && patch(r, { endTime: v })} />
                                                        <Cell type="number" value={String(r.days ?? '')} disabled={!edit} className="text-center tabular-nums" onCommit={(v) => patch(r, { numberOfDays: v === '' ? 0 : Number(v) })} />
                                                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-bold ${st.tone}`} title={r.decidedAt ? dayjs(r.decidedAt).format('DD MMM YYYY HH:mm') : undefined}>{tr(st.label)}</span>
                                                        {(cap.decide || cap.delete || mine(r)) && (
                                                            <span className="flex justify-end gap-0.5">
                                                                {cap.decide && r.status !== 1 && <Tooltip title={tr('Accept')}><Button size="xs" className="text-emerald-600" icon={<TbCheck />} onClick={() => decide(r, 1)} /></Tooltip>}
                                                                {cap.decide && r.status !== 2 && <Tooltip title={tr('Refuse')}><Button size="xs" className="text-rose-600" icon={<TbX />} onClick={() => decide(r, 2)} /></Tooltip>}
                                                                {(cap.delete || mine(r)) && <Tooltip title={tr('Delete')}><Button size="xs" variant="plain" className="text-gray-400 hover:text-red-500" icon={<TbTrash />} onClick={() => setDel(r)} /></Tooltip>}
                                                            </span>
                                                        )}
                                                        {r.reason && <div className="col-span-full -mt-0.5 truncate ps-9 text-xs text-gray-400" title={r.reason}>{r.reason}</div>}
                                                    </div>
                                                )
                                            })}
                                            {!g.rows.length && <div className="px-4 py-3 text-sm text-gray-400">{tr('Nothing here.')}</div>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this leave request?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const r = del; setDel(null); act(() => api(`/api/crm/leave/${r.id}`, { method: 'DELETE' }), tr('Deleted')) }}>
                <p>{del?.staff?.name} · {fmt(del?.startTime)} → {fmt(del?.endTime)}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default LeaveRequests

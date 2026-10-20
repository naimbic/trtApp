/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbTarget, TbTrophy, TbTrendingUp, TbAlertTriangle, TbPlus, TbDots, TbPencil, TbCopy, TbTrash, TbCheck, TbCircle, TbBulb } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Segment from '@/components/ui/Segment'
import Dropdown from '@/components/ui/Dropdown'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { useClientLookups, makeMoney } from '../clients/shared'
import { api, notify } from '../kit/api'
import GoalDialog, { KIND_ICON } from './GoalDialog'
import { tr } from '@/utils/t'

const STATUS = {
    achieved: { label: 'Achieved', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', bar: '#10b981' },
    ahead: { label: 'Ahead', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', bar: '#10b981' },
    on_track: { label: 'On track', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', bar: '#3b82f6' },
    behind: { label: 'Behind', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', bar: '#f59e0b' },
    missed: { label: 'Missed', cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300', bar: '#ef4444' },
    upcoming: { label: 'Starts soon', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', bar: '#9ca3af' },
    legacy: { label: 'Not measured', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', bar: '#9ca3af' },
}

// ideas shown when there is nothing yet
const IDEAS = [
    { title: 'Collect 100,000 every month', preset: { kind: 'income', achievement: 100000, period: 'month' } },
    { title: 'Invoice 300,000 this quarter', preset: { kind: 'invoiced', achievement: 300000, period: 'quarter' } },
    { title: '10 new customers every quarter', preset: { kind: 'customers', achievement: 10, period: 'quarter' } },
    { title: '40 new leads every month', preset: { kind: 'leads', achievement: 40, period: 'month' } },
    { title: 'Win 5 leads every month', preset: { kind: 'converted', achievement: 5, period: 'month' } },
    { title: 'Finish 120 tasks every month', preset: { kind: 'tasks', achievement: 120, period: 'month' } },
]

const periodText = (g) => (g.period === 'fixed' ? `${dayjs(g.startDate).format('DD MMM')} – ${dayjs(g.endDate).format('DD MMM YYYY')}` : g.period === 'month' ? dayjs(g.startDate).format('MMMM YYYY') : g.period === 'quarter' ? `Q${Math.floor(dayjs(g.startDate).month() / 3) + 1} ${dayjs(g.startDate).year()}` : String(dayjs(g.startDate).year()))

const GoalCard = ({ g, fmt, canEdit, canDelete, onEdit, onDuplicate, onDelete, onTick }) => {
    const [open, setOpen] = useState(false)
    const Icon = KIND_ICON[g.kind] || TbTarget
    const st = STATUS[g.status] || STATUS.legacy
    const money = g.unit === 'money'
    const shown = open ? g.steps : g.steps.slice(0, 4)
    return (
        <section className="group relative rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xl text-primary"><Icon /></span>
                <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[15px] font-extrabold">{g.subject}</h4>
                    <div className="truncate text-xs text-gray-400">{g.legacy ? tr('Imported goal: edit it to choose what it measures') : `${tr(g.kindLabel)} · ${periodText(g)}${g.staff ? ` · ${g.staff}` : ` · ${tr('Whole company')}`}`}</div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${st.cls}`}>{tr(st.label)}</span>
                {(canEdit || canDelete) && (
                    <div className="absolute right-2 top-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <Dropdown placement="bottom-end" renderTitle={<button type="button" aria-label={tr('Options')} className="flex size-7 items-center justify-center rounded-full bg-white text-lg text-gray-500 shadow-sm hover:bg-gray-100 dark:bg-gray-700"><TbDots /></button>}>
                            {canEdit && <Dropdown.Item eventKey="e" onClick={onEdit}><span className="flex items-center"><TbPencil className="mr-2 text-lg" />{tr('Edit')}</span></Dropdown.Item>}
                            {canEdit && <Dropdown.Item eventKey="d" onClick={onDuplicate}><span className="flex items-center"><TbCopy className="mr-2 text-lg" />{tr('Duplicate')}</span></Dropdown.Item>}
                            {canDelete && <Dropdown.Item eventKey="x" onClick={onDelete}><span className="flex items-center text-red-500"><TbTrash className="mr-2 text-lg" />{tr('Delete')}</span></Dropdown.Item>}
                        </Dropdown>
                    </div>
                )}
            </div>
            {!g.legacy && (
                <>
                    <div className="mt-4 flex items-end justify-between gap-2">
                        <div><span className="text-2xl font-extrabold tabular-nums">{fmt(g.current, money)}</span><span className="ml-1 text-sm text-gray-400">/ {fmt(g.target, money)}</span></div>
                        <span className="text-2xl font-extrabold tabular-nums" style={{ color: st.bar }}>{g.pct}%</span>
                    </div>
                    <div className="relative mt-2 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, g.pct)}%`, background: st.bar }} />
                        {g.steps.filter((s) => s.auto && g.target > 0).map((s) => <i key={s.id} title={s.title} className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 ${s.reached ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-500'}`} style={{ left: `${Math.min(100, (s.at / g.target) * 100)}%` }} />)}
                        {g.status !== 'achieved' && g.status !== 'missed' && g.status !== 'upcoming' && <i title={tr('Where it should be today')} className="absolute -top-1 h-4.5 w-0.5 bg-gray-500/60" style={{ left: `${g.expected}%`, height: 18 }} />}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        {g.status === 'achieved' ? tr('Target reached') : g.status === 'missed' ? tr('Period over: {n} short', { n: fmt(g.remaining, money) }) : g.status === 'upcoming' ? tr('Starts {d}', { d: dayjs(g.startDate).format('DD MMM') }) : tr('{n} days left · {x} still to reach, about {p} a day', { n: g.daysLeft, x: fmt(g.remaining, money), p: fmt(g.perDay, money) })}
                    </div>
                </>
            )}
            {g.steps.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-2 dark:border-gray-700">
                    {shown.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 py-1 text-sm">
                            {s.auto ? (s.reached ? <TbCheck className="shrink-0 text-emerald-500" /> : <TbCircle className="shrink-0 text-gray-300" />) : (
                                <input type="checkbox" className="size-3.5 shrink-0 cursor-pointer accent-emerald-500" checked={s.reached} disabled={!canEdit} onChange={() => onTick(s)} aria-label={s.title} />
                            )}
                            <span className={`min-w-0 flex-1 truncate ${s.reached ? 'text-gray-400 line-through' : ''}`}>{s.title}</span>
                            {s.auto && s.at !== null && <span className="shrink-0 text-xs text-gray-400">{fmt(s.at, money)}</span>}
                            {s.due && <span className={`shrink-0 text-xs ${!s.reached && dayjs(s.due).isBefore(dayjs(), 'day') ? 'text-red-500' : 'text-gray-400'}`}>{dayjs(s.due).format('DD MMM')}</span>}
                        </div>
                    ))}
                    {g.steps.length > 4 && <button type="button" className="mt-1 text-xs font-semibold text-primary hover:underline" onClick={() => setOpen(!open)}>{open ? tr('Show fewer steps') : tr('{n} more steps', { n: g.steps.length - 4 })}</button>}
                </div>
            )}
        </section>
    )
}

/** Company goals with live progress: what to reach, the period, who it is for, and the steps on the way. */
const GoalsPage = () => {
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('running')
    const [dlg, setDlg] = useState({ open: false, goal: null, preset: null })
    const [del, setDel] = useState(null)
    const load = useCallback(() => { api('/api/crm/goals-board').then((x) => { setD(x); setError('') }).catch((e) => setError(e.message)) }, [])
    useEffect(() => { load() }, [load])
    const base = d?.baseCurrencyId
    const symbol = lookups.currencies.find((c) => c.id === base)?.symbol || lookups.currencies.find((c) => c.id === base)?.name || ''
    const fmt = (n, isMoney) => (isMoney ? money(n, base, { decimals: 0 }) : Number(Math.round(n * 10) / 10).toLocaleString('en-US'))
    const goals = d?.goals || []
    const running = goals.filter((g) => ['ahead', 'on_track', 'behind', 'upcoming', 'legacy'].includes(g.status))
    const shown = useMemo(() => (filter === 'running' ? running : filter === 'achieved' ? goals.filter((g) => g.status === 'achieved') : filter === 'ended' ? goals.filter((g) => g.status === 'missed') : goals), [filter, goals, running])
    const count = (s) => goals.filter((g) => s.includes(g.status)).length
    const tick = async (g, step) => {
        const steps = g.steps.map(({ id, title, at, due, done }) => ({ id, title, at, due, done: id === step.id ? !step.reached : done }))
        try { await api(`/api/crm/goals/${g.id}`, { method: 'PATCH', body: { stepsRaw: JSON.stringify(steps) } }); load() } catch (e) { notify('danger', e.message) }
    }
    const duplicate = async (g) => {
        try {
            await api('/api/crm/goals', { method: 'POST', body: { subject: `${g.subject} (${tr('copy')})`, description: g.description, kind: g.kind, achievement: g.target, period: g.period, startDate: g.period === 'fixed' ? g.startDate : null, endDate: g.period === 'fixed' ? g.endDate : null, staffId: g.staffId, stepsRaw: g.steps.length ? JSON.stringify(g.steps.map(({ id, title, at, due }) => ({ id, title, at, due, done: false }))) : '' } })
            notify('success', tr('Goal created')); load()
        } catch (e) { notify('danger', e.message) }
    }
    const remove = async () => { const g = del; setDel(null); try { await api(`/api/crm/goals/${g.id}`, { method: 'DELETE' }); notify('success', tr('Goal deleted')); load() } catch (e) { notify('danger', e.message) } }

    return (
        <Container>
            <InvoiceHead
                title={tr('Goals')}
                stats={[
                    { icon: <TbTarget />, label: tr('Running goals'), value: d ? String(running.length) : '–' },
                    { icon: <TbTrophy />, label: tr('Achieved'), value: d ? String(count(['achieved'])) : '–' },
                    { icon: <TbTrendingUp />, label: tr('On track or ahead'), value: d ? String(count(['ahead', 'on_track'])) : '–' },
                    { icon: <TbAlertTriangle />, label: tr('Behind'), value: d ? String(count(['behind'])) : '–' },
                ]}
            />
            <div className="cx-tools">
                <Segment size="sm" value={filter} onChange={(v) => v && setFilter(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="running">{tr('Running')}</Segment.Item><Segment.Item value="achieved">{tr('Achieved')}</Segment.Item><Segment.Item value="ended">{tr('Missed')}</Segment.Item><Segment.Item value="all">{tr('All')}</Segment.Item>
                </Segment>
                {d?.can.create && <Button size="sm" variant="solid" className="ml-auto" icon={<TbPlus />} onClick={() => setDlg({ open: true, goal: null, preset: null })}>{tr('New goal')}</Button>}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {d?.ratesMissing && <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10">{tr('A currency has no rate, so its amounts are left out. Set the rate in Settings → Currencies.')}</div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((g) => <GoalCard key={g.id} g={g} fmt={fmt} canEdit={d.can.edit} canDelete={d.can.delete} onEdit={() => setDlg({ open: true, goal: g, preset: null })} onDuplicate={() => duplicate(g)} onDelete={() => setDel(g)} onTick={(s) => tick(g, s)} />)}
            </div>
            {d && !goals.length && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 dark:border-gray-600">
                    <div className="mb-3 flex items-center gap-2 font-bold"><TbBulb className="text-xl text-amber-500" />{tr('No goals yet. A few ideas to start from:')}</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {IDEAS.map((i) => <button key={i.title} type="button" disabled={!d.can.create} onClick={() => setDlg({ open: true, goal: null, preset: i.preset })} className="rounded-xl border border-gray-200 px-3 py-2 text-left text-sm font-semibold transition hover:border-primary dark:border-gray-700">{tr(i.title)}</button>)}
                    </div>
                </div>
            )}
            {d && goals.length > 0 && !shown.length && <div className="py-10 text-center text-gray-400">{tr('Nothing here')}</div>}
            {!d && !error && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            <p className="mt-4 text-xs text-gray-400">{tr('Amounts are in the default currency; other currencies are converted with the rates of Settings → Currencies. Every goal is measured live from your payments, invoices, customers, leads and tasks.')}</p>
            <GoalDialog open={dlg.open} goal={dlg.goal} preset={dlg.preset} symbol={symbol} onClose={() => setDlg({ open: false, goal: null, preset: null })} onSaved={load} />
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this goal?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}><p>{del?.subject}</p></ConfirmDialog>
        </Container>
    )
}

export default GoalsPage

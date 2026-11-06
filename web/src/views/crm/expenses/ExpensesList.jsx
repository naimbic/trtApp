import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { TbPlus, TbSearch, TbReceipt2, TbFileInvoice, TbCashBanknote, TbRepeat, TbFolderPlus } from 'react-icons/tb'
import dayjs from 'dayjs'
import Chart from '@/components/shared/Chart'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import { api, qs, notify } from '../kit/api'
import GroupedAccordions, { GroupDialog, NONE, colorOf } from '../kit/GroupedAccordions'
import PeriodPicker, { periodRange } from '../kit/PeriodPicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RelationSelect from '../kit/RelationSelect'
import ExpenseDrawer from './ExpenseDrawer'
import { onCreate } from '@/utils/createIntent'
import { tr, trn } from '@/utils/t'
import { KpiCard } from '../kit/KpiCard'

const STATES = [['', tr("All")], ['billable', tr("To invoice")], ['invoiced', tr("Invoiced")], ['nonbillable', tr("Not billable")], ['recurring', tr("Recurring")]]
const toneOf = (cls = '') => (/sky|blue/.test(cls) ? 'blue' : /emerald|green/.test(cls) ? 'green' : /purple|violet/.test(cls) ? 'violet' : /amber|yellow|orange/.test(cls) ? 'amber' : /red|rose/.test(cls) ? 'red' : /teal|cyan/.test(cls) ? 'teal' : /pink/.test(cls) ? 'pink' : 'blue')
const Stat = ({ title, value, className, icon, sub, change }) => <KpiCard label={title} value={value} sub={sub} icon={icon} tone={toneOf(className)} change={change} />

const ExpensesList = () => {
    const [sp, setSp] = useSearchParams()
    const [data, setData] = useState({ list: [], total: 0, stats: {}, topCategories: [], months: [], lookups: { categories: [], currencies: [], taxes: [], paymentModes: [] }, can: {} })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [state, setState] = useState('')
    const [categoryId, setCategoryId] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [period, setPeriod] = useState({ preset: 'month', from: '', to: '' }) // this month by default
    const [groupDlg, setGroupDlg] = useState(null)
    const [delGroup, setDelGroup] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: !!sp.get('open'), id: sp.get('open') || null, categoryId: null })

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try {
            setData(await api(`/api/crm/sales/expenses?${qs({ query, state, categoryId: categoryId || '', clientId: clientId || '', ...periodRange(period), pageIndex: 1, pageSize: 500, sortKey: 'date', order: 'desc' })}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, categoryId, clientId, period])
    useEffect(() => { load() }, [load])
    useEffect(() => { const o = sp.get('open'); if (o) { setDrawer({ open: true, id: o }); sp.delete('open'); setSp(sp, { replace: true }) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const cur = data.lookups.currencies.find((c) => c.isDefault) || data.lookups.currencies[0]
    const ec = (k, goodUp = true) => { const t = data.stats.trend; return t ? { cur: t.cur[k] ?? 0, prev: t.prev[k] ?? 0, goodUp, label: tr('vs previous {n} days', { n: t.days }) } : undefined }
    const m = (n, c = cur) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c?.symbol || c?.name || ''}`.trim()
    const curOf = (id) => data.lookups.currencies.find((c) => c.id === id) || cur
    const catOpts = data.lookups.categories.map((c) => ({ value: c.id, label: c.name }))
    const open = (id) => setDrawer({ open: true, id })
    useEffect(() => onCreate('expense', () => setDrawer({ open: true, id: null, categoryId: null })), [])
    const lookups = async () => { const l = await api('/api/crm/sales/expenses/lookups'); setData((d) => ({ ...d, lookups: l })) }
    const maxCat = Math.max(...data.topCategories.map((c) => c.value), 1)

    // the groups: the categories in the order of the page, with what was spent in each (when it is all in one currency)
    const groups = [...data.lookups.categories.map((c) => ({ id: c.id, name: c.name, color: colorOf(c.color), items: data.list.filter((e) => e.categoryId === c.id) })), { id: NONE, name: tr('No category'), color: 'slate', locked: true, items: data.list.filter((e) => !e.categoryId || !data.lookups.categories.some((c) => c.id === e.categoryId)) }]
        .map((g) => { const cs = [...new Set(g.items.map((e) => e.currencyId || ''))]; return { ...g, sub: g.items.length && cs.length === 1 ? m(g.items.reduce((n, e) => n + (e.total || 0), 0), curOf(g.items[0].currencyId)) : '' } })
        .filter((g) => !g.locked || g.items.length)
        .filter((g) => !categoryId || g.id === categoryId)
    const move = async ({ item, to }) => {
        if (to === NONE) return notify('warning', tr('Choose a category'))
        setData((d) => ({ ...d, list: d.list.map((e) => (e.id === item.id ? { ...e, categoryId: to, category: d.lookups.categories.find((c) => c.id === to)?.name || '' } : e)) }))
        try { await api('/api/crm/sales/expenses/move', { method: 'POST', body: { ids: [item.id], categoryId: to } }) } catch (e) { notify('danger', e.message) } finally { load() }
    }
    const reorderCats = async (ids) => { try { await api('/api/crm/sales/expenses/groups', { method: 'PATCH', body: { ids } }) } catch (e) { notify('danger', e.message) } finally { load() } }
    const saveCat = async () => { try { await api('/api/crm/sales/expenses/groups', { method: groupDlg.id ? 'PUT' : 'POST', body: groupDlg }); setGroupDlg(null); load() } catch (e) { notify('danger', e.message) } }
    const removeCat = async () => { const g = delGroup; setDelGroup(null); try { await api(`/api/crm/sales/expenses/groups?id=${g.id}`, { method: 'DELETE' }); notify('success', tr('Category deleted')); load() } catch (e) { notify('danger', e.message) } }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr("Expenses")}</h3><p className="text-sm text-gray-500">{trn(data.total, "expense")} {tr("match your filters")}</p></div>
                <div className="flex gap-2">{data.can.create && <Button icon={<TbFolderPlus />} onClick={() => setGroupDlg({ name: '', color: 'blue' })}>{tr("New category")}</Button>}{data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New expense")}</Button>}</div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Stat title={tr("Total spent")} change={ec('total', false)} className="bg-sky-100" value={m(data.stats.total)} sub={tr("{v1} tax included", { v1: m(data.stats.tax) })} icon={<TbReceipt2 />} />
                <Stat title={tr("To invoice")} change={ec('billable')} className="bg-purple-100" value={m(data.stats.billable)} sub={tr("Billable, not invoiced yet")} icon={<TbCashBanknote />} />
                <Stat title={tr("Invoiced")} change={ec('invoiced')} className="bg-emerald-100" value={m(data.stats.invoiced)} icon={<TbFileInvoice />} />
                <Stat title={tr("Expenses")} className="bg-amber-100" value={data.stats.count ?? 0} sub="in this selection" icon={<TbRepeat />} />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <h5 className="mb-2">{tr("By month")}</h5>
                    {data.months.length ? <Chart type="bar" height={220} series={[{ name: 'Spent', data: data.months.map((x) => x.value) }]} xAxis={data.months.map((x) => dayjs(`${x.month}-01`).format('MMM YY'))} customOptions={{ colors: ['#3b82f6'], legend: { show: false }, dataLabels: { enabled: false }, plotOptions: { bar: { columnWidth: '35%', borderRadius: 4, borderRadiusApplication: 'end' } }, tooltip: { y: { formatter: (v) => m(v) } } }} /> : <p className="py-10 text-center text-gray-500">{tr("No data for these filters.")}</p>}
                </Card>
                <Card>
                    <h5 className="mb-4">{tr("Top categories")}</h5>
                    <div className="space-y-3">{data.topCategories.map((c) => <div key={c.id}><div className="mb-1 flex justify-between text-sm"><span className="truncate font-semibold">{c.name}</span><span className="tabular-nums text-gray-500">{m(c.value)}</span></div><div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.value / maxCat) * 100}%` }} /></div></div>)}</div>
                    {!data.topCategories.length && <p className="py-6 text-center text-gray-500">{tr("Nothing here yet.")}</p>}
                </Card>
            </div>

            <div className="mb-3"><PeriodPicker value={period} onChange={setPeriod} /></div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search name, note, reference")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-52"><Select size="sm" isClearable placeholder={tr("Any category")} options={catOpts} value={catOpts.find((o) => o.value === categoryId) || null} onChange={(o) => setCategoryId(o?.value || null)} /></div>
                <div className="w-52"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(x) => setClientId(x || null)} /></div>
                <Segment size="sm" value={state} onChange={(v) => setState(Array.isArray(v) ? v[0] ?? '' : v ?? '')}>{STATES.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            {loading && !data.list.length ? <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div> : (
                <GroupedAccordions storeKey="expenses_open" groups={groups} canDrag={!!data.can.edit} canEdit={!!data.can.edit} canDelete={!!data.can.delete} canAdd={!!data.can.create}
                    forceOpen={!!query || !!categoryId || !!clientId || !!state} empty={tr("No expenses in this period")} groupEmpty={tr("No expenses in this category for the period.")}
                    onMove={move} onReorderGroups={reorderCats} onAdd={(g) => setDrawer({ open: true, id: null, categoryId: g.id })} onEdit={(g) => setGroupDlg({ id: g.id, name: g.name, color: g.color })} onDelete={setDelGroup}
                    renderRow={(e, { handle }) => (
                        <div className="flex items-center gap-2">
                            {handle}
                            <button type="button" onClick={() => open(e.id)} className="min-w-0 flex-1 text-start">
                                <div className="truncate font-semibold heading-text">{e.name}</div>
                                <div className="truncate text-xs text-gray-500">{[e.date ? dayjs(e.date).format('DD MMM YYYY') : '', e.reference, e.project?.name].filter(Boolean).join(' · ')}</div>
                            </button>
                            <div className="hidden w-48 shrink-0 truncate text-xs sm:block">{e.client ? <Link to={`/crm/clients/${e.client.id}`} className="hover:text-primary">{e.client.name}</Link> : <span className="text-gray-400">—</span>}</div>
                            <div className="hidden shrink-0 gap-1 md:flex">{e.invoice ? <Tag className="bg-emerald-100 text-emerald-700">{tr("Invoiced")}</Tag> : e.billable ? <Tag className="bg-purple-100 text-purple-700">{tr("To invoice")}</Tag> : null}{e.recurring && <Tag className="bg-sky-100 text-sky-700"><TbRepeat className="inline" /></Tag>}</div>
                            <div className="w-32 shrink-0 text-end font-bold tabular-nums">{m(e.total, curOf(e.currencyId))}</div>
                        </div>
                    )} />
            )}
            <p className="mt-3 text-xs text-gray-400">{trn(data.total, "expense")} · {tr("amounts include tax")}</p>
            <ExpenseDrawer open={drawer.open} id={drawer.id} initial={drawer.categoryId ? { categoryId: drawer.categoryId } : undefined} lookups={data.lookups} onLookups={lookups} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} />
            <GroupDialog title={groupDlg?.id ? tr("Rename or recolour the group") : tr("New category")} value={groupDlg} onChange={setGroupDlg} onClose={() => setGroupDlg(null)} onSave={saveCat} />
            <ConfirmDialog isOpen={!!delGroup} type="danger" title={tr("Delete this category?")} confirmText={tr("Delete")} onClose={() => setDelGroup(null)} onCancel={() => setDelGroup(null)} onConfirm={removeCat}>
                <p>{delGroup?.name}</p><p className="text-sm text-gray-500">{tr("A category that still has expenses cannot be deleted: move them first.")}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ExpensesList

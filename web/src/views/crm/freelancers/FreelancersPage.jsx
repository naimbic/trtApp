import { useCallback, useEffect, useState } from 'react'
import { TbPlus, TbSearch, TbRepeat, TbCircleCheck, TbClockHour4, TbAlertTriangle, TbCoins, TbTrash } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import { api, qs } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { KpiCard } from '../kit/KpiCard'
import { tr, trn } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const STATES = [['', tr("All")], ['unpaid', tr("Unpaid")], ['overdue', tr("Overdue")], ['paid', tr("Paid")], ['recurring', tr("Repeating")]]
const EMPTY = { title: '', payerName: '', clientId: null, description: '', amount: '', currencyId: null, date: new Date(), paymentModeId: null, recurring: false, repeatEvery: 1, recurringType: 'month', cyclesLimit: 0 }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const fmt = (n, c) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c?.symbol || c?.name || ''}`.trim()
const UNIT_LABEL = { day: tr("day(s)"), week: tr("week(s)"), month: tr("month(s)"), year: tr("year(s)") }

const JobDrawer = ({ open, id, lookups, onClose, onChanged }) => {
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const [error, setError] = useState('')
    const edit = !!id
    const canEdit = edit ? detail?.can.edit : true
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const lk = detail?.lookups || lookups
    const opt = (l = []) => l.map((x) => ({ value: x.id, label: x.name }))

    useEffect(() => {
        if (!open) return
        setError(''); setDetail(null)
        if (!id) { setV({ ...EMPTY, date: new Date(), currencyId: (lookups.currencies || []).find((c) => c.isDefault)?.id || null }); return }
        api(`/api/crm/freelance/${id}`).then((d) => { setDetail(d); setV({ ...EMPTY, ...d.job, date: d.job.date ? new Date(d.job.date) : new Date() }) }).catch((e) => { setError(e.message) })
    }, [open, id]) // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setSaving(true); setError('')
        try {
            await api(edit ? `/api/crm/freelance/${id}` : '/api/crm/freelance', { method: edit ? 'PUT' : 'POST', body: { ...v, date: dayjs(v.date).format('YYYY-MM-DD') } })
            onChanged(); onClose()
        } catch (e) { setError(e.message) } finally { setSaving(false) }
    }
    const remove = async () => { setConfirm(false); try { await api(`/api/crm/freelance/${id}`, { method: 'DELETE' }); onChanged(); onClose() } catch (e) { setError(e.message) } }

    return (
        <Drawer
            title={edit ? (detail?.job.title || tr("Freelance job")) : tr("New freelance job")} isOpen={open} onClose={onClose} onRequestClose={onClose} width={520}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm(true)}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Add job")}</Button>}</div>
                </div>
            }
        >
            {edit && !detail && !error ? <div className="py-10 text-center text-gray-500">{tr("Loading…")}</div> : (
                <div className="space-y-4">
                    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                    <div><L>{tr("Job")}</L><Input disabled={!canEdit} value={v.title} placeholder={tr("What is the work?")} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><L>{tr("Who pays (name)")}</L><Input disabled={!canEdit} value={v.payerName} placeholder={tr("Name of the person or company")} onChange={(e) => set({ payerName: e.target.value })} /></div>
                        <div><L>{tr("Or a client of the CRM")}</L><RelationSelect resource="clients" value={v.clientId} disabled={!canEdit} onChange={(x) => set({ clientId: x || null })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><L>{tr("Amount")}</L><Input type="number" min={0} step="0.01" disabled={!canEdit} value={v.amount} onChange={(e) => set({ amount: e.target.value })} /></div>
                        <div><L>{tr("Currency")}</L><Select isDisabled={!canEdit} options={(lk.currencies || []).map((c) => ({ value: c.id, label: c.name }))} value={(lk.currencies || []).filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                        <div><L>{v.recurring ? tr("First payment due") : tr("Payment due")}</L><DatePicker disabled={!canEdit} value={v.date} onChange={(d) => set({ date: d })} /></div>
                        <div><L>{tr("Payment mode")}</L><Select isClearable isDisabled={!canEdit} options={opt(lk.paymentModes)} value={opt(lk.paymentModes).find((o) => o.value === v.paymentModeId) || null} onChange={(o) => set({ paymentModeId: o?.value || null })} /></div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm"><div><div className="font-semibold">{tr("Repeating job")}</div><div className="text-xs text-gray-500">{tr("The next payment is created automatically when it is due (a monthly retainer, hosting...)")}</div></div><Switcher disabled={!canEdit} checked={v.recurring} onChange={(c) => set({ recurring: c })} /></div>
                        {v.recurring && (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><L>{tr("Every")}</L><Input type="number" min={1} disabled={!canEdit} value={v.repeatEvery} onChange={(e) => set({ repeatEvery: e.target.value })} /></div>
                                    <div><L>{tr("Unit")}</L><Select isDisabled={!canEdit} options={['day', 'week', 'month', 'year'].map((x) => ({ value: x, label: UNIT_LABEL[x] }))} value={{ value: v.recurringType, label: UNIT_LABEL[v.recurringType] }} onChange={(o) => set({ recurringType: o.value })} /></div>
                                    <div><L>{tr("Times (0 = no end)")}</L><Input type="number" min={0} disabled={!canEdit} value={v.cyclesLimit} onChange={(e) => set({ cyclesLimit: e.target.value })} /></div>
                                </div>
                                {detail?.job.cyclesDone > 0 && <p className="text-xs text-gray-500"><TbRepeat className="mr-1 inline" />{tr("Repeated")} {trn(detail.job.cyclesDone, "time")}{detail.job.lastRecurringDate ? tr(", last on {v1}", { v1: dayjs(detail.job.lastRecurringDate).format('DD MMM YYYY') }) : ''}{tr(". Automatic copies run from Settings → Cron job.")}</p>}
                            </>
                        )}
                    </div>
                    <div><L>{tr("Note")}</L><Input textArea rows={3} disabled={!canEdit} value={v.description} onChange={(e) => set({ description: e.target.value })} /></div>
                </div>
            )}
            <ConfirmDialog isOpen={confirm} type="danger" title={tr("Delete this job?")} confirmText={tr("Delete")} onClose={() => setConfirm(false)} onCancel={() => setConfirm(false)} onConfirm={remove}>
                <p>{tr("The job is removed for good. If it repeats, the payments already created stay.")}</p>
            </ConfirmDialog>
        </Drawer>
    )
}

const FreelancersPage = () => {
    const [data, setData] = useState({ list: [], total: 0, stats: {}, lookups: { currencies: [], paymentModes: [] }, can: {} })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [state, setState] = useState('')
    const [clientId, setClientId] = useState(null)
    const [page, setPage] = useState(1)
    const [sort, setSort] = useState({ key: 'date', order: 'desc' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const pageSize = 20

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/freelance?${qs({ query, state, clientId: clientId || '', pageIndex: page, pageSize, sortKey: sort.key, order: sort.order })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, clientId, page, sort])
    useEffect(() => { load() }, [load])

    const cur = data.lookups.currencies.find((c) => c.isDefault) || data.lookups.currencies[0]
    const curOf = (id) => data.lookups.currencies.find((c) => c.id === id) || cur
    const sortBy = (key) => { setSort((s) => ({ key, order: s.key === key && s.order === 'desc' ? 'asc' : 'desc' })); setPage(1) }
    const arrow = (k) => (sort.key === k ? (sort.order === 'desc' ? ' ↓' : ' ↑') : '')
    const open = (id) => setDrawer({ open: true, id })
    const mark = async (j, action) => { try { await api(`/api/crm/freelance/${j.id}/state`, { method: 'POST', body: { action } }); load() } catch (e) { setError(e.message) } }
    const s = data.stats

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr("Freelancers")}</h3><p className="text-sm text-gray-500">{tr("Side jobs paid like invoices, without numbers. They stay out of the company dashboard, reports and goals.")}</p></div>
                {data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New job")}</Button>}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard label={tr("To collect")} value={fmt(s.unpaid, cur)} sub={trn(s.unpaidCount || 0, "payment")} icon={<TbClockHour4 />} tone="blue" />
                <KpiCard label={tr("Overdue")} value={fmt(s.overdue, cur)} sub={trn(s.overdueCount || 0, "payment")} icon={<TbAlertTriangle />} tone="red" />
                <KpiCard label={tr("Collected")} value={fmt(s.paid, cur)} sub={trn(s.paidCount || 0, "payment")} icon={<TbCircleCheck />} tone="green" />
                <KpiCard label={tr("Repeating jobs")} value={s.recurring ?? 0} sub={tr("in this selection")} icon={<TbRepeat />} tone="violet" />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search job, who pays, note")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-52"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(x) => { setClientId(x || null); setPage(1) }} /></div>
                <Segment size="sm" value={state} onChange={(v) => { setState(Array.isArray(v) ? v[0] ?? '' : v ?? ''); setPage(1) }}>{STATES.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table hoverable>
                    <THead><Tr><Th className="cursor-pointer" onClick={() => sortBy('date')}>{tr("Due")}{arrow('date')}</Th><Th className="cursor-pointer" onClick={() => sortBy('title')}>{tr("Job")}{arrow('title')}</Th><Th>{tr("Who pays")}</Th><Th className="cursor-pointer text-right" onClick={() => sortBy('amount')}>{tr("Amount")}{arrow('amount')}</Th><Th>{tr("Status")}</Th><Th /></Tr></THead>
                    <TBody>
                        {data.list.map((j) => (
                            <Tr key={j.id} className="cursor-pointer" onClick={() => open(j.id)}>
                                <Td className="whitespace-nowrap">{j.date ? dayjs(j.date).format('DD MMM YYYY') : '—'}</Td>
                                <Td className="max-w-[300px]"><div className="truncate font-semibold heading-text">{j.title}</div>{j.recurring && <div className="truncate text-xs text-gray-500"><TbRepeat className="mr-1 inline" />{tr("Every {n} {unit}", { n: j.repeatEvery, unit: UNIT_LABEL[j.recurringType] || '' })}</div>}</Td>
                                <Td className="max-w-[220px] truncate">{j.client?.name || j.payerName || '—'}</Td>
                                <Td className="text-right font-semibold tabular-nums">{fmt(j.amount, curOf(j.currencyId))}</Td>
                                <Td><div className="flex flex-wrap gap-1">{j.status === 'paid' ? <Tag className="bg-emerald-100 text-emerald-700">{tr("Paid")}{j.paidDate ? ` · ${dayjs(j.paidDate).format('DD MMM')}` : ''}</Tag> : j.overdue ? <Tag className="bg-red-100 text-red-700">{tr("Overdue")}</Tag> : <Tag className="bg-amber-100 text-amber-700">{tr("Unpaid")}</Tag>}{j.repeated && <Tag className="bg-gray-100 text-gray-600">{tr("Repeated")}</Tag>}</div></Td>
                                <Td className="text-right" onClick={(e) => e.stopPropagation()}>{data.can.edit && (j.status === 'paid' ? <Button size="xs" onClick={() => mark(j, 'markUnpaid')}>{tr("Mark unpaid")}</Button> : <Button size="xs" variant="solid" icon={<TbCoins />} onClick={() => mark(j, 'markPaid')}>{tr("Mark paid")}</Button>)}</Td>
                            </Tr>
                        ))}
                        {!loading && !data.list.length && <Tr><Td colSpan={6} className="py-10 text-center text-gray-500">{tr("No freelance jobs match")}</Td></Tr>}
                    </TBody>
                </Table>
            </div>
            {data.total > pageSize && <div className="mt-4 flex justify-end"><Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} /></div>}
            <JobDrawer open={drawer.open} id={drawer.id} lookups={data.lookups} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onChanged={load} />
        </Container>
    )
}

export default FreelancersPage

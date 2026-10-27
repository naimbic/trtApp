/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbPlus, TbSearch, TbRepeat, TbCircleCheck, TbClockHour4, TbCoins, TbTrash, TbArrowBackUp, TbPencil } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Pipeline from '@/components/crm/Pipeline'
import Popup from '@/components/crm/PopupFrame'
import { api, notify, qs } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { makeMoney } from '../clients/shared'
import { tr, trn } from '@/utils/t'

const EMPTY = { title: '', payerName: '', clientId: null, description: '', amount: '', currencyId: null, date: new Date(), paymentModeId: null, recurring: false, repeatEvery: 1, recurringType: 'month', cyclesLimit: 0 }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const UNIT_LABEL = () => ({ day: tr("day(s)"), week: tr("week(s)"), month: tr("month(s)"), year: tr("year(s)") })
const COLUMNS = () => [{ id: 'unpaid', name: tr("To collect"), tone: 'butter' }, { id: 'paid', name: tr("Paid"), tone: 'good' }]

/** The popup of a freelance job: the Rapport popup (stage bar To collect → Paid), the form of the job inside. */
const JobPopup = ({ open, id, lookups, preset, onClose, onChanged }) => {
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState(false)
    const edit = !!id
    const canEdit = edit ? detail?.can.edit : true
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const lk = detail?.lookups || lookups
    const opt = (l = []) => l.map((x) => ({ value: x.id, label: x.name }))
    const units = UNIT_LABEL()

    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/crm/freelance/${id}`)
            setDetail(d); setV({ ...EMPTY, ...d.job, date: d.job.date ? new Date(d.job.date) : new Date() })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!open) return
        setDetail(null)
        if (id) load(); else setV({ ...EMPTY, date: new Date(), currencyId: (lookups.currencies || []).find((c) => c.isDefault)?.id || null, ...(preset || {}) })
    }, [open, id, load]) // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setSaving(true)
        try {
            await api(edit ? `/api/crm/freelance/${id}` : '/api/crm/freelance', { method: edit ? 'PUT' : 'POST', body: { ...v, date: dayjs(v.date).format('YYYY-MM-DD') } })
            notify('success', edit ? tr("Job saved") : tr("Job added")); onChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const remove = async () => { setConfirm(false); try { await api(`/api/crm/freelance/${id}`, { method: 'DELETE' }); notify('success', tr("Job deleted")); onChanged(); onClose() } catch (e) { notify('danger', e.message) } }
    // the stage bar: the job is paid or not, saved at once (the form is read again so it never holds the old status)
    const stage = {
        columns: COLUMNS(), currentId: detail?.job.status === 'paid' ? 'paid' : 'unpaid',
        onPick: edit && detail?.can.edit ? async (to) => { try { await api(`/api/crm/freelance/${id}/state`, { method: 'POST', body: { action: to === 'paid' ? 'markPaid' : 'markUnpaid' } }); await load(); onChanged() } catch (e) { notify('danger', e.message) } } : undefined,
    }
    const who = detail?.job.payerName || ''

    return (
        <Popup
            isOpen={open} onClose={onClose} width={560}
            kicker={`${tr("Freelance job")}${who ? ` · ${who}` : ''}`}
            title={edit ? (detail?.job.title || tr("Freelance job")) : tr("New freelance job")}
            date={v.date ? `${tr("Due")} ${dayjs(v.date).format('DD MMM')}` : ''}
            stage={edit ? stage : { columns: COLUMNS(), currentId: 'unpaid' }}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && <Button variant="plain" className="text-red-500" onClick={() => setConfirm(true)}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Add job")}</Button>}</div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">{tr("Loading…")}</div> : (
                <div className="space-y-4">
                    <div><L>{tr("Job")}</L><Input disabled={!canEdit} value={v.title} placeholder={tr("What is the work?")} onChange={(e) => set({ title: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><L>{tr("Who pays (name)")}</L><Input disabled={!canEdit} value={v.payerName} placeholder={tr("Name of the person or company")} onChange={(e) => set({ payerName: e.target.value })} /></div>
                        <div><L>{tr("Or a client of the CRM")}</L><RelationSelect resource="clients" value={v.clientId} disabled={!canEdit} onChange={(x) => set({ clientId: x || null })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><L>{tr("Amount")}</L><Input type="number" min={0} step="0.01" disabled={!canEdit} value={v.amount} onChange={(e) => set({ amount: e.target.value })} /></div>
                        <div><L>{tr("Currency")}</L><Select isDisabled={!canEdit} options={opt(lk.currencies)} value={opt(lk.currencies).find((o) => o.value === v.currencyId) || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                        <div><L>{v.recurring ? tr("First payment due") : tr("Payment due")}</L><DatePicker disabled={!canEdit} value={v.date} onChange={(d) => set({ date: d })} /></div>
                        <div><L>{tr("Payment mode")}</L><Select isClearable isDisabled={!canEdit} options={opt(lk.paymentModes)} value={opt(lk.paymentModes).find((o) => o.value === v.paymentModeId) || null} onChange={(o) => set({ paymentModeId: o?.value || null })} /></div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm"><div><div className="font-semibold">{tr("Repeating job")}</div><div className="text-xs text-gray-500">{tr("The next payment is created automatically when it is due (a monthly retainer, hosting...)")}</div></div><Switcher disabled={!canEdit} checked={v.recurring} onChange={(c) => set({ recurring: c })} /></div>
                        {v.recurring && (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><L>{tr("Every")}</L><Input type="number" min={1} disabled={!canEdit} value={v.repeatEvery} onChange={(e) => set({ repeatEvery: e.target.value })} /></div>
                                    <div><L>{tr("Unit")}</L><Select isDisabled={!canEdit} options={['day', 'week', 'month', 'year'].map((x) => ({ value: x, label: units[x] }))} value={{ value: v.recurringType, label: units[v.recurringType] }} onChange={(o) => set({ recurringType: o.value })} /></div>
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
        </Popup>
    )
}

const FreelancersPage = () => {
    const [data, setData] = useState({ list: [], total: 0, stats: {}, lookups: { currencies: [], paymentModes: [] }, can: {} })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [state, setState] = useState('')
    const [clientId, setClientId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [del, setDel] = useState(null)
    const [popup, setPopup] = useState({ open: false, id: null })

    useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/freelance?${qs({ query, state, clientId: clientId || '', pageIndex: 1, pageSize: 100, sortKey: 'date', order: 'asc' })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, clientId])
    useEffect(() => { load() }, [load])

    const money = useMemo(() => makeMoney(data.lookups.currencies), [data.lookups.currencies])
    const base = data.lookups.currencies.find((c) => c.isDefault)?.id
    const s = data.stats
    const open = (id) => setPopup({ open: true, id: id || null })
    const mark = async (it, action) => { try { await api(`/api/crm/freelance/${it.id}/state`, { method: 'POST', body: { action } }); load() } catch (e) { notify('danger', e.message); load() } }
    const remove = async (it) => { try { await api(`/api/crm/freelance/${it.id}`, { method: 'DELETE' }); notify('success', tr("Job deleted")); load() } catch (e) { notify('danger', e.message) } }
    const units = UNIT_LABEL()
    const isPaid = (it) => data.list.find((x) => x.id === it.id)?.status === 'paid'

    const tile = (j) => ({
        id: j.id, title: j.title, sub: j.client?.name || j.payerName || '', date: j.date ? dayjs(j.date).format('DD MMM') : '', overdue: j.overdue,
        amount: j.amount, label: money(j.amount, j.currencyId), badge: j.recurring ? tr("Repeats") : j.repeated ? tr("Repeated") : null,
        kicker: `${tr("Freelance job")}${j.client?.name || j.payerName ? ` · ${j.client?.name || j.payerName}` : ''}`,
        fields: [{ label: tr("Amount"), value: money(j.amount, j.currencyId) }, { label: tr("Due"), value: j.date ? dayjs(j.date).format('DD MMM YYYY') : '' }, { label: tr("Who pays"), value: j.client?.name || j.payerName }, ...(j.recurring ? [{ label: tr("Repeats"), value: tr("Every {n} {unit}", { n: j.repeatEvery, unit: units[j.recurringType] || '' }) }] : []), ...(j.status === 'paid' && j.paidDate ? [{ label: tr("Paid"), value: dayjs(j.paidDate).format('DD MMM YYYY') }] : [])],
        team: [], people: <span />,
    })
    const columns = [
        { id: 'unpaid', name: tr("To collect"), tone: 'butter', items: data.list.filter((j) => j.status !== 'paid').map(tile) },
        { id: 'paid', name: tr("Paid"), tone: 'good', items: data.list.filter((j) => j.status === 'paid').map(tile) },
    ]

    return (
        <Container>
            <InvoiceHead
                title={tr("Freelancers")}
                action={data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => open(null)}>{tr("New job")}</Button>}
                stats={[
                    { icon: <TbClockHour4 />, label: tr("To collect"), value: money(s.unpaid || 0, base, { decimals: 0 }), badge: s.overdueCount > 0 ? <span className="badge badge--tomato">{tr("{a} overdue", { a: money(s.overdue, base, { decimals: 0 }) })}</span> : <span className="badge badge--plain">{trn(s.unpaidCount || 0, "payment")}</span> },
                    { icon: <TbCircleCheck />, label: tr("Collected"), value: money(s.paid || 0, base, { decimals: 0 }), badge: <span className="badge badge--plain">{trn(s.paidCount || 0, "payment")}</span> },
                    { icon: <TbRepeat />, label: tr("Repeating jobs"), value: String(s.recurring ?? 0), badge: <span className="badge badge--plain">{tr("No numbers, not company income")}</span> },
                ]}
            />
            <div className="cx-tools">
                <Input className="cx-search" size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search job, who pays, note")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="w-52"><RelationSelect size="sm" resource="clients" value={clientId} onChange={(x) => setClientId(x || null)} /></div>
                <Segment size="sm" value={state} onChange={(v) => setState(Array.isArray(v) ? v[0] ?? '' : v ?? '')}>
                    <Segment.Item value="">{tr("All")}</Segment.Item><Segment.Item value="overdue">{tr("Overdue")}</Segment.Item><Segment.Item value="recurring">{tr("Repeating")}</Segment.Item>
                </Segment>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <Pipeline
                loading={loading}
                money={(n) => money(n, base, { decimals: 0 })}
                canDrag={() => !!data.can.edit}
                onOpen={(it) => open(it.id)}
                onAdd={(c) => (c.id === 'unpaid' && data.can.create ? open(null) : undefined)}
                onMoveTo={data.can.edit ? (it, to) => mark(it, to === 'paid' ? 'markPaid' : 'markUnpaid') : undefined}
                onMove={({ item, to }) => mark(item, to === 'paid' ? 'markPaid' : 'markUnpaid')}
                actions={(it) => [
                    ...(data.can.edit ? [{ label: isPaid(it) ? tr("Mark unpaid") : tr("Mark paid"), icon: isPaid(it) ? <TbArrowBackUp /> : <TbCoins />, onClick: () => mark(it, isPaid(it) ? 'markUnpaid' : 'markPaid') }, { label: tr("Edit"), icon: <TbPencil />, onClick: () => open(it.id) }] : []),
                    ...(data.can.delete ? [{ label: tr("Delete"), icon: <TbTrash />, danger: true, after: true, onClick: () => setDel(it) }] : []),
                ]}
                columns={columns}
            />
            {!loading && !data.list.length && <p className="mt-6 text-center text-sm text-gray-400">{tr("No freelance jobs match")}</p>}

            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this job?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const it = del; setDel(null); remove(it) }}>
                <p>{del?.title}</p>
            </ConfirmDialog>
            <JobPopup open={popup.open} id={popup.id} lookups={data.lookups} onClose={() => setPopup((p) => ({ ...p, open: false }))} onChanged={load} />
        </Container>
    )
}

export default FreelancersPage

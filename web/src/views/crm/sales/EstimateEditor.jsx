import ItemPicker from './ItemPicker'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import AccordionCard from '@/components/crm/AccordionCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify } from '../kit/api'
import LineItemsTable from './LineItemsTable'
import RelationSelect from '../kit/RelationSelect'
import { makeMoney } from '../clients/shared'
import { NumberField } from './shared'
import useClientNotes from './useClientNotes'
import { tr } from '@/utils/t'
import BankAccountSelect from '../kit/BankAccountSelect'

const emptyLine = () => ({ description: '', longDescription: '', qty: 1, rate: 0, unit: '', taxes: [] })
const day = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '')
const money2 = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const EstimateEditor = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [lookups, setLookups] = useState(null)
    const [doc, setDoc] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [v, setV] = useState(null)
    const [open, setOpen] = useState({ items: true, notes: true }) // folding sections of the form
    const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))
    const [disc, setDisc] = useState(null) // the Discount switch; until it is touched it is on when the document has a discount
    useClientNotes('estimate', !id, v?.clientId, setV) // the notes of a new document in the client's language

    const fromId = params.get('from')
    useEffect(() => {
        Promise.all([api('/api/crm/sales/lookups').then(async (l) => ({ ...l, defaults: { ...(l.defaults || {}), ...(await api('/api/crm/sales/estimates/defaults')) } })), id || fromId ? api(`/api/crm/sales/estimates/${id || fromId}`) : null])
            .then(async ([l, d]) => {
                setLookups(l)
                setDoc(d)
                const inv = d?.estimate
                const cloned = !id && !!inv // a duplicate: the content of another document, as a new draft with a new number and today's dates
                const def = l.currencies.find((c) => c.isDefault) || l.currencies[0]
                const dd = l.defaults || {}
                const pc = !inv && params.get('clientId') ? await api(`/api/crm/customers/${params.get('clientId')}`).catch(() => null) : null // a new one for a client: its currency
                const dueAfter = dd.validFor !== '' && dd.validFor != null ? Number(dd.validFor) : 7
                const baseLine = () => ({ ...emptyLine(), taxes: (dd.taxes || []).filter((t) => l.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
                setV({ number: cloned ? '' : inv?.number ?? '',
                    clientId: inv?.clientId || params.get('clientId') || null,
                    date: (!cloned && day(inv?.date)) || day(new Date()),
                    expiryDate: (!cloned && day(inv?.expiryDate)) || day(dayjs().add(dueAfter, 'day')), referenceNo: inv?.referenceNo || '',
                    currencyId: inv?.currencyId || pc?.currencyId || def?.id || null,
                    bankAccountId: inv?.bankAccountId || null,
                    discountPercent: inv?.discountPercent || 0,
                    discountFixed: inv && !inv.discountPercent ? inv.discountTotal || 0 : 0,
                    discountType: inv?.discountType || 'before_tax',
                    adjustment: inv?.adjustment || 0,
                    clientNote: inv ? inv.clientNote || '' : dd.clientNote || '', adminNote: inv?.adminNote || '', terms: inv ? inv.terms || '' : dd.terms || '',
                    remindClient: inv ? inv.remindClient !== false : true,
                    items: d?.items?.length ? d.items.map(({ id: _i, ...line }) => line) : [baseLine()],
                })
            })
            .catch((e) => setError(e.message))
    }, [id, fromId, params])

    const taxOptions = useMemo(() => (lookups?.taxes || []).map((t) => ({ value: `${t.name}|${t.rate}`, label: `${t.name} (${t.rate}%)`, tax: t })), [lookups])
    const totals = useMemo(() => (v ? calcDocument({ items: v.items, discountPercent: v.discountPercent, discountFixed: v.discountFixed, discountType: v.discountType, adjustment: v.adjustment }) : null), [v])

    if (error && !v) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div></Container>
    if (!v || !lookups) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>

    const currency = lookups.currencies.find((c) => c.id === v.currencyId)
    const money = (n) => makeMoney(lookups.currencies)(n, v.currencyId)
    const newLine = () => ({ ...emptyLine(), taxes: (lookups.defaults?.taxes || []).filter((t) => lookups.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
    const set = (patch) => setV((s) => ({ ...s, ...patch }))
    const discOn = disc ?? (Number(v.discountPercent) > 0 || Number(v.discountFixed) > 0)
    const num = (key) => (e) => set({ [key]: e.target.value === '' ? '' : Number(e.target.value) })

    const addFromCatalog = async (itemId) => {
        if (!itemId) return
        try {
            const it = await api(`/api/crm/items/${itemId}`)
            const line = { description: it.description || '', longDescription: it.longDescription || '', qty: 1, rate: it.rate || 0, unit: it.unit || '', taxes: [] }
            const only = v.items.length === 1 && !v.items[0].description.trim()
            set({ items: only ? [line] : [...v.items, line] })
        } catch (e) {
            notify('danger', e.message)
        }
    }

    const submit = async () => {
        if (!v.clientId) return setError(tr("Choose a client"))
        setSaving(true)
        setError('')
        try {
            const body = { ...v }
            const res = id ? await api(`/api/crm/sales/estimates/${id}`, { method: 'PUT', body }) : await api('/api/crm/sales/estimates', { method: 'POST', body })
            notify('success', tr("Estimate saved"))
            navigate(`/crm/estimates/${res.id}`)
        } catch (e) {
            setError(e.message)
            setSaving(false)
        }
    }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3>{id ? tr("Edit estimate {v1}", { v1: doc?.estimate?.displayNumber || '' }) : tr("New estimate")}</h3><NumberField value={v?.number} onChange={(n) => set({ number: n })} /></div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="flex flex-col gap-3">
                {/* same layout as the proposal form: the items and notes stay wide on the left; every setting is a small card on the right, its switch at the top right. One column on small screens */}
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-3">
                        <AccordionCard title={tr("Items")} dot="#10b981" count={v.items.filter((i) => String(i.description || '').trim()).length} note={money(totals.total)} open={open.items} onToggle={() => toggle('items')}>
                            <div className="p-4">
                                <div className="mb-3 flex justify-end"><div className="w-full sm:w-72"><ItemPicker onChange={addFromCatalog} /></div></div>
                                <LineItemsTable items={v.items} onChange={(items) => set({ items })} taxOptions={taxOptions} newLine={newLine} />
                                <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
                                    <div className="w-full sm:w-36"><label className="form-label mb-1 block">{tr("Adjustment")}</label><Input type="number" step="0.01" value={v.adjustment} onChange={num('adjustment')} /></div>
                                    <dl className="w-full max-w-sm text-sm">
                                    <div className="flex justify-between py-1"><dt>{tr("Sub total")}</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
                                    {totals.discountTotal > 0 && <div className="flex justify-between py-1"><dt>{tr("Discount")}</dt><dd className="tabular-nums">-{money(totals.discountTotal)}</dd></div>}
                                    {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{money(t.total)}</dd></div>)}
                                    {Number(v.adjustment) !== 0 && <div className="flex justify-between py-1"><dt>{tr("Adjustment")}</dt><dd className="tabular-nums">{money(v.adjustment)}</dd></div>}
                                    <div className="mt-1 flex justify-between border-t py-2 text-base font-semibold"><dt>{tr("Total")}</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
                                    </dl>
                                </div>
                            </div>
                        </AccordionCard>

                        <AccordionCard title={tr("Notes")} dot="#f59e0b" note={[v.clientNote && tr("Client note"), v.terms && tr("Terms & conditions"), v.adminNote && tr("Admin note (internal)")].filter(Boolean).join(" · ") || undefined} open={open.notes} onToggle={() => toggle('notes')}>
                            <div className="flex flex-wrap gap-3 p-4">
                                <div className="min-w-[240px] flex-1"><label className="form-label mb-1 block">{tr("Client note")}</label><Input textArea rows={4} value={v.clientNote} onChange={(e) => set({ clientNote: e.target.value })} /></div>
                                <div className="min-w-[240px] flex-1"><label className="form-label mb-1 block">{tr("Terms & conditions")}</label><Input textArea rows={4} value={v.terms} onChange={(e) => set({ terms: e.target.value })} /></div>
                                <div className="w-full"><label className="form-label mb-1 block">{tr("Admin note (internal)")}</label><Input textArea rows={2} value={v.adminNote} onChange={(e) => set({ adminNote: e.target.value })} /></div>
                            </div>
                        </AccordionCard>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-24">
                        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                            <div className="w-full"><label className="form-label mb-1 block">{tr("Client *")}</label><RelationSelect resource="clients" value={v.clientId} onChange={async (cid) => { set({ clientId: cid }); if (cid && !id) { try { const c = await api(`/api/crm/customers/${cid}`); setV((s) => (s.clientId === cid && c.currencyId ? { ...s, currencyId: c.currencyId } : s)) } catch { /* the document keeps the default currency */ } } }} /></div>
                            <div className="min-w-[115px] flex-1"><label className="form-label mb-1 block">{tr("Currency")}</label><Select options={lookups.currencies.map((c) => ({ value: c.id, label: c.name }))} value={lookups.currencies.filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                            <div className="min-w-[130px] flex-1"><label className="form-label mb-1 block">{tr("Reference")}</label><Input value={v.referenceNo} placeholder={tr("Optional")} onChange={(e) => set({ referenceNo: e.target.value })} /></div>
                            <div className="min-w-[130px] flex-1"><label className="form-label mb-1 block">{tr("Estimate date")}</label><Input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></div>
                            <div className="min-w-[130px] flex-1"><label className="form-label mb-1 block">{tr("Valid until")}</label><Input type="date" value={v.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} /></div>
                            <div className="w-full"><label className="form-label mb-1 block">{tr("Bank account on the document")}</label><BankAccountSelect value={v.bankAccountId} clientId={v.clientId || null} currencyId={v.currencyId} onChange={(id) => set({ bankAccountId: id })} emptyLabel={tr("The client's account, else the company's default")} /></div>
                        </div>

                        <AccordionCard title={tr("Discount")} dot="#ef4444" note={discOn && totals.discountTotal > 0 ? `-${money(totals.discountTotal)}` : undefined} open={discOn} right={<Switcher checked={discOn} onChange={(on) => { setDisc(on); if (!on) set({ discountPercent: 0, discountFixed: 0 }) }} />}>
                            <div className="flex flex-wrap items-end gap-2 p-3">
                                <div className="min-w-[80px] flex-1"><label className="form-label mb-1 block">{tr("Discount %")}</label><Input type="number" step="any" value={v.discountPercent} onChange={num('discountPercent')} /></div>
                                <div className="min-w-[100px] flex-1"><label className="form-label mb-1 block">{tr("Fixed discount")}</label><Input type="number" step="0.01" value={v.discountFixed} disabled={Number(v.discountPercent) > 0} onChange={num('discountFixed')} /></div>
                                <div className="w-full"><label className="form-label mb-1 block">{tr("Discount applies")}</label><Select options={[{ value: 'before_tax', label: tr("Before tax") }, { value: 'after_tax', label: tr("After tax") }]} value={{ value: v.discountType, label: v.discountType === 'after_tax' ? tr("After tax") : tr("Before tax") }} onChange={(o) => set({ discountType: o?.value || 'before_tax' })} /></div>
                            </div>
                        </AccordionCard>

                        <AccordionCard title={tr("Expiry reminder")} dot="#6b7280" right={<Switcher checked={v.remindClient !== false} onChange={(c) => set({ remindClient: c })} />} />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button onClick={() => navigate(id ? `/crm/estimates/${id}` : '/crm/estimates')}>{tr("Cancel")}</Button>
                    <Button variant="solid" loading={saving} onClick={() => submit()}>{tr("Save estimate")}</Button>
                </div>
            </div>
            {currency ? null : null}
        </Container>
    )
}

export default EstimateEditor

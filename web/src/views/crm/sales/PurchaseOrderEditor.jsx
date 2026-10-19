import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify } from '../kit/api'
import LineItemsTable from './LineItemsTable'
import RelationSelect from '../kit/RelationSelect'
import { makeMoney } from '../clients/shared'
import { NumberField } from './shared'
import { tr } from '@/utils/t'
import BankAccountSelect from '../kit/BankAccountSelect'

const emptyLine = () => ({ description: '', longDescription: '', qty: 1, rate: 0, unit: '', taxes: [] })
const day = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '')
const money2 = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PurchaseOrderEditor = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [lookups, setLookups] = useState(null)
    const [doc, setDoc] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [v, setV] = useState(null)

    useEffect(() => {
        Promise.all([api('/api/crm/sales/lookups').then(async (l) => ({ ...l, defaults: { ...(l.defaults || {}), ...(await api('/api/crm/sales/purchase-orders/defaults')) } })), id ? api(`/api/crm/sales/purchase-orders/${id}`) : null])
            .then(([l, d]) => {
                setLookups(l)
                setDoc(d)
                const inv = d?.order
                const def = l.currencies.find((c) => c.isDefault) || l.currencies[0]
                const dd = l.defaults || {}
                const dueAfter = dd.deliveryIn !== '' && dd.deliveryIn != null ? Number(dd.deliveryIn) : 14
                const baseLine = () => ({ ...emptyLine(), taxes: (dd.taxes || []).filter((t) => l.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
                setV({ number: inv?.number ?? '',
                    clientId: inv?.clientId || params.get('clientId') || null,
                    date: day(inv?.date) || day(new Date()),
                    deliveryDate: day(inv?.deliveryDate) || day(dayjs().add(dueAfter, 'day')), referenceNo: inv?.referenceNo || '',
                    currencyId: inv?.currencyId || def?.id || null,
                    bankAccountId: inv?.bankAccountId || null,
                    discountPercent: inv?.discountPercent || 0,
                    discountFixed: inv && !inv.discountPercent ? inv.discountTotal || 0 : 0,
                    discountType: inv?.discountType || 'before_tax',
                    adjustment: inv?.adjustment || 0,
                    clientNote: inv ? inv.clientNote || '' : dd.clientNote || '', adminNote: inv?.adminNote || '', terms: inv ? inv.terms || '' : dd.terms || '',
                    items: d?.items?.length ? d.items : [baseLine()],
                })
            })
            .catch((e) => setError(e.message))
    }, [id, params])

    const taxOptions = useMemo(() => (lookups?.taxes || []).map((t) => ({ value: `${t.name}|${t.rate}`, label: `${t.name} (${t.rate}%)`, tax: t })), [lookups])
    const totals = useMemo(() => (v ? calcDocument({ items: v.items, discountPercent: v.discountPercent, discountFixed: v.discountFixed, discountType: v.discountType, adjustment: v.adjustment }) : null), [v])

    if (error && !v) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div></Container>
    if (!v || !lookups) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>

    const currency = lookups.currencies.find((c) => c.id === v.currencyId)
    const money = (n) => makeMoney(lookups.currencies)(n, v.currencyId)
    const newLine = () => ({ ...emptyLine(), taxes: (lookups.defaults?.taxes || []).filter((t) => lookups.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
    const set = (patch) => setV((s) => ({ ...s, ...patch }))
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
            const res = id ? await api(`/api/crm/sales/purchase-orders/${id}`, { method: 'PUT', body }) : await api('/api/crm/sales/purchase-orders', { method: 'POST', body })
            notify('success', tr("Purchase order saved"))
            navigate(`/crm/purchase-orders/${res.id}`)
        } catch (e) {
            setError(e.message)
            setSaving(false)
        }
    }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3>{id ? tr("Edit purchase order {v1}", { v1: doc?.order?.displayNumber || '' }) : tr("New purchase order")}</h3><NumberField value={v?.number} onChange={(n) => set({ number: n })} /></div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-2"><label className="form-label mb-2 block">{tr("Client *")}</label><RelationSelect resource="clients" value={v.clientId} onChange={(cid) => set({ clientId: cid })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Currency")}</label><Select options={lookups.currencies.map((c) => ({ value: c.id, label: c.name }))} value={lookups.currencies.filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Bank account on the document")}</label><BankAccountSelect value={v.bankAccountId} onChange={(id) => set({ bankAccountId: id })} emptyLabel={tr("The client's account, else the company's default")} /></div>
                        <div><label className="form-label mb-2 block">{tr("Client's order number")}</label><Input value={v.referenceNo} placeholder={tr("Optional")} onChange={(e) => set({ referenceNo: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Order date")}</label><Input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Expected delivery")}</label><Input type="date" value={v.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} /></div>
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h4>{tr("Items")}</h4>
                        <div className="w-72"><RelationSelect resource="items" value={null} onChange={addFromCatalog} /></div>
                    </div>
                    <LineItemsTable items={v.items} onChange={(items) => set({ items })} taxOptions={taxOptions} newLine={newLine} />

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="grid grid-cols-2 content-start gap-4">
                            <div><label className="form-label mb-2 block">{tr("Discount %")}</label><Input type="number" step="any" value={v.discountPercent} onChange={num('discountPercent')} /></div>
                            <div><label className="form-label mb-2 block">{tr("Fixed discount")}</label><Input type="number" step="0.01" value={v.discountFixed} disabled={Number(v.discountPercent) > 0} onChange={num('discountFixed')} /></div>
                            <div><label className="form-label mb-2 block">{tr("Discount applies")}</label><Select options={[{ value: 'before_tax', label: tr("Before tax") }, { value: 'after_tax', label: tr("After tax") }]} value={{ value: v.discountType, label: v.discountType === 'after_tax' ? tr("After tax") : tr("Before tax") }} onChange={(o) => set({ discountType: o?.value || 'before_tax' })} /></div>
                            <div><label className="form-label mb-2 block">{tr("Adjustment")}</label><Input type="number" step="0.01" value={v.adjustment} onChange={num('adjustment')} /></div>
                        </div>
                        <dl className="ml-auto w-full max-w-sm text-sm">
                            <div className="flex justify-between py-1"><dt>{tr("Sub total")}</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
                            {totals.discountTotal > 0 && <div className="flex justify-between py-1"><dt>{tr("Discount")}</dt><dd className="tabular-nums">-{money(totals.discountTotal)}</dd></div>}
                            {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{money(t.total)}</dd></div>)}
                            {Number(v.adjustment) !== 0 && <div className="flex justify-between py-1"><dt>{tr("Adjustment")}</dt><dd className="tabular-nums">{money(v.adjustment)}</dd></div>}
                            <div className="mt-1 flex justify-between border-t py-2 text-base font-semibold"><dt>{tr("Total")}</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
                        </dl>
                    </div>
                </Card>

                <Card>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div><label className="form-label mb-2 block">{tr("Client note")}</label><Input textArea rows={4} value={v.clientNote} onChange={(e) => set({ clientNote: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Admin note (internal)")}</label><Input textArea rows={4} value={v.adminNote} onChange={(e) => set({ adminNote: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Terms & conditions")}</label><Input textArea rows={4} value={v.terms} onChange={(e) => set({ terms: e.target.value })} /></div>
                    </div>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button onClick={() => navigate(id ? `/crm/purchase-orders/${id}` : '/crm/purchase-orders')}>{tr("Cancel")}</Button>
                    <Button variant="solid" loading={saving} onClick={() => submit()}>{tr("Save purchase order")}</Button>
                </div>
            </div>
            {currency ? null : null}
        </Container>
    )
}

export default PurchaseOrderEditor

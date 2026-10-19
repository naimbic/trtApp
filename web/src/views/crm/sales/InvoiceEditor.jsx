import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify } from '../kit/api'
import { useSessionUser } from '@/store/authStore'
import LineItemsTable from './LineItemsTable'
import RelationSelect from '../kit/RelationSelect'
import { makeMoney } from '../clients/shared'
import { tr } from '@/utils/t'
import ReminderSwitch from '../kit/ReminderSwitch'
import BankAccountSelect from '../kit/BankAccountSelect'

const RECUR_UNITS = () => [{ value: 'day', label: tr("Days") }, { value: 'week', label: tr("Weeks") }, { value: 'month', label: tr("Months") }, { value: 'year', label: tr("Years") }]
const emptyLine = () => ({ description: '', longDescription: '', qty: 1, rate: 0, unit: '', taxes: [] })
const day = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '')
const money2 = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const InvoiceEditor = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [lookups, setLookups] = useState(null)
    const [doc, setDoc] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [v, setV] = useState(null)
    const authority = useSessionUser((x) => x.user.authority) || []
    const superAdmin = authority.includes('admin') || authority.includes('crm.admin')

    useEffect(() => {
        Promise.all([api('/api/crm/sales/lookups'), id ? api(`/api/crm/sales/invoices/${id}`) : null])
            .then(([l, d]) => {
                setLookups(l)
                setDoc(d)
                const inv = d?.invoice
                // a paid invoice is final: only a super admin edits it (the caution was shown when they pressed Edit)
                if (inv?.status === 2 && !superAdmin) { notify('warning', tr("A paid invoice cannot be changed. Only a super admin can do that.")); navigate(`/crm/invoices/${id}`); return }
                const def = l.currencies.find((c) => c.isDefault) || l.currencies[0]
                const dd = l.defaults || {}
                const dueAfter = dd.dueAfter !== '' && dd.dueAfter != null ? Number(dd.dueAfter) : 30
                const baseLine = () => ({ ...emptyLine(), taxes: (dd.taxes || []).filter((t) => l.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
                setV({
                    clientId: inv?.clientId || params.get('clientId') || null,
                    date: day(inv?.date) || day(new Date()),
                    dueDate: day(inv?.dueDate) || day(dayjs().add(dueAfter, 'day')),
                    currencyId: inv?.currencyId || def?.id || null,
                    bankAccountId: inv?.bankAccountId || null,
                    discountPercent: inv?.discountPercent || 0,
                    discountFixed: inv && !inv.discountPercent ? inv.discountTotal || 0 : 0,
                    discountType: inv?.discountType || 'before_tax',
                    adjustment: inv?.adjustment || 0,
                    clientNote: inv ? inv.clientNote || '' : dd.clientNote || '', adminNote: inv?.adminNote || '', terms: inv ? inv.terms || '' : dd.terms || '',
                    remindClient: inv ? !inv.cancelOverdueReminders : true,
                    recurring: inv?.recurring || 0, recurringType: inv?.recurringType || 'month', cycles: inv?.cycles || 0, isCopy: !!inv?.isRecurringFrom,
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

    const submit = async (draft) => {
        if (!v.clientId) return setError(tr("Choose a client"))
        setSaving(true)
        setError('')
        try {
            const body = { ...v, draft, force: doc?.invoice?.status === 2 }
            const res = id ? await api(`/api/crm/sales/invoices/${id}`, { method: 'PUT', body }) : await api('/api/crm/sales/invoices', { method: 'POST', body })
            notify('success', tr("Invoice saved"))
            navigate(`/crm/invoices/${res.id}`)
        } catch (e) {
            setError(e.message)
            setSaving(false)
        }
    }

    return (
        <Container>
            <h3 className="mb-4">{id ? tr("Edit invoice {v1}", { v1: doc?.invoice?.displayNumber || '' }) : tr("New invoice")}</h3>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid gap-3 md:grid-cols-12">
                        <div className="md:col-span-3"><label className="form-label mb-1 block">{tr("Client *")}</label><RelationSelect resource="clients" value={v.clientId} onChange={(cid) => set({ clientId: cid })} /></div>
                        <div className="md:col-span-2"><label className="form-label mb-1 block">{tr("Currency")}</label><Select options={lookups.currencies.map((c) => ({ value: c.id, label: c.name }))} value={lookups.currencies.filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                        <div className="md:col-span-3"><label className="form-label mb-1 block">{tr("Bank account on the document")}</label><BankAccountSelect value={v.bankAccountId} onChange={(id) => set({ bankAccountId: id })} emptyLabel={tr("The client's account, else the company's default")} /></div>
                        <div className="md:col-span-2"><label className="form-label mb-1 block">{tr("Invoice date")}</label><Input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></div>
                        <div className="md:col-span-2"><label className="form-label mb-1 block">{tr("Due date")}</label><Input type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
                    </div>
                    {!v.isCopy && (
                        <div className="mt-3 grid items-end gap-3 border-t border-gray-100 pt-3 md:grid-cols-12 dark:border-gray-700">
                            <label className="flex items-center gap-2 pb-1.5 font-semibold md:col-span-3"><Switcher checked={Number(v.recurring) > 0} onChange={(on) => set({ recurring: on ? 1 : 0 })} />{tr("Recurring invoice")}</label>
                            {Number(v.recurring) > 0 && (
                                <>
                                    <div className="md:col-span-2"><label className="form-label mb-1 block">{tr("Repeat every")}</label><Input type="number" min={1} max={365} value={v.recurring} onChange={(e) => set({ recurring: e.target.value })} /></div>
                                    <div className="md:col-span-3"><Select isSearchable={false} options={RECUR_UNITS()} value={RECUR_UNITS().find((o) => o.value === v.recurringType)} onChange={(o) => set({ recurringType: o.value })} /></div>
                                    <div className="md:col-span-2"><label className="form-label mb-1 block">{tr("Stop after (copies)")}</label><Input type="number" min={0} placeholder={tr("Never")} value={v.cycles || ''} onChange={(e) => set({ cycles: e.target.value })} /></div>
                                    <p className="pb-2 text-xs text-gray-400 md:col-span-2">{tr("A new copy is created automatically each time.")}</p>
                                </>
                            )}
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h4>{tr("Items")}</h4>
                        <div className="w-72"><RelationSelect resource="items" value={null} onChange={addFromCatalog} /></div>
                    </div>
                    <LineItemsTable items={v.items} onChange={(items) => set({ items })} taxOptions={taxOptions} newLine={newLine} />

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div><label className="form-label mb-1 block">{tr("Discount %")}</label><Input type="number" step="any" value={v.discountPercent} onChange={num('discountPercent')} /></div>
                        <div><label className="form-label mb-1 block">{tr("Fixed discount")}</label><Input type="number" step="0.01" value={v.discountFixed} disabled={Number(v.discountPercent) > 0} onChange={num('discountFixed')} /></div>
                        <div><label className="form-label mb-1 block">{tr("Discount applies")}</label><Select options={[{ value: 'before_tax', label: tr("Before tax") }, { value: 'after_tax', label: tr("After tax") }]} value={{ value: v.discountType, label: v.discountType === 'after_tax' ? tr("After tax") : tr("Before tax") }} onChange={(o) => set({ discountType: o?.value || 'before_tax' })} /></div>
                        <div><label className="form-label mb-1 block">{tr("Adjustment")}</label><Input type="number" step="0.01" value={v.adjustment} onChange={num('adjustment')} /></div>
                    </div>
                    <div className="mt-4">
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
                    <ReminderSwitch className="mt-5 flex items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-700" checked={v.remindClient !== false} onChange={(c) => set({ remindClient: c })} title={tr("Send overdue reminders to the client")} hint={tr("If the invoice is still unpaid after its due date, the client receives the reminder email.")} />
                </Card>

                <div className="flex justify-end gap-2">
                    <Button onClick={() => navigate(id ? `/crm/invoices/${id}` : '/crm/invoices')}>{tr("Cancel")}</Button>
                    {!id && <Button loading={saving} onClick={() => submit(true)}>{tr("Save as draft")}</Button>}
                    <Button variant="solid" loading={saving} onClick={() => submit(false)}>{tr("Save")}</Button>
                </div>
            </div>
            {currency ? null : null}
        </Container>
    )
}

export default InvoiceEditor

'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbPlus, TbTrash } from 'react-icons/tb'
import RelationSelect from '../RelationSelect'
import { formatMoney } from '../format'
import { calcDocument } from '@/lib/crm/sales/calc'
import { saveInvoice } from '@/server/actions/crm/sales/invoices'

const emptyLine = () => ({ description: '', longDescription: '', qty: 1, rate: 0, unit: '', taxes: [] })
const day = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '')

/** props: lookups {taxes, currencies}, document? (from getInvoiceDocument), initialValues? */
const InvoiceEditor = ({ lookups, document: doc, initialValues = {} }) => {
    const router = useRouter()
    const inv = doc?.invoice
    const defaultCurrency = lookups.currencies.find((c) => c.isDefault) || lookups.currencies[0]

    const [clientId, setClientId] = useState(inv?.clientId || initialValues.clientId || null)
    const [date, setDate] = useState(day(inv?.date) || day(new Date()))
    const [dueDate, setDueDate] = useState(day(inv?.dueDate) || day(dayjs().add(30, 'day')))
    const [currencyId, setCurrencyId] = useState(inv?.currencyId || defaultCurrency?.id || null)
    const [discountPercent, setDiscountPercent] = useState(inv?.discountPercent || 0)
    const [discountFixed, setDiscountFixed] = useState(inv && !inv.discountPercent ? inv.discountTotal || 0 : 0)
    const [discountType, setDiscountType] = useState(inv?.discountType || 'before_tax')
    const [adjustment, setAdjustment] = useState(inv?.adjustment || 0)
    const [clientNote, setClientNote] = useState(inv?.clientNote || '')
    const [adminNote, setAdminNote] = useState(inv?.adminNote || '')
    const [terms, setTerms] = useState(inv?.terms || '')
    const [items, setItems] = useState(doc?.items?.length ? doc.items : [emptyLine()])
    const [saving, setSaving] = useState(false)

    const taxOptions = useMemo(
        () => lookups.taxes.map((t) => ({ value: `${t.name}|${t.rate}`, label: `${t.name} (${t.rate}%)`, tax: t })),
        [lookups.taxes],
    )
    const currency = lookups.currencies.find((c) => c.id === currencyId)

    const totals = useMemo(
        () => calcDocument({ items, discountPercent, discountFixed, discountType, adjustment }),
        [items, discountPercent, discountFixed, discountType, adjustment],
    )

    const setLine = (i, patch) => setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

    const submit = async (draft) => {
        setSaving(true)
        try {
            const res = await saveInvoice({
                id: inv?.id,
                clientId,
                date,
                dueDate,
                currencyId,
                discountPercent,
                discountFixed,
                discountType,
                adjustment,
                clientNote,
                adminNote,
                terms,
                draft,
                items,
            })
            if (!res.success) throw new Error(res.message)
            toast.push(<Notification type="success">Invoice saved</Notification>, { placement: 'top-center' })
            router.replace(`/crm/invoices/${res.id}`)
        } catch (e) {
            toast.push(<Notification type="danger">{e.message}</Notification>, { placement: 'top-center' })
            setSaving(false)
        }
    }

    const money = (v) => `${currency?.symbol ? currency.symbol + ' ' : ''}${formatMoney(v)}`
    const num = (set) => (e) => set(e.target.value === '' ? '' : Number(e.target.value))

    return (
        <Container>
            <h3 className="mb-4">{inv ? `Edit invoice ${doc.invoice.displayNumber}` : 'New invoice'}</h3>
            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="form-label mb-2 block">Client *</label>
                            <RelationSelect resource="clients" value={clientId} onChange={setClientId} />
                        </div>
                        <div>
                            <label className="form-label mb-2 block">Currency</label>
                            <Select
                                options={lookups.currencies.map((c) => ({ value: c.id, label: c.name }))}
                                value={lookups.currencies.filter((c) => c.id === currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null}
                                onChange={(o) => setCurrencyId(o?.value || null)}
                            />
                        </div>
                        <div />
                        <div>
                            <label className="form-label mb-2 block">Invoice date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label mb-2 block">Due date</label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </div>
                </Card>

                <Card>
                    <h4 className="mb-4">Items</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="pb-2 pr-2 min-w-[220px]">Description</th>
                                    <th className="pb-2 pr-2 w-24">Qty</th>
                                    <th className="pb-2 pr-2 w-32">Rate</th>
                                    <th className="pb-2 pr-2 min-w-[180px]">Tax</th>
                                    <th className="pb-2 pr-2 w-32 text-right">Amount</th>
                                    <th className="pb-2 w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, i) => (
                                    <tr key={i} className="align-top">
                                        <td className="pb-3 pr-2">
                                            <Input value={it.description} placeholder="Description" onChange={(e) => setLine(i, { description: e.target.value })} />
                                            <Input
                                                className="mt-1"
                                                textArea
                                                rows={2}
                                                value={it.longDescription}
                                                placeholder="Long description (optional)"
                                                onChange={(e) => setLine(i, { longDescription: e.target.value })}
                                            />
                                        </td>
                                        <td className="pb-3 pr-2">
                                            <Input type="number" step="any" value={it.qty} onChange={(e) => setLine(i, { qty: e.target.value === '' ? '' : Number(e.target.value) })} />
                                        </td>
                                        <td className="pb-3 pr-2">
                                            <Input type="number" step="0.01" value={it.rate} onChange={(e) => setLine(i, { rate: e.target.value === '' ? '' : Number(e.target.value) })} />
                                        </td>
                                        <td className="pb-3 pr-2">
                                            <Select
                                                isMulti
                                                options={taxOptions}
                                                value={taxOptions.filter((o) => it.taxes.some((t) => `${t.name}|${t.rate}` === o.value))}
                                                onChange={(opts) => setLine(i, { taxes: (opts || []).map((o) => o.tax) })}
                                            />
                                        </td>
                                        <td className="pb-3 pr-2 text-right pt-2">{money((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
                                        <td className="pb-3">
                                            <Button size="sm" variant="plain" type="button" icon={<TbTrash />} onClick={() => setItems((r) => (r.length > 1 ? r.filter((_, x) => x !== i) : [emptyLine()]))} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button size="sm" type="button" icon={<TbPlus />} onClick={() => setItems((r) => [...r, emptyLine()])}>
                        Add item
                    </Button>

                    <div className="mt-6 grid md:grid-cols-2 gap-6">
                        <div className="grid grid-cols-2 gap-4 content-start">
                            <div>
                                <label className="form-label mb-2 block">Discount %</label>
                                <Input type="number" step="any" value={discountPercent} onChange={num(setDiscountPercent)} />
                            </div>
                            <div>
                                <label className="form-label mb-2 block">Fixed discount</label>
                                <Input type="number" step="0.01" value={discountFixed} disabled={Number(discountPercent) > 0} onChange={num(setDiscountFixed)} />
                            </div>
                            <div>
                                <label className="form-label mb-2 block">Discount applies</label>
                                <Select
                                    options={[
                                        { value: 'before_tax', label: 'Before tax' },
                                        { value: 'after_tax', label: 'After tax' },
                                    ]}
                                    value={{ value: discountType, label: discountType === 'after_tax' ? 'After tax' : 'Before tax' }}
                                    onChange={(o) => setDiscountType(o?.value || 'before_tax')}
                                />
                            </div>
                            <div>
                                <label className="form-label mb-2 block">Adjustment</label>
                                <Input type="number" step="0.01" value={adjustment} onChange={num(setAdjustment)} />
                            </div>
                        </div>
                        <dl className="ml-auto w-full max-w-sm text-sm">
                            <div className="flex justify-between py-1"><dt>Sub total</dt><dd>{money(totals.subtotal)}</dd></div>
                            {totals.discountTotal > 0 && (
                                <div className="flex justify-between py-1"><dt>Discount</dt><dd>-{money(totals.discountTotal)}</dd></div>
                            )}
                            {totals.taxes.map((t) => (
                                <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd>{money(t.total)}</dd></div>
                            ))}
                            {Number(adjustment) !== 0 && (
                                <div className="flex justify-between py-1"><dt>Adjustment</dt><dd>{money(adjustment)}</dd></div>
                            )}
                            <div className="flex justify-between py-2 mt-1 border-t font-semibold text-base"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
                        </dl>
                    </div>
                </Card>

                <Card>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="form-label mb-2 block">Client note</label>
                            <Input textArea rows={4} value={clientNote} onChange={(e) => setClientNote(e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label mb-2 block">Admin note</label>
                            <Input textArea rows={4} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label mb-2 block">Terms &amp; conditions</label>
                            <Input textArea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" onClick={() => router.back()}>Cancel</Button>
                    {!inv && (
                        <Button type="button" loading={saving} onClick={() => submit(true)}>Save as draft</Button>
                    )}
                    <Button variant="solid" type="button" loading={saving} onClick={() => submit(false)}>Save</Button>
                </div>
            </div>
        </Container>
    )
}

export default InvoiceEditor

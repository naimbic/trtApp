'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import Link from 'next/link'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbArrowLeft, TbPencil, TbTrash, TbCash, TbSend, TbBan } from 'react-icons/tb'
import { formatMoney } from '../format'
import { calcDocument } from '@/lib/crm/sales/calc'
import { recordPayment, deletePayment, setInvoiceState } from '@/server/actions/crm/sales/invoices'

const STATUS = {
    1: { label: 'Unpaid', cls: 'bg-amber-200' },
    2: { label: 'Paid', cls: 'bg-emerald-200' },
    3: { label: 'Partially paid', cls: 'bg-blue-200' },
    4: { label: 'Overdue', cls: 'bg-red-200' },
    5: { label: 'Cancelled', cls: 'bg-gray-200' },
    6: { label: 'Draft', cls: 'bg-gray-200' },
}

const d = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '—')

/** props: data (getInvoiceDocument), paymentModes, caps {edit, payments, deletePayments} */
const InvoiceView = ({ data, paymentModes = [], caps }) => {
    const router = useRouter()
    const { invoice, items, payments, client, currency, activity, paid, balance } = data
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [pay, setPay] = useState({ amount: balance > 0 ? balance : '', paymentModeId: null, paymentDate: dayjs().format('YYYY-MM-DD'), note: '', transactionId: '' })
    const status = STATUS[invoice.status] || STATUS[1]
    const money = (v) => `${currency?.symbol ? currency.symbol + ' ' : ''}${formatMoney(v)}`
    const modeName = useMemo(() => Object.fromEntries(paymentModes.map((m) => [m.id, m.name])), [paymentModes])

    const totals = useMemo(
        () =>
            calcDocument({
                items,
                discountPercent: invoice.discountPercent,
                discountFixed: invoice.discountPercent ? 0 : invoice.discountTotal,
                discountType: invoice.discountType || 'before_tax',
                adjustment: invoice.adjustment,
            }),
        [items, invoice],
    )

    const run = async (fn, okMsg) => {
        setBusy(true)
        try {
            const res = await fn()
            if (!res.success) throw new Error(res.message)
            toast.push(<Notification type="success">{okMsg}</Notification>, { placement: 'top-center' })
            router.refresh()
            return true
        } catch (e) {
            toast.push(<Notification type="danger">{e.message}</Notification>, { placement: 'top-center' })
            return false
        } finally {
            setBusy(false)
        }
    }

    const submitPayment = async () => {
        const ok = await run(() => recordPayment(invoice.id, pay), 'Payment recorded')
        if (ok) setOpen(false)
    }

    const cancelled = invoice.status === 5
    return (
        <Container>
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => router.push('/crm/invoices')} />
                <h3 className="mr-2">Invoice {invoice.displayNumber}</h3>
                <Tag className={`${status.cls} text-gray-900`}>{status.label}</Tag>
                <div className="flex flex-wrap gap-2 ml-auto">
                    {caps.edit && !cancelled && !invoice.sent && (
                        <Button size="sm" icon={<TbSend />} loading={busy} onClick={() => run(() => setInvoiceState(invoice.id, 'markSent'), 'Marked as sent')}>Mark as sent</Button>
                    )}
                    {caps.payments && !cancelled && balance > 0 && (
                        <Button size="sm" variant="solid" icon={<TbCash />} onClick={() => { setPay((p) => ({ ...p, amount: balance })); setOpen(true) }}>Record payment</Button>
                    )}
                    {caps.edit && !cancelled && (
                        <Button size="sm" icon={<TbPencil />} onClick={() => router.push(`/crm/invoices/${invoice.id}?edit=1`)}>Edit</Button>
                    )}
                    {caps.edit && (
                        cancelled ? (
                            <Button size="sm" loading={busy} onClick={() => run(() => setInvoiceState(invoice.id, 'uncancel'), 'Invoice restored')}>Mark as not cancelled</Button>
                        ) : (
                            <Button size="sm" icon={<TbBan />} loading={busy} onClick={() => run(() => setInvoiceState(invoice.id, 'cancel'), 'Invoice cancelled')}>Cancel</Button>
                        )
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500">Client</div>
                            {client ? <Link className="font-semibold hover:underline" href={`/crm/clients/${client.id}`}>{client.company}</Link> : (invoice.deletedCustomerName || '—')}
                        </div>
                        <div><div className="text-gray-500">Invoice date</div>{d(invoice.date)}</div>
                        <div><div className="text-gray-500">Due date</div>{d(invoice.dueDate)}</div>
                        <div><div className="text-gray-500">Balance due</div><span className="font-semibold">{money(balance)}</span></div>
                    </div>
                </Card>

                <Card>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Item</th>
                                <th className="pb-2 text-right">Qty</th>
                                <th className="pb-2 text-right">Rate</th>
                                <th className="pb-2">Tax</th>
                                <th className="pb-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id} className="border-b align-top">
                                    <td className="py-2">
                                        <div className="font-medium">{it.description}</div>
                                        {it.longDescription && <div className="text-gray-500 whitespace-pre-line">{it.longDescription}</div>}
                                    </td>
                                    <td className="py-2 text-right">{it.qty}{it.unit ? ` ${it.unit}` : ''}</td>
                                    <td className="py-2 text-right">{money(it.rate)}</td>
                                    <td className="py-2">{it.taxes.map((t) => `${t.rate}%`).join(', ') || '—'}</td>
                                    <td className="py-2 text-right">{money(it.qty * it.rate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <dl className="ml-auto w-full max-w-sm text-sm mt-4">
                        <div className="flex justify-between py-1"><dt>Sub total</dt><dd>{money(invoice.subtotal)}</dd></div>
                        {invoice.discountTotal > 0 && <div className="flex justify-between py-1"><dt>Discount{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ''}</dt><dd>-{money(invoice.discountTotal)}</dd></div>}
                        {totals.taxes.map((t) => (
                            <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd>{money(t.total)}</dd></div>
                        ))}
                        {!!invoice.adjustment && <div className="flex justify-between py-1"><dt>Adjustment</dt><dd>{money(invoice.adjustment)}</dd></div>}
                        <div className="flex justify-between py-2 mt-1 border-t font-semibold text-base"><dt>Total</dt><dd>{money(invoice.total)}</dd></div>
                        <div className="flex justify-between py-1"><dt>Total paid</dt><dd>{money(paid)}</dd></div>
                        <div className="flex justify-between py-1 font-semibold"><dt>Amount due</dt><dd>{money(balance)}</dd></div>
                    </dl>
                </Card>

                <Card>
                    <h4 className="mb-3">Payments</h4>
                    {payments.length ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="pb-2">Date</th><th className="pb-2">Mode</th><th className="pb-2">Transaction</th><th className="pb-2">Note</th><th className="pb-2 text-right">Amount</th><th className="w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id} className="border-b">
                                        <td className="py-2">{d(p.paymentDate)}</td>
                                        <td className="py-2">{modeName[p.paymentModeId] || p.paymentMethod || '—'}</td>
                                        <td className="py-2">{p.transactionId || '—'}</td>
                                        <td className="py-2">{p.note || '—'}</td>
                                        <td className="py-2 text-right">{money(p.amount)}</td>
                                        <td className="py-2">
                                            {caps.deletePayments && (
                                                <Button size="xs" variant="plain" icon={<TbTrash />} onClick={() => confirm('Delete this payment?') && run(() => deletePayment(p.id), 'Payment deleted')} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500 text-sm">No payments yet.</p>
                    )}
                </Card>

                {(invoice.clientNote || invoice.adminNote || invoice.terms) && (
                    <Card>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                            {invoice.clientNote && <div><div className="text-gray-500">Client note</div><p className="whitespace-pre-line">{invoice.clientNote}</p></div>}
                            {invoice.adminNote && <div><div className="text-gray-500">Admin note</div><p className="whitespace-pre-line">{invoice.adminNote}</p></div>}
                            {invoice.terms && <div><div className="text-gray-500">Terms</div><p className="whitespace-pre-line">{invoice.terms}</p></div>}
                        </div>
                    </Card>
                )}

                {activity.length > 0 && (
                    <Card>
                        <h4 className="mb-3">Activity</h4>
                        <ul className="text-sm flex flex-col gap-1">
                            {activity.map((a) => (
                                <li key={a.id}><span className="text-gray-500">{dayjs(a.date || a.createdAt).format('YYYY-MM-DD HH:mm')}</span> — {a.description}</li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>

            <Dialog isOpen={open} onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}>
                <h5 className="mb-4">Record payment</h5>
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="form-label mb-2 block">Amount (max {formatMoney(balance)})</label>
                        <Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value === '' ? '' : Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="form-label mb-2 block">Payment date</label>
                        <Input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label mb-2 block">Payment mode</label>
                        <Select
                            isClearable
                            options={paymentModes.map((m) => ({ value: m.id, label: m.name }))}
                            value={paymentModes.filter((m) => m.id === pay.paymentModeId).map((m) => ({ value: m.id, label: m.name }))[0] || null}
                            onChange={(o) => setPay({ ...pay, paymentModeId: o?.value || null })}
                        />
                    </div>
                    <div>
                        <label className="form-label mb-2 block">Transaction id</label>
                        <Input value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label mb-2 block">Note</label>
                        <Input textArea rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="solid" loading={busy} onClick={submitPayment}>Save</Button>
                </div>
            </Dialog>
        </Container>
    )
}

export default InvoiceView

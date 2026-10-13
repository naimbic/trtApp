import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbPencil, TbCash, TbSend, TbBan, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify, useCan } from '../kit/api'
import { makeMoney } from '../clients/shared'
import { StatusTag, fmtDate } from './shared'

/** Effective status for display (overdue derives from the due date, like the list). */
const effective = (inv, paid) => {
    if (inv.status === 5 || inv.status === 6) return inv.status
    const due = Math.round((inv.total - paid) * 100) / 100
    if (due <= 0) return 2
    if (inv.dueDate && fmtDate(inv.dueDate) < fmtDate(new Date())) return 4
    return paid > 0 ? 3 : 1
}

const InvoiceView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const [data, setData] = useState(null)
    const [lookups, setLookups] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [payOpen, setPayOpen] = useState(false)
    const [pay, setPay] = useState({ amount: '', paymentModeId: null, paymentDate: dayjs().format('YYYY-MM-DD'), note: '', transactionId: '' })
    const [confirm, setConfirm] = useState(null) // 'cancel' | 'delete' | { payment }

    const load = useCallback(() => Promise.all([api(`/api/crm/sales/invoices/${id}`), api('/api/crm/sales/lookups')]).then(([d, l]) => { setData(d); setLookups(l); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])

    const totals = useMemo(() => data && calcDocument({ items: data.items, discountPercent: data.invoice.discountPercent, discountFixed: data.invoice.discountPercent ? 0 : data.invoice.discountTotal, discountType: data.invoice.discountType || 'before_tax', adjustment: data.invoice.adjustment }), [data])

    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/invoices')}>Back to invoices</Button></Container>
    if (!data || !lookups) return <Container><div className="py-20 text-center text-gray-400">Loading…</div></Container>

    const { invoice, items, payments, client, activity, paid, balance } = data
    const money = (n) => makeMoney(lookups.currencies)(n, invoice.currencyId)
    const st = effective(invoice, paid)
    const cancelled = invoice.status === 5
    const modeName = Object.fromEntries(lookups.paymentModes.map((m) => [m.id, m.name]))

    const run = async (fn, ok) => {
        setBusy(true)
        try {
            await fn()
            notify('success', ok)
            await load()
            return true
        } catch (e) {
            notify('danger', e.message)
            return false
        } finally {
            setBusy(false)
        }
    }

    const doConfirm = async () => {
        const c = confirm
        setConfirm(null)
        if (c === 'cancel') await run(() => api(`/api/crm/sales/invoices/${id}/state`, { method: 'POST', body: { action: 'cancel' } }), 'Invoice cancelled')
        else if (c === 'delete') { if (await run(() => api(`/api/crm/sales/invoices/${id}`, { method: 'DELETE' }), 'Invoice deleted')) navigate('/crm/invoices') }
        else if (c?.payment) await run(() => api(`/api/crm/sales/payments/${c.payment.id}`, { method: 'DELETE' }), 'Payment deleted')
    }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/invoices')} />
                <h3 className="mr-2">Invoice {invoice.displayNumber}</h3>
                <StatusTag status={st} />
                {!invoice.sent && st === 1 && <span className="text-xs text-gray-400">not sent</span>}
                <div className="ml-auto flex flex-wrap gap-2">
                    {can('invoices', 'edit') && !cancelled && !invoice.sent && <Button size="sm" icon={<TbSend />} loading={busy} onClick={() => run(() => api(`/api/crm/sales/invoices/${id}/state`, { method: 'POST', body: { action: 'markSent' } }), 'Marked as sent')}>Mark as sent</Button>}
                    {can('payments', 'create') && !cancelled && balance > 0 && <Button size="sm" variant="solid" icon={<TbCash />} onClick={() => { setPay((p) => ({ ...p, amount: balance })); setPayOpen(true) }}>Record payment</Button>}
                    {can('invoices', 'edit') && !cancelled && <Button size="sm" icon={<TbPencil />} onClick={() => navigate(`/crm/invoices/${id}/edit`)}>Edit</Button>}
                    {can('invoices', 'edit') && (cancelled ? <Button size="sm" loading={busy} onClick={() => run(() => api(`/api/crm/sales/invoices/${id}/state`, { method: 'POST', body: { action: 'uncancel' } }), 'Invoice restored')}>Mark as not cancelled</Button> : <Button size="sm" icon={<TbBan />} onClick={() => setConfirm('cancel')}>Cancel</Button>)}
                    {can('invoices', 'delete') && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>Delete</Button>}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid gap-4 text-sm md:grid-cols-4">
                        <div><div className="text-gray-500">Client</div>{client ? <Link className="font-semibold hover:underline" to={`/crm/clients/${client.id}`}>{client.company}</Link> : invoice.deletedCustomerName || '—'}</div>
                        <div><div className="text-gray-500">Invoice date</div>{fmtDate(invoice.date) || '—'}</div>
                        <div><div className="text-gray-500">Due date</div>{fmtDate(invoice.dueDate) || '—'}</div>
                        <div><div className="text-gray-500">Balance due</div><span className="font-semibold">{money(balance)}</span></div>
                    </div>
                </Card>

                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b text-left text-gray-500"><th className="pb-2">Item</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Rate</th><th className="pb-2">Tax</th><th className="pb-2 text-right">Amount</th></tr></thead>
                            <tbody>
                                {items.map((it) => (
                                    <tr key={it.id} className="border-b align-top">
                                        <td className="py-2"><div className="font-medium">{it.description}</div>{it.longDescription && <div className="whitespace-pre-line text-gray-500">{it.longDescription}</div>}</td>
                                        <td className="py-2 text-right tabular-nums">{it.qty}{it.unit ? ` ${it.unit}` : ''}</td>
                                        <td className="py-2 text-right tabular-nums">{money(it.rate)}</td>
                                        <td className="py-2">{it.taxes.map((t) => `${t.rate}%`).join(', ') || '—'}</td>
                                        <td className="py-2 text-right tabular-nums">{money(it.qty * it.rate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <dl className="ml-auto mt-4 w-full max-w-sm text-sm">
                        <div className="flex justify-between py-1"><dt>Sub total</dt><dd className="tabular-nums">{money(invoice.subtotal)}</dd></div>
                        {invoice.discountTotal > 0 && <div className="flex justify-between py-1"><dt>Discount{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ''}</dt><dd className="tabular-nums">-{money(invoice.discountTotal)}</dd></div>}
                        {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{money(t.total)}</dd></div>)}
                        {!!invoice.adjustment && <div className="flex justify-between py-1"><dt>Adjustment</dt><dd className="tabular-nums">{money(invoice.adjustment)}</dd></div>}
                        <div className="mt-1 flex justify-between border-t py-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(invoice.total)}</dd></div>
                        <div className="flex justify-between py-1"><dt>Total paid</dt><dd className="tabular-nums">{money(paid)}</dd></div>
                        <div className="flex justify-between py-1 font-semibold"><dt>Amount due</dt><dd className="tabular-nums">{money(balance)}</dd></div>
                    </dl>
                </Card>

                <Card>
                    <h4 className="mb-3">Payments</h4>
                    {payments.length ? (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b text-left text-gray-500"><th className="pb-2">Date</th><th className="pb-2">Mode</th><th className="pb-2">Transaction</th><th className="pb-2">Note</th><th className="pb-2 text-right">Amount</th><th className="w-10" /></tr></thead>
                            <tbody>{payments.map((p) => (
                                <tr key={p.id} className="border-b"><td className="py-2">{fmtDate(p.paymentDate)}</td><td className="py-2">{modeName[p.paymentModeId] || p.paymentMethod || '—'}</td><td className="py-2">{p.transactionId || '—'}</td><td className="py-2">{p.note || '—'}</td><td className="py-2 text-right tabular-nums">{money(p.amount)}</td><td className="py-2">{can('payments', 'delete') && <Button size="xs" variant="plain" icon={<TbTrash />} onClick={() => setConfirm({ payment: p })} />}</td></tr>
                            ))}</tbody>
                        </table>
                    ) : <p className="text-sm text-gray-500">No payments yet.</p>}
                </Card>

                {(invoice.clientNote || invoice.adminNote || invoice.terms) && (
                    <Card>
                        <div className="grid gap-4 text-sm md:grid-cols-3">
                            {invoice.clientNote && <div><div className="text-gray-500">Client note</div><p className="whitespace-pre-line">{invoice.clientNote}</p></div>}
                            {invoice.adminNote && <div><div className="text-gray-500">Admin note</div><p className="whitespace-pre-line">{invoice.adminNote}</p></div>}
                            {invoice.terms && <div><div className="text-gray-500">Terms</div><p className="whitespace-pre-line">{invoice.terms}</p></div>}
                        </div>
                    </Card>
                )}

                {activity.length > 0 && (
                    <Card>
                        <h4 className="mb-3">Activity</h4>
                        <ul className="flex flex-col gap-1 text-sm">{activity.map((a) => <li key={a.id}><span className="text-gray-500">{dayjs(a.date || a.createdAt).format('YYYY-MM-DD HH:mm')}</span> — {a.description}</li>)}</ul>
                    </Card>
                )}
            </div>

            <Dialog isOpen={payOpen} onClose={() => setPayOpen(false)} onRequestClose={() => setPayOpen(false)}>
                <h5 className="mb-4">Record payment</h5>
                <div className="flex flex-col gap-3">
                    <div><label className="form-label mb-2 block">Amount (max {money(balance)})</label><Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
                    <div><label className="form-label mb-2 block">Payment date</label><Input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} /></div>
                    <div><label className="form-label mb-2 block">Payment mode</label><Select isClearable options={lookups.paymentModes.map((m) => ({ value: m.id, label: m.name }))} value={lookups.paymentModes.filter((m) => m.id === pay.paymentModeId).map((m) => ({ value: m.id, label: m.name }))[0] || null} onChange={(o) => setPay({ ...pay, paymentModeId: o?.value || null })} /></div>
                    <div><label className="form-label mb-2 block">Transaction id</label><Input value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} /></div>
                    <div><label className="form-label mb-2 block">Note</label><Input textArea rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setPayOpen(false)}>Cancel</Button><Button variant="solid" loading={busy} onClick={async () => { if (await run(() => api(`/api/crm/sales/invoices/${id}/payments`, { method: 'POST', body: pay }), 'Payment recorded')) setPayOpen(false) }}>Save</Button></div>
            </Dialog>

            <ConfirmDialog isOpen={!!confirm} type={confirm === 'cancel' ? 'warning' : 'danger'} title={confirm === 'cancel' ? 'Cancel this invoice?' : confirm === 'delete' ? 'Delete this invoice?' : 'Delete this payment?'} confirmText={confirm === 'cancel' ? 'Cancel invoice' : 'Delete'} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={doConfirm}>
                <p>{confirm === 'cancel' ? 'A cancelled invoice no longer counts as revenue. It can be restored later. Invoices with payments cannot be cancelled.' : confirm === 'delete' ? 'The invoice, its lines and its activity will be removed. Invoices with payments cannot be deleted.' : 'The payment will be removed and the invoice status recalculated.'}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default InvoiceView

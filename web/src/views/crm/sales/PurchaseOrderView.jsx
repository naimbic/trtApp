import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbDownload, TbFileInvoice, TbFileTypePdf, TbMail, TbPencil, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify, useCan } from '../kit/api'
import { makeMoney, useClientLookups } from '../clients/shared'
import SendMailDialog from '../mail/SendMailDialog'
import { PoStatusTag, fmtDate } from './shared'


const PurchaseOrderView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [mail, setMail] = useState(false)
    const [confirm, setConfirm] = useState(null) // 'delete' | 'convert'

    const load = useCallback(() => api(`/api/crm/sales/purchase-orders/${id}`).then((d) => { setData(d); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])
    const totals = useMemo(() => data && calcDocument({ items: data.items, discountPercent: data.order.discountPercent, discountFixed: data.order.discountPercent ? 0 : data.order.discountTotal, discountType: data.order.discountType || 'before_tax', adjustment: data.order.adjustment }), [data])

    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/purchase-orders')}>Back to purchase orders</Button></Container>
    if (!data) return <Container><div className="py-20 text-center text-gray-400">Loading…</div></Container>

    const { order: e, items, client, activity, invoice, estimate } = data
    const money = makeMoney(lookups.currencies)
    const m = (n) => money(n, e.currencyId)
    const st = e.status
    const locked = !!e.invoiceId

    const run = async (fn, ok) => {
        setBusy(true)
        try { const r = await fn(); notify('success', ok); await load(); return r } catch (err) { notify('danger', err.message); return null } finally { setBusy(false) }
    }
    const state = (action, ok) => run(() => api(`/api/crm/sales/purchase-orders/${id}/state`, { method: 'POST', body: { action } }), ok)
    const convert = async () => { const r = await run(() => api(`/api/crm/sales/purchase-orders/${id}/convert`, { method: 'POST' }), 'Invoice created'); if (r?.invoiceId) navigate(`/crm/invoices/${r.invoiceId}`) }
    const doConfirm = async () => {
        const c = confirm; setConfirm(null)
        if (c === 'delete') { const r = await run(() => api(`/api/crm/sales/purchase-orders/${id}`, { method: 'DELETE' }), 'Purchase order deleted'); if (r) navigate('/crm/purchase-orders') } else if (c === 'convert') await convert()
    }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/purchase-orders')} />
                <h3 className="mr-2">Purchase order {e.displayNumber}</h3>
                <PoStatusTag status={st} />
                {estimate && <Link className="text-sm text-blue-600 hover:underline" to={`/crm/estimates/${estimate.id}`}>← estimate {estimate.displayNumber}</Link>}
                {invoice && <Link className="text-sm text-emerald-600 hover:underline" to={`/crm/invoices/${invoice.id}`}>→ invoice {invoice.displayNumber}</Link>}
                <div className="ml-auto flex flex-wrap gap-2">
                    <Button size="sm" icon={<TbFileTypePdf />} onClick={() => window.open(`/api/crm/sales/purchase-orders/${id}/pdf`, '_blank')}>PDF</Button>
                    <Button size="sm" icon={<TbDownload />} onClick={() => { window.location.href = `/api/crm/sales/purchase-orders/${id}/pdf?download=1` }}>Download</Button>
                    {can('purchase_orders', 'edit') && !locked && <Button size="sm" icon={<TbMail />} onClick={() => setMail(true)}>Send</Button>}
                    {can('invoices', 'create') && !locked && [2, 3, 4].includes(st) && <Button size="sm" variant="solid" icon={<TbFileInvoice />} loading={busy} onClick={() => setConfirm('convert')}>Convert to invoice</Button>}
                    {can('purchase_orders', 'edit') && !locked && (
                        <Dropdown renderTitle={<Button size="sm" loading={busy}>Mark as…</Button>} placement="bottom-end">
                            {e.status !== 1 && <Dropdown.Item eventKey="d" onClick={() => state('markDraft', 'Marked as draft')}>Draft</Dropdown.Item>}
                            {e.status !== 2 && <Dropdown.Item eventKey="s" onClick={() => state('markSent', 'Marked as sent')}>Sent</Dropdown.Item>}
                            {e.status !== 3 && <Dropdown.Item eventKey="c" onClick={() => state('markConfirmed', 'Marked as confirmed')}>Confirmed</Dropdown.Item>}
                            {e.status !== 4 && <Dropdown.Item eventKey="v" onClick={() => state('markDelivered', 'Marked as delivered')}>Delivered</Dropdown.Item>}
                            {e.status !== 5 && <Dropdown.Item eventKey="x" onClick={() => state('markCancelled', 'Marked as cancelled')}>Cancelled</Dropdown.Item>}
                        </Dropdown>
                    )}
                    {can('purchase_orders', 'edit') && !locked && <Button size="sm" icon={<TbPencil />} onClick={() => navigate(`/crm/purchase-orders/${id}/edit`)}>Edit</Button>}
                    {can('purchase_orders', 'delete') && !locked && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>Delete</Button>}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid gap-4 text-sm md:grid-cols-4">
                        <div><div className="text-gray-500">Client</div>{client ? <Link className="font-semibold hover:underline" to={`/crm/clients/${client.id}`}>{client.company}</Link> : '—'}</div>
                        <div><div className="text-gray-500">Order date</div>{fmtDate(e.date) || '—'}</div>
                        <div><div className="text-gray-500">Expected delivery</div>{fmtDate(e.deliveryDate) || '—'}</div>
                        <div><div className="text-gray-500">Client's order number</div>{e.referenceNo || '—'}</div>
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
                                        <td className="py-2 text-right tabular-nums">{m(it.rate)}</td>
                                        <td className="py-2">{it.taxes.map((t) => `${t.rate}%`).join(', ') || '—'}</td>
                                        <td className="py-2 text-right tabular-nums">{m(it.qty * it.rate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <dl className="ml-auto mt-4 w-full max-w-sm text-sm">
                        <div className="flex justify-between py-1"><dt>Sub total</dt><dd className="tabular-nums">{m(e.subtotal)}</dd></div>
                        {e.discountTotal > 0 && <div className="flex justify-between py-1"><dt>Discount{e.discountPercent > 0 ? ` (${e.discountPercent}%)` : ''}</dt><dd className="tabular-nums">-{m(e.discountTotal)}</dd></div>}
                        {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{m(t.total)}</dd></div>)}
                        {!!e.adjustment && <div className="flex justify-between py-1"><dt>Adjustment</dt><dd className="tabular-nums">{m(e.adjustment)}</dd></div>}
                        <div className="mt-1 flex justify-between border-t py-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{m(e.total)}</dd></div>
                    </dl>
                </Card>

                {(e.clientNote || e.adminNote || e.terms) && (
                    <Card>
                        <div className="grid gap-6 text-sm md:grid-cols-3">
                            {e.clientNote && <div><div className="mb-1 font-semibold">Client note</div><p className="whitespace-pre-line text-gray-600 dark:text-gray-300">{e.clientNote}</p></div>}
                            {e.adminNote && <div><div className="mb-1 font-semibold">Internal note</div><p className="whitespace-pre-line text-gray-600 dark:text-gray-300">{e.adminNote}</p></div>}
                            {e.terms && <div><div className="mb-1 font-semibold">Terms &amp; conditions</div><p className="whitespace-pre-line text-gray-600 dark:text-gray-300">{e.terms}</p></div>}
                        </div>
                    </Card>
                )}


                <Card><h4 className="mb-3">Files</h4><AttachmentsPanel relType="purchase_order" relId={id} canEdit={can('purchase_orders', 'edit')} showClientToggle /></Card>

                {activity.length > 0 && (
                    <Card>
                        <h4 className="mb-3">Activity</h4>
                        <div className="flex flex-col gap-2 text-sm">{activity.map((a) => <div key={a.id} className="flex justify-between gap-4"><span>{a.description}{a.fullName ? <span className="text-gray-400"> · {a.fullName}</span> : null}</span><span className="shrink-0 text-gray-400">{dayjs(a.date).format('DD MMM YYYY HH:mm')}</span></div>)}</div>
                    </Card>
                )}
            </div>

            <SendMailDialog open={mail} kind="purchase_order" id={id} template="purchase-order-send-to-client" onClose={() => setMail(false)} onSent={load} />
            <ConfirmDialog isOpen={!!confirm} type={confirm === 'delete' ? 'danger' : 'info'} title={confirm === 'delete' ? 'Delete this purchase order?' : 'Create the invoice?'} confirmText={confirm === 'delete' ? 'Delete' : 'Create invoice'} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={doConfirm}>
                <p>{confirm === 'delete' ? 'The purchase order is removed for good.' : 'An unpaid invoice with the same lines is created and linked to this purchase order. The purchase order can no longer be edited afterwards.'}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default PurchaseOrderView

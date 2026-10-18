import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbPencil, TbCash, TbSend, TbBan, TbTrash, TbMail, TbBellRinging, TbFileTypePdf, TbDownload, TbPrinter } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Dropdown from '@/components/ui/Dropdown'
import EllipsisButton from '@/components/shared/EllipsisButton'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify, useCan, printPage } from '../kit/api'
import { makeMoney } from '../clients/shared'
import { StatusTag, fmtDate } from './shared'
import SendMailDialog from '../mail/SendMailDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import { useSessionUser } from '@/store/authStore'
import { tr, trn } from '@/utils/t'
import RichText from '../kit/RichText'
import { plainText } from '@/lib/crm/richText'
import ReminderCard from '../kit/ReminderCard'

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
    const [view, setView] = useState('details') // details | document
    const [mail, setMail] = useState(null) // template slug or null
    const [payOpen, setPayOpen] = useState(false)
    const [pay, setPay] = useState({ amount: '', paymentModeId: null, paymentDate: dayjs().format('YYYY-MM-DD'), note: '', transactionId: '' })
    const [confirm, setConfirm] = useState(null) // 'cancel' | 'delete' | { payment }
    const [caution, setCaution] = useState(null) // a paid invoice a super admin is about to change: the function to run (with force)
    const authority = useSessionUser((x) => x.user.authority) || []
    const superAdmin = authority.includes('admin') || authority.includes('crm.admin')

    const load = useCallback(() => Promise.all([api(`/api/crm/sales/invoices/${id}`), api('/api/crm/sales/lookups')]).then(([d, l]) => { setData(d); setLookups(l); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])

    const totals = useMemo(() => data && calcDocument({ items: data.items, discountPercent: data.invoice.discountPercent, discountFixed: data.invoice.discountPercent ? 0 : data.invoice.discountTotal, discountType: data.invoice.discountType || 'before_tax', adjustment: data.invoice.adjustment }), [data])

    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/invoices')}>{tr("Back to invoices")}</Button></Container>
    if (!data || !lookups) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>

    const { invoice, items, payments, client, activity, paid, balance } = data
    const money = (n) => makeMoney(lookups.currencies)(n, invoice.currencyId)
    const st = effective(invoice, paid)
    const cancelled = invoice.status === 5
    const paidFinal = invoice.status === 2 // a paid invoice is final: only a super admin changes it, after confirming
    const guard = (fn) => () => (paidFinal ? setCaution(() => fn) : fn(false))
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
        if (c === 'cancel') await run(() => api(`/api/crm/sales/invoices/${id}/state`, { method: 'POST', body: { action: 'cancel', force: paidFinal } }), tr("Invoice cancelled"))
        else if (c === 'delete') { if (await run(() => api(`/api/crm/sales/invoices/${id}`, { method: 'DELETE' }), tr("Invoice deleted"))) navigate('/crm/invoices') }
        else if (c?.payment) await run(() => api(`/api/crm/sales/payments/${c.payment.id}${paidFinal ? '?force=1' : ''}`, { method: 'DELETE' }), tr("Payment deleted"))
    }

    const canEdit = can('invoices', 'edit') && !cancelled && (!paidFinal || superAdmin)
    const dueIn = invoice.dueDate ? dayjs(fmtDate(invoice.dueDate)).diff(dayjs(fmtDate(new Date())), 'day') : null
    const pct = invoice.total > 0 ? Math.min(100, Math.round((paid / invoice.total) * 100)) : 0
    const dueHint = st === 2 || cancelled || dueIn == null ? null : dueIn < 0 ? { text: `${trn(-dueIn, 'day')} ${tr('overdue')}`, cls: 'text-red-500' } : { text: dueIn === 0 ? tr("Due today") : `${tr('in')} ${trn(dueIn, 'day')}`, cls: 'text-gray-400' }
    const kpi = 'rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800'
    const label = 'text-xs font-semibold uppercase tracking-wide text-gray-500'
    const sizeFrame = (e) => { try { const d = e.target.contentDocument; if (d) e.target.style.height = `${Math.max(d.documentElement.scrollHeight, d.body.scrollHeight) + 8}px` } catch { /* keep the default height */ } }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/invoices')} />
                <h3 className="mr-1">{tr("Invoice")} {invoice.displayNumber}</h3>
                <StatusTag status={st} />
                {!invoice.sent && st === 1 && <span className="text-xs text-gray-400">{tr("not sent")}</span>}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {can('payments', 'create') && !cancelled && balance > 0 && <Button size="sm" variant="solid" icon={<TbCash />} onClick={() => { setPay((p) => ({ ...p, amount: balance })); setPayOpen(true) }}>{tr("Record payment")}</Button>}
                    {canEdit && st !== 6 && <Button size="sm" icon={<TbMail />} onClick={() => setMail('invoice-send-to-client')}>{tr("Send")}</Button>}
                    {st !== 6 && <Button size="sm" icon={<TbPrinter />} onClick={() => printPage(`/api/crm/sales/invoices/${id}/html?print=1`)}>{tr("Print")}</Button>}
                    <Button size="sm" icon={<TbFileTypePdf />} onClick={() => window.open(`/api/crm/sales/invoices/${id}/pdf`, '_blank')}>{tr("PDF")}</Button>
                    {canEdit && <Button size="sm" icon={<TbPencil />} onClick={guard(() => navigate(`/crm/invoices/${id}/edit`))}>{tr("Edit")}</Button>}
                    <Dropdown placement="bottom-end" renderTitle={<EllipsisButton size="sm" />}>
                        <Dropdown.Item eventKey="dl" onClick={() => { window.location.href = `/api/crm/sales/invoices/${id}/pdf?download=1` }}><TbDownload className="text-lg" /><span>{tr("Download PDF")}</span></Dropdown.Item>
                        {canEdit && [1, 3, 4].includes(st) && <Dropdown.Item eventKey="rem" onClick={() => setMail('invoice-overdue-notice')}><TbBellRinging className="text-lg" /><span>{tr("Send reminder")}</span></Dropdown.Item>}
                        {canEdit && payments.length > 0 && <Dropdown.Item eventKey="rec" onClick={() => setMail('invoice-payment-recorded')}><TbMail className="text-lg" /><span>{tr("Send receipt")}</span></Dropdown.Item>}
                        {canEdit && !invoice.sent && <Dropdown.Item eventKey="sent" onClick={guard((force) => run(() => api(`/api/crm/sales/invoices/${id}/state`, { method: 'POST', body: { action: 'markSent', force } }), tr("Marked as sent")))}><TbSend className="text-lg" /><span>{tr("Mark as sent")}</span></Dropdown.Item>}
                        {can('invoices', 'edit') && (cancelled ? <Dropdown.Item eventKey="un" onClick={guard((force) => run(() => api(`/api/crm/sales/invoices/${id}/state`, { method: 'POST', body: { action: 'uncancel', force } }), tr("Invoice restored")))}><TbBan className="text-lg" /><span>{tr("Mark as not cancelled")}</span></Dropdown.Item> : <Dropdown.Item eventKey="cx" onClick={guard(() => setConfirm('cancel'))}><TbBan className="text-lg" /><span>{tr("Cancel invoice")}</span></Dropdown.Item>)}
                        {can('invoices', 'delete') && (!paidFinal || superAdmin) && <Dropdown.Item eventKey="del" onClick={() => setConfirm('delete')}><TbTrash className="text-lg text-red-500" /><span className="text-red-500">{tr("Delete")}</span></Dropdown.Item>}
                    </Dropdown>
                </div>
            </div>

            <div className="mb-4"><Segment size="sm" value={view} onChange={(v) => v && setView(v)}><Segment.Item value="details">{tr("Details")}</Segment.Item><Segment.Item value="document">{tr("Document")}</Segment.Item></Segment></div>

            {view === 'document' && (
                <iframe title={tr("Invoice document")} onLoad={sizeFrame} src={`/api/crm/sales/invoices/${id}/html?v=${Math.round((invoice.total || 0) * 100)}-${payments.length}-${st}-${items.map((i) => i.id).join('')}-${invoice.updatedAt || ''}`} className="block h-[1180px] w-full border-0" />
            )}

            <div className={view === 'document' ? 'hidden' : ''}>
                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <div className={`${kpi} col-span-2 lg:col-span-1`}><div className={label}>{tr("Client")}</div><div className="mt-1 truncate font-semibold heading-text">{client ? <Link className="hover:text-primary" to={`/crm/clients/${client.id}`}>{client.company}</Link> : invoice.deletedCustomerName || '—'}</div><div className="mt-0.5 text-xs text-gray-400">{tr("Invoice")} {fmtDate(invoice.date) || '—'}</div></div>
                    <div className={kpi}><div className={label}>{tr("Due date")}</div><div className="mt-1 font-semibold heading-text">{fmtDate(invoice.dueDate) || '—'}</div>{dueHint && <div className={`mt-0.5 text-xs ${dueHint.cls}`}>{dueHint.text}</div>}</div>
                    <div className={kpi}><div className={label}>{tr("Total")}</div><div className="mt-1 text-lg font-bold heading-text tabular-nums">{money(invoice.total)}</div></div>
                    <div className={kpi}><div className={label}>{tr("Paid")}</div><div className="mt-1 text-lg font-bold text-emerald-600 tabular-nums">{money(paid)}</div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div></div>
                    <div className={`${kpi} ${balance > 0 && st === 4 ? 'border-red-200 dark:border-red-500/40' : ''}`}><div className={label}>{tr("Balance due")}</div><div className={`mt-1 text-lg font-bold tabular-nums ${balance > 0 ? (st === 4 ? 'text-red-600' : 'heading-text') : 'text-emerald-600'}`}>{money(balance)}</div></div>
                </div>

                <div className="grid items-start gap-4 xl:grid-cols-3">
                    <div className="flex flex-col gap-4 xl:col-span-2">
                        <Card>
                            <h5 className="mb-3">{tr("Items")}</h5>
                            <div className="overflow-x-auto">
                                <div className="min-w-[560px]">
                                    <div className="grid grid-cols-[28px_minmax(0,1fr)_80px_110px_70px_120px] gap-x-3 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><span>#</span><span>{tr("Item")}</span><span className="text-right">{tr("Qty")}</span><span className="text-right">{tr("Rate")}</span><span>{tr("Tax")}</span><span className="text-right">{tr("Amount")}</span></div>
                                    {items.map((it, i) => (
                                        <div key={it.id} className="grid grid-cols-[28px_minmax(0,1fr)_80px_110px_70px_120px] gap-x-3 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-700">
                                            <span className="text-gray-400">{i + 1}</span>
                                            <div className="min-w-0"><div className="font-medium heading-text whitespace-pre-line">{plainText(it.description)}</div>{it.longDescription && <RichText className="mt-0.5 text-xs text-gray-500" html={it.longDescription} />}</div>
                                            <span className="text-right tabular-nums">{it.qty}{it.unit ? ` ${it.unit}` : ''}</span>
                                            <span className="text-right tabular-nums">{money(it.rate)}</span>
                                            <span className="flex flex-wrap gap-1">{it.taxes.length ? it.taxes.map((t, k) => <span key={k} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">{t.rate}%</span>) : <span className="text-gray-400">—</span>}</span>
                                            <span className="text-right font-semibold tabular-nums">{money(it.qty * it.rate)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <dl className="ml-auto mt-4 w-full max-w-sm rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-700/40">
                                <div className="flex justify-between py-1"><dt className="text-gray-500">{tr("Sub total")}</dt><dd className="tabular-nums">{money(invoice.subtotal)}</dd></div>
                                {invoice.discountTotal > 0 && <div className="flex justify-between py-1"><dt className="text-gray-500">{tr("Discount")}{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ''}</dt><dd className="tabular-nums">-{money(invoice.discountTotal)}</dd></div>}
                                {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt className="text-gray-500">{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{money(t.total)}</dd></div>)}
                                {!!invoice.adjustment && <div className="flex justify-between py-1"><dt className="text-gray-500">{tr("Adjustment")}</dt><dd className="tabular-nums">{money(invoice.adjustment)}</dd></div>}
                                <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 text-base font-bold dark:border-gray-600"><dt>{tr("Total")}</dt><dd className="tabular-nums">{money(invoice.total)}</dd></div>
                                <div className="flex justify-between py-1 text-emerald-600"><dt>{tr("Total paid")}</dt><dd className="tabular-nums">{money(paid)}</dd></div>
                                <div className="flex justify-between py-1 font-semibold"><dt>{tr("Amount due")}</dt><dd className="tabular-nums">{money(balance)}</dd></div>
                            </dl>
                        </Card>

                        {(invoice.clientNote || invoice.terms) && (
                            <Card>
                                <div className="grid gap-4 text-sm md:grid-cols-2">
                                    {invoice.clientNote && <div><div className={label}>{tr("Client note")}</div><RichText className="mt-1" html={invoice.clientNote} /></div>}
                                    {invoice.terms && <div><div className={label}>{tr("Terms")}</div><RichText className="mt-1" html={invoice.terms} /></div>}
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        {[1, 3, 4].includes(st) && <ReminderCard resource="invoices" id={id} field="cancelOverdueReminders" inverted value={!invoice.cancelOverdueReminders} canEdit={canEdit} title={tr("Send overdue reminders to the client")} hint={tr("If the invoice is still unpaid after its due date, the client receives the reminder email.")} />}
                        <Card>
                            <h5 className="mb-3">{tr("Payments")}</h5>
                            {payments.length ? (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {payments.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                            <div className="min-w-0"><div className="font-semibold tabular-nums">{money(p.amount)}</div><div className="truncate text-xs text-gray-500">{fmtDate(p.paymentDate)} · {modeName[p.paymentModeId] || p.paymentMethod || '—'}{p.transactionId ? ` · ${p.transactionId}` : ''}</div>{p.note && <div className="truncate text-xs text-gray-400">{p.note}</div>}</div>
                                            {can('payments', 'delete') && (!paidFinal || superAdmin) && <Button size="xs" variant="plain" icon={<TbTrash />} onClick={guard(() => setConfirm({ payment: p }))} />}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-gray-500">{tr("No payments yet.")}</p>}
                        </Card>

                        <Card>
                            <h5 className="mb-3">{tr("Files")}</h5>
                            <AttachmentsPanel relType="invoice" relId={id} canEdit={can('invoices', 'edit')} showClientToggle />
                        </Card>

                        {invoice.adminNote && <Card><h5 className="mb-2">{tr("Internal note")}</h5><RichText className="text-sm" html={invoice.adminNote} /></Card>}

                        {activity.length > 0 && (
                            <Card>
                                <h5 className="mb-3">{tr("Activity")}</h5>
                                <ul className="flex flex-col gap-2 text-sm">{activity.map((a) => <li key={a.id}><div className="text-xs text-gray-400">{dayjs(a.date || a.createdAt).format('YYYY-MM-DD HH:mm')}</div>{a.description}</li>)}</ul>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            <Dialog isOpen={payOpen} onClose={() => setPayOpen(false)} onRequestClose={() => setPayOpen(false)}>
                <h5 className="mb-4">{tr("Record payment")}</h5>
                <div className="flex flex-col gap-3">
                    <div><label className="form-label mb-2 block">{tr("Amount (max")} {money(balance)})</label><Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Payment date")}</label><Input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Payment mode")}</label><Select isClearable options={lookups.paymentModes.map((m) => ({ value: m.id, label: m.name }))} value={lookups.paymentModes.filter((m) => m.id === pay.paymentModeId).map((m) => ({ value: m.id, label: m.name }))[0] || null} onChange={(o) => setPay({ ...pay, paymentModeId: o?.value || null })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Transaction id")}</label><Input value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} /></div>
                    <div><label className="form-label mb-2 block">{tr("Note")}</label><Input textArea rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setPayOpen(false)}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} onClick={async () => { if (await run(() => api(`/api/crm/sales/invoices/${id}/payments`, { method: 'POST', body: pay }), tr("Payment recorded"))) setPayOpen(false) }}>{tr("Save")}</Button></div>
            </Dialog>

            <ConfirmDialog isOpen={!!caution} type="warning" title={tr("This invoice is paid")} confirmText={tr("Change it anyway")} onClose={() => setCaution(null)} onCancel={() => setCaution(null)} onConfirm={() => { const fn = caution; setCaution(null); fn(true) }}>
                <p className="text-sm text-red-600">{tr("A paid invoice is final. Changing it can upset your accounts and reports. Only a super admin can do it, and only if you know why.")}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={!!confirm} type={confirm === 'cancel' ? 'warning' : 'danger'} title={confirm === 'cancel' ? tr("Cancel this invoice?") : confirm === 'delete' ? tr("Delete this invoice?") : tr("Delete this payment?")} confirmText={confirm === 'cancel' ? tr("Cancel invoice") : tr("Delete")} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={doConfirm}>
                <p>{confirm === 'cancel' ? tr("A cancelled invoice no longer counts as revenue. It can be restored later. Invoices with payments cannot be cancelled.") : confirm === 'delete' ? tr("The invoice, its lines and its activity will be removed. Invoices with payments cannot be deleted.") : tr("The payment will be removed and the invoice status recalculated.")}</p>
            </ConfirmDialog>
                    <SendMailDialog open={!!mail} kind="invoice" id={id} template={mail} onClose={() => setMail(null)} onSent={load} />
        </Container>
    )
}

export default InvoiceView

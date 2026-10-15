import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbCopy, TbDownload, TbFileInvoice, TbFileTypePdf, TbMail, TbPencil, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import Input from '@/components/ui/Input'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify, useCan } from '../kit/api'
import { makeMoney, useClientLookups } from '../clients/shared'
import SendMailDialog from '../mail/SendMailDialog'
import { ProposalStatusTag, fmtDate } from './shared'
import { tr } from '@/utils/t'

const effective = (p) => (p.openTill && [1, 4, 5].includes(p.status) && fmtDate(p.openTill) < fmtDate(new Date()) ? 7 : p.status)

const ProposalView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [mail, setMail] = useState(false)
    const [confirm, setConfirm] = useState(null) // 'delete' | 'convert'
    const [reply, setReply] = useState('')

    const load = useCallback(() => api(`/api/crm/sales/proposals/${id}`).then((d) => { setData(d); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])
    const totals = useMemo(() => data && calcDocument({ items: data.items, discountPercent: data.proposal.discountPercent, discountFixed: data.proposal.discountPercent ? 0 : data.proposal.discountTotal, discountType: data.proposal.discountType || 'before_tax', adjustment: data.proposal.adjustment }), [data])

    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/proposals')}>{tr("Back to proposals")}</Button></Container>
    if (!data) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>

    const { proposal: e, items, client, lead, comments, activity, invoice, estimate } = data
    const money = makeMoney(lookups.currencies)
    const m = (n) => money(n, e.currencyId)
    const st = effective(e)
    const locked = !!e.invoiceId
    const isClient = e.relType === 'customer'
    const clientLink = `${window.location.origin}/api/crm/public/proposal/${e.id}/${e.hash}`

    const run = async (fn, ok) => {
        setBusy(true)
        try { const r = await fn(); notify('success', ok); await load(); return r } catch (err) { notify('danger', err.message); return null } finally { setBusy(false) }
    }
    const state = (action, ok) => run(() => api(`/api/crm/sales/proposals/${id}/state`, { method: 'POST', body: { action } }), ok)
    const copy = async () => { try { await navigator.clipboard.writeText(clientLink); notify('success', tr("Client link copied")) } catch { notify('danger', tr("Could not copy")) } }
    const convert = async (to) => { const r = await run(() => api(`/api/crm/sales/proposals/${id}/convert`, { method: 'POST', body: { to } }), to === 'invoice' ? tr("Invoice created") : tr("Estimate created")); if (r?.invoiceId) navigate(`/crm/invoices/${r.invoiceId}`); else if (r?.estimateId) navigate(`/crm/estimates/${r.estimateId}`) }
    const sendReply = async () => { if (!reply.trim()) return; if (await run(() => api(`/api/crm/sales/proposals/${id}/comments`, { method: 'POST', body: { content: reply } }), tr("Reply added"))) setReply('') }
    const delComment = (cid) => run(() => api(`/api/crm/sales/proposals/${id}/comments?commentId=${cid}`, { method: 'DELETE' }), tr("Comment deleted"))
    const doConfirm = async () => {
        const c = confirm; setConfirm(null)
        if (c === 'delete') { const r = await run(() => api(`/api/crm/sales/proposals/${id}`, { method: 'DELETE' }), tr("Proposal deleted")); if (r) navigate('/crm/proposals') } else if (c === 'estimate' || c === 'invoice') await convert(c)
    }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/proposals')} />
                <h3 className="mr-2">{tr("Proposal")} {e.displayNumber}</h3>
                <ProposalStatusTag status={st} />
                {estimate && <Link className="text-sm text-blue-600 hover:underline" to={`/crm/estimates/${estimate.id}`}>{tr("→ estimate")} {estimate.displayNumber}</Link>}
                {invoice && <Link className="text-sm text-emerald-600 hover:underline" to={`/crm/invoices/${invoice.id}`}>{tr("→ invoice")} {invoice.displayNumber}</Link>}
                <div className="ml-auto flex flex-wrap gap-2">
                    <Button size="sm" icon={<TbFileTypePdf />} onClick={() => window.open(`/api/crm/sales/proposals/${id}/pdf`, '_blank')}>{tr("PDF")}</Button>
                    <Button size="sm" icon={<TbDownload />} onClick={() => { window.location.href = `/api/crm/sales/proposals/${id}/pdf?download=1` }}>{tr("Download")}</Button>
                    {can('proposals', 'edit') && !locked && <Button size="sm" icon={<TbMail />} onClick={() => setMail(true)}>{tr("Send")}</Button>}
                    {e.status !== 6 && <Button size="sm" icon={<TbCopy />} onClick={copy}>{tr("Client link")}</Button>}
                    {can('estimates', 'create') && isClient && !e.estimateId && !locked && e.status !== 6 && <Button size="sm" icon={<TbFileInvoice />} loading={busy} onClick={() => setConfirm('estimate')}>{tr("To estimate")}</Button>}
                    {can('invoices', 'create') && isClient && !locked && e.status === 3 && <Button size="sm" variant="solid" icon={<TbFileInvoice />} loading={busy} onClick={() => setConfirm('invoice')}>{tr("To invoice")}</Button>}
                    {can('proposals', 'edit') && !locked && (
                        <Dropdown renderTitle={<Button size="sm" loading={busy}>{tr("Mark as…")}</Button>} placement="bottom-end">
                            {e.status !== 6 && <Dropdown.Item eventKey="d" onClick={() => state('markDraft', tr("Marked as draft"))}>{tr("Draft")}</Dropdown.Item>}
                            {e.status !== 1 && <Dropdown.Item eventKey="o" onClick={() => state('markOpen', tr("Marked as open"))}>{tr("Open")}</Dropdown.Item>}
                            {e.status !== 4 && <Dropdown.Item eventKey="s" onClick={() => state('markSent', tr("Marked as sent"))}>{tr("Sent")}</Dropdown.Item>}
                            {e.status !== 5 && <Dropdown.Item eventKey="r" onClick={() => state('markRevised', tr("Marked as revised"))}>{tr("Revised")}</Dropdown.Item>}
                            {e.status !== 3 && <Dropdown.Item eventKey="a" onClick={() => state('markAccepted', tr("Marked as accepted"))}>{tr("Accepted")}</Dropdown.Item>}
                            {e.status !== 2 && <Dropdown.Item eventKey="x" onClick={() => state('markDeclined', tr("Marked as declined"))}>{tr("Declined")}</Dropdown.Item>}
                        </Dropdown>
                    )}
                    {can('proposals', 'edit') && !locked && <Button size="sm" icon={<TbPencil />} onClick={() => navigate(`/crm/proposals/${id}/edit`)}>{tr("Edit")}</Button>}
                    {can('proposals', 'delete') && !locked && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>{tr("Delete")}</Button>}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <Card>
                    <h4 className="mb-1">{e.subject}</h4>
                    <div className="mt-3 grid gap-4 text-sm md:grid-cols-4">
                        <div><div className="text-gray-500">{tr("For")}</div>{client ? <Link className="font-semibold hover:underline" to={`/crm/clients/${client.id}`}>{e.proposalTo}</Link> : <span className="font-semibold">{e.proposalTo}</span>}{lead && <span className="ml-1 rounded bg-gray-100 px-1.5 text-xs text-gray-500 dark:bg-gray-700">{tr("lead")}</span>}<div className="text-gray-500">{[e.email, e.phone].filter(Boolean).join(' · ')}</div></div>
                        <div><div className="text-gray-500">{tr("Proposal date")}</div>{fmtDate(e.date) || '—'}</div>
                        <div><div className="text-gray-500">{tr("Open until")}</div>{fmtDate(e.openTill) || '—'}</div>
                        <div><div className="text-gray-500">{tr("Comments")}</div>{e.allowComments ? tr("Allowed") : tr("Turned off")}</div>
                    </div>
                    {e.status === 3 && e.acceptanceFirstname && (
                        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10">
                            <div><b>{tr("Accepted by")} {e.acceptanceFirstname} {e.acceptanceLastname}</b> ({e.acceptanceEmail}{tr(") on")} {e.acceptanceDate ? dayjs(e.acceptanceDate).format('DD MMM YYYY, HH:mm') : ''}{e.acceptanceIp ? tr(" · IP {acceptanceIp}", { acceptanceIp: e.acceptanceIp }) : ''}</div>
                            {e.signature?.startsWith('data:image/png;base64,') && <img src={e.signature} alt={tr("Signature")} className="max-h-14 rounded bg-white p-1" />}
                        </div>
                    )}
                </Card>

                <Card bodyClass="p-0 sm:p-0">
                    <div className="flex items-center justify-between border-b px-4 py-2 text-sm text-gray-500"><span>{tr("The document your client reads")}</span><Button size="xs" icon={<TbFileTypePdf />} onClick={() => window.open(`/api/crm/sales/proposals/${id}/pdf`, '_blank')}>{tr("Open PDF")}</Button></div>
                    <iframe title={tr("Proposal")} src={`/api/crm/sales/proposals/${id}/html?v=${e.updatedAt}`} className="block h-[720px] w-full bg-white" />
                </Card>

                {items.length > 0 && <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b text-left text-gray-500"><th className="pb-2">{tr("Item")}</th><th className="pb-2 text-right">{tr("Qty")}</th><th className="pb-2 text-right">{tr("Rate")}</th><th className="pb-2">{tr("Tax")}</th><th className="pb-2 text-right">{tr("Amount")}</th></tr></thead>
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
                        <div className="flex justify-between py-1"><dt>{tr("Sub total")}</dt><dd className="tabular-nums">{m(e.subtotal)}</dd></div>
                        {e.discountTotal > 0 && <div className="flex justify-between py-1"><dt>{tr("Discount")}{e.discountPercent > 0 ? ` (${e.discountPercent}%)` : ''}</dt><dd className="tabular-nums">-{m(e.discountTotal)}</dd></div>}
                        {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{m(t.total)}</dd></div>)}
                        {!!e.adjustment && <div className="flex justify-between py-1"><dt>{tr("Adjustment")}</dt><dd className="tabular-nums">{m(e.adjustment)}</dd></div>}
                        <div className="mt-1 flex justify-between border-t py-2 text-base font-semibold"><dt>{tr("Total")}</dt><dd className="tabular-nums">{m(e.total)}</dd></div>
                    </dl>
                </Card>}


                <Card>
                    <h4 className="mb-3">{tr("Comments")} {comments.length ? <span className="text-sm font-normal text-gray-400">({comments.length})</span> : null}</h4>
                    {!comments.length ? <p className="mb-3 text-sm text-gray-400">{tr("No comments yet. The client can comment from the public proposal page.")}</p> : (
                        <div className="mb-4 flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                            {comments.map((c) => (
                                <div key={c.id} className="flex gap-3 py-3">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.staffId ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{(c.authorName || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="text-sm text-gray-900 dark:text-gray-100">{c.authorName || tr("Client")}</b>{c.staffId ? <span className="rounded bg-emerald-100 px-1.5 text-emerald-700">{tr("Team")}</span> : <span className="rounded bg-indigo-100 px-1.5 text-indigo-700">{tr("Client")}</span>}<span>{dayjs(c.createdAt).format('DD MMM YYYY, HH:mm')}</span>{can('proposals', 'edit') && <button type="button" className="ml-auto text-red-500 hover:underline" onClick={() => delComment(c.id)}>{tr("Delete")}</button>}</div>
                                        <p className="mt-0.5 whitespace-pre-line text-sm">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {can('proposals', 'edit') && (
                        <div className="flex gap-2"><Input textArea rows={2} placeholder={tr("Reply to the client… (visible on the public proposal page)")} value={reply} onChange={(ev) => setReply(ev.target.value)} /><Button variant="solid" loading={busy} onClick={sendReply}>{tr("Reply")}</Button></div>
                    )}
                </Card>

                <Card><h4 className="mb-3">{tr("Files")}</h4><AttachmentsPanel relType="proposal" relId={id} canEdit={can('proposals', 'edit')} showClientToggle /></Card>

                {activity.length > 0 && (
                    <Card>
                        <h4 className="mb-3">{tr("Activity")}</h4>
                        <div className="flex flex-col gap-2 text-sm">{activity.map((a) => <div key={a.id} className="flex justify-between gap-4"><span>{a.description}{a.fullName ? <span className="text-gray-400"> · {a.fullName}</span> : null}</span><span className="shrink-0 text-gray-400">{dayjs(a.date).format('DD MMM YYYY HH:mm')}</span></div>)}</div>
                    </Card>
                )}
            </div>

            <SendMailDialog open={mail} kind="proposal" id={id} template="proposal-send-to-customer" onClose={() => setMail(false)} onSent={load} />
            <ConfirmDialog isOpen={!!confirm} type={confirm === 'delete' ? 'danger' : 'info'} title={confirm === 'delete' ? tr("Delete this proposal?") : confirm === 'estimate' ? tr("Create an estimate?") : tr("Create the invoice?")} confirmText={confirm === 'delete' ? tr("Delete") : confirm === 'estimate' ? tr("Create estimate") : tr("Create invoice")} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={doConfirm}>
                <p>{confirm === 'delete' ? tr("The proposal and its comments are removed for good.") : confirm === 'estimate' ? tr("A draft estimate with the same lines is created for this client.") : tr("An unpaid invoice with the same lines is created. The proposal can no longer be edited afterwards.")}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ProposalView

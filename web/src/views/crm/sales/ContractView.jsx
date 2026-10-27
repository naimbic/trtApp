import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbMail, TbPencil, TbRefresh, TbSignature, TbTrash, TbTrashOff, TbFileTypePdf, TbCopy, TbPrinter } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import { api, notify, useCan, printPage } from '../kit/api'
import { useClientLookups, makeMoney } from '../clients/shared'
import { StateTag } from './ContractsList'
import { fmtDate } from './shared'
import SendMailDialog from '../mail/SendMailDialog'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import { useSessionUser } from '@/store/authStore'
import ShareButton from '@/components/crm/ShareButton'
import { tr } from '@/utils/t'
import ReminderCard from '../kit/ReminderCard'

const { TabList, TabNav } = Tabs
const Field = ({ label, children }) => (<div><div className="mb-0.5 text-xs uppercase tracking-wide text-gray-400">{label}</div><div>{children || <span className="text-gray-400">—</span>}</div></div>)

const ContractView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const baseCur = lookups.currencies.find((c) => c.isDefault)?.id
    const [c, setC] = useState(null)
    const [error, setError] = useState('')
    const [tab, setTab] = useState('content')
    const [renew, setRenew] = useState(null)
    const [comment, setComment] = useState('')
    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const [caution, setCaution] = useState(null) // a signed contract a super admin is about to change: the function to run (with force)
    const authority = useSessionUser((x) => x.user.authority) || []
    const superAdmin = authority.includes('admin') || authority.includes('crm.admin')
    const [mailOpen, setMailOpen] = useState(false)

    const load = useCallback(() => api(`/api/crm/sales/contracts/${id}`).then((d) => { setC(d); setError('') }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])

    const act = async (action, body = {}, ok) => {
        setBusy(true)
        try { await api(`/api/crm/sales/contracts/${id}/actions`, { method: 'POST', body: { action, ...body } }); notify('success', ok); await load(); return true } catch (e) { notify('danger', e.message); return false } finally { setBusy(false) }
    }
    const addComment = async () => {
        if (!comment.trim()) return
        try { await api(`/api/crm/sales/contracts/${id}/comments`, { method: 'POST', body: { content: comment } }); setComment(''); load() } catch (e) { notify('danger', e.message) }
    }
    const delComment = async (cid) => { try { await api(`/api/crm/sales/contracts/${id}/comments?commentId=${cid}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }
    const del = async () => {
        try { await api(`/api/crm/sales/contracts/${id}${locked ? '?force=1' : ''}`, { method: 'DELETE' }); notify('success', tr("Contract deleted")); navigate('/crm/contracts') } catch (e) { notify('danger', e.message); setConfirm(null) }
    }

    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/contracts')}>{tr("Back to contracts")}</Button></Container>
    if (!c) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>
    const signed = c.signed || c.markedAsSigned
    const locked = !!c.locked // a signed contract is final: no edit, no delete; only a super admin, after confirming
    const guard = (fn) => () => (locked ? setCaution(() => fn) : fn(false))

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/contracts')} />
                <h3 className="mr-1 max-w-[60%] truncate">{c.subject}</h3>
                <StateTag state={c.state} />
                <Tag className={signed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{signed ? tr("Signed") : tr("Not signed")}</Tag>{locked && <span className="text-xs text-gray-400">{tr("Signed contracts cannot be edited")}</span>}
                <div className="ml-auto flex flex-wrap gap-2">
                    <Button size="sm" icon={<TbFileTypePdf />} onClick={() => window.open(`/api/crm/sales/contracts/${id}/pdf`, '_blank')}>{tr("PDF")}</Button>
                    {can('contracts', 'create') && <Button size="sm" icon={<TbCopy />} onClick={() => navigate(`/crm/contracts/new?from=${id}`)}>{tr("Duplicate")}</Button>}
                    <ShareButton asButton url={c.hash && !c.trash && !c.hidden ? `/api/crm/public/contract/${id}/${c.hash}` : `/crm/contracts/${id}`} title={c.subject || tr("Contract")} text={c.subject || tr("Contract")} file={{ url: `/api/crm/sales/contracts/${id}/pdf`, name: `Contract-${id}.pdf`, type: 'application/pdf' }} />
                    {c.hash && !c.trash && !c.hidden && <Button size="sm" icon={<TbCopy />} onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/api/crm/public/contract/${id}/${c.hash}`); notify('success', tr("Client link copied")) } catch { notify('danger', tr("Could not copy")) } }}>{tr("Client link")}</Button>}
                    {can('contracts', 'edit') && !c.trash && <Button size="sm" icon={<TbMail />} onClick={() => setMailOpen(true)}>{tr("Send")}</Button>}
                    <Button size="sm" icon={<TbPrinter />} onClick={() => printPage(`/api/crm/sales/contracts/${id}/html?print=1`)}>{tr("Print")}</Button>
                    {can('contracts', 'edit') && !c.trash && (!locked || superAdmin) && <Button size="sm" icon={<TbRefresh />} onClick={guard(() => setRenew({ newStartDate: dayjs(c.dateEnd || new Date()).format('YYYY-MM-DD'), newEndDate: dayjs(c.dateEnd || new Date()).add(1, 'year').format('YYYY-MM-DD'), newValue: c.value }))}>{tr("Renew")}</Button>}
                    {can('contracts', 'edit') && !c.eSigned && (!signed || superAdmin) && <Button size="sm" icon={<TbSignature />} loading={busy} onClick={guard((force) => act(signed ? 'unsign' : 'sign', { force }, signed ? tr("Marked as not signed") : tr("Marked as signed")))}>{signed ? tr("Mark as not signed") : tr("Mark as signed")}</Button>}
                    {can('contracts', 'edit') && (!locked || superAdmin) && <Button size="sm" icon={<TbPencil />} onClick={guard(() => navigate(`/crm/contracts/${id}/edit`))}>{tr("Edit")}</Button>}
                    {can('contracts', 'edit') && (c.trash ? <Button size="sm" icon={<TbTrashOff />} loading={busy} onClick={() => act('restore', {}, tr("Contract restored"))}>{tr("Restore")}</Button> : (locked && !superAdmin ? null : <Button size="sm" icon={<TbTrash />} loading={busy} onClick={guard((force) => act('trash', { force }, tr("Moved to trash")))}>{tr("Trash")}</Button>))}
                    {can('contracts', 'delete') && (!locked || superAdmin) && <Button size="sm" variant="plain" className="text-red-500" onClick={guard(() => setConfirm('delete'))}>{tr("Delete")}</Button>}
                </div>
            </div>

            <Card className="mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
                    <Field label={tr("Client")}>{c.client && <Link className="font-semibold hover:underline" to={`/crm/clients/${c.client.id}`}>{c.client.company}</Link>}</Field>
                    <Field label={tr("Type")}>{c.type?.name}</Field>
                    <Field label={tr("Value")}><span className="font-semibold tabular-nums">{money(c.value, baseCur)}</span></Field>
                    <Field label={tr("Start")}>{fmtDate(c.dateStart)}</Field>
                    <Field label={tr("End")}>{c.dateEnd ? fmtDate(c.dateEnd) : tr("No end date")}</Field>
                </div>
                {c.description && <p className="mt-4 whitespace-pre-line border-t pt-3 text-sm text-gray-500">{c.description}</p>}
                {c.hidden && <p className="mt-3 text-xs text-gray-400">{tr("Not visible to the client.")}</p>}
            </Card>

            {c.dateEnd && <div className="mb-4"><ReminderCard resource="contracts" id={id} value={c.remindClient !== false} canEdit={can('contracts', 'edit')} title={tr("Send expiry reminders to the client")} hint={tr("Shortly before the contract ends, the client receives a notice by email.")} /></div>}

            <AdaptiveCard>
                <Tabs value={tab} onChange={setTab}>
                    <TabList>
                        <TabNav value="content">{tr("Content")}</TabNav>
                        <TabNav value="comments">{tr("Comments")}{c.comments.length ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{c.comments.length}</span> : null}</TabNav>
                        <TabNav value="renewals">{tr("Renewals")}{c.renewals.length ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{c.renewals.length}</span> : null}</TabNav>
                        <TabNav value="signature">{tr("Signature")}</TabNav>
                        <TabNav value="files">{tr("Files")}</TabNav>
                    </TabList>
                    <div className="pt-5">
                        {tab === 'files' && <AttachmentsPanel relType="contract" relId={id} canEdit={can('contracts', 'edit')} showClientToggle />}
                        {tab === 'content' && (c.content ? <iframe title={tr("Contract")} src={`/api/crm/sales/contracts/${id}/html?v=${c.updatedAt || ''}`} className="block h-[860px] w-full border-0" /> : <p className="text-gray-400">{tr("This contract has no text yet.")}{can('contracts', 'edit') && <button className="ml-1 text-primary" onClick={() => navigate(`/crm/contracts/${id}/edit`)}>{tr("Write it")}</button>}</p>)}
                        {tab === 'comments' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-2"><Input textArea rows={2} placeholder={tr("Write a comment…")} value={comment} onChange={(e) => setComment(e.target.value)} /><Button variant="solid" onClick={addComment}>{tr("Add")}</Button></div>
                                {c.comments.length ? c.comments.map((m) => (
                                    <div key={m.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"><div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span>{m.staff || tr("Staff")} · {dayjs(m.createdAt).format('YYYY-MM-DD HH:mm')}</span>{can('contracts', 'edit') && <button type="button" className="text-red-500 hover:underline" onClick={() => delComment(m.id)}>{tr("Delete")}</button>}</div><p className="whitespace-pre-line text-sm">{m.content}</p></div>
                                )) : <p className="text-gray-400">{tr("No comments yet.")}</p>}
                            </div>
                        )}
                        {tab === 'renewals' && (c.renewals.length ? (
                            <table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="pb-2">{tr("Renewed")}</th><th className="pb-2">{tr("By")}</th><th className="pb-2">{tr("Period")}</th><th className="pb-2 text-right">{tr("Value")}</th></tr></thead>
                                <tbody>{c.renewals.map((r) => (<tr key={r.id} className="border-b"><td className="py-2">{fmtDate(r.dateRenewed)}</td><td className="py-2">{r.renewedBy || '—'}</td><td className="py-2">{fmtDate(r.oldStartDate)} → {fmtDate(r.oldEndDate)} <span className="text-gray-400">{tr("to")}</span> {fmtDate(r.newStartDate)} → {fmtDate(r.newEndDate)}</td><td className="py-2 text-right tabular-nums">{r.oldValue != null ? money(r.oldValue, baseCur, { decimals: 0 }) : '—'} → {r.newValue != null ? money(r.newValue, baseCur, { decimals: 0 }) : '—'}</td></tr>))}</tbody></table>
                        ) : <p className="text-gray-400">{tr("This contract has not been renewed.")}</p>)}
                        {tab === 'signature' && (c.acceptance || signed ? (
                            <div className="grid max-w-xl grid-cols-2 gap-4 text-sm"><Field label={tr("Status")}>{c.markedAsSigned ? tr("Marked as signed by staff") : tr("Signed by the client")}</Field><Field label={tr("Signed by")}>{c.acceptance?.name}</Field><Field label={tr("Email")}>{c.acceptance?.email}</Field><Field label={tr("Date and time")}>{c.acceptance?.date ? dayjs(c.acceptance.date).format('YYYY-MM-DD HH:mm:ss') : ''}</Field><Field label={tr("IP address")}><span className="font-mono">{c.acceptance?.ip}</span></Field>{c.acceptance?.signature && <div className="col-span-2"><div className="mb-1 text-xs uppercase tracking-wide text-gray-400">{tr("Signature")}</div><img src={c.acceptance.signature} alt={tr("Signature")} className="max-h-28 rounded-lg border border-gray-200 bg-white p-2" /></div>}</div>
                        ) : <p className="text-gray-400">{tr("Not signed yet.")}</p>)}
                    </div>
                </Tabs>
            </AdaptiveCard>

            <Dialog isOpen={!!renew} onClose={() => setRenew(null)} onRequestClose={() => setRenew(null)}>
                <h5 className="mb-1">{tr("Renew contract")}</h5>
                <p className="mb-4 text-sm text-gray-500">{tr("Sets new dates (and optionally a new value) and keeps the old ones in the renewal history.")}</p>
                {renew && (
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3"><div><label className="form-label mb-2 block">{tr("New start")}</label><Input type="date" value={renew.newStartDate} onChange={(e) => setRenew({ ...renew, newStartDate: e.target.value })} /></div><div><label className="form-label mb-2 block">{tr("New end")}</label><Input type="date" value={renew.newEndDate} onChange={(e) => setRenew({ ...renew, newEndDate: e.target.value })} /></div></div>
                        <div><label className="form-label mb-2 block">{tr("New value")}</label><Input type="number" step="0.01" value={renew.newValue ?? ''} onChange={(e) => setRenew({ ...renew, newValue: e.target.value })} /></div>
                    </div>
                )}
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setRenew(null)}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} onClick={async () => { if (await act('renew', { ...renew, force: locked }, tr("Contract renewed"))) setRenew(null) }}>{tr("Renew")}</Button></div>
            </Dialog>

            <ConfirmDialog isOpen={!!caution} type="warning" title={tr("This contract is signed")} confirmText={tr("Change it anyway")} onClose={() => setCaution(null)} onCancel={() => setCaution(null)} onConfirm={() => { const fn = caution; setCaution(null); fn(true) }}>
                <p className="text-sm text-red-600">{tr("A signed contract is final. Changing it can go against what the client agreed to. Only a super admin can do it, and only if you know why.")}</p>
            </ConfirmDialog>
            <ConfirmDialog isOpen={confirm === 'delete'} type="danger" title={tr("Delete this contract?")} confirmText={tr("Delete")} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={del}>
                <p>{tr("The contract is removed for good. Use Trash instead if you may need it again.")}</p>
            </ConfirmDialog>
                    <SendMailDialog open={mailOpen} kind="contract" id={id} template="send-contract" onClose={() => setMailOpen(false)} />
        </Container>
    )
}

export default ContractView

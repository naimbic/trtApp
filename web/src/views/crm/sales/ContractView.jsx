import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbPencil, TbRefresh, TbSignature, TbTrash, TbTrashOff } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import { getResource } from '@/lib/crm/resources'
import { api, notify, useCan } from '../kit/api'
import RecordDrawer from '../kit/RecordDrawer'
import { useClientLookups, makeMoney } from '../clients/shared'
import { StateTag } from './ContractsList'
import { fmtDate } from './shared'

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
    const [edit, setEdit] = useState(false)
    const [renew, setRenew] = useState(null)
    const [comment, setComment] = useState('')
    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState(null)

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
        try { await api(`/api/crm/contracts/${id}`, { method: 'DELETE' }); notify('success', 'Contract deleted'); navigate('/crm/contracts') } catch (e) { notify('danger', e.message); setConfirm(null) }
    }

    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/contracts')}>Back to contracts</Button></Container>
    if (!c) return <Container><div className="py-20 text-center text-gray-400">Loading…</div></Container>
    const signed = c.signed || c.markedAsSigned

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/contracts')} />
                <h3 className="mr-1 max-w-[60%] truncate">{c.subject}</h3>
                <StateTag state={c.state} />
                <Tag className={signed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{signed ? 'Signed' : 'Not signed'}</Tag>
                <div className="ml-auto flex flex-wrap gap-2">
                    {can('contracts', 'edit') && !c.trash && <Button size="sm" icon={<TbRefresh />} onClick={() => setRenew({ newStartDate: dayjs(c.dateEnd || new Date()).format('YYYY-MM-DD'), newEndDate: dayjs(c.dateEnd || new Date()).add(1, 'year').format('YYYY-MM-DD'), newValue: c.value })}>Renew</Button>}
                    {can('contracts', 'edit') && <Button size="sm" icon={<TbSignature />} loading={busy} onClick={() => act(signed ? 'unsign' : 'sign', {}, signed ? 'Marked as not signed' : 'Marked as signed')}>{signed ? 'Mark as not signed' : 'Mark as signed'}</Button>}
                    {can('contracts', 'edit') && <Button size="sm" icon={<TbPencil />} onClick={() => setEdit(true)}>Edit</Button>}
                    {can('contracts', 'edit') && (c.trash ? <Button size="sm" icon={<TbTrashOff />} loading={busy} onClick={() => act('restore', {}, 'Contract restored')}>Restore</Button> : <Button size="sm" icon={<TbTrash />} loading={busy} onClick={() => act('trash', {}, 'Moved to trash')}>Trash</Button>)}
                    {can('contracts', 'delete') && <Button size="sm" variant="plain" className="text-red-500" onClick={() => setConfirm('delete')}>Delete</Button>}
                </div>
            </div>

            <Card className="mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
                    <Field label="Client">{c.client && <Link className="font-semibold hover:underline" to={`/crm/clients/${c.client.id}`}>{c.client.company}</Link>}</Field>
                    <Field label="Type">{c.type?.name}</Field>
                    <Field label="Value"><span className="font-semibold tabular-nums">{money(c.value, baseCur)}</span></Field>
                    <Field label="Start">{fmtDate(c.dateStart)}</Field>
                    <Field label="End">{c.dateEnd ? fmtDate(c.dateEnd) : 'No end date'}</Field>
                </div>
                {c.description && <p className="mt-4 whitespace-pre-line border-t pt-3 text-sm text-gray-500">{c.description}</p>}
                {c.hidden && <p className="mt-3 text-xs text-gray-400">Not visible to the client.</p>}
            </Card>

            <AdaptiveCard>
                <Tabs value={tab} onChange={setTab}>
                    <TabList>
                        <TabNav value="content">Content</TabNav>
                        <TabNav value="comments">Comments{c.comments.length ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{c.comments.length}</span> : null}</TabNav>
                        <TabNav value="renewals">Renewals{c.renewals.length ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{c.renewals.length}</span> : null}</TabNav>
                        <TabNav value="signature">Signature</TabNav>
                    </TabList>
                    <div className="pt-5">
                        {tab === 'content' && (c.content ? <iframe title="Contract content" sandbox="" srcDoc={`<base target="_blank"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.55;color:#222;margin:16px}</style>${c.content}`} className="h-[640px] w-full rounded-xl border border-gray-200 bg-white dark:border-gray-600" /> : <p className="text-gray-400">This contract has no content yet. Use Edit to add it.</p>)}
                        {tab === 'comments' && (
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-2"><Input textArea rows={2} placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} /><Button variant="solid" onClick={addComment}>Add</Button></div>
                                {c.comments.length ? c.comments.map((m) => (
                                    <div key={m.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"><div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span>{m.staff || 'Staff'} · {dayjs(m.createdAt).format('YYYY-MM-DD HH:mm')}</span>{can('contracts', 'edit') && <button type="button" className="text-red-500 hover:underline" onClick={() => delComment(m.id)}>Delete</button>}</div><p className="whitespace-pre-line text-sm">{m.content}</p></div>
                                )) : <p className="text-gray-400">No comments yet.</p>}
                            </div>
                        )}
                        {tab === 'renewals' && (c.renewals.length ? (
                            <table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="pb-2">Renewed</th><th className="pb-2">By</th><th className="pb-2">Period</th><th className="pb-2 text-right">Value</th></tr></thead>
                                <tbody>{c.renewals.map((r) => (<tr key={r.id} className="border-b"><td className="py-2">{fmtDate(r.dateRenewed)}</td><td className="py-2">{r.renewedBy || '—'}</td><td className="py-2">{fmtDate(r.oldStartDate)} → {fmtDate(r.oldEndDate)} <span className="text-gray-400">to</span> {fmtDate(r.newStartDate)} → {fmtDate(r.newEndDate)}</td><td className="py-2 text-right tabular-nums">{r.oldValue != null ? money(r.oldValue, baseCur, { decimals: 0 }) : '—'} → {r.newValue != null ? money(r.newValue, baseCur, { decimals: 0 }) : '—'}</td></tr>))}</tbody></table>
                        ) : <p className="text-gray-400">This contract has not been renewed.</p>)}
                        {tab === 'signature' && (c.acceptance || signed ? (
                            <div className="grid max-w-xl grid-cols-2 gap-4 text-sm"><Field label="Status">{c.markedAsSigned ? 'Marked as signed by staff' : 'Signed by the client'}</Field><Field label="Signed by">{c.acceptance?.name}</Field><Field label="Email">{c.acceptance?.email}</Field><Field label="Date">{c.acceptance?.date ? dayjs(c.acceptance.date).format('YYYY-MM-DD HH:mm') : ''}</Field></div>
                        ) : <p className="text-gray-400">Not signed yet.</p>)}
                    </div>
                </Tabs>
            </AdaptiveCard>

            <RecordDrawer resource={getResource('contracts')} open={edit} id={id} canEdit={can('contracts', 'edit')} canDelete={false} onClose={() => setEdit(false)} onSaved={load} />

            <Dialog isOpen={!!renew} onClose={() => setRenew(null)} onRequestClose={() => setRenew(null)}>
                <h5 className="mb-1">Renew contract</h5>
                <p className="mb-4 text-sm text-gray-500">Sets new dates (and optionally a new value) and keeps the old ones in the renewal history.</p>
                {renew && (
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3"><div><label className="form-label mb-2 block">New start</label><Input type="date" value={renew.newStartDate} onChange={(e) => setRenew({ ...renew, newStartDate: e.target.value })} /></div><div><label className="form-label mb-2 block">New end</label><Input type="date" value={renew.newEndDate} onChange={(e) => setRenew({ ...renew, newEndDate: e.target.value })} /></div></div>
                        <div><label className="form-label mb-2 block">New value</label><Input type="number" step="0.01" value={renew.newValue ?? ''} onChange={(e) => setRenew({ ...renew, newValue: e.target.value })} /></div>
                    </div>
                )}
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setRenew(null)}>Cancel</Button><Button variant="solid" loading={busy} onClick={async () => { if (await act('renew', renew, 'Contract renewed')) setRenew(null) }}>Renew</Button></div>
            </Dialog>

            <ConfirmDialog isOpen={confirm === 'delete'} type="danger" title="Delete this contract?" confirmText="Delete" onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={del}>
                <p>The contract is removed for good. Use Trash instead if you may need it again.</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ContractView

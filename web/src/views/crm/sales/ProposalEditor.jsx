import { useEffect, useMemo, useRef, useState } from 'react'
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
import Switcher from '@/components/ui/Switcher'
import Segment from '@/components/ui/Segment'
import VisualEditor from '../mail/VisualEditor'
import { useClientLookups } from '../clients/shared'
import { makeMoney } from '../clients/shared'
import { NumberField } from './shared'
import { tr } from '@/utils/t'
import ReminderSwitch from '../kit/ReminderSwitch'

const emptyLine = () => ({ description: '', longDescription: '', qty: 1, rate: 0, unit: '', taxes: [] })
const day = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '')
const money2 = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ProposalEditor = () => {
    const { id } = useParams()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [lookups, setLookups] = useState(null)
    const [doc, setDoc] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [v, setV] = useState(null)
    const base = useClientLookups()
    const visual = useRef(null)

    useEffect(() => {
        Promise.all([api('/api/crm/sales/lookups').then(async (l) => ({ ...l, defaults: { ...(l.defaults || {}), ...(await api('/api/crm/sales/proposals/defaults')) } })), id ? api(`/api/crm/sales/proposals/${id}`) : null])
            .then(([l, d]) => {
                setLookups(l)
                setDoc(d)
                const inv = d?.proposal
                const def = l.currencies.find((c) => c.isDefault) || l.currencies[0]
                const dd = l.defaults || {}
                const dueAfter = dd.openFor !== '' && dd.openFor != null ? Number(dd.openFor) : 14
                const baseLine = () => ({ ...emptyLine(), taxes: (dd.taxes || []).filter((t) => l.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
                setV({ number: inv?.number ?? '',
                    subject: inv?.subject || '', relType: inv?.relType || (params.get('leadId') ? 'lead' : 'customer'), relId: inv?.relId || params.get('clientId') || params.get('leadId') || null,
                    proposalTo: inv?.proposalTo || '', email: inv?.email || '', phone: inv?.phone || '', address: inv?.address || '', city: inv?.city || '', state: inv?.state || '', zip: inv?.zip || '', country: inv?.country ?? null,
                    content: inv?.content ?? '<p>Hello,</p><p>Thank you for your interest. Please find our offer below.</p><p>{proposal_items}</p><p>We look forward to working with you.</p>', allowComments: inv ? inv.allowComments !== false : true, remindClient: inv ? inv.remindClient !== false : true, assignedId: inv?.assignedId || null,
                    date: day(inv?.date) || day(new Date()),
                    openTill: inv ? day(inv.openTill) : (dueAfter > 0 ? day(dayjs().add(dueAfter, 'day')) : ''),
                    currencyId: inv?.currencyId || def?.id || null,
                    discountPercent: inv?.discountPercent || 0,
                    discountFixed: inv && !inv.discountPercent ? inv.discountTotal || 0 : 0,
                    discountType: inv?.discountType || 'before_tax',
                    adjustment: inv?.adjustment || 0,
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

    const fill = async (relType, relId) => {
        try { const f = await api(`/api/crm/sales/proposals/prefill?relType=${relType}&relId=${relId}`); setV((s) => ({ ...s, proposalTo: f.proposalTo || s.proposalTo, email: f.email || s.email, phone: f.phone || s.phone, address: f.address || s.address, city: f.city || s.city, state: f.state || s.state, zip: f.zip || s.zip, country: f.country ?? s.country })) } catch { /* optional */ }
    }

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
        if (!v.subject.trim()) return setError(tr("Give the proposal a subject"))
        if (!v.relId) return setError(tr("Choose the client or lead this proposal is for"))
        if (!v.proposalTo.trim()) return setError(tr("Who is the proposal for?"))
        setSaving(true)
        setError('')
        try {
            const body = { ...v }
            const res = id ? await api(`/api/crm/sales/proposals/${id}`, { method: 'PUT', body }) : await api('/api/crm/sales/proposals', { method: 'POST', body })
            notify('success', tr("Proposal saved"))
            navigate(`/crm/proposals/${res.id}`)
        } catch (e) {
            setError(e.message)
            setSaving(false)
        }
    }

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3>{id ? tr("Edit proposal {v1}", { v1: doc?.proposal?.displayNumber || '' }) : tr("New proposal")}</h3><NumberField value={v?.number} onChange={(n) => set({ number: n })} /></div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="flex flex-col gap-4">
                <Card>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-4"><label className="form-label mb-2 block">{tr("Subject *")}</label><Input value={v.subject} placeholder={tr("e.g. Website redesign")} onChange={(e) => set({ subject: e.target.value })} /></div>
                        <div className="md:col-span-2">
                            <label className="form-label mb-2 block">{tr("Made for *")}</label>
                            <div className="mb-2"><Segment size="sm" value={v.relType} onChange={(t) => t && set({ relType: t, relId: null })}><Segment.Item value="customer">{tr("Client")}</Segment.Item><Segment.Item value="lead">{tr("Lead")}</Segment.Item></Segment></div>
                            <RelationSelect key={v.relType} resource={v.relType === 'lead' ? 'leads' : 'clients'} value={v.relId} onChange={(rid) => { set({ relId: rid }); if (rid) fill(v.relType, rid) }} />
                        </div>
                        <div><label className="form-label mb-2 block">{tr("Currency")}</label><Select options={lookups.currencies.map((c) => ({ value: c.id, label: c.name }))} value={lookups.currencies.filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Assigned to")}</label><Select isClearable options={(base.staff || []).map((s) => ({ value: s.id, label: s.name }))} value={(base.staff || []).filter((s) => s.id === v.assignedId).map((s) => ({ value: s.id, label: s.name }))[0] || null} onChange={(o) => set({ assignedId: o?.value || null })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Proposal date")}</label><Input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Open until")}</label><Input type="date" value={v.openTill} onChange={(e) => set({ openTill: e.target.value })} /></div>
                    </div>
                </Card>

                <Card>
                    <div className="mb-3 flex items-center justify-between"><h4>{tr("Prepared for")}</h4><span className="text-xs text-gray-400">{tr("Filled from the client or lead; edit freely")}</span></div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div><label className="form-label mb-2 block">{tr("Name / company *")}</label><Input value={v.proposalTo} onChange={(e) => set({ proposalTo: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Email")}</label><Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("Phone")}</label><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                        <div className="md:col-span-3"><label className="form-label mb-2 block">{tr("Address")}</label><Input value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("City")}</label><Input value={v.city} onChange={(e) => set({ city: e.target.value })} /></div>
                        <div><label className="form-label mb-2 block">{tr("State")}</label><Input value={v.state} onChange={(e) => set({ state: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="form-label mb-2 block">{tr("ZIP")}</label><Input value={v.zip} onChange={(e) => set({ zip: e.target.value })} /></div><div><label className="form-label mb-2 block">{tr("Country")}</label><Select isClearable options={base.countries || []} value={(base.countries || []).find((o) => o.value === v.country) || null} onChange={(o) => set({ country: o ? o.value : null })} /></div></div>
                    </div>
                </Card>

                <Card>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div><h4>{tr("Proposal text")}</h4><p className="text-sm text-gray-500">{tr("What the client reads. The items table goes where you put")} <code>{tr("{proposal_items}")}</code>{tr("; without it the table is added at the end.")}</p></div>
                        <div className="flex flex-wrap gap-1.5">{['proposal_items', 'proposal_number', 'proposal_total', 'proposal_open_till', 'proposal_proposal_to', 'company_name'].map((t) => <button key={t} type="button" onClick={() => visual.current?.insert(`{${t}}`)} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary dark:bg-gray-700">{`{${t}}`}</button>)}</div>
                    </div>
                    <VisualEditor ref={visual} docKey={`proposal-${id || 'new'}`} value={v.content} onChange={(html) => setV((s) => ({ ...s, content: html }))} />
                </Card>

                <Card>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h4>{tr("Items")} <span className="text-sm font-normal text-gray-400">{tr("(optional)")}</span></h4>
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
                    <div className="flex items-center justify-between gap-4"><div><div className="font-semibold">{tr("Allow comments")}</div><div className="text-sm text-gray-500">{tr("The client can write comments on the public proposal page")}</div></div><Switcher checked={v.allowComments} onChange={(c) => set({ allowComments: c })} /></div>
                </Card>

                <Card>
                    <ReminderSwitch checked={v.remindClient !== false} onChange={(c) => set({ remindClient: c })} title={tr("Send expiry reminders to the client")} hint={tr("Shortly before the proposal closes, the client receives a reminder email.")} />
                </Card>

                <div className="flex justify-end gap-2">
                    <Button onClick={() => navigate(id ? `/crm/proposals/${id}` : '/crm/proposals')}>{tr("Cancel")}</Button>
                    <Button variant="solid" loading={saving} onClick={() => submit()}>{tr("Save proposal")}</Button>
                </div>
            </div>
            {currency ? null : null}
        </Container>
    )
}

export default ProposalEditor

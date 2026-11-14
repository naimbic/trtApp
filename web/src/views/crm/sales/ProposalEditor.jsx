import ItemPicker from './ItemPicker'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { calcDocument } from '@/lib/crm/sales/calc'
import { api, notify } from '../kit/api'
import LineItemsTable from './LineItemsTable'
import { proposalText, isStartingText } from '@/lib/crm/proposalText'
import RelationSelect from '../kit/RelationSelect'
import Switcher from '@/components/ui/Switcher'
import Segment from '@/components/ui/Segment'
import VisualEditor from '../mail/VisualEditor'
import { useClientLookups } from '../clients/shared'
import { makeMoney } from '../clients/shared'
import { NumberField } from './shared'
import { tr } from '@/utils/t'
import AccordionCard from '@/components/crm/AccordionCard'

const RECUR_UNITS = () => [{ value: 'day', label: tr("Days") }, { value: 'week', label: tr("Weeks") }, { value: 'month', label: tr("Months") }, { value: 'year', label: tr("Years") }]

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
    const [open, setOpen] = useState({ to: false, items: true, text: true }) // folding sections; "Prepared for" is filled by itself on a new proposal, so it starts folded
    const [disc, setDisc] = useState(null) // the Discount switch; until it is touched it is on when the proposal has a discount
    const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))
    const [lang, setLang] = useState('') // language of the client or lead: a new proposal's starting text is written in it

    // fills the "prepared for" block (and, on a new proposal, the client's currency) from the chosen client or lead
    const fill = async (relType, relId) => {
        try { const f = await api(`/api/crm/sales/proposals/prefill?relType=${relType}&relId=${relId}`); if (f.language) setLang(f.language); setV((s) => ({ ...s, ...(f.language && isStartingText(s.content) ? { content: proposalText(f.language) } : {}), ...(!id && f.currencyId ? { currencyId: f.currencyId } : {}), proposalTo: f.proposalTo || s.proposalTo, email: f.email || s.email, phone: f.phone || s.phone, address: f.address || s.address, city: f.city || s.city, state: f.state || s.state, zip: f.zip || s.zip, country: f.country ?? s.country })) } catch { /* optional */ }
    }

    const langOf = async (relType, relId) => { try { const f = await api(`/api/crm/sales/proposals/prefill?relType=${relType}&relId=${relId}`); if (!f.language) return; setLang(f.language); setV((s) => (s && isStartingText(s.content) ? { ...s, content: proposalText(f.language) } : s)) } catch { /* optional */ } }
    const fromId = params.get('from')
    useEffect(() => {
        Promise.all([api('/api/crm/sales/lookups').then(async (l) => ({ ...l, defaults: { ...(l.defaults || {}), ...(await api('/api/crm/sales/proposals/defaults')) } })), id || fromId ? api(`/api/crm/sales/proposals/${id || fromId}`) : null])
            .then(([l, d]) => {
                setLookups(l)
                setDoc(d)
                const inv = d?.proposal
                const cloned = !id && !!inv // a duplicate: the content of another document, as a new draft with a new number and today's dates
                const def = l.currencies.find((c) => c.isDefault) || l.currencies[0]
                const dd = l.defaults || {}
                const dueAfter = dd.openFor !== '' && dd.openFor != null ? Number(dd.openFor) : 7
                const baseLine = () => ({ ...emptyLine(), taxes: (dd.taxes || []).filter((t) => l.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
                setV({ number: cloned ? '' : inv?.number ?? '',
                    subject: inv?.subject || '', relType: inv?.relType || (params.get('leadId') ? 'lead' : 'customer'), relId: inv?.relId || params.get('clientId') || params.get('leadId') || null,
                    proposalTo: inv?.proposalTo || '', email: inv?.email || '', phone: inv?.phone || '', address: inv?.address || '', city: inv?.city || '', state: inv?.state || '', zip: inv?.zip || '', country: inv?.country ?? null,
                    content: inv?.content ?? proposalText(), recurring: inv?.recurring || 0, recurringType: inv?.recurringType || 'month', cycles: inv?.cycles || 0, allowComments: inv ? inv.allowComments !== false : true, remindClient: inv ? inv.remindClient !== false : true, assignedId: inv?.assignedId || (!inv ? dd.me || null : null),
                    date: (!cloned && day(inv?.date)) || day(new Date()),
                    openTill: inv && !cloned ? day(inv.openTill) : (dueAfter > 0 ? day(dayjs().add(dueAfter, 'day')) : ''),
                    currencyId: inv?.currencyId || def?.id || null,
                    discountPercent: inv?.discountPercent || 0,
                    discountFixed: inv && !inv.discountPercent ? inv.discountTotal || 0 : 0,
                    discountType: inv?.discountType || 'before_tax',
                    adjustment: inv?.adjustment || 0,
                                        items: d?.items?.length ? d.items.map(({ id: _i, ...line }) => line) : [baseLine()],
                })
                // a new proposal from a client's page or a lead: the "prepared for" block (and the client's currency) is filled at once
                if (inv && id) langOf(inv.relType, inv.relId) // an untouched starting text follows the language of who it is for
                if (!inv && params.get('clientId')) fill('customer', params.get('clientId'))
                else if (!inv && params.get('leadId')) fill('lead', params.get('leadId'))
            })
            .catch((e) => setError(e.message))
    }, [id, fromId, params])

    const taxOptions = useMemo(() => (lookups?.taxes || []).map((t) => ({ value: `${t.name}|${t.rate}`, label: `${t.name} (${t.rate}%)`, tax: t })), [lookups])
    const totals = useMemo(() => (v ? calcDocument({ items: v.items, discountPercent: v.discountPercent, discountFixed: v.discountFixed, discountType: v.discountType, adjustment: v.adjustment }) : null), [v])

    if (error && !v) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div></Container>
    if (!v || !lookups) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>

    const currency = lookups.currencies.find((c) => c.id === v.currencyId)
    const money = (n) => makeMoney(lookups.currencies)(n, v.currencyId)
    const newLine = () => ({ ...emptyLine(), taxes: (lookups.defaults?.taxes || []).filter((t) => lookups.taxes.some((x) => x.name === t.name && Number(x.rate) === t.rate)) })
    const set = (patch) => setV((s) => ({ ...s, ...patch }))
    const discOn = disc ?? (Number(v.discountPercent) > 0 || Number(v.discountFixed) > 0)
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

    const submit = async () => {
        if (!v.subject.trim()) return setError(tr("Give the proposal a subject"))
        if (!v.relId) return setError(tr("Choose the client or lead this proposal is for"))
        if (!v.proposalTo.trim()) { setOpen((o) => ({ ...o, to: true })); return setError(tr("Who is the proposal for?")) }
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
            <div className="flex flex-col gap-3">
                {/* the content (subject, items, text) stays wide on the left; every setting is a small card on the right, its switch at the top right. One column on small screens */}
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-3">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><label className="form-label mb-1 block">{tr("Subject *")}</label><Input className="text-base font-semibold" value={v.subject} placeholder={tr("e.g. Website redesign")} onChange={(e) => set({ subject: e.target.value })} /></div>

                        <AccordionCard title={tr("Items")} dot="#10b981" count={v.items.filter((i) => String(i.description || '').trim()).length} note={money(totals.total)} open={open.items} onToggle={() => toggle('items')}>
                            <div className="p-4">
                                <div className="mb-3 flex justify-end"><div className="w-full sm:w-72"><ItemPicker onChange={addFromCatalog} /></div></div>
                                <LineItemsTable items={v.items} onChange={(items) => set({ items })} taxOptions={taxOptions} newLine={newLine} />
                                <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
                                    <div className="w-full sm:w-36"><label className="form-label mb-1 block">{tr("Adjustment")}</label><Input type="number" step="0.01" value={v.adjustment} onChange={num('adjustment')} /></div>
                                    <dl className="w-full max-w-sm text-sm">
                                    <div className="flex justify-between py-1"><dt>{tr("Sub total")}</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
                                    {totals.discountTotal > 0 && <div className="flex justify-between py-1"><dt>{tr("Discount")}</dt><dd className="tabular-nums">-{money(totals.discountTotal)}</dd></div>}
                                    {totals.taxes.map((t) => <div key={`${t.name}|${t.rate}`} className="flex justify-between py-1"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{money(t.total)}</dd></div>)}
                                    {Number(v.adjustment) !== 0 && <div className="flex justify-between py-1"><dt>{tr("Adjustment")}</dt><dd className="tabular-nums">{money(v.adjustment)}</dd></div>}
                                    <div className="mt-1 flex justify-between border-t py-2 text-base font-semibold"><dt>{tr("Total")}</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
                                    </dl>
                                </div>
                            </div>
                        </AccordionCard>

                        <AccordionCard title={tr("Proposal text")} dot="#f59e0b" note={tr("What the client reads")} open={open.text} onToggle={() => toggle('text')}>
                            <div className="p-4">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-gray-500">{tr("The items table goes where you put")} <code>{tr("{proposal_items}")}</code>{tr("; without it the table is added at the end.")}</p>
                                    <div className="flex flex-wrap gap-1.5">{['proposal_items', 'proposal_number', 'proposal_total', 'proposal_open_till', 'proposal_proposal_to', 'company_name'].map((t) => <button key={t} type="button" onClick={() => visual.current?.insert(`{${t}}`)} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary dark:bg-gray-700">{`{${t}}`}</button>)}</div>
                                </div>
                                <VisualEditor ref={visual} autoHeight docKey={`proposal-${id || 'new'}-${lang}`} value={v.content} onChange={(html) => setV((s) => ({ ...s, content: html }))} />
                            </div>
                        </AccordionCard>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-24">
                        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-1 flex items-center justify-between gap-2"><label className="form-label">{tr("Made for *")}</label><Segment size="sm" value={v.relType} onChange={(t) => t && set({ relType: t, relId: null })}><Segment.Item value="customer">{tr("Client")}</Segment.Item><Segment.Item value="lead">{tr("Lead")}</Segment.Item></Segment></div>
                            <RelationSelect key={v.relType} resource={v.relType === 'lead' ? 'leads' : 'clients'} value={v.relId} onChange={(rid) => { set({ relId: rid }); if (rid) fill(v.relType, rid) }} />
                            <div className="mt-3 flex flex-wrap items-end gap-2">
                                <div className="min-w-[115px] flex-1"><label className="form-label mb-1 block">{tr("Currency")}</label><Select options={lookups.currencies.map((c) => ({ value: c.id, label: c.name }))} value={lookups.currencies.filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                                <div className="min-w-[150px] flex-1"><label className="form-label mb-1 block">{tr("Assigned to")}</label><Select isClearable options={(base.staff || []).map((s) => ({ value: s.id, label: s.name }))} value={(base.staff || []).filter((s) => s.id === v.assignedId).map((s) => ({ value: s.id, label: s.name }))[0] || null} onChange={(o) => set({ assignedId: o?.value || null })} /></div>
                                <div className="min-w-[130px] flex-1"><label className="form-label mb-1 block">{tr("Proposal date")}</label><Input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} /></div>
                                <div className="min-w-[130px] flex-1"><label className="form-label mb-1 block">{tr("Open until")}</label><Input type="date" value={v.openTill} onChange={(e) => set({ openTill: e.target.value })} /></div>
                            </div>
                        </div>

                        <AccordionCard title={tr("Prepared for")} dot="#8b5cf6" note={[v.proposalTo, v.email].filter(Boolean).join(" · ") || undefined} open={open.to} onToggle={() => toggle('to')}>
                            <div className="flex flex-wrap items-end gap-2 p-3">
                                <div className="w-full"><label className="form-label mb-1 block">{tr("Name / company *")}</label><Input value={v.proposalTo} onChange={(e) => set({ proposalTo: e.target.value })} /></div>
                                <div className="min-w-[160px] flex-[2]"><label className="form-label mb-1 block">{tr("Email")}</label><Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} /></div>
                                <div className="min-w-[120px] flex-1"><label className="form-label mb-1 block">{tr("Phone")}</label><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                                <div className="w-full"><label className="form-label mb-1 block">{tr("Address")}</label><Input value={v.address} onChange={(e) => set({ address: e.target.value })} /></div>
                                <div className="min-w-[110px] flex-1"><label className="form-label mb-1 block">{tr("City")}</label><Input value={v.city} onChange={(e) => set({ city: e.target.value })} /></div>
                                <div className="min-w-[110px] flex-1"><label className="form-label mb-1 block">{tr("State")}</label><Input value={v.state} onChange={(e) => set({ state: e.target.value })} /></div>
                                <div className="min-w-[80px] flex-1"><label className="form-label mb-1 block">{tr("ZIP")}</label><Input value={v.zip} onChange={(e) => set({ zip: e.target.value })} /></div>
                                <div className="min-w-[150px] flex-[2]"><label className="form-label mb-1 block">{tr("Country")}</label><Select isClearable options={base.countries || []} value={(base.countries || []).find((o) => o.value === v.country) || null} onChange={(o) => set({ country: o ? o.value : null })} /></div>
                            </div>
                        </AccordionCard>

                        <AccordionCard title={tr("Discount")} dot="#ef4444" note={discOn && totals.discountTotal > 0 ? `-${money(totals.discountTotal)}` : undefined} open={discOn} right={<Switcher checked={discOn} onChange={(on) => { setDisc(on); if (!on) set({ discountPercent: 0, discountFixed: 0 }) }} />}>
                            <div className="flex flex-wrap items-end gap-2 p-3">
                                <div className="min-w-[80px] flex-1"><label className="form-label mb-1 block">{tr("Discount %")}</label><Input type="number" step="any" value={v.discountPercent} onChange={num('discountPercent')} /></div>
                                <div className="min-w-[100px] flex-1"><label className="form-label mb-1 block">{tr("Fixed discount")}</label><Input type="number" step="0.01" value={v.discountFixed} disabled={Number(v.discountPercent) > 0} onChange={num('discountFixed')} /></div>
                                <div className="w-full"><label className="form-label mb-1 block">{tr("Discount applies")}</label><Select options={[{ value: 'before_tax', label: tr("Before tax") }, { value: 'after_tax', label: tr("After tax") }]} value={{ value: v.discountType, label: v.discountType === 'after_tax' ? tr("After tax") : tr("Before tax") }} onChange={(o) => set({ discountType: o?.value || 'before_tax' })} /></div>
                            </div>
                        </AccordionCard>

                        <AccordionCard title={tr("Repeating")} dot="#06b6d4" open={Number(v.recurring) > 0} right={<Switcher checked={Number(v.recurring) > 0} onChange={(on) => set({ recurring: on ? 1 : 0 })} />}>
                            <div className="flex flex-wrap items-end gap-2 p-3">
                                <div className="min-w-[80px] flex-1"><label className="form-label mb-1 block">{tr("Repeat every")}</label><Input type="number" min={1} max={365} value={v.recurring} onChange={(e) => set({ recurring: e.target.value })} /></div>
                                <div className="min-w-[110px] flex-1"><Select isSearchable={false} options={RECUR_UNITS()} value={RECUR_UNITS().find((o) => o.value === v.recurringType)} onChange={(o) => set({ recurringType: o.value })} /></div>
                                <div className="w-full"><label className="form-label mb-1 block">{tr("Stop after (copies)")}</label><Input type="number" min={0} placeholder={tr("Never")} value={v.cycles || ''} onChange={(e) => set({ cycles: e.target.value })} /></div>
                                <p className="w-full text-xs text-gray-400">{tr("The invoice made from this proposal repeats with these options.")}</p>
                            </div>
                        </AccordionCard>

                        <AccordionCard title={tr("Allow comments")} dot="#6b7280" right={<Switcher checked={v.allowComments} onChange={(c) => set({ allowComments: c })} />} />
                        <AccordionCard title={tr("Expiry reminder")} dot="#6b7280" right={<Switcher checked={v.remindClient !== false} onChange={(c) => set({ remindClient: c })} />} />
                    </div>
                </div>

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

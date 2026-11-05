import { useMemo, useState } from 'react'
import { TbPlus, TbX, TbPackage, TbRepeat, TbCash, TbCalendarStats, TbInfinity } from 'react-icons/tb'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import cn from '@/utils/classNames'
import { OFFER_KINDS, BILLING, OPTION_BILLING, TERMS, NOTICES, OPTION_PRESETS, OFFER_PACKS, cleanOffer, offerTotals } from '@/lib/crm/ideaOffer'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>
const fmt = (n) => { const x = Number(n || 0); return x.toLocaleString('fr-FR', { minimumFractionDigits: Math.round(x * 100) % 100 ? 2 : 0, maximumFractionDigits: 2 }).replace(/ | /g, ' ') }
const BILL_SHORT = { one_shot: '', monthly: '/ month', quarterly: '/ 3 months', yearly: '/ year' }
const uid = () => `o${Math.random().toString(36).slice(2, 8)}`
const presetOf = (key) => OPTION_PRESETS.flatMap((g) => g.items).find((i) => i[0] === key)
const optionFrom = (key) => { const p = presetOf(key); return { id: uid(), key, label: tr(p[1]), billing: p[2], price: 0, qty: 1, on: true } }
const EMPTY = { kind: 'service', billing: 'one_shot', term: 0, price: 0, setupFee: 0, discountPct: 0, noticeMonths: 0, options: [] }

/** One line of the summary shown on the closed accordion: what is sold and what it costs. */
export const offerSummary = (offer, cur) => {
    const o = cleanOffer(offer)
    if (!o) return ''
    const t = offerTotals(o)
    const sym = cur?.symbol || cur?.name || ''
    const kind = tr(OFFER_KINDS.find(([k]) => k === o.kind)?.[1] || 'Other').replace(/ \(.*\)$/, '')
    const parts = [kind]
    if (t.recurring) parts.push(`${fmt(t.monthly)} ${sym} ${tr('/ month')}`.trim())
    if (t.oneOff) parts.push(`${fmt(t.oneOff)} ${sym} ${tr('once')}`.trim())
    if (t.recurring) parts.push(o.term === 0 ? tr('open contract') : tr(TERMS.find(([k]) => k === o.term)?.[1] || ''))
    if (o.options.filter((x) => x.on).length) parts.push(tr('{n} option(s)', { n: o.options.filter((x) => x.on).length }))
    return parts.join(' · ')
}

const Tile = ({ icon, label, value, sub, tone }) => (
    <div className={cn('rounded-xl border p-2.5', tone || 'border-gray-200 dark:border-gray-600')}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{icon}{label}</div>
        <div className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
)

/**
 * The offer of an idea: a simple price, or a detailed offer (what is sold, one price or recurring, contract length, setup fee, discount and the options
 * on top: domain, server, maintenance, support...) with the totals worked out as it is built. `price` / `onPrice` is the simple price.
 */
const OfferEditor = ({ offer, onChange, price, onPrice, currency, readOnly }) => {
    const detailed = !!offer
    const o = offer || EMPTY
    const [pick, setPick] = useState(null)
    const sym = currency?.symbol || currency?.name || ''
    const t = useMemo(() => offerTotals(o), [o])
    const set = (p) => onChange({ ...o, ...p })
    const recurring = o.billing !== 'one_shot'
    const setBilling = (billing) => set({ billing, term: billing === 'one_shot' ? 0 : o.term || 1 })
    const setOption = (id, p) => set({ options: o.options.map((x) => (x.id === id ? { ...x, ...p } : x)) })
    const addOption = (x) => set({ options: [...o.options, x] })
    const groupedOptions = OPTION_PRESETS.map((g) => ({ label: tr(g.group), options: g.items.filter(([k]) => !o.options.some((x) => x.key === k)).map(([k, label]) => ({ value: k, label: tr(label) })) })).filter((g) => g.options.length)
    const usePack = (p) => onChange({ ...EMPTY, kind: p.kind, billing: p.billing, term: p.term, price: Number(price) || 0, options: p.options.map(optionFrom) })
    const unit = recurring ? tr(BILL_SHORT[o.billing]) : ''

    return (
        <div className="space-y-3">
            <Segment value={detailed ? 'detail' : 'simple'} onChange={(v) => { const x = Array.isArray(v) ? v[0] : v; if (readOnly) return; if (x === 'simple') onChange(null); else if (!detailed) onChange({ ...EMPTY, price: Number(price) || 0 }) }} className="w-full">
                <Segment.Item value="simple" className="flex-1"><span className="inline-flex items-center gap-1"><TbCash />{tr('Simple price')}</span></Segment.Item>
                <Segment.Item value="detail" className="flex-1"><span className="inline-flex items-center gap-1"><TbPackage />{tr('Detailed offer')}</span></Segment.Item>
            </Segment>

            {!detailed && (
                <div className="grid gap-3 sm:grid-cols-3">
                    <div><L>{tr('Price (optional)')}</L><Input type="number" min="0" disabled={readOnly} value={price} onChange={(e) => onPrice(e.target.value)} /></div>
                </div>
            )}

            {detailed && (
                <>
                    {!readOnly && (
                        <div>
                            <L>{tr('Start from a ready-made offer')}</L>
                            <div className="flex flex-wrap gap-1.5">
                                {OFFER_PACKS.map((p) => <button key={p.key} type="button" onClick={() => usePack(p)} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300">{tr(p.label)}</button>)}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-3">
                        <div><L>{tr('What we sell')}</L><Select size="sm" isSearchable={false} isDisabled={readOnly} options={OFFER_KINDS.map(([value, label]) => ({ value, label: tr(label) }))} value={OFFER_KINDS.filter(([k]) => k === o.kind).map(([value, label]) => ({ value, label: tr(label) }))[0]} onChange={(x) => set({ kind: x.value })} /></div>
                        <div><L>{tr('How it is billed')}</L>
                            <Segment value={o.billing} onChange={(v) => !readOnly && setBilling(Array.isArray(v) ? v[0] : v)} className="w-full">
                                {BILLING.map(([k, label]) => <Segment.Item key={k} value={k} className="flex-1"><span className="text-xs">{k === 'one_shot' ? tr('Once') : k === 'monthly' ? tr('Monthly') : k === 'quarterly' ? tr('Quarterly') : tr('Yearly')}</span></Segment.Item>)}
                            </Segment>
                            <p className="mt-1 text-[11px] text-gray-400">{tr(BILLING.find(([k]) => k === o.billing)?.[1])}</p>
                        </div>
                    </div>

                    {recurring && (
                        <div>
                            <L>{tr('Contract length')}</L>
                            <div className="flex flex-wrap gap-1.5">
                                {TERMS.map(([k, label]) => (
                                    <button key={k} type="button" disabled={readOnly} onClick={() => set({ term: k })} aria-pressed={o.term === k} className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1 transition', o.term === k ? 'bg-primary text-white ring-primary' : 'bg-white text-gray-600 ring-gray-200 hover:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600')}>{k === 0 && <TbInfinity className="me-1 inline" />}{tr(label)}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-2"><L>{recurring ? `${tr('Price')} ${unit}` : tr('Price')} ({sym})</L><Input type="number" min="0" disabled={readOnly} value={o.price || ''} onChange={(e) => set({ price: e.target.value })} /></div>
                        {recurring && <div><L>{tr('Setup fee, once')}</L><Input type="number" min="0" disabled={readOnly} value={o.setupFee || ''} onChange={(e) => set({ setupFee: e.target.value })} /></div>}
                        <div><L>{tr('Discount %')}</L><Input type="number" min="0" max="100" disabled={readOnly} value={o.discountPct || ''} onChange={(e) => set({ discountPct: e.target.value })} /></div>
                        {recurring && o.term === 0 && <div><L>{tr('Notice to stop')}</L><Select size="sm" isSearchable={false} isDisabled={readOnly} options={NOTICES.map((n) => ({ value: n, label: n ? tr('{n} month(s)', { n }) : tr('None') }))} value={{ value: o.noticeMonths || 0, label: o.noticeMonths ? tr('{n} month(s)', { n: o.noticeMonths }) : tr('None') }} onChange={(x) => set({ noticeMonths: x.value })} /></div>}
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between"><L>{tr('Options and extras')}</L>{!readOnly && <Button size="xs" icon={<TbPlus />} onClick={() => addOption({ id: uid(), key: '', label: '', billing: 'monthly', price: 0, qty: 1, on: true })}>{tr('Your own option')}</Button>}</div>
                        {o.options.length > 0 && (
                            <div className="mb-2 space-y-1.5">
                                {o.options.map((x) => (
                                    <div key={x.id} className={cn('grid grid-cols-[auto_minmax(0,1fr)_7.5rem_5.5rem_3.5rem_auto] items-center gap-1.5 rounded-lg bg-gray-50 p-1.5 dark:bg-gray-700/40', !x.on && 'opacity-50')}>
                                        <Switcher checked={x.on} disabled={readOnly} onChange={(c) => setOption(x.id, { on: c })} />
                                        <Input size="sm" disabled={readOnly} value={x.label} placeholder={tr('Name of the option')} onChange={(e) => setOption(x.id, { label: e.target.value })} />
                                        <Select size="sm" isSearchable={false} isDisabled={readOnly} options={OPTION_BILLING.map(([value]) => ({ value, label: value === 'one_shot' ? tr('Once') : value === 'monthly' ? tr('Monthly') : tr('Yearly') }))} value={{ value: x.billing, label: x.billing === 'one_shot' ? tr('Once') : x.billing === 'monthly' ? tr('Monthly') : tr('Yearly') }} onChange={(s) => setOption(x.id, { billing: s.value })} />
                                        <Input size="sm" type="number" min="0" disabled={readOnly} value={x.price || ''} placeholder={sym || '0'} onChange={(e) => setOption(x.id, { price: e.target.value })} />
                                        <Input size="sm" type="number" min="1" disabled={readOnly} value={x.qty} title={tr('Quantity')} onChange={(e) => setOption(x.id, { qty: e.target.value })} />
                                        {!readOnly && <button type="button" aria-label={tr('Remove')} onClick={() => set({ options: o.options.filter((y) => y.id !== x.id) })} className="text-gray-400 hover:text-red-500"><TbX /></button>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!readOnly && groupedOptions.length > 0 && (
                            <Select size="sm" isSearchable placeholder={tr('Add an option: domain, server, maintenance, support...')} options={groupedOptions} value={pick} onChange={(x) => { if (x) { addOption(optionFrom(x.value)); setPick(null) } }} />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Tile icon={<TbCash />} label={tr('Paid once')} value={`${fmt(t.oneOff)} ${sym}`} />
                        <Tile icon={<TbRepeat />} label={tr('Per month')} value={`${fmt(t.monthly)} ${sym}`} sub={t.recurring ? `${fmt(t.monthly * 12)} ${sym} ${tr('per year')}` : tr('nothing recurring')} />
                        <Tile icon={<TbCalendarStats />} label={tr('First year')} value={`${fmt(t.firstYear)} ${sym}`} tone="border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10" />
                        <Tile icon={o.term === 0 && recurring ? <TbInfinity /> : <TbPackage />} label={t.contract != null ? tr('Whole contract') : tr('Contract')} value={t.contract != null ? `${fmt(t.contract)} ${sym}` : t.open ? tr('Open') : '—'} sub={t.contract != null ? tr('{n} months', { n: t.months }) : t.open ? (o.noticeMonths ? tr('{n} month(s) notice', { n: o.noticeMonths }) : tr('stop at any time')) : tr('no contract')} />
                    </div>
                    <p className="text-[11px] text-gray-400">{tr('The price of the idea follows this offer: it is the first year (everything paid once + 12 months of what recurs).')}</p>
                </>
            )}
        </div>
    )
}

export default OfferEditor

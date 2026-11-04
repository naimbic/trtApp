import { useCallback, useEffect, useState } from 'react'
import { StatTile, TileGrid, StatusPills } from '@/components/crm/ListHeader'
import { TbFileCertificate, TbClockExclamation, TbCoins, TbSignature } from 'react-icons/tb'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch, TbFolderPlus } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import { api, qs, useCan } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'
import { useClientLookups, makeMoney } from '../clients/shared'
import { fmtDate } from './shared'
import { useDocMenu } from './DocMenu'
import { InvoiceHead, DocChart, shortMoney, sumOf } from './InvoiceInsights'
import GroupedAccordions, { GroupDialog, NONE, colorOf } from '../kit/GroupedAccordions'
import PeriodPicker, { periodRange } from '../kit/PeriodPicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Switcher from '@/components/ui/Switcher'
import { notify } from '../kit/api'
import { tr } from '@/utils/t'

export const STATE = {
    active: { label: tr("Active"), cls: 'bg-emerald-100 text-emerald-700' },
    expiring: { label: tr("About to expire"), cls: 'bg-amber-100 text-amber-700' },
    expired: { label: tr("Expired"), cls: 'bg-red-100 text-red-700' },
    trash: { label: tr("Trash"), cls: 'bg-gray-200 text-gray-600' },
}
export const StateTag = ({ state }) => <Tag className={STATE[state]?.cls}>{STATE[state]?.label || state}</Tag>

const ContractsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const baseCur = lookups.currencies.find((c) => c.isDefault)?.id
    const [data, setData] = useState({ list: [], total: 0, stats: { counts: {}, types: [] } })
    const [state, setState] = useState(null)
    const [clientId, setClientId] = useState(null)
    const [typeId, setTypeId] = useState(null)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [period, setPeriod] = useState({ preset: 'month', from: '', to: '' }) // this month by default: the contracts that start in it
    const [groupDlg, setGroupDlg] = useState(null)
    const [delGroup, setDelGroup] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        setLoading(true)
        try { setData(await api(`/api/crm/sales/contracts?${qs({ query, state, clientId, typeId, ...periodRange(period), pageIndex: 1, pageSize: 500, sortKey: 'dateStart', order: 'desc' })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, state, clientId, typeId, period])
    useEffect(() => { load() }, [load])

    const doc = useDocMenu({
        path: '/crm/contracts', apiBase: '/api/crm/sales/contracts', perm: 'contracts', name: (r) => `${r.subject} · ${r.client}`,
        canEdit: (r) => r.state !== 'trash',
        lock: { when: (r) => !!r.signed },
        extra: (r, { act, guard, superAdmin }) => [
            ...(can('contracts', 'edit') && r.state !== 'trash' && (!r.signed || superAdmin) ? [{ label: r.signed ? tr("Mark as unsigned") : tr("Mark as signed"), icon: <TbSignature />, onClick: guard(r, (force) => act(() => api(`/api/crm/sales/contracts/${r.id}/actions`, { method: 'POST', body: { action: r.signed ? 'unsign' : 'sign', force } }), r.signed ? tr("Marked as unsigned") : tr("Marked as signed"))) }] : []),
            ...(can('contracts', 'edit') && r.state === 'trash' ? [{ label: tr("Restore"), icon: <TbFileCertificate />, onClick: () => act(() => api(`/api/crm/sales/contracts/${r.id}/actions`, { method: 'POST', body: { action: 'restore' } }), tr("Restored")) }] : []),
        ],
        remove: (r, force) => api(`/api/crm/sales/contracts/${r.id}/actions`, { method: 'POST', body: { action: 'trash', force } }),
    }, load)

    const st = data.stats
    const typeOptions = (st.types || []).map((t) => ({ value: t.id, label: t.name }))

    // the groups: one per contract type (and the contracts without a type), in the order of the types
    const groups = [...(st.types || []).map((t) => ({ id: t.id, name: t.name, color: colorOf(t.color), items: data.list.filter((c) => c.typeId === t.id), sub: (() => { const v = data.list.filter((c) => c.typeId === t.id).reduce((n, c) => n + (c.value || 0), 0); return v ? money(v, baseCur, { decimals: 0 }) : '' })() })), { id: NONE, name: tr('No type'), color: 'slate', locked: true, items: data.list.filter((c) => !c.typeId || !(st.types || []).some((t) => t.id === c.typeId)) }]
        .filter((g) => !g.locked || g.items.length)
        .filter((g) => !typeId || g.id === typeId)
    const move = async ({ item, to }) => {
        if (to === NONE) return notify('warning', tr('Choose a contract type'))
        if (item.signed) return notify('warning', tr('A signed contract keeps its type'))
        setData((d) => ({ ...d, list: d.list.map((c) => (c.id === item.id ? { ...c, typeId: to } : c)) }))
        try { await api('/api/crm/sales/contracts/move', { method: 'POST', body: { ids: [item.id], typeId: to } }) } catch (e) { notify('danger', e.message) } finally { load() }
    }
    const reorderTypes = async (ids) => { try { await api('/api/crm/sales/contracts/types', { method: 'PATCH', body: { ids } }) } catch (e) { notify('danger', e.message) } finally { load() } }
    const saveType = async () => {
        try { await api('/api/crm/sales/contracts/types', { method: groupDlg.id ? 'PUT' : 'POST', body: groupDlg }); setGroupDlg(null); load() } catch (e) { notify('danger', e.message) }
    }
    const removeType = async () => { const g = delGroup; setDelGroup(null); try { await api(`/api/crm/sales/contracts/types?id=${g.id}`, { method: 'DELETE' }); notify('success', tr('Contract type deleted')); load() } catch (e) { notify('danger', e.message) } }

    return (
        <Container>
            <InvoiceHead
                title={tr("Contracts")}
                action={can('contracts', 'create') && <Button variant="solid" icon={<TbPlus />} data-href={'/crm/contracts/new'} onClick={() => navigate('/crm/contracts/new')}>{tr("New contract")}</Button>}
                stats={[
                    { icon: <TbFileCertificate />, label: tr("Active"), value: String(data.stats.counts?.active ?? 0), badge: (data.stats.counts?.expiring ?? 0) ? <span className="badge badge--butter">{tr("{n} expiring", { n: data.stats.counts.expiring })}</span> : null },
                    { icon: <TbCoins />, label: tr("Value of live contracts"), value: money(data.stats.activeValue, baseCur, { decimals: 0 }) },
                    { icon: <TbSignature />, label: tr("Waiting for a signature"), value: String(data.stats.unsigned || 0) },
                ]}
            />
            <TileGrid>
                <StatTile title={tr("Active")} className="bg-emerald-100" value={st.counts?.active ?? 0} icon={<TbFileCertificate />} />
                <StatTile title={tr("About to expire")} className={(st.counts?.expiring ?? 0) ? 'bg-amber-100' : 'bg-sky-100'} value={st.counts?.expiring ?? 0} sub={tr("Within 7 days")} icon={<TbClockExclamation />} />
                <StatTile title={tr("Value of live contracts")} className="bg-sky-100" value={money(st.activeValue, baseCur, { decimals: 0 })} icon={<TbCoins />} />
                <StatTile title={tr("Waiting for a signature")} className="bg-purple-100" value={st.unsigned || 0} icon={<TbSignature />} />
            </TileGrid>
            {data.stats.series && <DocChart title={tr("Contract value over time")} sumLabel={tr("started in the last 12 months")} sum={sumOf(data.stats.series, 'value')} series={data.stats.series} money={(v) => money(v, baseCur, { decimals: 0 })} moneyShort={shortMoney(lookups.currencies, baseCur)} cfg={[{ key: 'value', name: tr("Contract value"), tone: 'tomato' }, { key: 'signed', name: tr("Signed"), tone: 'pine', dashed: true }]} />}

            <AdaptiveCard>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><PeriodPicker value={period} onChange={setPeriod} />{can('contracts', 'create') && <Button size="sm" icon={<TbFolderPlus />} onClick={() => setGroupDlg({ name: '', color: 'blue', defaultMonths: '', isActive: true })}>{tr("New type")}</Button>}</div>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="w-52"><Select size="sm" isClearable placeholder={tr("All types")} options={typeOptions} value={typeOptions.find((o) => o.value === typeId) || null} onChange={(o) => setTypeId(o ? o.value : null)} /></div>
                    <div className="w-full sm:w-60"><RelationSelect size="sm" placeholder={tr("Choose a client")} resource="clients" value={clientId} onChange={(v) => setClientId(v)} /></div>
                    <StatusPills inline order={['active', 'expiring', 'expired', 'trash']} labels={Object.fromEntries(['active', 'expiring', 'expired', 'trash'].map((k) => [k, STATE[k].label]))} counts={st.counts} value={state} onChange={(k) => setState(k)} />
                    <div className="w-full sm:w-64"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search subject, client, type")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                {loading && !data.list.length ? <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div> : (
                    <GroupedAccordions storeKey="contracts_open" groups={groups} canDrag={can('contracts', 'edit')} canEdit={can('contracts', 'edit')} canDelete={can('contracts', 'delete')} canAdd={can('contracts', 'create')}
                        forceOpen={!!query || !!clientId || !!state} empty={tr("No contracts found")} groupEmpty={tr("No contract of this type in the period.")}
                        onMove={move} onReorderGroups={reorderTypes}
                        onAdd={(g) => navigate(`/crm/contracts/new?typeId=${g.id}`)}
                        onEdit={(g) => { const t = (st.types || []).find((x) => x.id === g.id); setGroupDlg({ id: g.id, name: g.name, color: g.color, defaultMonths: t?.months || '', isDefault: !!t?.isDefault, isActive: t ? t.active : true }) }}
                        onDelete={setDelGroup}
                        renderRow={(c, { handle }) => (
                            <div className="flex items-center gap-2" data-href={`/crm/contracts/${c.id}`}>
                                {handle}
                                <button type="button" onClick={() => navigate(`/crm/contracts/${c.id}`)} className="min-w-0 flex-1 text-start">
                                    <div className="truncate font-semibold heading-text">{c.subject}</div>
                                    <div className="truncate text-xs text-gray-500">{c.client || '—'}</div>
                                </button>
                                <div className="hidden w-24 shrink-0 text-xs text-gray-500 sm:block">{fmtDate(c.dateStart)}</div>
                                <div className="hidden w-28 shrink-0 text-xs text-gray-500 md:block">{c.dateEnd ? fmtDate(c.dateEnd) : tr("No end")}{c.state === 'expiring' && <span className="ml-1 text-amber-600">{c.daysLeft}d</span>}</div>
                                <div className="w-28 shrink-0 text-end font-bold tabular-nums">{money(c.value, baseCur)}</div>
                                <div className="hidden shrink-0 gap-1 lg:flex"><Tag className={c.signed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.signed ? tr("Signed") : tr("Unsigned")}</Tag><StateTag state={c.state} /></div>
                                {doc.button(c)}
                            </div>
                        )} />
                )}
                <p className="mt-3 text-xs text-gray-400">{data.total} {tr("contracts")}{periodRange(period).from || periodRange(period).to ? ` · ${tr("started in this period")}` : ''}</p>
            </AdaptiveCard>
            <GroupDialog title={groupDlg?.id ? tr("Rename or recolour the group") : tr("New type")} value={groupDlg} onChange={setGroupDlg} onClose={() => setGroupDlg(null)} onSave={saveType}
                extra={groupDlg && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div><label className="form-label mb-1 block">{tr("Length (months)")}</label><Input type="number" min="0" value={groupDlg.defaultMonths ?? ''} placeholder={tr("No end date")} onChange={(e) => setGroupDlg({ ...groupDlg, defaultMonths: e.target.value })} /></div>
                        <div className="flex flex-col justify-end gap-2 text-sm">
                            <label className="flex items-center gap-2"><Switcher checked={!!groupDlg.isDefault} onChange={(v) => setGroupDlg({ ...groupDlg, isDefault: v })} />{tr("Default for new contracts")}</label>
                            <label className="flex items-center gap-2"><Switcher checked={groupDlg.isActive !== false} onChange={(v) => setGroupDlg({ ...groupDlg, isActive: v })} />{tr("Offered for new contracts")}</label>
                        </div>
                    </div>
                )} />
            <ConfirmDialog isOpen={!!delGroup} type="danger" title={tr("Delete this contract type?")} confirmText={tr("Delete")} onClose={() => setDelGroup(null)} onCancel={() => setDelGroup(null)} onConfirm={removeType}>
                <p>{delGroup?.name}</p><p className="text-sm text-gray-500">{delGroup?.items?.length ? tr("It still has contracts in this period: move them first.") : tr("A type that still has contracts cannot be deleted.")}</p>
            </ConfirmDialog>
            {doc.dialogs}
        </Container>
    )
}

export default ContractsList

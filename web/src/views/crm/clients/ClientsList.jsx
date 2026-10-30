/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbBuilding, TbCircleCheck, TbCoins, TbPlus, TbSearch, TbLayoutGrid, TbTable, TbDownload, TbDots, TbExternalLink, TbPencil, TbHistory, TbFileInvoice, TbMail, TbPhone, TbPower, TbTrash, TbMapPin } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Pagination from '@/components/ui/Pagination'
import RowMenu from '@/components/crm/RowMenu'
import cn from '@/utils/classNames'
import { api, notify, qs, useCan } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { useClientLookups, makeMoney } from './shared'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const TONES = ['butter', 'pine', 'tomato', 'ink']
const toneOf = (s = '') => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return TONES[h % TONES.length] }
const initials = (n = '') => n.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
const SORTS = { company: ['company', 'asc'], newest: ['createdAt', 'desc'], city: ['city', 'asc'] }

/** What a client still owes (first currency with a balance) and how much of what was invoiced is paid. */
const moneyOf = (c) => {
    const rows = Object.entries(c.money || {})
    const owing = rows.find(([, m]) => m.outstanding > 0)
    const any = rows.find(([, m]) => m.invoiced > 0)
    return { owing, share: any ? Math.round((any[1].paid / any[1].invoiced) * 100) : null, late: rows.some(([, m]) => m.overdue > 0) }
}

const ClientsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], total: 0, stats: {} })
    const [status, setStatus] = useState('active')
    const [groupId, setGroupId] = useState(null)
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [sortKey, setSortKey] = useState('company')
    const [view, setView] = useState(() => { try { return localStorage.getItem('clients.view') || 'grid' } catch { return 'grid' } })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [menu, setMenu] = useState(null)
    const [del, setDel] = useState(null)
    const pageSize = view === 'grid' ? 12 : 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const [key, order] = SORTS[sortKey]
    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await api(`/api/crm/customers?${qs({ query, status, groupId, pageIndex: page, pageSize, sortKey: key, order })}`))
            setError('')
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, status, groupId, page, pageSize, key, order])
    useEffect(() => { load() }, [load])

    const setViewSaved = (v) => { setView(v); setPage(1); try { localStorage.setItem('clients.view', v) } catch { /* private mode */ } }
    const toggle = async (c, active) => {
        setData((d) => ({ ...d, list: d.list.map((x) => (x.id === c.id ? { ...x, active } : x)) }))
        try {
            await api(`/api/crm/customers/${c.id}`, { method: 'PATCH', body: { active } })
            notify('success', `${c.company} ${active ? tr("activated") : tr("deactivated")}`)
            load()
        } catch (e) {
            setData((d) => ({ ...d, list: d.list.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)) }))
            notify('danger', e.message)
        }
    }
    const remove = async (c) => { try { await api(`/api/crm/customers/${c.id}`, { method: 'DELETE' }); notify('success', tr("Client deleted")); load() } catch (e) { notify('danger', e.message) } }
    const exportCsv = async () => {
        try {
            const all = await api(`/api/crm/customers?${qs({ query, status, groupId, pageIndex: 1, pageSize: 200, sortKey: key, order })}`)
            const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
            const rows = [[tr("Company"), tr("Contact"), tr("Email"), tr("Phone"), tr("City"), tr("Groups"), tr("Active")], ...all.list.map((c) => [c.company, c.primaryContact?.name, c.primaryContact?.email, c.phone || c.primaryContact?.phone, c.city, c.groups.map((g) => g.name).join(' / '), c.active ? tr("Yes") : tr("No")])]
            const url = URL.createObjectURL(new Blob([`﻿${rows.map((r) => r.map(esc).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' }))
            const a = document.createElement('a'); a.href = url; a.download = `clients-${dayjs().format('YYYY-MM-DD')}.csv`; a.click(); URL.revokeObjectURL(url)
        } catch (e) { notify('danger', e.message) }
    }

    const items = (c) => [
        { label: tr("Open"), icon: <TbExternalLink />, onClick: () => navigate(`/crm/clients/${c.id}`) },
        ...(can('customers', 'edit') ? [{ label: tr("Edit"), icon: <TbPencil />, onClick: () => navigate(`/crm/clients/${c.id}/edit`) }] : []),
        ...(can('invoices', 'create') ? [{ label: tr("New invoice"), icon: <TbFileInvoice />, onClick: () => navigate(`/crm/invoices/new?clientId=${c.id}`) }] : []),
        ...(c.primaryContact?.email ? [{ label: tr("Send an email"), icon: <TbMail />, onClick: () => { window.location.href = `mailto:${c.primaryContact.email}` } }] : []),
        ...((c.phone || c.primaryContact?.phone) ? [{ label: tr("Call"), icon: <TbPhone />, onClick: () => { window.location.href = `tel:${c.phone || c.primaryContact.phone}` } }] : []),
        ...(can('activity_log', 'view') ? [{ label: tr("Activity log"), icon: <TbHistory />, onClick: () => navigate(`/crm/activity/client/${c.id}`) }] : []),
        ...(can('customers', 'edit') ? [{ label: c.active ? tr("Deactivate") : tr("Activate"), icon: <TbPower />, after: true, onClick: () => toggle(c, !c.active) }] : []),
        ...(can('customers', 'delete') ? [{ label: tr("Delete"), icon: <TbTrash />, danger: true, after: true, onClick: () => setDel(c) }] : []),
    ]
    const dots = (c) => (
        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-gray-500 transition hover:rotate-90 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={tr("Actions")} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); setMenu({ row: c, el: e.currentTarget }) }}><TbDots /></button>
    )

    const s = data.stats || {}
    const groupOptions = lookups.groups.map((g) => ({ value: g.id, label: g.name }))
    const sortOptions = [['company', tr("Name A–Z")], ['newest', tr("Newest first")], ['city', tr("City")]].map(([value, label]) => ({ value, label }))
    const base = s.baseCurrencyId || lookups.currencies.find((c) => c.isDefault)?.id
    const pct = s.total ? Math.round((s.active / s.total) * 100) : 0

    const card = (c, i) => {
        const m = moneyOf(c)
        const primary = c.primaryContact
        return (
            <article key={c.id} className="cx-card" style={{ '--i': Math.min(i, 12) }} data-href={`/crm/clients/${c.id}`} onClick={() => navigate(`/crm/clients/${c.id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/crm/clients/${c.id}`) }}>
                <header className="cx-card__top">
                    {c.logoUrl ? <img className="cx-logo" src={c.logoUrl} alt="" loading="lazy" /> : <span className={`cx-logo cx-logo--${toneOf(c.company)}`}>{initials(c.company)}</span>}
                    <span className="cx-card__tools" onClick={(e) => e.stopPropagation()}>{!c.active && <span className="cx-off">{tr("Inactive")}</span>}{dots(c)}</span>
                </header>
                <h3 className="cx-card__name" title={c.company}>{c.company}</h3>
                <p className="cx-card__role">{primary?.name || tr("No contact yet")}{c.city ? <><span> · </span><TbMapPin className="cx-pin" />{c.city}</> : null}</p>
                <dl className="cx-card__facts">
                    <div><dt>{tr("Outstanding")}</dt><dd className={m.late ? 'is-late' : ''}>{m.owing ? money(m.owing[1].outstanding, m.owing[0], { decimals: 0 }) : '—'}</dd></div>
                    <div><dt>{tr("Client since")}</dt><dd>{dayjs(c.createdAt).format('MMM YYYY')}</dd></div>
                </dl>
                <div className="cx-card__health" title={tr("Share of what was invoiced that is paid")}>
                    {m.share === null ? <span className="cx-muted">{tr("No invoices yet")}</span> : (<><span className="cx-meter"><i className={m.late ? 'tomato' : m.share >= 80 ? 'pine' : 'butter'} style={{ transform: `scaleX(${Math.min(100, m.share) / 100})` }} /></span><b>{m.share}%</b></>)}
                </div>
                <footer className="cx-card__foot" onClick={(e) => e.stopPropagation()}>
                    {c.groups.length ? <span className="cx-chip">{c.groups[0].name}{c.groups.length > 1 ? ` +${c.groups.length - 1}` : ''}</span> : <span />}
                    <span className="cx-card__acts">
                        {primary?.email && <a className="cx-ibtn" href={`mailto:${primary.email}`} aria-label={tr("Send an email")}><TbMail /></a>}
                        {(c.phone || primary?.phone) && <a className="cx-ibtn" href={`tel:${c.phone || primary.phone}`} aria-label={tr("Call")}><TbPhone /></a>}
                    </span>
                </footer>
            </article>
        )
    }

    return (
        <Container>
            <InvoiceHead
                title={tr("Clients")}
                action={can('customers', 'create') && <Button variant="solid" icon={<TbPlus />} data-href={'/crm/clients/new'} onClick={() => navigate('/crm/clients/new')}>{tr("New client")}</Button>}
                stats={[
                    { icon: <TbBuilding />, label: tr("Clients in your book"), value: String(s.total ?? '–'), badge: s.newThisWeek ? <span className="badge badge--butter">{tr("+{n} this week", { n: s.newThisWeek })}</span> : null },
                    { icon: <TbCircleCheck />, label: tr("Active clients"), value: String(s.active ?? '–'), badge: s.total ? <span className="badge badge--plain">{pct}%</span> : null },
                    { icon: <TbCoins />, label: tr("Still owed across the book"), value: s.outstanding !== undefined ? money(s.outstanding, base, { decimals: 0 }) : '–', badge: s.overdue > 0 ? <span className="badge badge--tomato">{tr("{a} overdue", { a: money(s.overdue, base, { decimals: 0 }) })}</span> : null },
                ]}
            />
            <div className="cx-tools">
                <Input className="cx-search" size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search company, contact, phone, VAT…")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <Segment size="sm" value={status} onChange={(v) => { if (v) { setStatus(v); setPage(1) } }}>
                    <Segment.Item value="all">{tr("All")}</Segment.Item><Segment.Item value="active">{tr("Active")}</Segment.Item><Segment.Item value="inactive">{tr("Inactive")}</Segment.Item>
                </Segment>
                <div className="w-44"><Select size="sm" isClearable placeholder={tr("All groups")} options={groupOptions} value={groupOptions.find((o) => o.value === groupId) || null} onChange={(o) => { setGroupId(o ? o.value : null); setPage(1) }} /></div>
                <span className="cx-spacer" />
                <div className="w-40"><Select size="sm" isSearchable={false} options={sortOptions} value={sortOptions.find((o) => o.value === sortKey)} onChange={(o) => { setSortKey(o.value); setPage(1) }} /></div>
                <Segment size="sm" value={view} onChange={(v) => v && setViewSaved(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="grid"><span className="inline-flex items-center gap-1"><TbLayoutGrid />{tr("Grid")}</span></Segment.Item>
                    <Segment.Item value="table"><span className="inline-flex items-center gap-1"><TbTable />{tr("Table")}</span></Segment.Item>
                </Segment>
                <Button size="sm" icon={<TbDownload />} onClick={exportCsv}>{tr("Export")}</Button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            {view === 'grid' ? (
                <div className="rp-cx">
                    <div className="cx-grid">{data.list.map((c, i) => card(c, i))}</div>
                    {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No clients found")}</div>}
                </div>
            ) : (
                <AdaptiveCard>
                    <div className="overflow-x-auto">
                        <Table hoverable>
                            <THead><Tr><Th>{tr("Company")}</Th><Th>{tr("Primary contact")}</Th><Th>{tr("Phone")}</Th><Th>{tr("Groups")}</Th><Th className="text-right">{tr("Outstanding")}</Th><Th>{tr("Active")}</Th><Th>{tr("Created")}</Th><Th className="w-12" /></Tr></THead>
                            <TBody>
                                {data.list.map((c) => (
                                    <Tr key={c.id} className="cursor-pointer" data-href={`/crm/clients/${c.id}`} onClick={() => navigate(`/crm/clients/${c.id}`)}>
                                        <Td><div className="flex items-center gap-3">{c.logoUrl ? <img src={c.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" /> : <span className={`cx-logo cx-logo--${toneOf(c.company)} cx-logo--sm`}>{initials(c.company)}</span>}<div className="min-w-0"><div className="truncate font-semibold heading-text">{c.company}</div>{c.city && <div className="truncate text-xs text-gray-500">{c.city}</div>}</div></div></Td>
                                        <Td>{c.primaryContact ? <><div>{c.primaryContact.name}</div><div className="text-xs text-gray-500">{c.primaryContact.email}</div></> : <span className="text-gray-400">—</span>}</Td>
                                        <Td className="whitespace-nowrap">{c.phone || c.primaryContact?.phone || <span className="text-gray-400">—</span>}</Td>
                                        <Td><div className="flex flex-wrap gap-1">{c.groups.length ? c.groups.map((g) => <Tag key={g.id}>{g.name}</Tag>) : <span className="text-gray-400">—</span>}</div></Td>
                                        <Td className="text-right tabular-nums">
                                            {Object.entries(c.money).filter(([, m]) => m.outstanding > 0).map(([cid, m]) => <div key={cid} className={m.overdue > 0 ? 'text-red-500' : ''}>{money(m.outstanding, cid, { decimals: 0 })}</div>)}
                                            {!Object.values(c.money).some((m) => m.outstanding > 0) && <span className="text-gray-400">—</span>}
                                        </Td>
                                        <Td onClick={(e) => e.stopPropagation()}>{can('customers', 'edit') ? <Switcher checked={c.active} onChange={(v) => toggle(c, v)} /> : <Tag>{c.active ? tr("Yes") : tr("No")}</Tag>}</Td>
                                        <Td className="whitespace-nowrap text-gray-500">{dayjs(c.createdAt).format('YYYY-MM-DD')}</Td>
                                        <Td className="text-right" onClick={(e) => e.stopPropagation()}>{dots(c)}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                        {loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                        {!loading && !data.list.length && <div className="py-10 text-center text-gray-400">{tr("No clients found")}</div>}
                    </div>
                </AdaptiveCard>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-gray-500">{data.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, data.total), total: data.total }) : ''}</span>
                <Pagination total={data.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
            </div>

            {menu && <RowMenu anchor={menu.el} items={items(menu.row)} onClose={() => setMenu(null)} />}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this client?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const c = del; setDel(null); remove(c) }}>
                <p>{del?.company}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ClientsList

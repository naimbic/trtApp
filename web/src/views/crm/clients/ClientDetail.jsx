import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbPlus, TbSearch, TbCash, TbCircleCheck, TbBriefcase, TbArrowLeft } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/shared/PasswordInput'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import Pagination from '@/components/ui/Pagination'
import { getResource } from '@/lib/crm/resources'
import ResourceTable from '../kit/ResourceTable'
import RecordDrawer from '../kit/RecordDrawer'
import { api, notify, qs, useCan } from '../kit/api'
import { useClientLookups, makeMoney } from './shared'
import { Timeline, FollowUpDialog } from './ProfileParts'
import { ClientProfileCard, ClientInfoCard, ClientContactsCard, ClientJourneyCard } from './ClientSide'
import { InvoiceHead } from '../sales/InvoiceInsights'
import ClientOverview from './ClientOverview'
import NewTicketDialog from '../tickets/NewTicketDialog'
import ProjectDialog from '../projects/ProjectDialog'
import { tr } from '@/utils/t'

const { TabList, TabNav } = Tabs
const { Tr, Th, Td, THead, TBody } = Table

/** A related list (contacts, invoices, …) with its own create/edit drawer. */
const RelatedTab = ({ cfg, onChanged }) => {
    const navigate = useNavigate()
    const can = useCan()
    const resource = getResource(cfg.resource)
    const [reload, setReload] = useState(0)
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const canCreate = can(resource.feature, 'create') && !resource.readOnly
    const canEdit = can(resource.feature, 'edit') && !resource.readOnly
    const done = () => { setReload((n) => n + 1); onChanged?.() }
    return (
        <>
            <ResourceTable
                resource={resource}
                where={cfg.where}
                reloadKey={reload}
                columns={cfg.columns}
                hideFilters={cfg.hideFilters || ['clientId']}
                onRowClick={(r) => (cfg.openPath ? navigate(cfg.openPath(r)) : setDrawer({ open: true, id: r.id }))}
                toolbar={canCreate && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => (cfg.newPath ? navigate(cfg.newPath) : setDrawer({ open: true, id: null }))}>{tr("New")} {resource.label.toLowerCase()}</Button>}
            />
            <RecordDrawer resource={resource} open={drawer.open} id={drawer.id} initial={cfg.initial} hide={cfg.hide} canEdit={drawer.id ? canEdit : canCreate} canDelete={can(resource.feature, 'delete')} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onSaved={done} onDeleted={done} />
        </>
    )
}

const PaymentsTab = ({ id, money }) => {
    const [d, setD] = useState({ list: [], total: 0, modes: [] })
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [query, setQuery] = useState('')
    const [q, setQ] = useState('')
    const [mode, setMode] = useState(null)
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    useEffect(() => { const t = setTimeout(() => { setQ(query.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [query])
    useEffect(() => {
        setLoading(true)
        api(`/api/crm/customers/${id}/payments?${qs({ pageIndex: page, pageSize, query: q, mode: mode?.value, from, to })}`).then(setD).catch(() => {}).finally(() => setLoading(false))
    }, [id, page, pageSize, q, mode, from, to])
    const sizes = [10, 25, 50, 100].map((n) => ({ value: n, label: `${n} / page` }))
    return (
        <div>
            <div className="mb-4 flex items-center gap-2">
                <div className="w-52 shrink-0"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search payments")} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
                <div className="min-w-[7rem] max-w-[11rem] flex-1"><Select size="sm" isClearable placeholder={tr("Payment mode")} options={d.modes || []} value={mode} onChange={(o) => { setMode(o); setPage(1) }} menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: (b) => ({ ...b, zIndex: 10000 }) }} /></div>
                <div className="w-36 shrink-0"><Input size="sm" type="date" title={tr("From")} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} /></div>
                <div className="w-36 shrink-0"><Input size="sm" type="date" title={tr("To")} value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} /></div>
            </div>
            <div className="overflow-x-auto">
                <Table hoverable>
                    <THead><Tr><Th>{tr("Date")}</Th><Th>{tr("Invoice")}</Th><Th>{tr("Payment mode")}</Th><Th>{tr("Transaction")}</Th><Th className="text-right">{tr("Amount")}</Th></Tr></THead>
                    <TBody>
                        {d.list.map((p) => (
                            <Tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/crm/invoices/${p.invoiceId}`)}>
                                <Td>{p.paymentDate ? dayjs(p.paymentDate).format('YYYY-MM-DD') : ''}</Td><Td className="font-semibold heading-text">{p.invoiceNumber}</Td><Td>{p.mode}</Td><Td>{p.transactionId}</Td><Td className="text-right tabular-nums">{money(p.amount, p.currencyId)}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {loading && !d.list.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                {!loading && !d.list.length && <div className="py-10 text-center text-gray-400">{tr("No payments found")}</div>}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-gray-500">{d.total ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, d.total), total: d.total }) : ''}</span>
                <div className="flex items-center gap-3">
                    <Pagination total={d.total} pageSize={pageSize} currentPage={page} onChange={setPage} />
                    <div className="w-32"><Select size="sm" isSearchable={false} options={sizes} value={sizes.find((s) => s.value === pageSize)} onChange={(o) => { setPageSize(o.value); setPage(1) }} menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: (b) => ({ ...b, zIndex: 10000 }) }} /></div>
                </div>
            </div>
        </div>
    )
}

const ClientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [c, setC] = useState(null)
    const [error, setError] = useState('')
    const [tab, setTab] = useState('overview')
    const [cur, setCur] = useState(null)
    const [confirmDel, setConfirmDel] = useState(false)
    const [profile, setProfile] = useState(null)
    const [followUp, setFollowUp] = useState(null)
    const [ticketDialog, setTicketDialog] = useState(false)
    const [projectDialog, setProjectDialog] = useState(false)
    const [ticketLk, setTicketLk] = useState({ departments: [], priorities: [], staff: [] })

    const load = useCallback(() => api(`/api/crm/customers/${id}`).then((d) => { setC(d); setError(''); setCur((x) => x || Object.keys(d.money)[0] || null) }).catch((e) => setError(e.message)), [id])
    const loadProfile = useCallback(() => api(`/api/crm/customers/${id}/profile`).then(setProfile).catch(() => {}), [id])
    useEffect(() => { load(); loadProfile() }, [load, loadProfile])
    useEffect(() => { if (ticketDialog && !ticketLk.departments.length) api('/api/crm/support/tickets/lookups').then(setTicketLk).catch(() => {}) }, [ticketDialog]) // eslint-disable-line react-hooks/exhaustive-deps

    const tabs = useMemo(() => {
        if (!c) return []
        const where = { clientId: id }
        const rel = (key, label, count, feature, rel) => ({ key, label, count, feature, rel })
        const cols = (r) => getResource(r).columns.filter((x) => x.key !== 'clientId')
        return [
            { key: 'overview', label: tr("Overview") },
            rel('invoices', tr("Invoices"), c.counts.invoices, 'invoices', { resource: 'invoices', where, openPath: (r) => `/crm/invoices/${r.id}`, newPath: `/crm/invoices/new?clientId=${id}`, columns: cols('invoices') }),
            { key: 'payments', label: tr("Payments"), feature: 'payments' },
            rel('contracts', tr("Contracts"), c.counts.contracts, 'contracts', { resource: 'contracts', where, openPath: (r) => `/crm/contracts/${r.id}`, newPath: `/crm/contracts/new?clientId=${id}`, columns: cols('contracts') }),
            rel('estimates', tr("Estimates"), c.counts.estimates, 'estimates', { resource: 'estimates', where, openPath: (r) => `/crm/estimates/${r.id}`, newPath: `/crm/estimates/new?clientId=${id}`, initial: { clientId: id }, hide: ['clientId'], columns: cols('estimates') }),
            rel('proposals', tr("Proposals"), c.counts.proposals, 'proposals', { resource: 'proposals', where: { relType: 'customer', relId: id }, openPath: (r) => `/crm/proposals/${r.id}`, newPath: `/crm/proposals/new?clientId=${id}`, initial: { relType: 'customer', relId: id }, hide: ['relType', 'relId'] }),
            rel('projects', tr("Projects"), c.counts.projects, 'projects', { resource: 'projects', where, openPath: (r) => `/crm/projects/${r.id}`, initial: { clientId: id }, hide: ['clientId'], columns: cols('projects') }),
            rel('tickets', tr("Tickets"), c.counts.tickets, 'tickets', { resource: 'tickets', where, openPath: (r) => `/crm/tickets/${r.id}`, initial: { clientId: id }, hide: ['clientId'], columns: cols('tickets') }),
            { key: 'activity', label: tr("Activity") },
            rel('notes', tr("Notes"), c.counts.notes, undefined, { resource: 'notes', where: { relType: 'customer', relId: id }, initial: { relType: 'customer', relId: id }, hide: ['relType', 'relId'], columns: getResource('notes').columns.filter((x) => x.key !== 'relType') }),
            { key: 'files', label: tr("Files") },
            rel('contacts', tr("Contacts"), c.counts.contacts, 'customers', { resource: 'contacts', where, initial: { clientId: id }, hide: ['clientId'], columns: cols('contacts') }),
        ].filter((t) => !t.feature || can(t.feature, 'view'))
    }, [c, id, can])

    const openAsClient = async (k) => {
        try {
            const r = await api(`/api/crm/customers/${id}/portal-preview`, { method: 'POST', body: { contactId: k.id } })
            window.open(r.url, '_blank')
        } catch (e) { notify('danger', e.message) }
    }
    const [pwFor, setPwFor] = useState(null)
    const [pw, setPw] = useState('')
    const [pwBusy, setPwBusy] = useState(false)
    const makePw = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint32Array(12)); setPw([...r].map((n) => a[n % a.length]).join('')) }
    const savePw = async () => {
        setPwBusy(true)
        try {
            await api(`/api/crm/customers/${id}/portal-password`, { method: 'POST', body: { contactId: pwFor.id, password: pw } })
            try { await navigator.clipboard.writeText(pw) } catch { /* clipboard blocked */ }
            notify('success', tr("Password set for {name}. It was copied: share it with them (they can change it in their profile).", { name: pwFor.name }))
            setPwFor(null); setPw(''); loadProfile()
        } catch (e) { notify('danger', e.message) } finally { setPwBusy(false) }
    }
    const invite = async (k) => {
        try {
            const r = await api(`/api/crm/customers/${id}/portal-invite`, { method: 'POST', body: { contactId: k.id } })
            if (r.sent) notify('success', tr("Email sent to {email}", { email: r.email }))
            else { try { await navigator.clipboard.writeText(r.link) } catch { /* clipboard blocked */ } notify('warning', tr("The email could not be sent ({v1}). The link was copied: send it yourself.", { v1: r.error || 'mail not set up' })) }
            loadProfile()
        } catch (e) { notify('danger', e.message) }
    }

    const remove = async () => {
        try {
            await api(`/api/crm/customers/${id}`, { method: 'DELETE' })
            notify('success', tr("Client deleted"))
            navigate('/crm/clients')
        } catch (e) {
            notify('danger', e.message)
            setConfirmDel(false)
        }
    }

    if (error) return <Container><Card><div className="text-red-500">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/clients')}>{tr("Back to clients")}</Button></Card></Container>
    if (!c) return <Container><div className="py-20 text-center text-gray-400">{tr("Loading…")}</div></Container>

    const actions = {
        edit: () => navigate(`/crm/clients/${id}/edit`),
        activity: () => navigate(`/crm/activity/client/${id}`),
        followUp: () => setFollowUp('reminder'),
        note: () => setFollowUp('note'),
        invoice: () => navigate(`/crm/invoices/new?clientId=${id}`),
        estimate: () => navigate(`/crm/estimates/new?clientId=${id}`),
        proposal: () => navigate(`/crm/proposals/new?clientId=${id}`),
        ticket: () => setTicketDialog(true),
        project: () => setProjectDialog(true),
        remove: () => setConfirmDel(true),
        openAsClient, invite,
        setPassword: (k) => { setPwFor(k); setPw('') },
        manageContacts: () => setTab('contacts'),
        logoChanged: (url) => setC((x) => ({ ...x, logoUrl: url })),
    }

    return (
        <Container>
            <InvoiceHead
                title={tr("Client information")}
                action={<Button size="sm" icon={<TbArrowLeft className="rtl:rotate-180" />} onClick={() => navigate('/crm/clients')}>{tr("Back to clients")}</Button>}
                stats={[
                    { icon: <TbCash />, label: tr("Billed, all time"), value: cur && c.money[cur] ? money(c.money[cur].invoiced, cur, { decimals: 0 }) : '—', badge: cur && c.money[cur] ? <span className="badge badge--butter">{money(c.money[cur].paid, cur, { decimals: 0 })} {tr("paid")}</span> : null },
                    { icon: <TbCircleCheck />, label: tr("Still owed"), value: cur && c.money[cur] ? money(c.money[cur].outstanding, cur, { decimals: 0 }) : '—', badge: cur && c.money[cur]?.overdue > 0 ? <span className="badge badge--tomato">{money(c.money[cur].overdue, cur, { decimals: 0 })} {tr("overdue")}</span> : <span className="badge badge--plain">{tr("Nothing overdue")}</span> },
                    { icon: <TbBriefcase />, label: tr("Projects and tickets"), value: String((c.counts.projects || 0) + (c.counts.tickets || 0)), badge: <span className="badge badge--plain">{c.counts.invoices || 0} {tr("invoices")}</span> },
                ]}
            />
            <div className="pt">
                <div className="pt-col pt-col--sticky">
                    <ClientProfileCard c={c} profile={profile} cur={cur} id={id} can={can} a={actions} />
                    <ClientInfoCard c={c} profile={profile} lookups={lookups} id={id} can={can} onSaved={load} />
                    <ClientContactsCard c={c} profile={profile} can={can} a={actions} />
                </div>
                <div className="pt-col">
                    <ClientJourneyCard profile={profile} />
                    <Card>
                        <Tabs value={tab} onChange={setTab}>
                            <TabList>
                                {tabs.map((t) => <TabNav key={t.key} value={t.key} className="!px-2.5 text-sm">{t.label}{t.count ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{t.count}</span> : null}</TabNav>)}
                            </TabList>
                            <div className="p-4">
                                {tab === 'overview' && <ClientOverview c={c} profile={profile} lookups={lookups} money={money} cur={cur} setCur={setCur} can={can} setTab={setTab} setFollowUp={setFollowUp} loadProfile={loadProfile} id={id} />}
                                {tab === 'activity' && (profile ? <Timeline items={profile.timeline} /> : <p className="py-10 text-center text-gray-400">{tr("Loading…")}</p>)}
                                {tab === 'payments' && <PaymentsTab id={id} money={money} />}
                                {tab === 'files' && <AttachmentsPanel relType="customer" relId={id} canEdit={can('customers', 'edit')} showClientToggle />}
                                {(() => { const t = tabs.find((x) => x.key === tab); return t?.rel ? <RelatedTab key={t.key} cfg={t.rel} onChanged={() => { load(); loadProfile() }} /> : null })()}
                            </div>
                        </Tabs>
                    </Card>
                </div>
            </div>

            <FollowUpDialog key={followUp || 'none'} open={!!followUp} initialType={followUp || 'note'} clientId={id} onClose={() => setFollowUp(null)} onSaved={() => { loadProfile(); load() }} />
            <NewTicketDialog open={ticketDialog} onClose={() => setTicketDialog(false)} lookups={ticketLk} presets={{ clientId: id }} onCreated={(tid) => navigate(`/crm/tickets/${tid}`)} />
            <ProjectDialog open={projectDialog} onClose={() => setProjectDialog(false)} presets={{ clientId: id }} onCreated={(pid) => navigate(`/crm/projects/${pid}`)} />
            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr("Delete this client?")} confirmText={tr("Delete")} onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{c.company} {tr("and its contacts will be removed. Clients that still have invoices, estimates, contracts, projects or tickets cannot be deleted — deactivate them instead.")}</p>
            </ConfirmDialog>
                    <Dialog isOpen={!!pwFor} width={420} onClose={() => setPwFor(null)} onRequestClose={() => setPwFor(null)}>
                <h5 className="mb-1">{tr("Set client area password")}</h5>
                <p className="mb-4 text-sm text-gray-500">{pwFor?.name} · {pwFor?.email}{tr(". They sign in at /portal with their email and this password. Any session they have is closed.")}</p>
                <PasswordInput autoComplete="new-password" placeholder={tr("At least 8 characters")} value={pw} onChange={(e) => setPw(e.target.value)} />
                <div className="mt-2"><button type="button" onClick={makePw} className="text-sm font-semibold text-primary">{tr("Generate a strong password")}</button></div>
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setPwFor(null)}>{tr("Cancel")}</Button><Button variant="solid" loading={pwBusy} disabled={pw.length < 8} onClick={savePw}>{tr("Save password")}</Button></div>
            </Dialog>
</Container>
    )
}

export default ClientDetail

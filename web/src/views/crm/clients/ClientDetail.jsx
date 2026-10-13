import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbPencil, TbPlus, TbTrash, TbFileInvoice } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Segment from '@/components/ui/Segment'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Pagination from '@/components/ui/Pagination'
import { getResource } from '@/lib/crm/resources'
import ResourceTable from '../kit/ResourceTable'
import RecordDrawer from '../kit/RecordDrawer'
import { api, notify, qs, useCan } from '../kit/api'
import { useClientLookups, makeMoney } from './shared'

const { TabList, TabNav, TabContent } = Tabs
const { Tr, Th, Td, THead, TBody } = Table

const Field = ({ label, children }) => (<div><div className="mb-0.5 text-xs uppercase tracking-wide text-gray-400">{label}</div><div>{children || <span className="text-gray-400">—</span>}</div></div>)
const addrLine = (a) => [a.street, [a.zip, a.city].filter(Boolean).join(' '), a.state, a.countryName].filter(Boolean).join(', ')

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
                onRowClick={(r) => (cfg.openPath ? navigate(cfg.openPath(r)) : setDrawer({ open: true, id: r.id }))}
                toolbar={canCreate && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => (cfg.newPath ? navigate(cfg.newPath) : setDrawer({ open: true, id: null }))}>New {resource.label.toLowerCase()}</Button>}
            />
            <RecordDrawer resource={resource} open={drawer.open} id={drawer.id} initial={cfg.initial} hide={cfg.hide} canEdit={drawer.id ? canEdit : canCreate} canDelete={can(resource.feature, 'delete')} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onSaved={done} onDeleted={done} />
        </>
    )
}

const PaymentsTab = ({ id, money }) => {
    const [d, setD] = useState({ list: [], total: 0 })
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    useEffect(() => {
        setLoading(true)
        api(`/api/crm/customers/${id}/payments?${qs({ pageIndex: page, pageSize: 10 })}`).then(setD).catch(() => {}).finally(() => setLoading(false))
    }, [id, page])
    return (
        <div>
            <div className="overflow-x-auto">
                <Table hoverable>
                    <THead><Tr><Th>Date</Th><Th>Invoice</Th><Th>Payment mode</Th><Th>Transaction</Th><Th className="text-right">Amount</Th></Tr></THead>
                    <TBody>
                        {d.list.map((p) => (
                            <Tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/crm/invoices/${p.invoiceId}`)}>
                                <Td>{p.paymentDate ? dayjs(p.paymentDate).format('YYYY-MM-DD') : ''}</Td><Td className="font-semibold heading-text">{p.invoiceNumber}</Td><Td>{p.mode}</Td><Td>{p.transactionId}</Td><Td className="text-right tabular-nums">{money(p.amount, p.currencyId)}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {loading && !d.list.length && <div className="py-10 text-center text-gray-400">Loading…</div>}
                {!loading && !d.list.length && <div className="py-10 text-center text-gray-400">No payments yet</div>}
            </div>
            <div className="mt-4 flex justify-end"><Pagination total={d.total} pageSize={10} currentPage={page} onChange={setPage} /></div>
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
    const [tab, setTab] = useState('profile')
    const [cur, setCur] = useState(null)
    const [confirmDel, setConfirmDel] = useState(false)

    const load = useCallback(() => api(`/api/crm/customers/${id}`).then((d) => { setC(d); setError(''); setCur((x) => x || Object.keys(d.money)[0] || null) }).catch((e) => setError(e.message)), [id])
    useEffect(() => { load() }, [load])

    const tabs = useMemo(() => {
        if (!c) return []
        const where = { clientId: id }
        return [
            { key: 'profile', label: 'Profile' },
            { key: 'contacts', label: 'Contacts', count: c.counts.contacts, rel: { resource: 'contacts', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('contacts').columns.filter((x) => x.key !== 'clientId') }, feature: 'customers' },
            { key: 'invoices', label: 'Invoices', count: c.counts.invoices, rel: { resource: 'invoices', where, openPath: (r) => `/crm/invoices/${r.id}`, newPath: `/crm/invoices/new?clientId=${id}`, columns: getResource('invoices').columns.filter((x) => x.key !== 'clientId') }, feature: 'invoices' },
            { key: 'payments', label: 'Payments', feature: 'payments' },
            { key: 'estimates', label: 'Estimates', count: c.counts.estimates, rel: { resource: 'estimates', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('estimates').columns.filter((x) => x.key !== 'clientId') }, feature: 'estimates' },
            { key: 'proposals', label: 'Proposals', count: c.counts.proposals, rel: { resource: 'proposals', where: { relType: 'customer', relId: id }, initial: { relType: 'customer', relId: id }, hide: ['relType', 'relId'] }, feature: 'proposals' },
            { key: 'contracts', label: 'Contracts', count: c.counts.contracts, rel: { resource: 'contracts', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('contracts').columns.filter((x) => x.key !== 'clientId') }, feature: 'contracts' },
            { key: 'projects', label: 'Projects', count: c.counts.projects, rel: { resource: 'projects', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('projects').columns.filter((x) => x.key !== 'clientId') }, feature: 'projects' },
            { key: 'tickets', label: 'Tickets', count: c.counts.tickets, rel: { resource: 'tickets', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('tickets').columns.filter((x) => x.key !== 'clientId') }, feature: 'tickets' },
            { key: 'notes', label: 'Notes', count: c.counts.notes, rel: { resource: 'notes', where: { relType: 'customer', relId: id }, initial: { relType: 'customer', relId: id }, hide: ['relType', 'relId'], columns: getResource('notes').columns.filter((x) => x.key !== 'relType') } },
        ].filter((t) => !t.feature || can(t.feature, 'view'))
    }, [c, id, can])

    const remove = async () => {
        try {
            await api(`/api/crm/customers/${id}`, { method: 'DELETE' })
            notify('success', 'Client deleted')
            navigate('/crm/clients')
        } catch (e) {
            notify('danger', e.message)
            setConfirmDel(false)
        }
    }

    if (error) return <Container><AdaptiveCard><div className="text-red-500">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/clients')}>Back to clients</Button></AdaptiveCard></Container>
    if (!c) return <Container><div className="py-20 text-center text-gray-400">Loading…</div></Container>

    const m = c.money[cur]
    const currencies = Object.keys(c.money)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => navigate('/crm/clients')} />
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="truncate">{c.company}</h3><Tag className={c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.active ? 'Active' : 'Inactive'}</Tag>{c.groups.map((g) => <Tag key={g.id}>{g.name}</Tag>)}</div>
                    <p className="text-sm text-gray-500">Client since {dayjs(c.createdAt).format('MMM D, YYYY')}{c.vat ? ` · VAT ${c.vat}` : ''}</p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                    {can('invoices', 'create') && <Button size="sm" icon={<TbFileInvoice />} onClick={() => navigate(`/crm/invoices/new?clientId=${id}`)}>New invoice</Button>}
                    {can('customers', 'edit') && <Button size="sm" icon={<TbPencil />} onClick={() => navigate(`/crm/clients/${id}/edit`)}>Edit</Button>}
                    {can('customers', 'delete') && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirmDel(true)}>Delete</Button>}
                </div>
            </div>

            {currencies.length > 0 && (
                <div className="mb-4">
                    {currencies.length > 1 && (
                        <div className="mb-3"><Segment size="sm" value={cur} onChange={(v) => v && setCur(v)}>{currencies.map((k) => <Segment.Item key={k} value={k}>{lookups.currencies.find((x) => x.id === k)?.name || '?'}</Segment.Item>)}</Segment></div>
                    )}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <Card bodyClass="p-4"><div className="text-sm text-gray-500">Invoiced</div><h4 className="mt-1">{money(m?.invoiced, cur)}</h4><div className="text-xs text-gray-500">{m?.invoices} invoices</div></Card>
                        <Card bodyClass="p-4"><div className="text-sm text-gray-500">Paid</div><h4 className="mt-1 text-emerald-600">{money(m?.paid, cur)}</h4></Card>
                        <Card bodyClass="p-4"><div className="text-sm text-gray-500">Outstanding</div><h4 className="mt-1">{money(m?.outstanding, cur)}</h4></Card>
                        <Card bodyClass="p-4"><div className="text-sm text-gray-500">Overdue</div><h4 className={`mt-1 ${m?.overdue > 0 ? 'text-red-500' : ''}`}>{money(m?.overdue, cur)}</h4></Card>
                    </div>
                </div>
            )}

            <AdaptiveCard>
                <Tabs value={tab} onChange={setTab}>
                    <TabList>
                        {tabs.map((t) => <TabNav key={t.key} value={t.key}>{t.label}{t.count ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{t.count}</span> : null}</TabNav>)}
                    </TabList>
                    <div className="pt-5">
                        {tab === 'profile' && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="flex flex-col gap-4">
                                    <h6 className="text-gray-500">Company</h6>
                                    <Field label="Phone">{c.phone}</Field><Field label="Website">{c.website && <a className="text-primary hover:underline" href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">{c.website}</a>}</Field>
                                    <Field label="Default currency">{lookups.currencies.find((x) => x.id === c.currencyId)?.name}</Field><Field label="Language">{c.language}</Field>
                                    <Field label="Customer admins">{c.admins.map((a) => a.name).join(', ')}</Field>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <h6 className="text-gray-500">Address</h6>
                                    <Field label="Address">{addrLine({ street: c.address, city: c.city, state: c.state, zip: c.zip, countryName: c.countryName })}</Field>
                                    <Field label="Billing">{addrLine(c.billing)}</Field><Field label="Shipping">{addrLine(c.shipping)}</Field>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h6 className="text-gray-500">Contacts</h6>
                                    {c.contacts.length ? c.contacts.map((k) => (
                                        <div key={k.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"><div className="flex items-center gap-2 font-semibold">{k.name}{k.isPrimary && <Tag className="bg-blue-100 text-blue-700">Primary</Tag>}{!k.active && <Tag>Inactive</Tag>}</div><div className="text-sm text-gray-500">{[k.title, k.email, k.phone].filter(Boolean).join(' · ')}</div></div>
                                    )) : <span className="text-gray-400">No contacts yet</span>}
                                </div>
                            </div>
                        )}
                        {tab === 'payments' && <PaymentsTab id={id} money={money} />}
                        {(() => { const t = tabs.find((x) => x.key === tab); return t?.rel ? <RelatedTab key={t.key} cfg={t.rel} onChanged={load} /> : null })()}
                    </div>
                </Tabs>
            </AdaptiveCard>

            <ConfirmDialog isOpen={confirmDel} type="danger" title="Delete this client?" confirmText="Delete" onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{c.company} and its contacts will be removed. Clients that still have invoices, estimates, contracts, projects or tickets cannot be deleted — deactivate them instead.</p>
            </ConfirmDialog>
        </Container>
    )
}

export default ClientDetail

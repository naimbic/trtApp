import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbPencil, TbPlus, TbTrash, TbFileInvoice, TbMail, TbPhone, TbFileText, TbPresentation, TbLifebuoy, TbBriefcase, TbNotes, TbBell, TbBrandWhatsapp, TbTargetArrow, TbLogin } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import Tooltip from '@/components/ui/Tooltip'
import ImageUpload from '@/components/crm/ImageUpload'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import PasswordInput from '@/components/shared/PasswordInput'
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
import { Section, LeadJourney, Attention, Engagement, Reminders, Timeline, FollowUpDialog, QuickAction } from './ProfileParts'
import NewTicketDialog from '../tickets/NewTicketDialog'
import ProjectDialog from '../projects/ProjectDialog'

const { TabList, TabNav } = Tabs
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
        return [
            { key: 'overview', label: 'Overview' },
            { key: 'activity', label: 'Activity' },
            { key: 'contacts', label: 'Contacts', count: c.counts.contacts, rel: { resource: 'contacts', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('contacts').columns.filter((x) => x.key !== 'clientId') }, feature: 'customers' },
            { key: 'invoices', label: 'Invoices', count: c.counts.invoices, rel: { resource: 'invoices', where, openPath: (r) => `/crm/invoices/${r.id}`, newPath: `/crm/invoices/new?clientId=${id}`, columns: getResource('invoices').columns.filter((x) => x.key !== 'clientId') }, feature: 'invoices' },
            { key: 'payments', label: 'Payments', feature: 'payments' },
            { key: 'estimates', label: 'Estimates', count: c.counts.estimates, rel: { resource: 'estimates', where, openPath: (r) => `/crm/estimates/${r.id}`, newPath: `/crm/estimates/new?clientId=${id}`, initial: { clientId: id }, hide: ['clientId'], columns: getResource('estimates').columns.filter((x) => x.key !== 'clientId') }, feature: 'estimates' },
            { key: 'proposals', label: 'Proposals', count: c.counts.proposals, rel: { resource: 'proposals', where: { relType: 'customer', relId: id }, openPath: (r) => `/crm/proposals/${r.id}`, newPath: `/crm/proposals/new?clientId=${id}`, initial: { relType: 'customer', relId: id }, hide: ['relType', 'relId'] }, feature: 'proposals' },
            { key: 'contracts', label: 'Contracts', count: c.counts.contracts, rel: { resource: 'contracts', where, initial: { clientId: id }, hide: ['clientId'], columns: getResource('contracts').columns.filter((x) => x.key !== 'clientId') }, feature: 'contracts' },
            { key: 'projects', label: 'Projects', count: c.counts.projects, rel: { resource: 'projects', where, openPath: (r) => `/crm/projects/${r.id}`, initial: { clientId: id }, hide: ['clientId'], columns: getResource('projects').columns.filter((x) => x.key !== 'clientId') }, feature: 'projects' },
            { key: 'tickets', label: 'Tickets', count: c.counts.tickets, rel: { resource: 'tickets', where, openPath: (r) => `/crm/tickets/${r.id}`, initial: { clientId: id }, hide: ['clientId'], columns: getResource('tickets').columns.filter((x) => x.key !== 'clientId') }, feature: 'tickets' },
            { key: 'files', label: 'Files' },
            { key: 'notes', label: 'Notes', count: c.counts.notes, rel: { resource: 'notes', where: { relType: 'customer', relId: id }, initial: { relType: 'customer', relId: id }, hide: ['relType', 'relId'], columns: getResource('notes').columns.filter((x) => x.key !== 'relType') } },
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
            notify('success', `Password set for ${pwFor.name}. It was copied: share it with them (they can change it in their profile).`)
            setPwFor(null); setPw(''); loadProfile()
        } catch (e) { notify('danger', e.message) } finally { setPwBusy(false) }
    }
    const invite = async (k) => {
        try {
            const r = await api(`/api/crm/customers/${id}/portal-invite`, { method: 'POST', body: { contactId: k.id } })
            if (r.sent) notify('success', `Email sent to ${r.email}`)
            else { try { await navigator.clipboard.writeText(r.link) } catch { /* clipboard blocked */ } notify('warning', `The email could not be sent (${r.error || 'mail not set up'}). The link was copied: send it yourself.`) }
            loadProfile()
        } catch (e) { notify('danger', e.message) }
    }

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

    if (error) return <Container><Card><div className="text-red-500">{error}</div><Button className="mt-4" onClick={() => navigate('/crm/clients')}>Back to clients</Button></Card></Container>
    if (!c) return <Container><div className="py-20 text-center text-gray-400">Loading…</div></Container>

    const m = c.money[cur]
    const currencies = Object.keys(c.money)
    const primary = c.contacts.find((k) => k.isPrimary) || c.contacts[0]
    const Info = ({ title, children }) => (children ? <div><span className="font-semibold">{title}</span><p className="heading-text font-bold break-words">{children}</p></div> : null)

    return (
        <Container>
            <div className="flex flex-col gap-4 xl:flex-row">
                <div className="min-w-[330px] 2xl:min-w-[400px]">
                    <Card className="w-full">
                        <div className="flex justify-end">
                            {can('customers', 'edit') && <Tooltip title="Edit client"><button className="close-button button-press-feedback" type="button" onClick={() => navigate(`/crm/clients/${id}/edit`)}><TbPencil /></button></Tooltip>}
                        </div>
                        <div className="mx-auto flex h-full flex-col xl:justify-between 2xl:min-w-[360px]">
                            <div className="mt-6 flex items-center gap-4 xl:flex-col">
                                <ImageUpload url={c.logoUrl} name={c.company} shape="circle" size={90} uploadUrl={`/api/crm/customers/${id}/logo`} canEdit={can('customers', 'edit')} onChange={(url) => setC((x) => ({ ...x, logoUrl: url }))} />
                                <div className="text-center"><h4 className="font-bold">{c.company}</h4><div className="mt-2 flex flex-wrap justify-center gap-1"><Tag className={c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.active ? 'Active' : 'Inactive'}</Tag>{c.groups.map((g) => <Tag key={g.id}>{g.name}</Tag>)}</div>{profile?.lead && <div className="mt-3"><Tag className="gap-1 bg-blue-50 text-blue-700"><TbTargetArrow className="inline" /> Converted from lead{profile.lead.daysToConvert !== null ? ` · ${profile.lead.daysToConvert}d` : ''}</Tag></div>}</div>
                            </div>
                            <div className="mt-10 grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-1">
                                <Info title="Email">{primary?.email}</Info>
                                <Info title="Phone">{c.phone || primary?.phone}</Info>
                                <Info title="Website">{c.website && <a className="text-primary hover:underline" href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">{c.website}</a>}</Info>
                                <Info title="VAT / ICE">{c.vat}</Info>
                                <Info title="Industry">{c.industry}</Info>
                                <Info title="Address">{addrLine({ street: c.address, city: c.city, state: c.state, zip: c.zip, countryName: c.countryName })}</Info>
                                <Info title="Default currency">{lookups.currencies.find((x) => x.id === c.currencyId)?.name}</Info>
                                <Info title="Language">{c.language}</Info>
                                <Info title="Customer admins">{c.admins.map((a) => a.name).join(', ')}</Info>
                                <Info title="Client since">{dayjs(c.createdAt).format('DD MMM YYYY')}</Info>
                                {profile?.lastLogin && <Info title="Last seen in the client area">{dayjs(profile.lastLogin.date).format('DD MMM YYYY, HH:mm')}{profile.lastLogin.ip && <span className="block font-mono text-xs font-normal text-gray-500">IP {profile.lastLogin.ip}</span>}</Info>}
                                {profile?.engagement.total > 0 && <Info title="Opened documents">{profile.engagement.total} view{profile.engagement.total === 1 ? '' : 's'} · last {dayjs(profile.engagement.last).format('DD MMM YYYY')}</Info>}
                            </div>
                            <div className="mt-8">
                                <h6 className="mb-3 text-gray-500">Quick actions</h6>
                                <div className="grid grid-cols-2 gap-2">
                                    {can('customers', 'edit') && <QuickAction icon={<TbBell />} label="Follow up" onClick={() => setFollowUp('note')} />}
                                    {can('invoices', 'create') && <QuickAction icon={<TbFileInvoice />} label="Invoice" onClick={() => navigate(`/crm/invoices/new?clientId=${id}`)} />}
                                    {can('estimates', 'create') && <QuickAction icon={<TbFileText />} label="Estimate" onClick={() => navigate(`/crm/estimates/new?clientId=${id}`)} />}
                                    {can('proposals', 'create') && <QuickAction icon={<TbPresentation />} label="Proposal" onClick={() => navigate(`/crm/proposals/new?clientId=${id}`)} />}
                                    {can('tickets', 'create') && <QuickAction icon={<TbLifebuoy />} label="Ticket" onClick={() => setTicketDialog(true)} />}
                                    {can('projects', 'create') && <QuickAction icon={<TbBriefcase />} label="Project" onClick={() => setProjectDialog(true)} />}
                                    {can('customers', 'edit') && <QuickAction icon={<TbNotes />} label="Add note" onClick={() => setFollowUp('note')} />}
                                    {primary?.email && <QuickAction icon={<TbMail />} label="Email" href={`mailto:${primary.email}`} />}
                                    {(c.phone || primary?.phone) && <QuickAction icon={<TbPhone />} label="Call" href={`tel:${(c.phone || primary.phone).replace(/\s/g, '')}`} />}
                                    {(c.phone || primary?.phone) && <QuickAction icon={<TbBrandWhatsapp />} label="WhatsApp" onClick={() => window.open(`https://wa.me/${(c.phone || primary.phone).replace(/[^0-9]/g, '')}`, '_blank', 'noopener')} />}
                                </div>
                                {can('customers', 'delete') && <Button block className="mt-4" customColorClass={() => 'text-error hover:border-error hover:ring-1 ring-error hover:text-error'} icon={<TbTrash />} onClick={() => setConfirmDel(true)}>Delete client</Button>}
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="w-full min-w-0">
                    <Tabs value={tab} onChange={setTab}>
                        <TabList>
                            {tabs.map((t) => <TabNav key={t.key} value={t.key}>{t.label}{t.count ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs dark:bg-gray-600">{t.count}</span> : null}</TabNav>)}
                        </TabList>
                        <div className="p-4">
                            {tab === 'overview' && (
                                <div className="flex flex-col gap-8">
                                    {currencies.length > 0 ? (
                                        <div>
                                            {currencies.length > 1 && <div className="mb-3"><Segment size="sm" value={cur} onChange={(v) => v && setCur(v)}>{currencies.map((k) => <Segment.Item key={k} value={k}>{lookups.currencies.find((x) => x.id === k)?.name || '?'}</Segment.Item>)}</Segment></div>}
                                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                                <div className="rounded-2xl bg-sky-100 p-4 dark:bg-sky-100/10"><div className="font-bold text-gray-900 dark:text-gray-100">Invoiced</div><h4 className="mt-2">{money(m?.invoiced, cur)}</h4><div className="text-xs text-gray-600 dark:text-gray-400">{m?.invoices} invoices</div></div>
                                                <div className="rounded-2xl bg-emerald-100 p-4 dark:bg-emerald-100/10"><div className="font-bold text-gray-900 dark:text-gray-100">Paid</div><h4 className="mt-2">{money(m?.paid, cur)}</h4></div>
                                                <div className="rounded-2xl bg-purple-100 p-4 dark:bg-purple-100/10"><div className="font-bold text-gray-900 dark:text-gray-100">Outstanding</div><h4 className="mt-2">{money(m?.outstanding, cur)}</h4></div>
                                                <div className="rounded-2xl bg-red-100 p-4 dark:bg-red-100/10"><div className="font-bold text-gray-900 dark:text-gray-100">Overdue</div><h4 className={`mt-2 ${m?.overdue > 0 ? 'text-red-600' : ''}`}>{money(m?.overdue, cur)}</h4></div>
                                            </div>
                                        </div>
                                    ) : <p className="text-gray-400">No invoices yet.</p>}

                                    {profile && <Section title="From lead to client"><LeadJourney journey={profile.journey} lead={profile.lead} /></Section>}
                                    {profile && <Section title={`Needs attention${profile.attention.length ? ` (${profile.attention.length})` : ''}`}><Attention items={profile.attention} /></Section>}

                                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                                        {profile && <Section title="Document views & IP"><Engagement data={profile.engagement} lastLogin={profile.lastLogin} /></Section>}
                                        {profile && <Section title="Reminders" action={profile.can.reminder && <Button size="xs" icon={<TbPlus />} onClick={() => setFollowUp('reminder')}>New</Button>}><Reminders items={profile.reminders} clientId={id} canEdit={profile.can.reminder} onChanged={loadProfile} /></Section>}
                                    </div>

                                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                        <Section title="Billing address"><p>{addrLine(c.billing) || <span className="text-gray-400">—</span>}</p></Section>
                                        <Section title="Shipping address"><p>{addrLine(c.shipping) || <span className="text-gray-400">—</span>}</p></Section>
                                    </div>
                                    <Section title="Contacts">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {c.contacts.length ? c.contacts.map((k) => {
                                                const pk = profile?.contacts.find((x) => x.id === k.id)
                                                return (
                                                    <div key={k.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-600"><div className="flex items-center gap-2 font-semibold">{k.name}{k.isPrimary && <Tag className="bg-blue-100 text-blue-700">Primary</Tag>}{!k.active && <Tag>Inactive</Tag>}</div>
                                                        <div className="mt-1 space-y-0.5 text-sm text-gray-500">{k.title && <div>{k.title}</div>}{k.email && <div className="flex items-center gap-1"><TbMail />{k.email}</div>}{k.phone && <div className="flex items-center gap-1"><TbPhone />{k.phone}</div>}
                                                            {k.active && can('customers', 'edit') && <div className="flex flex-wrap items-center gap-2 pt-2">{pk?.portal && <Tag className="bg-emerald-100 text-emerald-700">Client area access</Tag>}<Button size="xs" variant="solid" onClick={() => openAsClient(k)}>Open client area</Button>{k.email && <><Button size="xs" onClick={() => invite(k)}>{pk?.portal ? 'Send password reset' : 'Invite to client area'}</Button><Button size="xs" onClick={() => { setPwFor(k); setPw('') }}>Set password</Button></>}</div>}
                                                            {pk?.lastLogin && <div className="flex items-center gap-1 pt-1 text-xs"><TbLogin />Last login {dayjs(pk.lastLogin).format('DD MMM YYYY, HH:mm')}{pk.ip && <span className="font-mono"> · {pk.ip}</span>}</div>}
                                                        </div>
                                                    </div>
                                                )
                                            }) : <span className="text-gray-400">No contacts yet</span>}
                                        </div>
                                    </Section>
                                </div>
                            )}
                            {tab === 'activity' && (profile ? <Timeline items={profile.timeline} /> : <p className="py-10 text-center text-gray-400">Loading…</p>)}
                            {tab === 'payments' && <PaymentsTab id={id} money={money} />}
                            {tab === 'files' && <AttachmentsPanel relType="customer" relId={id} canEdit={can('customers', 'edit')} showClientToggle />}
                            {(() => { const t = tabs.find((x) => x.key === tab); return t?.rel ? <RelatedTab key={t.key} cfg={t.rel} onChanged={() => { load(); loadProfile() }} /> : null })()}
                        </div>
                    </Tabs>
                </Card>
            </div>

            <FollowUpDialog key={followUp || 'none'} open={!!followUp} initialType={followUp || 'note'} clientId={id} onClose={() => setFollowUp(null)} onSaved={() => { loadProfile(); load() }} />
            <NewTicketDialog open={ticketDialog} onClose={() => setTicketDialog(false)} lookups={ticketLk} presets={{ clientId: id }} onCreated={(tid) => navigate(`/crm/tickets/${tid}`)} />
            <ProjectDialog open={projectDialog} onClose={() => setProjectDialog(false)} presets={{ clientId: id }} onCreated={(pid) => navigate(`/crm/projects/${pid}`)} />
            <ConfirmDialog isOpen={confirmDel} type="danger" title="Delete this client?" confirmText="Delete" onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{c.company} and its contacts will be removed. Clients that still have invoices, estimates, contracts, projects or tickets cannot be deleted — deactivate them instead.</p>
            </ConfirmDialog>
                    <Dialog isOpen={!!pwFor} width={420} onClose={() => setPwFor(null)} onRequestClose={() => setPwFor(null)}>
                <h5 className="mb-1">Set client area password</h5>
                <p className="mb-4 text-sm text-gray-500">{pwFor?.name} · {pwFor?.email}. They sign in at /portal with their email and this password. Any session they have is closed.</p>
                <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
                <div className="mt-2"><button type="button" onClick={makePw} className="text-sm font-semibold text-primary">Generate a strong password</button></div>
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setPwFor(null)}>Cancel</Button><Button variant="solid" loading={pwBusy} disabled={pw.length < 8} onClick={savePw}>Save password</Button></div>
            </Dialog>
</Container>
    )
}

export default ClientDetail

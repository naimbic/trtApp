import dayjs from 'dayjs'
import { TbPlus, TbFileText, TbPresentation, TbFileCertificate, TbBriefcase, TbLifebuoy, TbChecklist } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Segment from '@/components/ui/Segment'
import cn from '@/utils/classNames'
import { ColumnChart, DonutChart, StackedStat, PALETTE } from '../kit/charts'
import { Attention, Engagement, Reminders } from './ProfileParts'

const addrLine = (a) => [a?.street, [a?.zip, a?.city].filter(Boolean).join(' '), a?.state, a?.countryName].filter(Boolean).join(', ')

const Panel = ({ title, action, children, className }) => (
    <section className={cn('rounded-2xl border border-gray-200 p-4 dark:border-gray-600', className)}>
        <div className="mb-3 flex min-h-[28px] items-center justify-between gap-3"><h6 className="text-gray-500">{title}</h6>{action}</div>
        {children}
    </section>
)

const Kpi = ({ label, value, sub, tone }) => (
    <div className={cn('rounded-xl px-4 py-3', tone)}>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">{label}</div>
        <div className="mt-1 text-xl font-bold heading-text">{value}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
)

/** Overview tab: section by section (billing with charts, attention, sales, work, engagement, details). */
const ClientOverview = ({ c, profile, lookups, money, cur, setCur, can, setTab, setFollowUp, loadProfile, id }) => {
    const currencies = Object.keys(c.money)
    const m = c.money[cur]
    const charts = profile?.charts
    const series = charts?.monthly?.[cur]
    const collected = m?.invoiced ? Math.min(100, Math.round((m.paid / m.invoiced) * 100)) : 0
    const hasMoney = currencies.length > 0
    const see = (feature) => can(feature, 'view')

    return (
        <div className="flex flex-col gap-4">
            {/* 1. Billing */}
            <Panel
                title="Billing"
                action={currencies.length > 1 && <Segment size="sm" value={cur} onChange={(v) => v && setCur(Array.isArray(v) ? v[0] : v)}>{currencies.map((k) => <Segment.Item key={k} value={k}>{lookups.currencies.find((x) => x.id === k)?.name || '?'}</Segment.Item>)}</Segment>}
            >
                {hasMoney ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Kpi label="Invoiced" value={money(m?.invoiced, cur)} sub={`${m?.invoices || 0} invoices`} tone="bg-sky-100 dark:bg-sky-100/10" />
                            <Kpi label="Paid" value={money(m?.paid, cur)} sub={`${collected}% collected`} tone="bg-emerald-100 dark:bg-emerald-100/10" />
                            <Kpi label="Outstanding" value={money(m?.outstanding, cur)} tone="bg-purple-100 dark:bg-purple-100/10" />
                            <Kpi label="Overdue" value={<span className={m?.overdue > 0 ? 'text-red-600' : ''}>{money(m?.overdue, cur)}</span>} tone="bg-red-100 dark:bg-red-100/10" />
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {series ? (
                                <div className="lg:col-span-2">
                                    <div className="mb-1 text-sm font-semibold">Invoiced and paid, last 12 months</div>
                                    <ColumnChart labels={series.map((x) => dayjs(`${x.m}-01`).format('MMM YY'))} series={[{ name: 'Invoiced', data: series.map((x) => x.invoiced) }, { name: 'Paid', data: series.map((x) => x.paid) }]} colors={[PALETTE.blue, PALETTE.green]} money={(v) => money(v, cur)} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400 dark:bg-gray-700/40 lg:col-span-2">Money charts are hidden for your role.</div>
                            )}
                            <div>
                                <div className="mb-1 text-sm font-semibold">Invoices by status</div>
                                <DonutChart data={charts?.invoiceStatus} title="Invoices" />
                            </div>
                        </div>
                    </>
                ) : <p className="text-sm text-gray-400">No invoices yet.</p>}
            </Panel>

            {/* 2. Attention and reminders */}
            {profile && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <Panel title={`Needs attention${profile.attention.length ? ` (${profile.attention.length})` : ''}`}><Attention items={profile.attention} /></Panel>
                    <Panel title="Reminders" action={profile.can.reminder && <Button size="xs" icon={<TbPlus />} onClick={() => setFollowUp('reminder')}>New</Button>}><Reminders items={profile.reminders} clientId={id} canEdit={profile.can.reminder} onChanged={loadProfile} /></Panel>
                </div>
            )}

            {/* 3. Sales and work at a glance */}
            {charts && (
                <Panel title="Sales and work">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {see('estimates') && <StackedStat title="Estimates" icon={<TbFileText />} data={charts.docs.estimates} onClick={() => setTab('estimates')} />}
                        {see('proposals') && <StackedStat title="Proposals" icon={<TbPresentation />} data={charts.docs.proposals} onClick={() => setTab('proposals')} />}
                        {see('contracts') && <StackedStat title="Contracts" icon={<TbFileCertificate />} data={charts.docs.contracts} onClick={() => setTab('contracts')} />}
                        {see('projects') && <StackedStat title="Projects" icon={<TbBriefcase />} data={charts.docs.projects} onClick={() => setTab('projects')} />}
                        {see('tickets') && <StackedStat title="Tickets" icon={<TbLifebuoy />} data={charts.docs.tickets} onClick={() => setTab('tickets')} />}
                        <StackedStat title="Tasks" icon={<TbChecklist />} data={charts.docs.tasks} />
                    </div>
                </Panel>
            )}

            {/* 4. Client engagement and details */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {profile && <Panel title="Document views and IP"><Engagement data={profile.engagement} lastLogin={profile.lastLogin} /></Panel>}
                <Panel title="Details">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs uppercase tracking-wide text-gray-400">Billing address</dt><dd className="heading-text">{addrLine(c.billing) || <span className="text-gray-400">—</span>}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-gray-400">Shipping address</dt><dd className="heading-text">{addrLine(c.shipping) || <span className="text-gray-400">—</span>}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-gray-400">Company address</dt><dd className="heading-text">{addrLine({ street: c.address, city: c.city, state: c.state, zip: c.zip, countryName: c.countryName }) || <span className="text-gray-400">—</span>}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-gray-400">Phone</dt><dd className="heading-text">{c.phone || <span className="text-gray-400">—</span>}</dd></div>
                    </dl>
                </Panel>
            </div>
        </div>
    )
}

export default ClientOverview

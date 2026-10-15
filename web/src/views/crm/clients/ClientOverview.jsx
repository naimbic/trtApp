import { TbPlus, TbFileText, TbPresentation, TbFileCertificate, TbBriefcase, TbLifebuoy, TbChecklist } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import cn from '@/utils/classNames'
import { StackedStat } from '../kit/charts'
import ClientBilling from './ClientBilling'
import { Attention, Engagement, Reminders } from './ProfileParts'

const addrLine = (a) => [a?.street, [a?.zip, a?.city].filter(Boolean).join(' '), a?.state, a?.countryName].filter(Boolean).join(', ')

const Panel = ({ title, action, children, className }) => (
    <section className={cn('rounded-2xl border border-gray-200 p-4 dark:border-gray-600', className)}>
        <div className="mb-3 flex min-h-[28px] items-center justify-between gap-3"><h6 className="text-gray-500">{title}</h6>{action}</div>
        {children}
    </section>
)

/** Overview tab: section by section (billing with charts, attention, sales, work, engagement, details). */
const ClientOverview = ({ c, profile, lookups, money, cur, setCur, can, setTab, setFollowUp, loadProfile, id }) => {
    const charts = profile?.charts
    const see = (feature) => can(feature, 'view')

    return (
        <div className="flex flex-col gap-4">
            {/* 1. Billing: period and currency come from the top-bar filter */}
            <Panel title="Billing">
                <ClientBilling id={id} c={c} lookups={lookups} money={money} cur={cur} setCur={setCur} charts={charts} />
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

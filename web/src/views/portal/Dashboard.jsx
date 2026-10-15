import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { TbCash, TbFileInvoice, TbAlertTriangle, TbCircleCheck, TbExternalLink, TbBriefcase, TbLifebuoy, TbChevronRight } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Skeleton from '@/components/ui/Skeleton'
import classNames from '@/utils/classNames'
import { portal, money } from './api'
import { usePortal } from './PortalApp'
import { useI18n } from './i18n'
import { StatusTag, Bar, Empty } from './ui'

const { Tr, Th, Td, THead, TBody } = Table

/** One figure with an icon; clickable when it has a destination. */
const Tile = ({ icon, tone, label, value, sub, to, alert }) => {
    const body = (
        <div className={classNames('flex h-full items-center gap-3 rounded-2xl border bg-white p-4 transition dark:bg-gray-800', alert ? 'border-red-200 dark:border-red-500/40' : 'border-gray-200 dark:border-gray-700', to && 'hover:border-primary hover:shadow-sm')}>
            <span className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl', tone)}>{icon}</span>
            <div className="min-w-0">
                <div className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
                <div className="truncate text-xl font-bold heading-text">{value}</div>
                {sub && <div className="truncate text-xs text-red-600"><bdi>{sub}</bdi></div>}
            </div>
        </div>
    )
    return to ? <Link to={to} className="block">{body}</Link> : body
}

const CardHead = ({ title, to, label }) => (
    <div className="mb-3 flex items-center justify-between gap-3"><h5>{title}</h5>{to && <Link to={to} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{label}<TbChevronRight className="rtl:rotate-180" /></Link>}</div>
)

const Dashboard = () => {
    const { me } = usePortal()
    const { t, date } = useI18n()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => { portal('/dashboard').then(setD).catch((e) => setError(e.message)) }, [])
    if (error) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
    if (!d) return <div className="flex flex-col gap-4"><Skeleton height={40} width={280} /><div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={84} />)}</div><Skeleton height={220} /></div>

    const m = d.money[0]
    const can = (x) => d.can.includes(x)
    const actionTitle = (a) => ({
        overdue: t('Invoice {ref} is overdue', { ref: a.ref }),
        invoice: t('Invoice {ref} is waiting for payment', { ref: a.ref }),
        estimate: t('Estimate {ref} is waiting for your answer', { ref: a.ref }),
        proposal: t('Proposal {ref} is waiting for your answer', { ref: a.ref }),
        contract: t('Contract “{ref}” is waiting for your signature', { ref: a.ref }),
    }[a.kind] || a.title)
    const actionDetail = (a) => (a.amount != null ? t('{amount} left', { amount: money(a.amount, a.currency) }) : a.detail)
    const wide = (withSide, side) => (withSide && side ? 'xl:col-span-2' : 'xl:col-span-3')
    const offers = [
        ...d.estimates.map((e) => ({ key: `e${e.id}`, label: t('Estimate'), number: e.number, status: e.statusLabel, link: e.link })),
        ...d.proposals.map((p) => ({ key: `p${p.id}`, label: t('Proposal'), number: p.number, sub: p.subject, status: p.statusLabel, link: p.link })),
        ...d.contracts.map((c) => ({ key: `c${c.id}`, label: t('Contract'), number: c.number, status: c.statusLabel, link: c.link })),
    ].slice(0, 6)

    return (
        <div className="flex flex-col gap-4">
            <div><h3>{t('Hello {name} 👋', { name: me.contact.firstName || me.contact.name })}</h3><p className="text-gray-500">{me.company.name ? t('Here is where things stand with {company}.', { company: me.company.name }) : t('Here is where things stand with us.')}</p></div>

            {d.actions.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <h5 className="mb-3">{t('Waiting for you')}</h5>
                    <div className="grid gap-2 lg:grid-cols-2">
                        {d.actions.map((a, i) => (
                            <a key={i} href={a.link} target="_blank" rel="noreferrer" className={classNames('flex items-start gap-3 rounded-xl border bg-white p-3 text-sm transition hover:shadow dark:bg-gray-800', a.kind === 'overdue' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700')}>
                                <TbAlertTriangle className="mt-0.5 shrink-0 text-lg" /><div className="min-w-0 flex-1"><div className="font-semibold">{actionTitle(a)}</div>{actionDetail(a) && <div className="truncate text-xs opacity-80">{actionDetail(a)}</div>}</div><TbExternalLink className="mt-0.5 shrink-0" />
                            </a>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {can('invoices') && (m ? (
                    <>
                        <Tile icon={<TbCash />} tone={m.overdue > 0 ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'} label={t('To pay')} value={<bdi>{money(m.due, m.currency)}</bdi>} sub={m.overdue > 0 ? t('{amount} overdue', { amount: money(m.overdue, m.currency) }) : null} to="/portal/invoices" alert={m.overdue > 0} />
                        <Tile icon={<TbCircleCheck />} tone="bg-emerald-100 text-emerald-600" label={t('Paid')} value={<bdi>{money(m.paid, m.currency)}</bdi>} to="/portal/invoices" />
                        <Tile icon={<TbFileInvoice />} tone="bg-sky-100 text-sky-600" label={t('Invoiced')} value={<bdi>{money(m.invoiced, m.currency)}</bdi>} to="/portal/invoices" />
                    </>
                ) : <Tile icon={<TbFileInvoice />} tone="bg-sky-100 text-sky-600" label={t('Invoices')} value="0" />)}
                {can('projects') && <Tile icon={<TbBriefcase />} tone="bg-indigo-100 text-indigo-600" label={t('Projects in progress')} value={d.counts.projectsActive} to="/portal/projects" />}
                {can('support') && <Tile icon={<TbLifebuoy />} tone="bg-amber-100 text-amber-600" label={t('Open requests')} value={d.counts.ticketsOpen} to="/portal/tickets" />}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {can('invoices') && (
                    <Card className={wide(true, offers.length > 0)}>
                        <CardHead title={t('Latest invoices')} to="/portal/invoices" label={t('All invoices')} />
                        {d.invoices.length ? (
                            <div className="overflow-x-auto"><Table><THead><Tr><Th>{t('Invoice')}</Th><Th>{t('Due')}</Th><Th className="text-right">{t('Total')}</Th><Th>{t('Status')}</Th></Tr></THead>
                                <TBody>{d.invoices.map((i) => <Tr key={i.id}><Td><a className="font-semibold heading-text hover:text-primary" href={i.link} target="_blank" rel="noreferrer">{i.number}</a></Td><Td>{date(i.dueDate)}</Td><Td className="text-right tabular-nums"><bdi>{money(i.total, i.currency)}</bdi></Td><Td><StatusTag label={i.statusLabel} /></Td></Tr>)}</TBody></Table></div>
                        ) : <Empty>{t('No invoices yet.')}</Empty>}
                    </Card>
                )}
                {offers.length > 0 && (
                    <Card>
                        <CardHead title={t('Offers and contracts')} />
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {offers.map((o) => (
                                <a key={o.key} href={o.link} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-2.5">
                                    <span className="min-w-0"><span className="block truncate font-semibold heading-text hover:text-primary">{o.label} {o.number}</span>{o.sub && <span className="block truncate text-xs text-gray-500">{o.sub}</span>}</span>
                                    <StatusTag label={o.status} />
                                </a>
                            ))}
                        </div>
                    </Card>
                )}
                {can('projects') && (
                    <Card className={wide(true, can('support'))}>
                        <CardHead title={t('Projects')} to="/portal/projects" label={t('All projects')} />
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {d.projects.map((p) => (
                                <Link key={p.id} to={`/portal/projects/${p.id}`} className="block py-3">
                                    <div className="mb-2 flex items-center justify-between gap-3"><span className="font-bold heading-text hover:text-primary">{p.name}</span><StatusTag label={p.statusLabel} /></div>
                                    <Bar value={p.progress} />
                                </Link>
                            ))}
                            {!d.projects.length && <Empty>{t('No projects yet.')}</Empty>}
                        </div>
                    </Card>
                )}
                {can('support') && (
                    <Card>
                        <div className="mb-3 flex items-center justify-between gap-3"><h5>{t('Support')}</h5><Link to="/portal/tickets"><Button asElement="div" size="xs" variant="solid">{t('New request')}</Button></Link></div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {d.tickets.map((k) => <Link key={k.id} to={`/portal/tickets/${k.id}`} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0 truncate font-semibold heading-text hover:text-primary">#{k.number} {k.subject}</span>{k.status && <span className="flex shrink-0 items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: k.status.color }} />{k.status.name}</span>}</Link>)}
                            {!d.tickets.length && <Empty>{t('No support requests yet.')}</Empty>}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}

export default Dashboard

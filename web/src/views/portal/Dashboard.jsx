import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { TbCash, TbFileInvoice, TbAlertTriangle, TbCircleCheck, TbExternalLink } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Skeleton from '@/components/ui/Skeleton'
import classNames from '@/utils/classNames'
import { portal, money } from './api'
import { usePortal } from './PortalApp'
import { StatusTag, Bar, date, Empty } from './ui'

const { Tr, Th, Td, THead, TBody } = Table
const Stat = ({ title, className, icon, value, sub }) => (
    <div className={classNames('flex flex-col justify-center rounded-2xl p-4', className)}>
        <div className="flex items-center justify-between"><div><div className="mb-3 font-bold text-gray-900">{title}</div><h3 className="mb-1 text-gray-900">{value}</h3>{sub && <div className="text-xs text-gray-700">{sub}</div>}</div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-2xl text-white">{icon}</div></div>
    </div>
)

const Dashboard = () => {
    const { me } = usePortal()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => { portal('/dashboard').then(setD).catch((e) => setError(e.message)) }, [])
    if (error) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
    if (!d) return <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Card key={i}><Skeleton height={80} /></Card>)}</div>
    const m = d.money[0]
    return (
        <div className="flex flex-col gap-4">
            <div><h3>Hello {me.contact.firstName || me.contact.name} 👋</h3><p className="text-gray-500">Here is where things stand with {me.company.name || 'us'}.</p></div>

            {d.can.includes('invoices') && (
                <Card>
                    <div className="flex items-center justify-between"><h4>Billing</h4><Link to="/portal/invoices"><Button asElement="div" size="sm">All invoices</Button></Link></div>
                    {m ? (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Stat title="Invoiced" className="bg-sky-100" value={money(m.invoiced, m.currency)} icon={<TbFileInvoice />} />
                            <Stat title="Paid" className="bg-emerald-100" value={money(m.paid, m.currency)} icon={<TbCircleCheck />} />
                            <Stat title="To pay" className={m.overdue > 0 ? 'bg-red-100' : 'bg-purple-100'} value={money(m.due, m.currency)} sub={m.overdue > 0 ? `${money(m.overdue, m.currency)} overdue` : null} icon={<TbCash />} />
                        </div>
                    ) : <Empty>No invoices yet.</Empty>}
                </Card>
            )}

            {d.actions.length > 0 && (
                <Card>
                    <h4>Waiting for you</h4>
                    <div className="mt-4 grid gap-2 lg:grid-cols-2">
                        {d.actions.map((a, i) => (
                            <a key={i} href={a.link} target="_blank" rel="noreferrer" className={classNames('flex items-start gap-3 rounded-xl border p-3 text-sm transition hover:shadow', a.kind === 'overdue' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10' : 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-500/10')}>
                                <TbAlertTriangle className="mt-0.5 shrink-0 text-lg" /><div className="min-w-0 flex-1"><div className="font-semibold">{a.title}</div>{a.detail && <div className="truncate text-xs opacity-80">{a.detail}</div>}</div><TbExternalLink className="mt-0.5 shrink-0" />
                            </a>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {d.can.includes('invoices') && (
                    <Card>
                        <div className="flex items-center justify-between"><h4>Latest invoices</h4></div>
                        {d.invoices.length ? (
                            <Table className="mt-3"><THead><Tr><Th>Invoice</Th><Th>Due</Th><Th>Total</Th><Th>Status</Th></Tr></THead>
                                <TBody>{d.invoices.map((i) => <Tr key={i.id}><Td><a className="font-semibold heading-text hover:text-primary" href={i.link} target="_blank" rel="noreferrer">{i.number}</a></Td><Td>{date(i.dueDate)}</Td><Td>{money(i.total, i.currency)}</Td><Td><StatusTag label={i.statusLabel} /></Td></Tr>)}</TBody></Table>
                        ) : <Empty>No invoices yet.</Empty>}
                    </Card>
                )}
                {d.can.includes('projects') && (
                    <Card>
                        <div className="flex items-center justify-between"><h4>Projects</h4><Link to="/portal/projects"><Button asElement="div" size="sm">All projects</Button></Link></div>
                        <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
                            {d.projects.map((p) => (
                                <Link key={p.id} to={`/portal/projects/${p.id}`} className="block py-3">
                                    <div className="mb-2 flex items-center justify-between gap-3"><span className="font-bold heading-text hover:text-primary">{p.name}</span><StatusTag label={p.statusLabel} /></div>
                                    <Bar value={p.progress} />
                                </Link>
                            ))}
                            {!d.projects.length && <Empty>No projects yet.</Empty>}
                        </div>
                    </Card>
                )}
                {d.can.includes('support') && (
                    <Card>
                        <div className="flex items-center justify-between"><h4>Support</h4><Link to="/portal/tickets"><Button asElement="div" size="sm">All requests</Button></Link></div>
                        <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
                            {d.tickets.map((t) => <Link key={t.id} to={`/portal/tickets/${t.id}`} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate font-semibold heading-text hover:text-primary">#{t.number} {t.subject}</span>{t.status && <span className="flex shrink-0 items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: t.status.color }} />{t.status.name}</span>}</Link>)}
                            {!d.tickets.length && <Empty>No support requests yet.</Empty>}
                        </div>
                    </Card>
                )}
                {(d.can.includes('estimates') || d.can.includes('proposals')) && (d.estimates.length > 0 || d.proposals.length > 0) && (
                    <Card>
                        <h4>Offers</h4>
                        <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
                            {d.estimates.map((e) => <a key={e.id} href={e.link} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-3"><span className="font-semibold heading-text hover:text-primary">Estimate {e.number}</span><StatusTag label={e.statusLabel} /></a>)}
                            {d.proposals.map((p) => <a key={p.id} href={p.link} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate font-semibold heading-text hover:text-primary">Proposal {p.number} · {p.subject}</span><StatusTag label={p.statusLabel} /></a>)}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}

export default Dashboard

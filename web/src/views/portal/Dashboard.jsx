/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { TbCash, TbCircleCheck, TbBriefcase, TbLifebuoy, TbMail, TbPhone, TbAlertTriangle, TbMessage } from 'react-icons/tb'
import Segment from '@/components/ui/Segment'
import Skeleton from '@/components/ui/Skeleton'
import Container from '@/components/shared/Container'
import { InvoiceHead } from '../crm/sales/InvoiceInsights'
import { portal, money } from './api'
import { usePortal } from './PortalApp'
import { useI18n } from './i18n'

const initials = (n = '') => n.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
const TONE = { Paid: 'pine', Accepted: 'pine', Signed: 'pine', Finished: 'pine', Complete: 'pine', Overdue: 'tomato', Declined: 'tomato', Expired: 'ink', Cancelled: 'ink', Unpaid: 'butter', 'Partially paid': 'butter', 'To sign': 'butter', Sent: 'butter', Open: 'butter', Revised: 'butter' }
const DONE = ['pine', 'ink']

/** The customer profile of the template, for the client who signs in: the account, its documents as tiles, what is owed. */
const Overview = () => {
    const { me } = usePortal()
    const { t, date } = useI18n()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')
    useEffect(() => { portal('/dashboard').then(setD).catch((e) => setError(e.message)) }, [])

    const tiles = useMemo(() => {
        if (!d) return []
        const list = [
            ...d.invoices.map((i) => ({ key: `i${i.id}`, kind: t('Invoice'), number: i.number, date: i.dueDate || i.date, amount: i.total, currency: i.currency, status: i.statusLabel, link: i.link })),
            ...d.estimates.map((e) => ({ key: `e${e.id}`, kind: t('Estimate'), number: e.number, date: e.date, amount: e.total, currency: e.currency, status: e.statusLabel, link: e.link })),
            ...d.proposals.map((p) => ({ key: `p${p.id}`, kind: t('Proposal'), number: p.number, sub: p.subject, date: p.date, amount: p.total, currency: p.currency, status: p.statusLabel, link: p.link })),
            ...d.contracts.map((c) => ({ key: `c${c.id}`, kind: t('Contract'), number: c.number, date: c.startDate || c.date, status: c.statusLabel, link: c.link })),
        ].map((x) => ({ ...x, tone: TONE[x.status] || 'plain' }))
        return list.filter((x) => filter === 'all' || (filter === 'wait' ? !DONE.includes(x.tone) : DONE.includes(x.tone)))
    }, [d, filter, t])

    if (error) return <Container><div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div></Container>
    if (!d) return <Container><div className="flex flex-col gap-4"><Skeleton height={90} /><div className="grid gap-4 lg:grid-cols-3"><Skeleton height={320} /><div className="lg:col-span-2"><Skeleton height={320} /></div></div></div></Container>

    const can = (x) => d.can.includes(x)
    const m = d.money[0]
    const share = m && m.invoiced > 0 ? Math.round((m.paid / m.invoiced) * 100) : null
    const info = me.client.details || {}
    const actionTitle = (a) => ({
        overdue: t('Invoice {ref} is overdue', { ref: a.ref }), invoice: t('Invoice {ref} is waiting for payment', { ref: a.ref }),
        estimate: t('Estimate {ref} is waiting for your answer', { ref: a.ref }), proposal: t('Proposal {ref} is waiting for your answer', { ref: a.ref }),
        contract: t('Contract “{ref}” is waiting for your signature', { ref: a.ref }),
    }[a.kind] || a.title)
    const stats = [
        { icon: <TbCash />, label: t('To pay'), value: m ? money(m.due, m.currency) : '—', badge: m?.overdue > 0 ? <span className="badge badge--tomato">{t('{amount} overdue', { amount: money(m.overdue, m.currency) })}</span> : <span className="badge badge--plain">{t('Nothing overdue')}</span> },
        { icon: <TbCircleCheck />, label: t('Paid'), value: m ? money(m.paid, m.currency) : '—', badge: share !== null ? <span className="badge badge--pine">{share}%</span> : null },
        { icon: <TbBriefcase />, label: can('projects') ? t('Projects in progress') : t('Open requests'), value: String(can('projects') ? d.counts.projectsActive : d.counts.ticketsOpen), badge: can('projects') && can('support') ? <span className="badge badge--plain">{t('{n} open requests', { n: d.counts.ticketsOpen })}</span> : null },
    ]

    return (
        <Container>
            <InvoiceHead title={t('Hello {name} 👋', { name: me.contact.firstName || me.contact.name })} stats={stats} />
            <div className="rp-ov">
                {d.actions.length > 0 && (
                    <div className="pt-card" style={{ marginBottom: 'var(--rp-gap, 16px)' }}>
                        <h3>{t('Waiting for you')}</h3>
                        <div className="grid gap-2 lg:grid-cols-2">
                            {d.actions.map((a, i) => (
                                <a key={i} href={a.link} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-2xl p-3 text-sm font-semibold transition hover:-translate-y-0.5" style={{ background: a.kind === 'overdue' ? 'var(--rp-tomato)' : 'var(--rp-butter)', color: a.kind === 'overdue' ? 'var(--rp-on-tomato)' : 'var(--rp-on-butter)' }}>
                                    <TbAlertTriangle className="mt-0.5 shrink-0 text-lg" />
                                    <span className="min-w-0 flex-1">{actionTitle(a)}{a.amount != null && <small className="block opacity-80">{t('{amount} left', { amount: money(a.amount, a.currency) })}</small>}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                <div className="pt">
                    <div className="pt-col">
                        <section className="pt-card pt-prof">
                            <div className="pt-ring" style={{ '--p': share ?? 0 }}>
                                <span>{me.contact.image ? <img src={me.contact.image} alt="" /> : initials(me.contact.name)}</span>
                                {share !== null && <small title={t('Share of what was invoiced that is paid')}>{share}%</small>}
                            </div>
                            <h2 className="pt-name">{me.contact.name}</h2>
                            <p className="pt-role">{[me.contact.title, me.client.company].filter(Boolean).join(' · ')}</p>
                            <div className="pt-acts">
                                {can('support') && <Link className="pt-act" to="/portal/tickets"><TbMessage />{t('New request')}</Link>}
                                {me.contact.email && <a className="pt-act" href={`mailto:${me.contact.email}`}><TbMail />{t('Email')}</a>}
                                {me.contact.phone && <a className="pt-act" href={`tel:${me.contact.phone}`}><TbPhone />{t('Call')}</a>}
                            </div>
                        </section>
                        <section className="pt-card">
                            <h3>{t('Detailed information')}<Link className="text-xs font-bold" to="/portal/profile" style={{ color: 'var(--rp-muted)' }}>{t('Edit')}</Link></h3>
                            <dl className="pt-dl">
                                <div><dt>{t('Company')}</dt><dd>{me.client.company || '—'}</dd></div>
                                <div><dt>{t('Email')}</dt><dd>{me.contact.email || '—'}</dd></div>
                                <div><dt>{t('Phone')}</dt><dd>{me.contact.phone || info.phone || '—'}</dd></div>
                                {info.website && <div><dt>{t('Website')}</dt><dd>{info.website}</dd></div>}
                                {info.vat && <div><dt>{t('VAT / ICE')}</dt><dd>{info.vat}</dd></div>}
                                {info.address && <div><dt>{t('Address')}</dt><dd>{info.address}</dd></div>}
                                {info.since && <div><dt>{t('Client since')}</dt><dd>{date(info.since, 'MMM YYYY')}</dd></div>}
                            </dl>
                        </section>
                    </div>
                    <div className="pt-col">
                        <section className="pt-card">
                            <div className="pt-tools">
                                <h3 style={{ margin: 0 }}>{t('Interaction history')}</h3>
                                <Segment size="sm" value={filter} onChange={(v) => setFilter(Array.isArray(v) ? v[0] : v)}>
                                    <Segment.Item value="all">{t('All')}</Segment.Item><Segment.Item value="wait">{t('Waiting')}</Segment.Item><Segment.Item value="done">{t('Done')}</Segment.Item>
                                </Segment>
                            </div>
                            {tiles.length ? (
                                <div className="pt-tiles">
                                    {tiles.map((x) => (
                                        <a key={x.key} className={`pt-tile pt-tile--${x.tone}`} href={x.link} target="_blank" rel="noreferrer">
                                            <p className="pt-tile__date">{x.kind} · {date(x.date)}</p>
                                            <span className="pt-tile__st">{t(x.status)}</span>
                                            <h4 className="pt-tile__title">{x.number}</h4>
                                            {x.sub && <p className="pt-tile__date">{x.sub}</p>}
                                            {x.amount != null && <p className="pt-tile__amt">{money(x.amount, x.currency)}</p>}
                                        </a>
                                    ))}
                                </div>
                            ) : <p className="pt-empty">{filter === 'wait' ? t('Nothing is waiting for you. 🎉') : t('No documents yet.')}</p>}
                        </section>
                        <div className="grid gap-4 xl:grid-cols-2" style={{ gap: 'var(--rp-gap, 16px)' }}>
                            {can('invoices') && m && (
                                <section className="pt-card">
                                    <h3>{t('Payments')}<Link to="/portal/invoices">{t('All invoices')}</Link></h3>
                                    <div className="pt-fun">
                                        {[[t('Invoiced'), m.invoiced, 'ink'], [t('Paid'), m.paid, 'pine'], [t('To pay'), m.due, m.overdue > 0 ? 'tomato' : 'butter']].map(([label, v, tone]) => (
                                            <div key={label} className="pt-fun__row"><div><span>{label}</span><b className="tabular-nums"><bdi>{money(v, m.currency)}</bdi></b></div><span className="pt-bar"><i className={tone} style={{ transform: `scaleX(${m.invoiced ? Math.max(v / m.invoiced, 0.02) : 0.02})` }} /></span></div>
                                        ))}
                                    </div>
                                </section>
                            )}
                            {can('projects') && (
                                <section className="pt-card">
                                    <h3>{t('Projects')}<Link to="/portal/projects">{t('All projects')}</Link></h3>
                                    <div className="pt-fun">
                                        {d.projects.map((p) => (
                                            <Link key={p.id} to={`/portal/projects/${p.id}`} className="pt-fun__row"><div><span>{p.name}</span><b>{p.progress}%</b></div><span className="pt-bar"><i className={p.progress >= 80 ? 'pine' : 'butter'} style={{ transform: `scaleX(${Math.max(p.progress, 2) / 100})` }} /></span></Link>
                                        ))}
                                        {!d.projects.length && <p className="pt-empty">{t('No projects yet.')}</p>}
                                    </div>
                                </section>
                            )}
                            {can('support') && (
                                <section className="pt-card">
                                    <h3>{t('Support')}<Link to="/portal/tickets">{t('New request')}</Link></h3>
                                    <div>
                                        {d.tickets.map((k) => <Link key={k.id} to={`/portal/tickets/${k.id}`} className="flex items-center justify-between gap-3 py-2 text-sm font-semibold"><span className="min-w-0 truncate"><TbLifebuoy className="mr-1 inline" />#{k.number} {k.subject}</span></Link>)}
                                        {!d.tickets.length && <p className="pt-empty">{t('No support requests yet.')}</p>}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default Overview

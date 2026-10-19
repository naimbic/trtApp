/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { Link } from 'react-router'
import dayjs from 'dayjs'
import { TbHistory, TbPencil, TbTrash, TbFileInvoice, TbMail, TbPhone, TbFileText, TbPresentation, TbLifebuoy, TbBriefcase, TbNotes, TbBell, TbBrandWhatsapp, TbTargetArrow, TbLogin, TbCheck, TbKey, TbLink, TbExternalLink } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import EllipsisButton from '@/components/shared/EllipsisButton'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import ImageUpload from '@/components/crm/ImageUpload'
import BankAccountSelect from '../kit/BankAccountSelect'
import { api, notify } from '../kit/api'
import cn from '@/utils/classNames'
import { useMemo, useState } from 'react'
import Segment from '@/components/ui/Segment'
import { GROUPS, local } from '../activity/ActivityPage'
import { tr, trn } from '@/utils/t'


/** Round quick action with a tooltip. */
const Act = ({ icon, label, onClick, href }) => (
    <Tooltip title={label}><button type="button" className="cx-ibtn" aria-label={label} onClick={href ? () => { window.location.href = href } : onClick}>{icon}</button></Tooltip>
)
const Row = ({ label, children }) => (children ? <div><dt>{label}</dt><dd>{children}</dd></div> : null)

/** The profile card of the template: the logo inside a ring that is the share of what was invoiced that is paid, then the quick actions. */
export const ClientProfileCard = ({ c, profile, cur, id, can, a }) => {
    const primary = c.contacts.find((k) => k.isPrimary) || c.contacts[0]
    const phone = c.phone || primary?.phone
    const m = c.money[cur]
    const share = m && m.invoiced > 0 ? Math.round((m.paid / m.invoiced) * 100) : null
    const lead = profile?.lead
    const canEdit = can('customers', 'edit')
    return (
        <section className="pt-card pt-prof">
            <div className="pt-ring" style={{ '--p': share ?? 0 }}>
                <span><ImageUpload url={c.logoUrl} name={c.company} shape="circle" size={96} uploadUrl={`/api/crm/customers/${id}/logo`} canEdit={canEdit} onChange={a.logoChanged} /></span>
                {share !== null && <small title={tr("Share of what was invoiced that is paid")}>{share}%</small>}
            </div>
            <h2 className="pt-name">{c.company}</h2>
            <p className="pt-role">{[c.industry, [c.city, c.countryName].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || ' '}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Tag className={c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.active ? tr("Active") : tr("Inactive")}</Tag>
                {c.groups.map((g) => <Tag key={g.id}>{g.name}</Tag>)}
                {lead && <Tag className="gap-1 bg-blue-50 text-blue-700"><TbTargetArrow className="inline" /> {tr("From lead")}{lead.daysToConvert !== null ? ` · ${lead.daysToConvert}d` : ''}</Tag>}
            </div>
            <div className="pt-acts">
                {canEdit && <button type="button" className="pt-act" onClick={a.followUp}><TbBell />{tr("Follow up")}</button>}
                {primary?.email && <a className="pt-act" href={`mailto:${primary.email}`}><TbMail />{tr("Email")}</a>}
                {phone && <a className="pt-act" href={`tel:${phone.replace(/\s/g, '')}`}><TbPhone />{tr("Call")}</a>}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {can('invoices', 'create') && <Act icon={<TbFileInvoice />} label={tr("New invoice")} onClick={a.invoice} />}
                {can('estimates', 'create') && <Act icon={<TbFileText />} label={tr("New estimate")} onClick={a.estimate} />}
                {can('proposals', 'create') && <Act icon={<TbPresentation />} label={tr("New proposal")} onClick={a.proposal} />}
                {can('projects', 'create') && <Act icon={<TbBriefcase />} label={tr("New project")} onClick={a.project} />}
                {can('tickets', 'create') && <Act icon={<TbLifebuoy />} label={tr("New ticket")} onClick={a.ticket} />}
                {canEdit && <Act icon={<TbNotes />} label={tr("Add note")} onClick={a.note} />}
                {phone && <Act icon={<TbBrandWhatsapp />} label={tr("WhatsApp")} onClick={() => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank', 'noopener')} />}
                {can('activity_log', 'view') && <Act icon={<TbHistory />} label={tr("Activity log")} onClick={a.activity} />}
                {canEdit && <Act icon={<TbPencil />} label={tr("Edit client")} onClick={a.edit} />}
                {can('customers', 'delete') && (
                    <Dropdown placement="bottom-end" renderTitle={<EllipsisButton />}>
                        <Dropdown.Item eventKey="delete" onClick={a.remove}><span className="flex items-center text-red-500"><TbTrash className="mr-2 text-lg" />{tr("Delete client")}</span></Dropdown.Item>
                    </Dropdown>
                )}
            </div>
        </section>
    )
}

/** Detailed information: the facts that used to sit in the header line. */
export const ClientInfoCard = ({ c, profile, lookups, id, can, onSaved }) => {
    const site = c.website && (c.website.startsWith('http') ? c.website : `https://${c.website}`)
    return (
        <section className="pt-card">
            <h3>{tr("Detailed information")}</h3>
            <dl className="pt-dl">
                <Row label={tr("Website")}>{site && <a className="hover:underline" href={site} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a>}</Row>
                <Row label={tr("Phone")}>{c.phone}</Row>
                <Row label={tr("VAT / ICE")}>{c.vat}</Row>
                <Row label={tr("Industry")}>{c.industry}</Row>
                <Row label={tr("Currency")}>{lookups.currencies.find((x) => x.id === c.currencyId)?.name}</Row>
                <Row label={tr("Language")}>{c.language}</Row>
                <Row label={tr("Managed by")}>{c.admins.map((x) => x.name).join(', ')}</Row>
                <Row label={tr("Since")}>{dayjs(c.createdAt).format('DD MMM YYYY')}</Row>
                <Row label={tr("Bank account")}>
                    <div className="max-w-full" onClick={(e) => e.stopPropagation()}>
                        <BankAccountSelect
                            isDisabled={!can('customers', 'edit')}
                            value={c.bankAccountId || null}
                            emptyLabel={tr("Company default")}
                            onChange={async (bid) => { try { await api(`/api/crm/customers/${id}`, { method: 'PATCH', body: { bankAccountId: bid || null } }); notify('success', tr("Bank account assigned")); onSaved?.() } catch (e) { notify('danger', e.message) } }}
                        />
                    </div>
                </Row>
                {profile?.lastLogin && <Row label={tr("Last seen")}>{dayjs(profile.lastLogin.date).fromNow?.() || dayjs(profile.lastLogin.date).format('DD MMM YYYY')}</Row>}
            </dl>
        </section>
    )
}

/** Contacts and what can be done with their client area account (open it, invite, set the password). */
export const ClientContactsCard = ({ c, profile, can, a }) => {
    const canEdit = can('customers', 'edit')
    return (
        <section className="pt-card">
            <h3>{tr("Contacts (")}{c.contacts.length})<button type="button" onClick={a.manageContacts}>{tr("Manage contacts")}</button></h3>
            {c.contacts.length ? (
                <div className="grid gap-2.5">
                    {c.contacts.map((k) => {
                        const pk = profile?.contacts.find((x) => x.id === k.id)
                        return (
                            <div key={k.id} className="rounded-2xl p-3" style={{ background: 'var(--rp-well)' }}>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="truncate">{k.name}</span>{k.isPrimary && <Tag className="bg-blue-100 text-blue-700">{tr("Primary")}</Tag>}{!k.active && <Tag>{tr("Inactive")}</Tag>}</div>
                                <div className="truncate text-xs" style={{ color: 'var(--rp-muted)' }}>{[k.title, k.email, k.phone].filter(Boolean).join(' · ')}</div>
                                {pk?.lastLogin && <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--rp-muted)' }}><TbLogin />{tr("Last login")} {dayjs(pk.lastLogin).format('DD MMM YYYY, HH:mm')}</div>}
                                {k.active && canEdit && (
                                    <div className="mt-2 flex items-center gap-1.5">
                                        <Tooltip title={tr("Open the client area as this contact")}><Button size="xs" variant="solid" onClick={() => a.openAsClient(k)}>{tr("Client area")}</Button></Tooltip>
                                        {k.email && <Tooltip title={pk?.portal ? tr("Send a password reset link") : tr("Invite to the client area")}><Button size="xs" icon={<TbLink />} onClick={() => a.invite(k)} /></Tooltip>}
                                        {k.email && <Tooltip title={tr("Set the client area password")}><Button size="xs" icon={<TbKey />} onClick={() => a.setPassword(k)} /></Tooltip>}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : <p className="pt-empty">{tr("No contacts yet.")}</p>}
        </section>
    )
}

/** Lead → client path as a slim stepper. */
export const ClientJourneyCard = ({ profile }) => {
    if (!profile) return null
    const lead = profile.lead
    return (
        <section className="pt-card">
            <h3>{tr("Lead to client")}</h3>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--rp-muted)' }}>
                {lead ? (
                    <>
                        {lead.link ? <Link to={lead.link} className="inline-flex items-center gap-1 font-bold hover:underline" style={{ color: 'var(--rp-text)' }}>{lead.name}<TbExternalLink /></Link> : <span>{lead.name}</span>}
                        {lead.source && <span>{tr("Source")} <b style={{ color: 'var(--rp-text)' }}>{lead.source}</b></span>}
                        {lead.assigned && <span>{tr("Owner")} <b style={{ color: 'var(--rp-text)' }}>{lead.assigned}</b></span>}
                        {lead.daysToConvert !== null && <span>{tr("Converted after")} <b style={{ color: 'var(--rp-text)' }}>{trn(lead.daysToConvert, "day")}</b></span>}
                    </>
                ) : <span>{tr("Added directly as a client")}</span>}
            </div>
            <div className="flex overflow-x-auto pb-1">
                {profile.journey.map((s, i) => (
                    <div key={s.key} className="relative flex min-w-[92px] flex-1 flex-col items-center text-center">
                        {i > 0 && <div className={cn('absolute right-1/2 top-2.5 h-0.5 w-full', s.done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-600')} />}
                        <span className={cn('relative z-10 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold', s.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-600')}>{s.done ? <TbCheck /> : i + 1}</span>
                        <div className={cn('mt-1 text-xs font-semibold', !s.done && 'text-gray-400')}>{s.label}</div>
                        <div className="text-[11px] text-gray-400">{s.date ? dayjs(s.date).format('DD MMM YY') : s.done ? '' : tr("not yet")}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}

const TONE = { payment: 'pine', accepted: 'pine', converted: 'pine', contract: 'pine', invoice: 'butter', estimate: 'butter', proposal: 'butter', project: 'butter', expense: 'tomato', vault: 'ink', system: 'ink', login: 'ink', view: 'ink' }

/** Interaction history: the latest things that happened with this client as solid tiles; the colour tells the kind of event. */
export const ClientHistoryTiles = ({ items = [], onMore }) => {
    const [group, setGroup] = useState('all')
    const list = useMemo(() => {
        const types = group === 'all' ? null : GROUPS.find((g) => g[0] === group)?.[2]
        return items.filter((e) => !types || types.includes(e.type)).slice(0, 12)
    }, [items, group])
    return (
        <div>
            <div className="pt-tools">
                <Segment size="sm" value={group} onChange={(v) => setGroup(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="all">{tr("All")}</Segment.Item>
                    <Segment.Item value="sales">{tr("Sales")}</Segment.Item>
                    <Segment.Item value="work">{tr("Work")}</Segment.Item>
                    <Segment.Item value="comms">{tr("Notes and emails")}</Segment.Item>
                </Segment>
                {onMore && <button type="button" className="text-xs font-bold hover:underline" style={{ color: 'var(--rp-muted)' }} onClick={onMore}>{tr("Full activity")}</button>}
            </div>
            {list.length ? (
                <div className="pt-tiles">
                    {list.map((e) => {
                        const body = (
                            <>
                                <p className="pt-tile__date">{dayjs(e.date).format('DD MMM YYYY · HH:mm')}</p>
                                <h4 className="pt-tile__title">{local(e.title)}</h4>
                                {e.detail && <p className="pt-tile__date">{local(e.detail)}</p>}
                            </>
                        )
                        const cls = `pt-tile pt-tile--${TONE[e.type] || 'plain'}`
                        return e.link ? <Link key={e.id} to={e.link} className={cls}>{body}</Link> : <div key={e.id} className={cls}>{body}</div>
                    })}
                </div>
            ) : <p className="pt-empty">{tr("No activity to show")}</p>}
        </div>
    )
}

import { Link } from 'react-router'
import dayjs from 'dayjs'
import { TbPencil, TbTrash, TbFileInvoice, TbMail, TbPhone, TbFileText, TbPresentation, TbLifebuoy, TbBriefcase, TbNotes, TbBell, TbBrandWhatsapp, TbTargetArrow, TbLogin, TbMapPin, TbCheck, TbKey, TbLink, TbExternalLink, TbWorld } from 'react-icons/tb'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dropdown from '@/components/ui/Dropdown'
import EllipsisButton from '@/components/shared/EllipsisButton'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import ImageUpload from '@/components/crm/ImageUpload'
import cn from '@/utils/classNames'
import { tr, trn } from '@/utils/t'

const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

/** Icon-only quick action with a tooltip. */
const Act = ({ icon, label, onClick, href, solid }) => (
    <Tooltip title={label}>
        <Button size="sm" variant={solid ? 'solid' : 'default'} icon={icon} onClick={href ? () => { window.location.href = href } : onClick} />
    </Tooltip>
)

const Fact = ({ label, children }) => (children ? <span className="whitespace-nowrap"><span className="text-gray-400">{label} </span><span className="font-semibold heading-text">{children}</span></span> : null)

/** Lead → client path as a slim stepper. */
const Journey = ({ journey }) => (
    <div className="flex overflow-x-auto pb-1">
        {journey.map((s, i) => (
            <div key={s.key} className="relative flex min-w-[92px] flex-1 flex-col items-center text-center">
                {i > 0 && <div className={cn('absolute right-1/2 top-2.5 h-0.5 w-full', s.done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-600')} />}
                <span className={cn('relative z-10 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold', s.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-600')}>{s.done ? <TbCheck /> : i + 1}</span>
                <div className={cn('mt-1 text-xs font-semibold', !s.done && 'text-gray-400')}>{s.label}</div>
                <div className="text-[11px] text-gray-400">{s.date ? dayjs(s.date).format('DD MMM YY') : s.done ? '' : tr("not yet")}</div>
            </div>
        ))}
    </div>
)

/**
 * Portfolio section at the top of the client page: identity, key facts, quick actions, lead → client path and contacts.
 * props: c, profile, lookups, id, can(feature, cap), a { edit, followUp, invoice, estimate, proposal, ticket, project, remove, openAsClient, invite, setPassword, manageContacts, logoChanged }
 */
const ClientHeader = ({ c, profile, lookups, id, can, a }) => {
    const primary = c.contacts.find((k) => k.isPrimary) || c.contacts[0]
    const phone = c.phone || primary?.phone
    const where = [c.city, c.countryName].filter(Boolean).join(', ')
    const site = c.website && (c.website.startsWith('http') ? c.website : `https://${c.website}`)
    const lead = profile?.lead
    const canEdit = can('customers', 'edit')

    return (
        <Card bodyClass="p-4 flex flex-col gap-4">
            {/* identity, facts and quick actions */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="flex min-w-0 items-center gap-4 xl:flex-1">
                    <ImageUpload url={c.logoUrl} name={c.company} shape="circle" size={64} uploadUrl={`/api/crm/customers/${id}/logo`} canEdit={canEdit} onChange={a.logoChanged} />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate font-bold">{c.company}</h4>
                            <Tag className={c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{c.active ? tr("Active") : tr("Inactive")}</Tag>
                            {c.groups.map((g) => <Tag key={g.id}>{g.name}</Tag>)}
                            {lead && <Tag className="gap-1 bg-blue-50 text-blue-700"><TbTargetArrow className="inline" /> {tr("From lead")}{lead.daysToConvert !== null ? ` · ${lead.daysToConvert}d` : ''}</Tag>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            {where && <span className="flex items-center gap-1 font-semibold heading-text"><TbMapPin className="text-gray-400" />{where}</span>}
                            {site && <a className="flex items-center gap-1 text-primary hover:underline" href={site} target="_blank" rel="noreferrer"><TbWorld />{c.website.replace(/^https?:\/\//, '')}</a>}
                            <Fact label={tr("Since")}>{dayjs(c.createdAt).format('DD MMM YYYY')}</Fact>
                            <Fact label={tr("Currency")}>{lookups.currencies.find((x) => x.id === c.currencyId)?.name}</Fact>
                            <Fact label={tr("Language")}>{c.language}</Fact>
                            <Fact label={tr("Industry")}>{c.industry}</Fact>
                            <Fact label={tr("VAT / ICE")}>{c.vat}</Fact>
                            <Fact label={tr("Managed by")}>{c.admins.map((x) => x.name).join(', ')}</Fact>
                            {profile?.lastLogin && <Fact label={tr("Last seen")}>{dayjs(profile.lastLogin.date).fromNow?.() || dayjs(profile.lastLogin.date).format('DD MMM YYYY')}</Fact>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end">
                    {canEdit && <Button size="sm" variant="solid" icon={<TbBell />} onClick={a.followUp}>{tr("Follow up")}</Button>}
                    <div className="flex items-center gap-1">
                        {can('invoices', 'create') && <Act icon={<TbFileInvoice />} label={tr("New invoice")} onClick={a.invoice} />}
                        {can('estimates', 'create') && <Act icon={<TbFileText />} label={tr("New estimate")} onClick={a.estimate} />}
                        {can('proposals', 'create') && <Act icon={<TbPresentation />} label={tr("New proposal")} onClick={a.proposal} />}
                        {can('projects', 'create') && <Act icon={<TbBriefcase />} label={tr("New project")} onClick={a.project} />}
                        {can('tickets', 'create') && <Act icon={<TbLifebuoy />} label={tr("New ticket")} onClick={a.ticket} />}
                        {canEdit && <Act icon={<TbNotes />} label={tr("Add note")} onClick={a.note} />}
                    </div>
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-600">
                        {primary?.email && <Act icon={<TbMail />} label={tr("Email {email}", { email: primary.email })} href={`mailto:${primary.email}`} />}
                        {phone && <Act icon={<TbPhone />} label={tr("Call {phone}", { phone: phone })} href={`tel:${phone.replace(/\s/g, '')}`} />}
                        {phone && <Act icon={<TbBrandWhatsapp />} label={tr("WhatsApp")} onClick={() => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank', 'noopener')} />}
                    </div>
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-600">
                        {canEdit && <Act icon={<TbPencil />} label={tr("Edit client")} onClick={a.edit} />}
                        {can('customers', 'delete') && (
                            <Dropdown placement="bottom-end" renderTitle={<EllipsisButton />}>
                                <Dropdown.Item eventKey="delete" onClick={a.remove}><span className="flex items-center text-red-500"><TbTrash className="mr-2 text-lg" />{tr("Delete client")}</span></Dropdown.Item>
                            </Dropdown>
                        )}
                    </div>
                </div>
            </div>

            {/* lead → client path */}
            {profile && (
                <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
                    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="font-semibold uppercase tracking-wide">{tr("Lead to client")}</span>
                        {lead ? (
                            <>
                                {lead.link ? <Link to={lead.link} className="inline-flex items-center gap-1 text-primary hover:underline">{lead.name}<TbExternalLink /></Link> : <span>{lead.name}</span>}
                                {lead.source && <span>{tr("Source")} <b className="text-gray-700 dark:text-gray-200">{lead.source}</b></span>}
                                {lead.assigned && <span>{tr("Owner")} <b className="text-gray-700 dark:text-gray-200">{lead.assigned}</b></span>}
                                {lead.daysToConvert !== null && <span>{tr("Converted after")} <b className="text-gray-700 dark:text-gray-200">{trn(lead.daysToConvert, "day")}</b></span>}
                            </>
                        ) : <span>{tr("Added directly as a client")}</span>}
                    </div>
                    <Journey journey={profile.journey} />
                </div>
            )}

            {/* contacts and their actions */}
            <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tr("Contacts (")}{c.contacts.length})</span>
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={a.manageContacts}>{tr("Manage contacts")}</button>
                </div>
                {c.contacts.length ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-2">
                        {c.contacts.map((k) => {
                            const pk = profile?.contacts.find((x) => x.id === k.id)
                            return (
                                <div key={k.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-600">
                                    <Avatar size={34} shape="circle">{initials(k.name)}</Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold heading-text"><span className="truncate">{k.name}</span>{k.isPrimary && <Tag className="bg-blue-100 text-blue-700">{tr("Primary")}</Tag>}{!k.active && <Tag>{tr("Inactive")}</Tag>}</div>
                                        <div className="truncate text-xs text-gray-500">{[k.title, k.email, k.phone].filter(Boolean).join(' · ')}</div>
                                        {pk?.lastLogin && <div className="flex items-center gap-1 text-[11px] text-gray-400"><TbLogin />{tr("Last login")} {dayjs(pk.lastLogin).format('DD MMM YYYY, HH:mm')}</div>}
                                    </div>
                                    {k.active && canEdit && (
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Tooltip title={tr("Open the client area as this contact")}><Button size="xs" variant="solid" onClick={() => a.openAsClient(k)}>{tr("Client area")}</Button></Tooltip>
                                            {k.email && <Tooltip title={pk?.portal ? tr("Send a password reset link") : tr("Invite to the client area")}><Button size="xs" icon={<TbLink />} onClick={() => a.invite(k)} /></Tooltip>}
                                            {k.email && <Tooltip title={tr("Set the client area password")}><Button size="xs" icon={<TbKey />} onClick={() => a.setPassword(k)} /></Tooltip>}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : <p className="text-sm text-gray-400">{tr("No contacts yet.")}</p>}
            </div>
        </Card>
    )
}

export default ClientHeader

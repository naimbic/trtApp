/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { TbBriefcase, TbChecklist, TbClock, TbPlus, TbSearch, TbLayoutGrid, TbTable, TbDots, TbExternalLink, TbLayoutKanban, TbPencil, TbStar, TbStarFilled, TbTrash, TbCalendar, TbCalendarEvent, TbCoins, TbUser } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import RowMenu from '@/components/crm/RowMenu'
import { api, notify, qs, useCan } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { useClientLookups, makeMoney } from '../clients/shared'
import ProjectDialog from './ProjectDialog'
import { STATUS, BILLING, hours, fmt } from './shared'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const TONES = ['butter', 'pine', 'tomato', 'ink']
const toneOf = (s = '') => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return TONES[h % TONES.length] }
const initials = (n = '') => n.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
const STATUS_TONE = { 1: 'ink', 2: 'blue', 3: 'butter', 4: 'pine', 5: 'tomato' }
const FAV_KEY = 'projects.favourites'
const readFav = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] } }
const members = (p) => p.members.map((m) => ({ id: m.id, name: m.name, img: m.image }))

const ProjectsList = () => {
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const money = makeMoney(lookups.currencies)
    const [data, setData] = useState({ list: [], counts: {}, stats: {}, can: {} })
    const [status, setStatus] = useState('all')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [sortKey, setSortKey] = useState('newest')
    const [dateField, setDateField] = useState('deadline')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [page, setPage] = useState(1)
    const [view, setView] = useState(() => { try { return localStorage.getItem('projects.view') || 'grid' } catch { return 'grid' } })
    const [fav, setFav] = useState(readFav)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [menu, setMenu] = useState(null)
    const [del, setDel] = useState(null)
    const [dialog, setDialog] = useState(false)
    const pageSize = view === 'grid' ? 12 : 15

    useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        try { setData(await api(`/api/crm/work/projects?${qs({ query, status: status === 'all' ? '' : status, dateField, from, to })}`)); setError('') } catch (e) { setError(e.message) } finally { setLoading(false) }
    }, [query, status, dateField, from, to])
    useEffect(() => { load() }, [load])

    const toggleFav = (id) => setFav((f) => { const n = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; try { localStorage.setItem(FAV_KEY, JSON.stringify(n)) } catch { /* private mode */ } return n })
    const setViewSaved = (v) => { setView(v); setPage(1); try { localStorage.setItem('projects.view', v) } catch { /* private mode */ } }
    const remove = async (p) => { try { await api(`/api/crm/work/projects/${p.id}`, { method: 'DELETE' }); notify('success', tr("Project deleted")); load() } catch (e) { notify('danger', e.message) } }

    const sorted = useMemo(() => {
        const by = {
            newest: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
            name: (a, b) => a.name.localeCompare(b.name),
            deadline: (a, b) => (a.deadline ? +new Date(a.deadline) : Infinity) - (b.deadline ? +new Date(b.deadline) : Infinity),
            progress: (a, b) => b.progress - a.progress,
        }[sortKey]
        return [...data.list].sort((a, b) => (fav.includes(b.id) - fav.includes(a.id)) || by(a, b))
    }, [data.list, sortKey, fav])
    const rows = sorted.slice((page - 1) * pageSize, page * pageSize)

    const s = data.stats || {}
    const statusLabel = (v) => STATUS.find((x) => x.value === +v)?.label || ''
    const sortOptions = [['newest', tr("Newest first")], ['name', tr("Name A–Z")], ['deadline', tr("Deadline")], ['progress', tr("Progress")]].map(([value, label]) => ({ value, label }))
    const dateOptions = [['deadline', tr("Deadline")], ['startDate', tr("Start date")], ['createdAt', tr("Created")]].map(([value, label]) => ({ value, label }))
    const pct = s.total ? Math.round((s.active / s.total) * 100) : 0

    const items = (p) => [
        { label: tr("Open"), icon: <TbExternalLink />, onClick: () => navigate(`/crm/projects/${p.id}`) },
        { label: tr("Scrum board"), icon: <TbLayoutKanban />, onClick: () => navigate(`/crm/projects/${p.id}/board`) },
        ...(data.can.edit ? [{ label: tr("Edit"), icon: <TbPencil />, onClick: () => navigate(`/crm/projects/${p.id}`) }] : []),
        { label: fav.includes(p.id) ? tr("Remove from favorites") : tr("Add to favorites"), icon: fav.includes(p.id) ? <TbStarFilled /> : <TbStar />, onClick: () => toggleFav(p.id) },
        ...(can('projects', 'delete') ? [{ label: tr("Delete"), icon: <TbTrash />, danger: true, after: true, onClick: () => setDel(p) }] : []),
    ]
    const dots = (p) => (
        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-gray-500 transition hover:rotate-90 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={tr("Actions")} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); setMenu({ row: p, el: e.currentTarget }) }}><TbDots /></button>
    )
    const budget = (p) => {
        if (p.billingType === 1) return p.projectCost ? money(p.projectCost, 'all', { decimals: 0 }) : '—'
        return p.ratePerHour ? `${money(p.ratePerHour, 'all', { decimals: 0 })} / h` : '—'
    }
    const stateChip = (p) => <span className={`pj-st pj-st--${STATUS_TONE[p.status]}`}>{statusLabel(p.status)}</span>

    const card = (p, i) => (
        <article key={p.id} className="cx-card" style={{ '--i': Math.min(i, 12) }} onClick={() => navigate(`/crm/projects/${p.id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/crm/projects/${p.id}`) }}>
            <header className="cx-card__top">
                <span className={`cx-logo cx-logo--${toneOf(p.name)}`}>{initials(p.name)}</span>
                <span className="cx-card__tools" onClick={(e) => e.stopPropagation()}>
                    {stateChip(p)}
                    <button type="button" className={`pj-fav${fav.includes(p.id) ? ' is-on' : ''}`} aria-label={tr("Favorite")} onClick={() => toggleFav(p.id)}>{fav.includes(p.id) ? <TbStarFilled /> : <TbStar />}</button>
                    {dots(p)}
                </span>
            </header>
            <h3 className="cx-card__name" title={p.name}>{p.name}</h3>
            <p className="cx-card__role"><TbUser className="cx-pin" />{p.client?.name || tr("No client")}</p>
            <dl className="cx-card__facts">
                <div><dt><TbCalendarEvent className="pj-ico" />{tr("Start date")}</dt><dd>{fmt(p.startDate, 'DD MMM YYYY')}</dd></div>
                <div><dt><TbCalendar className="pj-ico" />{tr("Deadline")}</dt><dd className={p.overdue ? 'is-late' : ''}>{fmt(p.deadline, 'DD MMM YYYY')}</dd></div>
                <div><dt><TbClock className="pj-ico" />{tr("Time logged")}</dt><dd>{hours(p.seconds)}{p.estimatedHours ? <small className="pj-sub"> / {p.estimatedHours}h</small> : null}</dd></div>
                <div><dt><TbCoins className="pj-ico" />{BILLING.find((b) => b.value === p.billingType)?.label}</dt><dd>{budget(p)}</dd></div>
            </dl>
            <div className="cx-card__health" title={tr("Progress")}>
                <span className="cx-meter"><i className={p.status === 4 || p.progress >= 80 ? 'pine' : p.overdue ? 'tomato' : 'butter'} style={{ transform: `scaleX(${Math.max(p.progress, 2) / 100})` }} /></span>
                <b>{p.progress}%</b>
            </div>
            <footer className="cx-card__foot" onClick={(e) => e.stopPropagation()}>
                {p.members.length ? <UsersAvatarGroup users={members(p)} /> : <span className="cx-muted">{tr("No members")}</span>}
                <span className="cx-chip pj-tasks"><TbChecklist /> {p.tasksDone} / {p.tasksTotal}</span>
            </footer>
        </article>
    )

    return (
        <Container>
            <InvoiceHead
                title={tr("Projects")}
                action={data.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => setDialog(true)}>{tr("Create project")}</Button>}
                stats={[
                    { icon: <TbBriefcase />, label: tr("Projects in progress"), value: String(s.active ?? '–'), badge: s.total ? <span className="badge badge--plain">{pct}% {tr("of {n}", { n: s.total })}</span> : null },
                    { icon: <TbChecklist />, label: tr("Open tasks"), value: String(s.openTasks ?? '–'), badge: s.overdue > 0 ? <span className="badge badge--tomato">{tr("{n} past deadline", { n: s.overdue })}</span> : null },
                    { icon: <TbClock />, label: tr("Time logged"), value: s.seconds !== undefined ? hours(s.seconds) : '–', badge: s.total ? <span className="badge badge--plain">{s.avgProgress}% {tr("average progress")}</span> : null },
                ]}
            />
            <div className="cx-tools">
                <Input className="cx-search" size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search projects")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <Segment size="sm" value={status} onChange={(v) => { if (v) { setStatus(Array.isArray(v) ? v[0] : v); setPage(1) } }}>
                    <Segment.Item value="all">{tr("All")}</Segment.Item>
                    {STATUS.filter((x) => x.value !== 5).map((x) => <Segment.Item key={x.value} value={String(x.value)}>{x.label}{data.counts[x.value] && status === 'all' ? ` ${data.counts[x.value]}` : ''}</Segment.Item>)}
                </Segment>
                <div className="w-36"><Select size="sm" isSearchable={false} options={dateOptions} value={dateOptions.find((o) => o.value === dateField)} onChange={(o) => setDateField(o.value)} /></div>
                <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1) }} aria-label={tr("From")} className="pj-date" />
                <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1) }} aria-label={tr("To")} className="pj-date" />
                {(from || to) && <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => { setFrom(''); setTo('') }}>{tr("Clear dates")}</button>}
                <span className="cx-spacer" />
                <div className="w-40"><Select size="sm" isSearchable={false} options={sortOptions} value={sortOptions.find((o) => o.value === sortKey)} onChange={(o) => { setSortKey(o.value); setPage(1) }} /></div>
                <Segment size="sm" value={view} onChange={(v) => v && setViewSaved(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="grid"><span className="inline-flex items-center gap-1"><TbLayoutGrid />{tr("Grid")}</span></Segment.Item>
                    <Segment.Item value="table"><span className="inline-flex items-center gap-1"><TbTable />{tr("Table")}</span></Segment.Item>
                </Segment>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            {view === 'grid' ? (
                <div className="rp-cx">
                    <div className="cx-grid">{rows.map((p, i) => card(p, i))}</div>
                    {loading && !rows.length && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                    {!loading && !rows.length && <div className="py-10 text-center text-gray-400">{tr("No projects found")}</div>}
                </div>
            ) : (
                <AdaptiveCard>
                    <div className="overflow-x-auto">
                        <Table hoverable>
                            <THead><Tr><Th>{tr("Project")}</Th><Th>{tr("Client")}</Th><Th>{tr("Status")}</Th><Th>{tr("Start date")}</Th><Th>{tr("Deadline")}</Th><Th>{tr("Progress")}</Th><Th>{tr("Tasks")}</Th><Th>{tr("Time logged")}</Th><Th>{tr("Members")}</Th><Th className="w-12" /></Tr></THead>
                            <TBody>
                                {rows.map((p) => (
                                    <Tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/crm/projects/${p.id}`)}>
                                        <Td><div className="flex items-center gap-3"><span className={`cx-logo cx-logo--${toneOf(p.name)} cx-logo--sm`}>{initials(p.name)}</span><span className="font-semibold">{p.name}</span></div></Td>
                                        <Td>{p.client?.name || <span className="text-gray-400">—</span>}</Td>
                                        <Td>{stateChip(p)}</Td>
                                        <Td className="whitespace-nowrap">{fmt(p.startDate)}</Td>
                                        <Td className={`whitespace-nowrap ${p.overdue ? 'font-semibold text-red-500' : ''}`}>{fmt(p.deadline)}</Td>
                                        <Td className="w-40"><span className="flex items-center gap-2"><span className="cx-meter"><i className="pine" style={{ transform: `scaleX(${Math.max(p.progress, 2) / 100})` }} /></span><b className="text-xs">{p.progress}%</b></span></Td>
                                        <Td className="whitespace-nowrap">{p.tasksDone} / {p.tasksTotal}</Td>
                                        <Td className="whitespace-nowrap">{hours(p.seconds)}</Td>
                                        <Td onClick={(e) => e.stopPropagation()}>{p.members.length ? <UsersAvatarGroup users={members(p)} /> : <span className="text-gray-400">—</span>}</Td>
                                        <Td className="text-right" onClick={(e) => e.stopPropagation()}>{dots(p)}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                        {!loading && !rows.length && <div className="py-10 text-center text-gray-400">{tr("No projects found")}</div>}
                    </div>
                </AdaptiveCard>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-gray-500">{sorted.length ? tr("{v1}–{v2} of {total}", { v1: (page - 1) * pageSize + 1, v2: Math.min(page * pageSize, sorted.length), total: sorted.length }) : ''}</span>
                <Pagination total={sorted.length} pageSize={pageSize} currentPage={page} onChange={setPage} />
            </div>

            {menu && <RowMenu anchor={menu.el} items={items(menu.row)} onClose={() => setMenu(null)} />}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this project?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const p = del; setDel(null); remove(p) }}>
                <p>{del?.name}</p>
            </ConfirmDialog>
            <ProjectDialog open={dialog} onClose={() => setDialog(false)} onCreated={(id) => navigate(`/crm/projects/${id}`)} />
        </Container>
    )
}

export default ProjectsList

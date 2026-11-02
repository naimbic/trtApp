/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowRight, TbBulb, TbChecklist, TbDots, TbFilter, TbPlus, TbSearch, TbSettings, TbCalendarDue, TbBuilding, TbLayoutGrid } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { api, notify } from '../kit/api'
import TaskDrawer from '../tasks/TaskDrawer'
import LeadDrawer from '../leads/LeadDrawer'
import { STATUS as TASK_STATUS, useTaskStatuses, PRIORITY } from '../tasks/shared'
import { STATUS as IDEA_STATUS } from '../clients/ClientIdeas'
import { tr } from '@/utils/t'

// One adapter per kind: where its statuses and items come from, how an item is moved, how it is opened.
const KINDS = {
    tasks: { title: 'Tasks', icon: <TbChecklist />, manage: '/crm/task-statuses', addLabel: 'New task', feature: 'tasks' },
    leads: { title: 'Leads', icon: <TbFilter />, manage: '/crm/lead-statuses', addLabel: 'New lead', feature: 'leads' },
    ideas: { title: 'Ideas', icon: <TbBulb />, manage: null, addLabel: '', feature: 'client_ideas' },
}
const IDEA_COLORS = { draft: '#9ca3af', proposed: '#3b82f6', interested: '#0ea5e9', approved: '#10b981', doing: '#f59e0b', done: '#15803d', declined: '#f43f5e' }

/** The statuses of a kind with their colour and how many items each holds, and the items themselves. */
function useStatusData(kind) {
    useTaskStatuses()
    const [d, setD] = useState({ loading: true, statuses: [], items: [], error: '', can: {}, lookups: null })
    const load = useCallback(async () => {
        try {
            if (kind === 'tasks') {
                const [r, lk] = await Promise.all([api('/api/crm/work/tasks?done=1&limit=1000'), api('/api/crm/work/tasks/lookups')])
                const items = r.list.map((t) => ({ id: t.id, key: String(t.status), title: t.name, sub: t.rel?.label || '', due: t.dueDate, tags: [PRIORITY.find((p) => p.value === t.priority)?.label].filter(Boolean), people: t.assignees || [], done: t.status === 5 }))
                const count = (v) => items.filter((i) => i.key === String(v)).length
                const statuses = TASK_STATUS.filter((s) => s.active || count(s.value)).map((s) => ({ key: String(s.value), name: s.label, color: s.color, count: count(s.value) }))
                setD({ loading: false, statuses, items, error: '', can: r.can || {}, lookups: lk })
            } else if (kind === 'leads') {
                const [r, lk] = await Promise.all([api('/api/crm/pipeline/leads?view=list&limit=1000'), api('/api/crm/pipeline/leads/lookups')])
                const items = r.list.map((l) => ({ id: l.id, key: String(l.statusId || ''), title: l.name || l.company || l.email || tr('Lead'), sub: [l.company, l.source].filter(Boolean).join(' · '), due: l.lastContact, tags: l.converted ? [tr('Client')] : [], people: l.assignees || [] }))
                const statuses = r.statuses.map((s) => ({ key: String(s.id), name: s.name, color: s.color || '#64748b', count: items.filter((i) => i.key === String(s.id)).length }))
                setD({ loading: false, statuses, items, error: '', can: r.can || {}, lookups: { staff: lk.staff || [] } })
            } else {
                const r = await api('/api/crm/client-ideas/overview')
                const items = r.list.map((i) => ({ id: i.id, clientId: i.clientId, key: i.status, title: i.title, sub: i.clientName, due: i.dueDate, tags: [i.visible ? tr('Shown to the client') : ''].filter(Boolean), people: [] }))
                const statuses = Object.entries(IDEA_STATUS).map(([k, v]) => ({ key: k, name: tr(v[0]), color: IDEA_COLORS[k], count: r.counts[k] || 0 }))
                setD({ loading: false, statuses, items, error: '', can: r.can || {}, lookups: null })
            }
        } catch (e) { setD((x) => ({ ...x, loading: false, error: e.message })) }
    }, [kind])
    useEffect(() => { setD((x) => ({ ...x, loading: true })); load() }, [load])
    return [d, load]
}

const Faces = ({ people }) => (
    <span className="flex -space-x-1.5">{(people || []).slice(0, 3).map((p, i) => <Avatar key={p.id || i} size={22} src={p.image || undefined} className="ring-2 ring-white dark:ring-gray-800">{(p.name || '?').slice(0, 1)}</Avatar>)}</span>
)

/** Every status of Tasks, Leads and Ideas as a card: its colour, how many items it holds, and a link to its own page. */
export const StatusOverview = () => {
    const [t] = useStatusData('tasks')
    const [l] = useStatusData('leads')
    const [i] = useStatusData('ideas')
    const sections = [['tasks', t], ['leads', l], ['ideas', i]]
    return (
        <Container>
            <div className="mb-4"><h3>{tr('Statuses')}</h3><p className="text-sm text-gray-500">{tr('Every status of Tasks, Leads and Ideas has its own page. A status you add in the settings gets its page automatically.')}</p></div>
            {sections.map(([kind, d]) => (
                <section key={kind} className="mb-8">
                    <div className="mb-2 flex items-center gap-2"><span className="text-xl text-primary">{KINDS[kind].icon}</span><h5 className="flex-1">{tr(KINDS[kind].title)}</h5>{KINDS[kind].manage && <Link to={KINDS[kind].manage} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary"><TbSettings />{tr('Manage statuses')}</Link>}</div>
                    {d.error ? <p className="text-sm text-gray-400">{d.error}</p> : d.loading ? <Spinner /> : (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                            {d.statuses.map((s) => (
                                <Link key={s.key} to={`/crm/status/${kind}/${s.key}`} className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800" style={{ borderTop: `4px solid ${s.color}` }}>
                                    <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} /><span className="min-w-0 flex-1 truncate font-bold">{s.name}</span><TbArrowRight className="text-gray-300 transition group-hover:text-primary" /></div>
                                    <div className="mt-2 text-3xl font-extrabold" style={{ color: s.color }}>{s.count}</div>
                                    <div className="text-xs text-gray-400">{tr(KINDS[kind].title)}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </Container>
    )
}

/** The page of one status: its items as a canvas of cards that can be opened, edited, added and moved to another status. */
export const StatusPage = () => {
    const { kind, key } = useParams()
    const nav = useNavigate()
    const k = KINDS[kind]
    const [d, load] = useStatusData(k ? kind : 'tasks')
    const [q, setQ] = useState('')
    const [drawer, setDrawer] = useState({ open: false, id: null, k: 0, preset: null })
    const status = d.statuses.find((s) => s.key === key)
    const items = useMemo(() => d.items.filter((i) => i.key === key && (!q.trim() || `${i.title} ${i.sub}`.toLowerCase().includes(q.trim().toLowerCase()))), [d.items, key, q])
    useEffect(() => { setQ('') }, [kind, key])
    if (!k) return <Container><p className="py-10 text-center text-gray-400">{tr('This page does not exist.')}</p></Container>
    const canAdd = kind === 'tasks' ? d.can.create !== false : kind === 'leads' ? true : false
    const canMove = kind === 'tasks' ? d.can.edit : kind === 'leads' ? true : d.can.edit

    const move = async (it, to) => {
        try {
            if (kind === 'tasks') await api('/api/crm/work/tasks/reorder', { method: 'POST', body: { status: +to, ids: [it.id] } })
            else if (kind === 'leads') await api('/api/crm/pipeline/leads/reorder', { method: 'POST', body: { statusId: to, ids: [it.id] } })
            else await api(`/api/crm/client-ideas/${it.id}/move`, { method: 'POST', body: { clientId: it.clientId, status: to } })
            notify('success', tr('Moved to {name}', { name: d.statuses.find((s) => s.key === to)?.name || '' }))
            load()
        } catch (e) { notify('danger', e.message) }
    }
    const open = (it) => {
        if (kind === 'ideas') return nav(`/crm/clients/${it.clientId}?tab=ideas&idea=${it.id}`)
        setDrawer({ open: true, id: it.id, k: Date.now(), preset: null })
    }
    const add = () => setDrawer({ open: true, id: null, k: Date.now(), preset: kind === 'tasks' ? { status: +key } : { statusId: key } })
    const stage = () => ({ columns: d.statuses.map((s) => ({ id: kind === 'tasks' ? +s.key : s.key, name: s.name, color: s.color })), currentId: kind === 'tasks' ? +key : key, onPick: canMove && drawer.id ? async (to) => { await move({ id: drawer.id }, String(to)); setDrawer((x) => ({ ...x, k: Date.now() })) } : undefined })

    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <Link to="/crm/statuses" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary"><TbLayoutGrid />{tr('All statuses')}</Link>
                    <h3 className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: status?.color || '#9ca3af' }} />{status?.name || tr('Status')}<span className="text-base font-normal text-gray-400">· {tr(k.title)}</span></h3>
                    <p className="text-sm text-gray-500">{items.length}{status && items.length !== status.count ? ` / ${status.count}` : ''}</p>
                </div>
                <div className="w-60"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                {canAdd && <Button variant="solid" icon={<TbPlus />} onClick={add}>{tr(k.addLabel)}</Button>}
                {k.manage && <Link to={k.manage}><Button icon={<TbSettings />}>{tr('Manage statuses')}</Button></Link>}
            </div>
            <div className="mb-5 flex flex-wrap gap-1.5">
                {d.statuses.map((s) => (
                    <Link key={s.key} to={`/crm/status/${kind}/${s.key}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition ${s.key === key ? 'text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'}`} style={s.key === key ? { background: s.color, borderColor: s.color } : undefined}>
                        {s.key !== key && <span className="size-2 rounded-full" style={{ background: s.color }} />}{s.name}<span className="opacity-70">{s.count}</span>
                    </Link>
                ))}
            </div>
            {d.loading ? <div className="py-12 text-center"><Spinner size={32} /></div> : d.error ? <p className="py-10 text-center text-gray-400">{d.error}</p> : !status ? <p className="py-10 text-center text-gray-400">{tr('This status does not exist (any more).')}</p> : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {items.map((it) => (
                        <div key={it.id} role="button" tabIndex={0} onClick={() => open(it)} onKeyDown={(e) => { if (e.key === 'Enter') open(it) }} className="group relative min-w-0 cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800" style={{ borderTop: `3px solid ${status.color}` }}>
                            <div className="flex items-start gap-2"><div className="min-w-0 flex-1 break-words font-bold leading-snug">{it.title}</div>
                                {canMove && (
                                    <div onClick={(e) => e.stopPropagation()} className="opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                                        <Dropdown placement="bottom-end" renderTitle={<button type="button" aria-label={tr('Options')} className="grid size-7 place-items-center rounded-full text-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbDots /></button>}>
                                            <Dropdown.Item variant="header"><span className="px-3 text-xs font-semibold text-gray-400">{tr('Move to…')}</span></Dropdown.Item>
                                            {d.statuses.filter((s) => s.key !== key).map((s) => <Dropdown.Item key={s.key} eventKey={s.key} onClick={() => move(it, s.key)}><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span></Dropdown.Item>)}
                                        </Dropdown>
                                    </div>
                                )}
                            </div>
                            {it.sub && <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">{kind === 'ideas' && <TbBuilding className="shrink-0" />}{it.sub}</div>}
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                                {it.tags.map((t) => <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">{t}</span>)}
                                {it.due && <span className="inline-flex items-center gap-1"><TbCalendarDue />{dayjs(it.due).format('DD MMM')}</span>}
                                <span className="ms-auto"><Faces people={it.people} /></span>
                            </div>
                        </div>
                    ))}
                    {!items.length && <p className="col-span-full py-10 text-center text-gray-400">{tr('Nothing in this status.')}</p>}
                </div>
            )}
            {kind === 'tasks' && <TaskDrawer open={drawer.open} id={drawer.id} staff={d.lookups?.staff || []} refreshKey={drawer.k} stage={drawer.id ? stage() : undefined} presets={{ ...(drawer.preset || {}), ...(d.lookups?.defaults ? { priority: d.lookups.defaults.priority, billable: d.lookups.defaults.billable, assigneeIds: d.lookups.defaults.assignMe && d.lookups.me ? [d.lookups.me] : [] } : {}) }} onClose={() => setDrawer((x) => ({ ...x, open: false }))} onChanged={load} />}
            {kind === 'leads' && <LeadDrawer open={drawer.open} id={drawer.id} staff={d.lookups?.staff || []} presets={drawer.preset} refreshKey={drawer.k} stage={drawer.id ? stage() : undefined} onClose={() => setDrawer((x) => ({ ...x, open: false }))} onChanged={load} />}
        </Container>
    )
}

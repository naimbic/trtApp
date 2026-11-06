/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { TbPlus, TbBuilding, TbCoin, TbCreditCard, TbPercentage, TbTag, TbBulb, TbShieldCheck, TbUsersGroup, TbBeach, TbBroadcast, TbChevronDown, TbFlag, TbListDetails, TbMessageCircleCog, TbProgressCheck, TbSettings, TbShieldX, TbTool } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import { getResource } from '@/lib/crm/resources'
import LookupManager from '../kit/LookupManager'
import { useCan } from '../kit/api'
import { tr } from '@/utils/t'

// Every settings list that is a short set of named items, on one page: one accordion per list, each edited in place (type, switch,
// colour, drag the handle, add at the top; autosaved, paged). The chips filter by area; each menu's "... setting" entry opens this page on its area.
const AREAS = [
    ['sales', 'Sales', ['currencies', 'taxes', 'payment-modes']],
    ['customers', 'Customers', ['customer-groups', 'idea-categories', 'consent-purposes']],
    ['leads', 'Leads', ['lead-statuses', 'lead-sources']],
    ['tasks', 'Tasks', ['task-statuses']],
    ['support', 'Support', ['ticket-statuses', 'ticket-priorities', 'services', 'predefined-replies', 'spam-filters']],
    ['team', 'Team', ['departments', 'leave-types']],
    ['general', 'General', ['tags']],
]
const AREA_OF = Object.fromEntries(AREAS.flatMap(([a, , keys]) => keys.map((k) => [k, a])))
const ICONS = { currencies: TbCoin, taxes: TbPercentage, 'payment-modes': TbCreditCard, departments: TbBuilding, tags: TbTag, 'customer-groups': TbUsersGroup, 'idea-categories': TbBulb, 'consent-purposes': TbShieldCheck, 'lead-statuses': TbListDetails, 'lead-sources': TbBroadcast, 'task-statuses': TbListDetails, 'ticket-statuses': TbProgressCheck, 'ticket-priorities': TbFlag, services: TbTool, 'predefined-replies': TbMessageCircleCog, 'spam-filters': TbShieldX, 'leave-types': TbBeach }
const BADGE = { Sales: 'bg-teal-500', Setup: 'bg-violet-500', Customers: 'bg-indigo-500', Leads: 'bg-blue-500', Tasks: 'bg-emerald-500', Support: 'bg-amber-500', Administration: 'bg-rose-500' }
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)) } catch { return null } }

/** One list: a coloured header with its name and size, the editable rows when open (loaded the first time it opens). */
const TINT = { Sales: 'bg-teal-50 dark:bg-teal-500/10', Customers: 'bg-indigo-50 dark:bg-indigo-500/10', Leads: 'bg-blue-50 dark:bg-blue-500/10', Tasks: 'bg-emerald-50 dark:bg-emerald-500/10', Support: 'bg-amber-50 dark:bg-amber-500/10', Administration: 'bg-rose-50 dark:bg-rose-500/10', Setup: 'bg-violet-50 dark:bg-violet-500/10' }
const ListBlock = ({ resource, open, onToggle, can }) => {
    const [add, setAdd] = useState(0)
    const [count, setCount] = useState(null)
    const [seen, setSeen] = useState(open)
    useEffect(() => { if (open) setSeen(true) }, [open])
    const wf = resource.writeFeature || resource.feature
    const Icon = ICONS[resource.key] || TbSettings
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" data-list={resource.key}>
            <div className={`flex items-center ${TINT[resource.group] || ''}`}>
            <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-start transition hover:bg-black/[0.03] dark:hover:bg-white/5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base text-white ${BADGE[resource.group] || 'bg-violet-500'}`}><Icon /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold heading-text">{tr(resource.plural)}</span></span>
                {count !== null && <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">{count}</span>}
                <TbChevronDown className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {can(wf, 'create') && <button type="button" aria-label={tr('Add')} title={tr('Add')} onClick={() => { setAdd((n) => n + 1); if (!open) onToggle() }} className="me-3 ms-1 grid size-8 shrink-0 place-items-center rounded-full bg-white text-lg text-gray-600 shadow-sm transition hover:bg-primary hover:text-white dark:bg-gray-700 dark:text-gray-200"><TbPlus /></button>}
            </div>
            {seen && (
                <div className={open ? 'border-t border-gray-100 p-3 dark:border-gray-700' : 'hidden'}>
                    <LookupManager resource={resource} canCreate={can(wf, 'create')} canEdit={can(wf, 'edit')} canDelete={can(wf, 'delete')} onCount={setCount} addSignal={add} />
                </div>
            )}
        </div>
    )
}

const ListsPage = () => {
    const { pathname } = useLocation()
    const [params, setParams] = useSearchParams()
    const can = useCan()
    const slug = pathname.replace(/^\/crm\//, '')
    const wanted = params.get('open') || (AREA_OF[slug] ? slug : '')
    const area = params.get('area') || (slug === 'customers-setting' ? 'customers' : AREA_OF[wanted] || 'all')
    const visible = useMemo(() => AREAS.map(([id, label, keys]) => ({ id, label, lists: keys.map(getResource).filter((r) => r && (!r.feature || can(r.feature, 'view') || can(r.feature, 'view_own'))) })).filter((a) => a.lists.length), [can])
    const lists = visible.filter((a) => area === 'all' || a.id === area).flatMap((a) => a.lists)
    const memo = `lists.open.${area}`
    const [open, setOpen] = useState(() => {
        if (wanted) return [wanted]
        const saved = store(memo)
        return Array.isArray(saved) ? saved : [lists[0]?.key].filter(Boolean)
    })
    const first = useRef(true)
    useEffect(() => { if (first.current) { first.current = false; return } store(memo, open) }, [open, memo])
    useEffect(() => { if (wanted) setOpen((o) => (o.includes(wanted) ? o : [...o, wanted])) }, [wanted])
    useEffect(() => { if (wanted) setTimeout(() => document.querySelector(`[data-list="${wanted}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 150) }, [wanted])
    useEffect(() => { // moving to another area opens what was open there, or its first list
        const saved = store(memo)
        setOpen(wanted && lists.some((r) => r.key === wanted) ? [wanted] : Array.isArray(saved) ? saved : [lists[0]?.key].filter(Boolean))
    }, [area]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!visible.length) return <Navigate to="/access-denied" replace />
    const toggle = (k) => setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))
    const allOpen = lists.length > 0 && lists.every((r) => open.includes(r.key))
    const pick = (id) => { const next = new URLSearchParams(); if (id !== 'all') next.set('area', id); setParams(next, { replace: true }) }
    const chip = (on) => `rounded-full px-3 py-1 text-sm font-semibold transition ${on ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`
    return (
        <Container>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr('Lists & statuses')}</h3><p className="text-sm text-gray-500">{tr('All the short lists of the CRM in one place. Open one, edit it in place — every change is saved as you make it.')}</p></div>
                {lists.length > 1 && <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setOpen(allOpen ? [] : lists.map((r) => r.key))}>{allOpen ? tr('Collapse all') : tr('Expand all')}</button>}
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
                <button type="button" className={chip(area === 'all')} onClick={() => pick('all')}>{tr('All')}</button>
                {visible.map((a) => <button key={a.id} type="button" className={chip(area === a.id)} onClick={() => pick(a.id)}>{tr(a.label)}</button>)}
            </div>
            <div className="flex flex-col gap-3">
                {lists.map((r) => <ListBlock key={r.key} resource={r} open={open.includes(r.key)} onToggle={() => toggle(r.key)} can={can} />)}
            </div>
        </Container>
    )
}

export default ListsPage

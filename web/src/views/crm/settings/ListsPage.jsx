/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { TbBulb, TbShieldCheck, TbUsersGroup, TbBeach, TbBroadcast, TbChevronDown, TbFlag, TbListDetails, TbMessageCircleCog, TbProgressCheck, TbSettings, TbShieldX, TbTool } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import { getResource } from '@/lib/crm/resources'
import LookupManager from '../kit/LookupManager'
import { useCan } from '../kit/api'
import { tr } from '@/utils/t'

// Every settings list that is a short set of named items (statuses, sources, priorities, services, replies, filters), on one
// page: one accordion per list, each edited in place (type, switch, colour, drag the handle, add at the top; autosaved).
// A page is a "scope": the lists it shows. The address decides the scope, so the menu can have one short item per topic.
const SCOPES = {
    customers: { title: 'Customers setting', sub: 'Customer groups, idea categories and consent purposes. Every change is saved as you make it.', lists: ['customer-groups', 'idea-categories', 'consent-purposes'] },
    all: {
        title: 'Lists & statuses', sub: 'All the short lists of the CRM in one place. Open one, edit it in place — every change is saved as you make it.',
        lists: ['lead-statuses', 'lead-sources', 'task-statuses', 'ticket-statuses', 'ticket-priorities', 'services', 'predefined-replies', 'spam-filters', 'leave-types'],
    },
}
const CUSTOMER_LISTS = SCOPES.customers.lists
const ICONS = { 'customer-groups': TbUsersGroup, 'idea-categories': TbBulb, 'consent-purposes': TbShieldCheck, 'lead-statuses': TbListDetails, 'lead-sources': TbBroadcast, 'task-statuses': TbListDetails, 'ticket-statuses': TbProgressCheck, 'ticket-priorities': TbFlag, services: TbTool, 'predefined-replies': TbMessageCircleCog, 'spam-filters': TbShieldX, 'leave-types': TbBeach }
const BADGE = { Customers: 'bg-indigo-500', Leads: 'bg-blue-500', Tasks: 'bg-emerald-500', Support: 'bg-amber-500', Administration: 'bg-rose-500' }
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)) } catch { return null } }

/** One list: a coloured header with its name and size, the editable rows when open (loaded the first time it opens). */
const ListBlock = ({ resource, open, onToggle, can }) => {
    const [count, setCount] = useState(null)
    const [seen, setSeen] = useState(open)
    useEffect(() => { if (open) setSeen(true) }, [open])
    const wf = resource.writeFeature || resource.feature
    const Icon = ICONS[resource.key] || TbSettings
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" data-list={resource.key}>
            <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base text-white ${BADGE[resource.group] || 'bg-violet-500'}`}><Icon /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold heading-text">{tr(resource.plural)}</span></span>
                {count !== null && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">{count}</span>}
                <TbChevronDown className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {seen && (
                <div className={open ? 'border-t border-gray-100 p-3 dark:border-gray-700' : 'hidden'}>
                    <LookupManager resource={resource} canCreate={can(wf, 'create')} canEdit={can(wf, 'edit')} canDelete={can(wf, 'delete')} onCount={setCount} />
                </div>
            )}
        </div>
    )
}

const ListsPage = () => {
    const { pathname } = useLocation()
    const [params] = useSearchParams()
    const can = useCan()
    const slug = pathname.replace(/^\/crm\//, '')
    const scopeKey = slug === 'customers-setting' || CUSTOMER_LISTS.includes(slug) ? 'customers' : 'all'
    const scope = SCOPES[scopeKey]
    const lists = useMemo(() => scope.lists.map(getResource).filter((r) => r && (!r.feature || can(r.feature, 'view') || can(r.feature, 'view_own'))), [scope, can])
    const wanted = params.get('open') || (scope.lists.includes(slug) ? slug : '')
    const memo = `lists.open.${scopeKey}`
    const [open, setOpen] = useState(() => {
        if (wanted) return [wanted]
        const saved = store(memo)
        return Array.isArray(saved) ? saved : [scope.lists[0]]
    })
    const first = useRef(true)
    useEffect(() => { if (first.current) { first.current = false; return } store(memo, open) }, [open, memo])
    useEffect(() => { if (wanted) setOpen((o) => (o.includes(wanted) ? o : [...o, wanted])) }, [wanted])
    useEffect(() => { if (wanted) setTimeout(() => document.querySelector(`[data-list="${wanted}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 150) }, [wanted])

    if (!lists.length) return <Navigate to="/access-denied" replace />
    const toggle = (k) => setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))
    const allOpen = lists.every((r) => open.includes(r.key))
    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><h3>{tr(scope.title)}</h3><p className="text-sm text-gray-500">{tr(scope.sub)}</p></div>
                {lists.length > 1 && <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setOpen(allOpen ? [] : lists.map((r) => r.key))}>{allOpen ? tr('Collapse all') : tr('Expand all')}</button>}
            </div>
            <div className="flex flex-col gap-3">
                {lists.map((r) => <ListBlock key={r.key} resource={r} open={open.includes(r.key)} onToggle={() => toggle(r.key)} can={can} />)}
            </div>
        </Container>
    )
}

export default ListsPage

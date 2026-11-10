import { useEffect, useMemo, useState, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { PiXBold, PiMagnifyingGlassBold, PiCaretDownBold, PiCaretRightBold } from 'react-icons/pi'
import NavToggle from '@/components/shared/NavToggle'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon'
import navigationConfig from '@/configs/navigation.config'
import appConfig from '@/configs/app.config'
import { NAV_DESC } from '@/components/template/rapport/navDescriptions'
import { NAV_ITEM_TYPE_TITLE, NAV_ITEM_TYPE_COLLAPSE } from '@/constants/navigation.constant'
import { useRouteKeyStore } from '@/store/routeKeyStore'
import { useSessionUser } from '@/store/authStore'
import useTranslation from '@/utils/hooks/useTranslation'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

const DashboardFilters = lazy(() => import('@/components/template/DashboardFilters'))
const MobileNavToggle = withHeaderItem(NavToggle)

const allowed = (nav, user) => !nav.authority?.length || !user?.length || nav.authority.some((a) => user.includes(a))
/** The keys of the groups that hold the page being looked at, so they open by themselves. */
const trail = (tree, key, path = []) => {
    for (const n of tree || []) {
        if (n.key === key) return path
        const hit = trail(n.subMenu, key, [...path, n.key])
        if (hit) return hit
    }
    return null
}

/**
 * The menu on a phone or a tablet: a full-screen sheet (close button on top, a search box, the list scrolls) with the
 * groups of the app as tiles; a group opens to show its pages, each with a short line saying what it is for.
 */
const MobileNav = ({ translationSetup = appConfig.activeNavTranslation, filters = false }) => {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState('')
    const [expanded, setExpanded] = useState([])
    const routeKey = useRouteKeyStore((s) => s.currentRouteKey)
    const user = useSessionUser((s) => s.user.authority)
    const { t } = useTranslation(!translationSetup)
    const label = (n) => t(n.translateKey, n.title) || n.title

    useEffect(() => {
        if (!open) return undefined
        setQ(''); setExpanded(trail(navigationConfig, routeKey) || [])
        const old = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', esc)
        return () => { document.body.style.overflow = old; window.removeEventListener('keydown', esc) }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const close = () => setOpen(false)
    const toggle = (key) => setExpanded((k) => (k.includes(key) ? k.filter((x) => x !== key) : [...k, key]))

    // search: every page whose name matches, with the group it belongs to
    const found = useMemo(() => {
        const text = q.trim().toLowerCase()
        if (!text) return null
        const out = []
        const walk = (tree, parent) => {
            for (const n of tree || []) {
                if (!allowed(n, user)) continue
                if (n.path && !n.subMenu?.length && label(n).toLowerCase().includes(text)) out.push({ n, parent })
                walk(n.subMenu, n.type === NAV_ITEM_TYPE_TITLE ? parent : label(n))
            }
        }
        walk(navigationConfig, '')
        return out
    }, [q, user]) // eslint-disable-line react-hooks/exhaustive-deps

    const Page = ({ n, depth = 0, caption }) => {
        const active = routeKey === n.key
        const desc = NAV_DESC[n.key]
        return (
            <Link to={n.path} target={n.isExternalLink ? '_blank' : undefined} onClick={close} className={classNames('flex items-center gap-3 rounded-xl py-2.5 pe-2 active:bg-gray-100 dark:active:bg-gray-700', active ? 'bg-primary/10 text-primary' : '', depth ? 'ps-3' : 'ps-2')}>
                {depth === 0 || n.icon ? (
                    <span className={classNames('grid shrink-0 place-items-center rounded-xl text-xl', depth ? 'size-9' : 'size-10', active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}><VerticalMenuIcon icon={n.icon} /></span>
                ) : <span className={classNames('ms-1 size-1.5 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600')} />}
                <span className="min-w-0 flex-1 leading-tight">
                    <span className={classNames('block truncate text-[15px]', active ? 'font-bold' : 'font-semibold')}>{label(n)}</span>
                    {(caption || desc) && <span className="block truncate text-xs text-gray-400">{caption || tr(desc)}</span>}
                </span>
                {active ? <span className="size-2 shrink-0 rounded-full bg-primary" /> : <PiCaretRightBold className="shrink-0 text-gray-300" />}
            </Link>
        )
    }

    const Group = ({ n, depth = 0 }) => {
        const kids = (n.subMenu || []).filter((c) => allowed(c, user))
        if (!kids.length) return null
        const isOpen = expanded.includes(n.key)
        const holdsActive = (trail(navigationConfig, routeKey) || []).includes(n.key)
        return (
            <div className={depth ? 'ms-3 border-s border-gray-100 ps-1 dark:border-gray-700' : ''}>
                <button type="button" onClick={() => toggle(n.key)} aria-expanded={isOpen} className={classNames('flex w-full items-center gap-3 rounded-xl py-2.5 pe-2 text-start active:bg-gray-100 dark:active:bg-gray-700', depth ? 'ps-2' : 'ps-2')}>
                    {n.icon ? <span className={classNames('grid size-10 shrink-0 place-items-center rounded-xl text-xl', holdsActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}><VerticalMenuIcon icon={n.icon} /></span> : null}
                    <span className={classNames('min-w-0 flex-1 truncate text-[15px]', depth && !n.icon ? 'text-xs font-bold uppercase tracking-wide text-gray-400' : 'font-semibold', holdsActive && 'text-primary')}>{label(n)}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">{kids.filter((c) => !c.subMenu?.length).length || kids.length}</span>
                    <PiCaretDownBold className={classNames('shrink-0 text-gray-400 transition', isOpen && 'rotate-180')} />
                </button>
                {isOpen && <div className="pb-1">{kids.map((c) => (c.subMenu?.length ? <Group key={c.key} n={c} depth={depth + 1} /> : <Page key={c.key} n={c} depth={depth + 1} />))}</div>}
            </div>
        )
    }

    const renderTop = (tree) => tree.filter((n) => allowed(n, user)).map((n) => {
        if (n.type === NAV_ITEM_TYPE_TITLE) {
            const inner = renderTop(n.subMenu || [])
            return inner.some(Boolean) ? <div key={n.key}><div className="px-2 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{label(n)}</div>{inner}</div> : null
        }
        if (n.type === NAV_ITEM_TYPE_COLLAPSE || n.subMenu?.length) return <Group key={n.key} n={n} />
        return <Page key={n.key} n={n} />
    })

    return (
        <>
            <div className="text-2xl" onClick={() => setOpen(true)}><MobileNavToggle toggled={open} /></div>
            {open && createPortal(
                <div className="fixed inset-0 z-[1000] flex flex-col bg-white dark:bg-gray-800" role="dialog" aria-modal="true" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                    <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                        <span className="text-base font-bold">{tr('Navigation')}</span>
                        <button type="button" aria-label={tr('Close')} onClick={close} className="ms-auto grid size-10 place-items-center rounded-xl bg-gray-100 text-xl text-gray-600 active:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"><PiXBold /></button>
                    </div>
                    <div className="shrink-0 px-4 pb-2 pt-3">
                        <label className="flex h-11 items-center gap-2 rounded-xl bg-gray-100 px-3 text-gray-500 dark:bg-gray-700">
                            <PiMagnifyingGlassBold className="shrink-0 text-lg" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search a page')} aria-label={tr('Search a page')} className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100" />
                            {q && <button type="button" aria-label={tr('Clear')} onClick={() => setQ('')} className="grid size-6 place-items-center rounded-full text-gray-400"><PiXBold /></button>}
                        </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
                        {found ? (
                            found.length ? found.map(({ n, parent }) => <Page key={n.key} n={n} caption={parent} />) : <p className="py-10 text-center text-sm text-gray-400">{tr('Nothing found')}</p>
                        ) : (
                            <>
                                {filters && <Suspense fallback={null}><div className="mb-2 rounded-2xl bg-gray-50 dark:bg-gray-700/40"><DashboardFilters stacked /></div></Suspense>}
                                {renderTop(navigationConfig)}
                            </>
                        )}
                    </div>
                </div>, document.body)}
        </>
    )
}

export default MobileNav

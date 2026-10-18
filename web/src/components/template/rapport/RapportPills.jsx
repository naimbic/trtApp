/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { PiCaretDownBold, PiArrowUpRightBold } from 'react-icons/pi'
import { NAV_DESC } from './navDescriptions'
import navigationConfig from '@/configs/navigation.config'
import navigationIcon from '@/configs/navigation-icon.config'
import appConfig from '@/configs/app.config'
import useTranslation from '@/utils/hooks/useTranslation'
import { useSessionUser } from '@/store/authStore'
import { NAV_ITEM_TYPE_COLLAPSE } from '@/constants/navigation.constant'
import { tr } from '@/utils/t'

const allowed = (authority = [], user = []) => !authority.length || !user.length || authority.some((a) => user.includes(a))
const MAX_PILLS = 6

/** The sections of a group: its own links first, then its sub-sections (Items & catalog, Finance...). */
const sectionsOf = (group, ok) => {
    const own = [], subs = []
    for (const n of group.subMenu || []) {
        if (!ok(n)) continue
        if (n.type === NAV_ITEM_TYPE_COLLAPSE && n.subMenu?.length) subs.push({ title: n, items: n.subMenu.filter(ok) })
        else own.push(n)
    }
    return [...(own.length ? [{ title: null, items: own }] : []), ...subs.filter((s) => s.items.length)]
}
const pathsOf = (sections) => sections.flatMap((s) => s.items.map((i) => i.path).filter(Boolean))
const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`)

/**
 * The pill navigation of the Rapport layout: Dashboard, then the CRM groups the person may open (the rest under "More"); a pill opens
 * a panel with its links. The dark pill slides to the page you are on. Built from the same menu as the side menu, so authority holds.
 */
const RapportPills = () => {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const user = useSessionUser((s) => s.user.authority) || []
    const { t } = useTranslation(!appConfig.activeNavTranslation)
    const [open, setOpen] = useState(null)
    const box = useRef(null)
    const timer = useRef(null)
    const reduce = useReducedMotion()

    const pills = useMemo(() => {
        const ok = (n) => allowed(n.authority, user)
        const top = (key) => navigationConfig.find((n) => n.key === key && ok(n))
        const crm = navigationConfig.find((n) => n.key === 'crm')
        const groups = (crm?.subMenu || []).filter(ok).map((g) => ({ key: g.key, node: g, sections: sectionsOf(g, ok) })).filter((g) => g.sections.length)
        const first = top('dashboard') || top('team-dashboard')
        const extras = [top('team-dashboard') !== first && top('team-dashboard'), top('calendar'), top('chat'), top('team')].filter(Boolean)
        const shown = groups.slice(0, MAX_PILLS), rest = groups.slice(MAX_PILLS)
        const list = []
        if (first) list.push({ key: first.key, node: first, link: first.path })
        // a group pill leads to the group's main page (the first link of its menu): Customers → Clients, Leads → Leads…
        shown.forEach((g) => list.push({ ...g, main: g.sections[0]?.items[0]?.path }))
        const moreSections = [...rest.flatMap((g) => [{ title: g.node, items: g.sections.flatMap((s) => s.items) }]), ...(extras.length ? [{ title: null, items: extras }] : [])]
        if (moreSections.length) list.push({ key: 'more', node: { title: tr('More'), translateKey: 'nav.more' }, sections: moreSections })
        return list
    }, [user.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

    // which pill the current page belongs to: the longest matching link wins
    const activeKey = useMemo(() => {
        let best = null, len = -1
        for (const p of pills) {
            const paths = p.link ? [p.link] : pathsOf(p.sections)
            for (const path of paths) if (matches(pathname, path) && path.length > len) { best = p.key; len = path.length }
        }
        return best
    }, [pills, pathname])

    useEffect(() => setOpen(null), [pathname])
    useEffect(() => {
        if (!open) return undefined
        const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(null) }
        const esc = (e) => { if (e.key === 'Escape') setOpen(null) }
        document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
    }, [open])

    const enter = (key) => { clearTimeout(timer.current); if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) timer.current = setTimeout(() => setOpen(key), 90) }
    const leave = () => { clearTimeout(timer.current); if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) timer.current = setTimeout(() => setOpen(null), 180) }
    // a wide panel never leaves the window: slide it back by what sticks out
    const keepInside = (el) => { if (!el) return; el.style.translate = ''; const r = el.getBoundingClientRect(); const over = r.right - (window.innerWidth - 16), under = 16 - r.left; el.style.translate = over > 0 ? `${-over}px` : under > 0 ? `${under}px` : '' }
    const label = (n) => t(n.translateKey, n.title)
    const desc = (n) => (NAV_DESC[String(n.key).replace(/^crm\./, '')] ? tr(NAV_DESC[String(n.key).replace(/^crm\./, '')]) : null)
    // the light under the pointer: the row glows where the mouse is
    const glow = (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`) }

    return (
        <LayoutGroup id="rp-pills">
            <nav ref={box} className="rp-pillbar" aria-label={tr('Main navigation')}>
                {pills.map((p, i) => {
                    const active = activeKey === p.key
                    const bg = active && <motion.span layoutId="rp-pill-bg" className="rp-pill-bg" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }} />
                    if (p.link) return <Link key={p.key} to={p.link} className="rp-pill" data-active={active}>{bg}<span>{label(p.node)}</span></Link>
                    const endAlign = i > pills.length / 2
                    return (
                        <div key={p.key} className="relative" onMouseEnter={() => enter(p.key)} onMouseLeave={leave}>
                            <button type="button" className="rp-pill" data-active={active} aria-haspopup="true" aria-expanded={open === p.key} onClick={() => { if (p.main && window.matchMedia('(hover: hover) and (pointer: fine)').matches) { clearTimeout(timer.current); setOpen(null); navigate(p.main) } else setOpen(open === p.key ? null : p.key) }} onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(p.key) } }}>
                                {bg}<span>{label(p.node)}<PiCaretDownBold style={{ fontSize: 10, opacity: 0.6, transform: open === p.key ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /></span>
                            </button>
                            <AnimatePresence>
                                {open === p.key && (
                                    <motion.div key="panel" ref={keepInside} className="rp-panel" style={endAlign ? { insetInlineEnd: 0 } : { insetInlineStart: 0 }}
                                        initial={reduce ? false : { opacity: 0, y: -14, scale: 0.96, clipPath: 'inset(0 0 100% 0 round 22px)' }}
                                        animate={{ opacity: 1, y: 0, scale: 1, clipPath: 'inset(0 0 0% 0 round 22px)', transition: reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32, staggerChildren: 0.055, delayChildren: 0.05 } }}
                                        exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}>
                                        <div className="rp-panel-grid" style={{ '--cols': Math.min(p.sections.length, 3) }}>
                                            {p.sections.map((s, n) => (
                                                <motion.section key={n} className="rp-card" variants={reduce ? undefined : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 30 } } }} initial="hidden" animate="show">
                                                    <header className="rp-card-h"><h6>{label(s.title || p.node)}</h6><em>{s.items.length}</em></header>
                                                    <div className="rp-card-list">
                                                        {s.items.map((it, i) => (
                                                            <Link key={it.key} to={it.path} className="rp-link" style={{ '--i': Math.min(i, 12) }} data-active={matches(pathname, it.path)} target={it.isExternalLink ? '_blank' : undefined} onPointerMove={glow}>
                                                                <span className="ico">{navigationIcon[it.icon] || <span className="rp-ico-dot" />}</span>
                                                                <span className="rp-link-t"><b>{label(it)}</b>{desc(it) && <small>{desc(it)}</small>}</span>
                                                                <PiArrowUpRightBold className="rp-link-go" />
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </motion.section>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </nav>
        </LayoutGroup>
    )
}

export default RapportPills

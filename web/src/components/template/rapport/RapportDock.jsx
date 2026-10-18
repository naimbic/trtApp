/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { Link, useLocation } from 'react-router'
import DockFilters from './DockFilters'
import { hasPageFilter } from '@/store/pageFilterStore'
import { PiUsersThreeDuotone, PiCalendarBlankDuotone, PiChatsDuotone, PiChartBarDuotone, PiSparkleDuotone, PiSunDuotone, PiMoonDuotone } from 'react-icons/pi'
import Tooltip from '@/components/ui/Tooltip'
import Search from '@/components/template/Search'
import SettingsMenu from '@/components/template/SettingsMenu'
import { useThemeStore } from '@/store/themeStore'
import { useSessionUser } from '@/store/authStore'
import { tr } from '@/utils/t'

const ITEMS = [
    { to: '/team-dashboard', icon: <PiUsersThreeDuotone />, label: 'Team dashboard', authority: [] },
    { to: '/calendar', icon: <PiCalendarBlankDuotone />, label: 'Calendar', authority: ['admin', 'crm.admin', 'crm.calendar.view'] },
    { to: '/crm/chat', icon: <PiChatsDuotone />, label: 'Team chat', authority: ['admin', 'crm.admin', 'crm.chat.view'] },
    { to: '/crm/reports', icon: <PiChartBarDuotone />, label: 'Reports', authority: ['admin', 'crm.admin', 'crm.reports.view'] },
    { to: '/crm/ai', icon: <PiSparkleDuotone />, label: 'AI insights', authority: ['admin', 'crm.admin'] },
]

/** The dark pill docked at the edge of the screen (the left in English, the right in Arabic): search, quick pages, settings, light/dark. */
const RapportDock = () => {
    const { pathname } = useLocation()
    const user = useSessionUser((s) => s.user.authority) || []
    const mode = useThemeStore((s) => s.mode)
    const setMode = useThemeStore((s) => s.setMode)
    const direction = useThemeStore((s) => s.direction)
    const place = direction === 'rtl' ? 'left' : 'right'
    const can = (a) => !a.length || a.some((x) => user.includes(x))
    return (
        <aside className="rp-dock" aria-label={tr('Quick access')}>
            <div className="rp-dock-in">
                <Search />
                <span className="rp-dock-sep" />
                {ITEMS.filter((i) => can(i.authority)).map((i) => (
                    <Tooltip key={i.to} title={tr(i.label)} placement={place}>
                        <Link to={i.to} className="rp-dock-btn" data-active={pathname === i.to || pathname.startsWith(`${i.to}/`)} aria-label={tr(i.label)}>{i.icon}</Link>
                    </Tooltip>
                ))}
                {(pathname === '/dashboard' || hasPageFilter(pathname)) && <DockFilters />}
                <span className="rp-dock-sep" />
                <SettingsMenu placement={direction === 'rtl' ? 'left-end' : 'right-end'} />
                <Tooltip title={mode === 'dark' ? tr('Light mode') : tr('Dark mode')} placement={place}>
                    <button type="button" className="rp-dock-btn" aria-label={mode === 'dark' ? tr('Light mode') : tr('Dark mode')} onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>{mode === 'dark' ? <PiSunDuotone /> : <PiMoonDuotone />}</button>
                </Tooltip>
            </div>
        </aside>
    )
}

export default RapportDock

/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { magnetic } from '@/vendor/rapport/motion'
import RapportPills from '@/components/template/rapport/RapportPills'
import RapportDock from '@/components/template/rapport/RapportDock'
import DashboardFilters from '@/components/template/DashboardFilters'
import PageTabs from '@/components/template/PageTabs'
import MobileNav from '@/components/template/MobileNav'
import UserProfileDropdown from '@/components/template/UserProfileDropdown'
import LanguageSelector from '@/components/template/LanguageSelector'
import Notification from '@/components/template/Notification'
import ChatWidget from '@/components/crm/chat/ChatWidget'
import AccentApplier from '@/components/template/AccentApplier'
import PreferencesApplier from '@/components/template/PreferencesApplier'
import LayoutBase from '@/components/template/LayoutBase'
import Logo from '@/components/template/Logo'
import useResponsive from '@/utils/hooks/useResponsive'
import { useThemeStore } from '@/store/themeStore'
import { useSessionUser } from '@/store/authStore'
import { usePageTabsStore } from '@/store/pageTabsStore'
import { hasPageFilter } from '@/store/pageFilterStore'
import appConfig from '@/configs/app.config'
import { LAYOUT_RAPPORT } from '@/constants/theme.constant'
import { usePresence } from '@/components/crm/chat/chatKit'

/** Keeps the global status (available / idle / away) alive for people without the chat; the chat widget does it for the rest. */
const PresenceKeeper = () => { usePresence(() => {}); return null }

/**
 * The Rapport layout: a slow mesh of colour behind frosted panes, the dark dock at the edge, a pill navigation at the top and the
 * page filters (period, currency, colour) in a toolbar underneath. On a phone the dock and pills fold into the usual menu drawer.
 */
const RapportShell = ({ children }) => {
    const { larger, smaller } = useResponsive()
    const { pathname } = useLocation()
    const mode = useThemeStore((s) => s.mode)
    const authority = useSessionUser((s) => s.user.authority) || []
    const canChat = authority.includes('admin') || authority.includes('crm.admin') || authority.includes('crm.chat.view')
    const hasTabs = usePageTabsStore((st) => !!st.tabs)
    // on a computer the period / currency / colour pickers live in the dock; on a phone (no dock) they stay in a toolbar under the top bar
    const filters = pathname === '/dashboard' || hasPageFilter(pathname)
    // the template's magnetic hands: dock buttons, the profile, bell and language lean toward the pointer
    useEffect(() => {
        const MAG = '.rp-dock-btn, .rp-dock .header-action-item, .rp-actions .header-action-item, .rp-brand'
        let t = null
        const apply = () => { document.querySelectorAll(MAG).forEach((el) => el.classList.add('magnetic')); magnetic() }
        apply()
        const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(apply, 120) })
        mo.observe(document.body, { childList: true, subtree: true })
        return () => { mo.disconnect(); clearTimeout(t) }
    }, [])
    const toolbar = hasTabs ? <PageTabs /> : filters && !larger.lg ? <DashboardFilters /> : null

    return (
        <LayoutBase type={LAYOUT_RAPPORT} className="rp-app app-layout-rapport flex flex-auto flex-col">
            <PreferencesApplier />
            <AccentApplier />
            <div className="rp-mesh" aria-hidden="true"><i /></div>
            {larger.lg && <RapportDock />}
            <div className="rp-frame">
                <header className="rp-top">
                    {smaller.lg && <MobileNav />}
                    <Link to={appConfig.authenticatedEntryPath} className="rp-brand"><Logo type="full" mode={mode} imgClass="h-8 w-auto" /></Link>
                    <div className="rp-pills">{larger.lg && <RapportPills />}</div>
                    <div className="rp-actions">
                        <LanguageSelector />
                        <Notification />
                        <UserProfileDropdown />
                    </div>
                </header>
                {toolbar && <div className="rp-toolbar">{toolbar}</div>}
                <main className="rp-main">{children}</main>
            </div>
            {canChat ? <ChatWidget /> : <PresenceKeeper />}
        </LayoutBase>
    )
}

export default RapportShell

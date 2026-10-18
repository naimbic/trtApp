import { Link, useLocation } from 'react-router'
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
    const toolbar = hasTabs ? <PageTabs /> : pathname === '/dashboard' || hasPageFilter(pathname) ? <DashboardFilters /> : null

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
            {canChat && <ChatWidget />}
        </LayoutBase>
    )
}

export default RapportShell

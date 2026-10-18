import SideNav from '@/components/template/SideNav'
import Header from '@/components/template/Header'
import SideNavToggle from '@/components/template/SideNavToggle'
import MobileNav from '@/components/template/MobileNav'
import UserProfileDropdown from '@/components//template/UserProfileDropdown'
import LanguageSelector from '@/components/template/LanguageSelector'
import SettingsMenu from '@/components/template/SettingsMenu'
import Notification from '@/components/template/Notification'
import ChatWidget from '@/components/crm/chat/ChatWidget'
import AccentApplier from '@/components/template/AccentApplier'
import PreferencesApplier from '@/components/template/PreferencesApplier'
import LayoutBase from '@/components//template/LayoutBase'
import useResponsive from '@/utils/hooks/useResponsive'
import { LAYOUT_COLLAPSIBLE_SIDE } from '@/constants/theme.constant'
import { useSessionUser } from '@/store/authStore'

const CollapsibleSide = ({ children }) => {
    const { larger, smaller } = useResponsive()
    const authority = useSessionUser((s) => s.user.authority) || []
    const canChat = authority.includes('admin') || authority.includes('crm.admin') || authority.includes('crm.chat.view')

    return (
        <LayoutBase
            type={LAYOUT_COLLAPSIBLE_SIDE}
            className="app-layout-collapsible-side flex flex-auto flex-col"
        >
            <PreferencesApplier />
                    <AccentApplier />
            <div className="flex flex-auto min-w-0">
                {larger.lg && <SideNav />}
                <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full">
                    <Header
                        className="shadow-sm dark:shadow-2xl"
                        headerStart={
                            <>
                                {smaller.lg && <MobileNav />}
                                {larger.lg && <SideNavToggle />}
                            </>
                        }
                        headerEnd={
                            <>
                                <LanguageSelector />
                                <SettingsMenu />
                                <Notification />
                                <UserProfileDropdown />
                            </>
                        }
                    />
                    <div className="h-full flex flex-auto flex-col">
                        {children}
                    </div>
                </div>
            </div>
            {canChat && <ChatWidget />}
        </LayoutBase>
    )
}

export default CollapsibleSide

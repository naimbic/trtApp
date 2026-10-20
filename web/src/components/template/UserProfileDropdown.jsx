import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useSessionUser } from '@/store/authStore'
import { Link } from 'react-router'
import { PiUserDuotone, PiSignOutDuotone, PiShieldCheckDuotone, PiUsersThreeDuotone, PiEnvelopeSimpleDuotone, PiCalendarCheckDuotone, PiMoonDuotone, PiSunDuotone, PiPulseDuotone } from 'react-icons/pi'
import { useThemeStore } from '@/store/themeStore'
import useMe from '@/utils/hooks/useMe'
import { useAuth } from '@/auth'
import { useChatStatus, useMyStatus, STATUS } from '@/store/chatStatusStore'
import useResponsive from '@/utils/hooks/useResponsive'
import { tr } from '@/utils/t'

const dropdownItemList = [
    { label: tr("My profile"), path: '/account/profile', icon: <PiUserDuotone /> },
    { label: tr("Password & security"), path: '/account/profile?tab=security', icon: <PiShieldCheckDuotone /> },
    { label: tr("Team & roles"), path: '/team', icon: <PiUsersThreeDuotone />, any: ['staff', 'roles'] },
    { label: tr("Mail settings"), path: '/crm/mails?tab=settings', icon: <PiEnvelopeSimpleDuotone />, adminOnly: true },
    { label: tr("Calendar sync"), path: '/calendar?sync=1', icon: <PiCalendarCheckDuotone />, need: 'calendar' },
]

const _UserDropdown = ({ className }) => {
    const { avatar, userName, email, authority = [] } = useSessionUser((state) => state.user)

    const { signOut } = useAuth()
    const { smaller } = useResponsive()
    const me = useMe()
    const chatState = useMyStatus()
    const away = useChatStatus((st) => st.away)
    const setAway = useChatStatus((st) => st.setAway)
    const mode = useThemeStore((st) => st.mode)
    const setMode = useThemeStore((st) => st.setMode)

    const handleSignOut = () => {
        signOut()
    }

    const avatarProps = {
        ...(me?.image ? { src: me.image } : { icon: <PiUserDuotone /> }),
    }

    return (
        <Dropdown
            className="flex"
            toggleClassName="flex items-center"
            renderTitle={
                <div className={`${className || ''}`}>
                    <span className="relative flex"><Avatar size={32} {...avatarProps} /><span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${STATUS[chatState].dot}`} /></span>
                </div>
            }
            placement="bottom-end"
            menuClass="profile-menu"
        >
            <Dropdown.Item variant="header">
                <div className="py-2 px-3 flex items-center gap-3">
                    <Avatar {...avatarProps} />
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {me?.name || userName || tr("Anonymous")}
                        </div>
                        <div className="text-xs">
                            {me?.email || email || tr("No email available")}
                        </div>
                        {me?.role && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{me.role}</span>}
                    </div>
                </div>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="Status" className="gap-3" onClick={() => setAway(!away)}>
                {/* the dot is the colour of the status you would switch to: orange for away, green for available */}
                <span className={`h-3 w-3 shrink-0 rounded-full ${away ? 'bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.55)]' : 'bg-orange-400 shadow-[0_0_8px_2px_rgba(251,146,60,0.6)]'}`} />
                <span className="leading-tight">
                    <span className="block text-sm font-semibold">{away ? tr("Change status to available") : tr("Change status to away")}</span>
                    <span className="block text-xs text-gray-400">{tr("Now")}: {tr(STATUS[chatState].label)}{chatState === 'idle' ? ` · ${tr("no activity for a while")}` : ''}</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {/* the all-activity icon of the top bar lives here on a phone */}
            {smaller.lg && (authority.includes('admin') || authority.includes('crm.admin')) && (
                <Dropdown.Item eventKey="all-activity" className="px-0">
                    <Link className="flex h-full w-full px-2" to="/crm/all-activity"><span className="flex w-full items-center gap-2"><span className="text-xl"><PiPulseDuotone /></span><span>{tr("All activity")}</span></span></Link>
                </Dropdown.Item>
            )}
            {dropdownItemList.filter((item) => {
                const admin = authority.includes('admin') || authority.includes('crm.admin')
                if (item.adminOnly) return admin
                if (item.any) return admin || item.any.some((f) => authority.includes(`crm.${f}.view`))
                return !item.need || admin || authority.includes(`crm.${item.need}.view`)
            }).map((item) => (
                <Dropdown.Item
                    key={item.label}
                    eventKey={item.label}
                    className="px-0"
                >
                    <Link className="flex h-full w-full px-2" to={item.path}>
                        <span className="flex gap-2 items-center w-full">
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.label}</span>
                        </span>
                    </Link>
                </Dropdown.Item>
            ))}
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="Theme" className="gap-2" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
                <span className="text-xl">{mode === 'dark' ? <PiSunDuotone /> : <PiMoonDuotone />}</span>
                <span>{mode === 'dark' ? tr("Light mode") : tr("Dark mode")}</span>
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="Sign Out"
                className="gap-2"
                onClick={handleSignOut}
            >
                <span className="text-xl">
                    <PiSignOutDuotone />
                </span>
                <span>{tr("Sign Out")}</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown

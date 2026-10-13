import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useSessionUser } from '@/store/authStore'
import { Link } from 'react-router'
import { PiUserDuotone, PiSignOutDuotone, PiShieldCheckDuotone, PiUsersThreeDuotone, PiEnvelopeSimpleDuotone, PiCalendarCheckDuotone, PiMoonDuotone, PiSunDuotone } from 'react-icons/pi'
import { useThemeStore } from '@/store/themeStore'
import useMe from '@/utils/hooks/useMe'
import { useAuth } from '@/auth'

const dropdownItemList = [
    { label: 'My profile', path: '/account/profile', icon: <PiUserDuotone /> },
    { label: 'Password & security', path: '/account/profile?tab=security', icon: <PiShieldCheckDuotone /> },
    { label: 'Team & roles', path: '/team', icon: <PiUsersThreeDuotone /> },
    { label: 'Mail settings', path: '/crm/mails?tab=settings', icon: <PiEnvelopeSimpleDuotone /> },
    { label: 'Calendar sync', path: '/calendar?sync=1', icon: <PiCalendarCheckDuotone /> },
]

const _UserDropdown = ({ className }) => {
    const { avatar, userName, email } = useSessionUser((state) => state.user)

    const { signOut } = useAuth()
    const me = useMe()
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
                    <Avatar size={32} {...avatarProps} />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="py-2 px-3 flex items-center gap-3">
                    <Avatar {...avatarProps} />
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {me?.name || userName || 'Anonymous'}
                        </div>
                        <div className="text-xs">
                            {me?.email || email || 'No email available'}
                        </div>
                        {me?.role && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{me.role}</span>}
                    </div>
                </div>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {dropdownItemList.map((item) => (
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
                <span>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </Dropdown.Item>
            <Dropdown.Item
                eventKey="Sign Out"
                className="gap-2"
                onClick={handleSignOut}
            >
                <span className="text-xl">
                    <PiSignOutDuotone />
                </span>
                <span>Sign Out</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown

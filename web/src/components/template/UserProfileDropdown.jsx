import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useSessionUser } from '@/store/authStore'
import { Link } from 'react-router'
import { useRef, useState } from 'react'
import PhoneApp from '@/components/crm/PhoneApp'
import { PiUserDuotone, PiSignOutDuotone, PiShieldCheckDuotone, PiUsersThreeDuotone, PiEnvelopeSimpleDuotone, PiRocketLaunchDuotone, PiMoonDuotone, PiSunDuotone, PiPulseDuotone, PiDeviceMobileDuotone, PiAlarmDuotone, PiCalendarBlankDuotone, PiClockCountdownDuotone, PiBellDuotone, PiFolderOpenDuotone, PiCaretRightBold } from 'react-icons/pi'
import { useThemeStore } from '@/store/themeStore'
import useMe from '@/utils/hooks/useMe'
import { useAuth } from '@/auth'
import { useChatStatus, useMyStatus, STATUS } from '@/store/chatStatusStore'
import useResponsive from '@/utils/hooks/useResponsive'
import { tr } from '@/utils/t'

// The profile menu: who you are (a card that opens your profile) · my space · my account · footer (theme, app, sign out).
// `need` = the permission feature that shows the line; `any` = any of these; `adminOnly`.
const SPACE = [
    { label: 'Reminders', desc: 'Never forget a date', path: '/crm/reminders', icon: <PiAlarmDuotone /> },
    { label: 'Calendar events', desc: 'Your meetings and calls by month', path: '/crm/events', icon: <PiCalendarBlankDuotone />, need: 'calendar' },
    { label: 'Scheduled messages', desc: 'Chat messages that go out later', path: '/crm/scheduled-messages', icon: <PiClockCountdownDuotone />, need: 'scheduled_messages' },
    { label: 'Notifications', desc: 'Everything that needs you', path: '/crm/notifications', icon: <PiBellDuotone /> },
    { label: 'File manager', desc: 'Everything uploaded', path: '/crm/file-manager', icon: <PiFolderOpenDuotone />, need: 'file_manager' },
]
const ACCOUNT = [
    { label: 'Password & security', desc: 'Password and two-step sign-in', path: '/account/profile?tab=security', icon: <PiShieldCheckDuotone /> },
    { label: 'My growth', desc: 'Your goals, primes and trophies', path: '/crm/my-growth', icon: <PiRocketLaunchDuotone />, need: 'growth' },
    { label: 'Team & roles', desc: 'Accounts and what each role can do', path: '/team', icon: <PiUsersThreeDuotone />, any: ['staff', 'roles'] },
    { label: 'Mail settings', desc: 'Mail server and templates', path: '/crm/mails?tab=settings', icon: <PiEnvelopeSimpleDuotone />, adminOnly: true },
]

const _UserDropdown = ({ className }) => {
    const { userName, email, authority = [] } = useSessionUser((state) => state.user)
    const { signOut } = useAuth()
    const [phoneApp, setPhoneApp] = useState(false)
    const { smaller } = useResponsive()
    const me = useMe()
    const chatState = useMyStatus()
    const away = useChatStatus((st) => st.away)
    const setAway = useChatStatus((st) => st.setAway)
    const mode = useThemeStore((st) => st.mode)
    const setMode = useThemeStore((st) => st.setMode)
    const ref = useRef(null)
    const close = () => ref.current?.handleDropdownClose?.()
    const admin = authority.includes('admin') || authority.includes('crm.admin')
    const allowed = (item) => (item.adminOnly ? admin : item.any ? admin || item.any.some((f) => authority.includes(`crm.${f}.view`)) : !item.need || admin || authority.includes(`crm.${item.need}.view`) || authority.includes(`crm.${item.need}.view_own`))
    const avatarProps = { ...(me?.image ? { src: me.image } : { icon: <PiUserDuotone /> }) }
    const row = (item) => (
        <Dropdown.Item key={item.label} eventKey={item.label} className="px-0">
            <Link className="flex h-full w-full px-2 py-0.5" to={item.path}>
                <span className="flex w-full items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-lg text-gray-600 dark:bg-gray-700 dark:text-gray-300">{item.icon}</span>
                    <span className="min-w-0 leading-tight"><span className="block text-sm font-semibold">{tr(item.label)}</span><span className="block truncate text-xs text-gray-400">{tr(item.desc)}</span></span>
                </span>
            </Link>
        </Dropdown.Item>
    )
    const title = (t) => <Dropdown.Item variant="header"><div className="px-3 pb-0.5 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{tr(t)}</div></Dropdown.Item>
    const tool = 'grid size-9 place-items-center rounded-xl text-xl text-gray-500 transition hover:bg-gray-100 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-700'

    return (
        <>
        <Dropdown
            ref={ref}
            className="flex"
            toggleClassName="flex items-center"
            renderTitle={
                <div className={`${className || ''}`}>
                    <span className="relative flex"><Avatar size={32} {...avatarProps} /><span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${STATUS[chatState].dot}`} /></span>
                </div>
            }
            placement="bottom-end"
            menuClass="profile-menu w-[320px] max-w-[calc(100vw-1rem)]"
        >
            {/* header: the whole card opens the profile; the status switch sits on it */}
            <Dropdown.Item variant="header">
                <div className="flex items-center gap-1 px-2 py-2">
                    <Link to="/account/profile" onClick={close} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Avatar size={44} {...avatarProps} />
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate font-bold text-gray-900 dark:text-gray-100">{me?.name || userName || tr('Anonymous')}</span>
                            <span className="block truncate text-xs text-gray-500">{me?.email || email || tr('No email available')}</span>
                            {me?.role && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{me.role}</span>}
                        </span>
                        <PiCaretRightBold className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setAway(!away) }} className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-start text-xs transition hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700">
                    <span className={`size-2.5 shrink-0 rounded-full ${STATUS[chatState].dot}`} />
                    <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{tr(STATUS[chatState].label)}{chatState === 'idle' ? ` · ${tr('no activity for a while')}` : ''}</span>
                    <span className="shrink-0 font-semibold text-primary">{away ? tr('Set available') : tr('Set away')}</span>
                </button>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {title('My space')}
            {SPACE.filter(allowed).map(row)}
            <Dropdown.Item variant="divider" />
            {title('My account')}
            {smaller.lg && admin && row({ label: 'All activity', desc: 'What everybody did', path: '/crm/all-activity', icon: <PiPulseDuotone /> })}
            {ACCOUNT.filter(allowed).map(row)}
            <Dropdown.Item variant="divider" />
            {/* footer: icons only, and Sign out */}
            <Dropdown.Item variant="header">
                <div className="flex items-center gap-1 px-3 py-2">
                    <button type="button" title={mode === 'dark' ? tr('Light mode') : tr('Dark mode')} aria-label={mode === 'dark' ? tr('Light mode') : tr('Dark mode')} className={tool} onClick={(e) => { e.stopPropagation(); setMode(mode === 'dark' ? 'light' : 'dark') }}>{mode === 'dark' ? <PiSunDuotone /> : <PiMoonDuotone />}</button>
                    <button type="button" title={tr('Install the app & notifications')} aria-label={tr('Install the app & notifications')} className={tool} onClick={() => { close(); setPhoneApp(true) }}><PiDeviceMobileDuotone /></button>
                    <span className="flex-1" />
                    <button type="button" onClick={() => { close(); signOut() }} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"><PiSignOutDuotone className="text-lg" />{tr('Sign Out')}</button>
                </div>
            </Dropdown.Item>
        </Dropdown>
        <PhoneApp open={phoneApp} onClose={() => setPhoneApp(false)} />
        </>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown

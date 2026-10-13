import { Link } from 'react-router'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { PiGearSixDuotone, PiEnvelopeSimpleDuotone, PiUsersThreeDuotone, PiShieldCheckDuotone, PiIdentificationBadgeDuotone, PiCoinsDuotone, PiCalendarCheckDuotone, PiSlidersHorizontalDuotone, PiBuildingsDuotone, PiFolderOpenDuotone } from 'react-icons/pi'
import { useSessionUser } from '@/store/authStore'

const ITEMS = [
    { label: 'Company & logos', desc: 'Details printed on documents', path: '/crm/settings?group=company', icon: <PiBuildingsDuotone />, need: ['settings'] },
    { label: 'File manager', desc: 'Uploads in DigitalOcean Spaces', path: '/crm/file-manager', icon: <PiFolderOpenDuotone />, need: [] },
    { label: 'Mail server & templates', desc: 'SMTP, email designs, sent log', path: '/crm/mails', icon: <PiEnvelopeSimpleDuotone />, need: ['email_templates'] },
    { label: 'Team members', desc: 'Accounts and access', path: '/team', icon: <PiUsersThreeDuotone />, need: ['staff'] },
    { label: 'Roles & permissions', desc: 'What each role can do', path: '/crm/roles', icon: <PiShieldCheckDuotone />, need: ['roles', 'staff'] },
    { label: 'Taxes & currencies', desc: 'Money settings', path: '/crm/taxes', icon: <PiCoinsDuotone />, need: ['settings'] },
    { label: 'Calendar sync', desc: 'Google & Apple Calendar', path: '/calendar?sync=1', icon: <PiCalendarCheckDuotone />, need: [] },
    { label: 'Account security', desc: 'Password and sessions', path: '/account/security', icon: <PiIdentificationBadgeDuotone />, need: [] },
    { label: 'All settings', desc: 'Every setup option', path: '/crm/settings', icon: <PiSlidersHorizontalDuotone />, need: ['settings'] },
]

const _SettingsMenu = ({ className }) => {
    const authority = useSessionUser((s) => s.user.authority) || []
    const admin = authority.includes('admin') || authority.includes('crm.admin')
    const allowed = (need) => !need.length || admin || need.some((f) => authority.some((a) => a.startsWith(`crm.${f}.`)))
    return (
        <Dropdown className="flex" toggleClassName="flex items-center" renderTitle={<div className={`${className || ''} text-2xl`} title="Settings"><PiGearSixDuotone /></div>} placement="bottom-end">
            <Dropdown.Item variant="header"><div className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100">Settings</div></Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {ITEMS.filter((i) => allowed(i.need)).map((i) => (
                <Dropdown.Item key={i.path} eventKey={i.label} className="px-0">
                    <Link className="flex h-full w-full px-2 py-1" to={i.path}>
                        <span className="flex w-full items-center gap-3">
                            <span className="text-xl text-gray-500">{i.icon}</span>
                            <span className="leading-tight"><span className="block text-sm font-semibold">{i.label}</span><span className="block text-xs text-gray-400">{i.desc}</span></span>
                        </span>
                    </Link>
                </Dropdown.Item>
            ))}
        </Dropdown>
    )
}

export default withHeaderItem(_SettingsMenu)

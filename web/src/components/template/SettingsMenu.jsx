import { Link } from 'react-router'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { PiGearSixDuotone, PiEnvelopeSimpleDuotone, PiUsersThreeDuotone, PiShieldCheckDuotone, PiIdentificationBadgeDuotone, PiCoinsDuotone, PiCalendarCheckDuotone, PiSlidersHorizontalDuotone, PiBuildingsDuotone, PiFolderOpenDuotone } from 'react-icons/pi'
import { useSessionUser } from '@/store/authStore'
import { tr } from '@/utils/t'

const ITEMS = [
    { label: tr("Company & logos"), desc: tr("Details printed on documents"), path: '/crm/settings?group=company', icon: <PiBuildingsDuotone />, need: ['settings'] },
    { label: tr("File manager"), desc: tr("Uploads in DigitalOcean Spaces"), path: '/crm/file-manager', icon: <PiFolderOpenDuotone />, need: ['file_manager'] },
    { label: tr("Mail server & templates"), desc: tr("SMTP, email designs, sent log"), path: '/crm/mails', icon: <PiEnvelopeSimpleDuotone />, need: ['email_templates'] },
    { label: tr("Team members"), desc: tr("Accounts and access"), path: '/team', icon: <PiUsersThreeDuotone />, need: ['staff'] },
    { label: tr("Roles & permissions"), desc: tr("What each role can do"), path: '/crm/roles', icon: <PiShieldCheckDuotone />, need: ['roles', 'staff'] },
    { label: tr("Taxes & currencies"), desc: tr("Money settings"), path: '/crm/taxes', icon: <PiCoinsDuotone />, need: ['settings'] },
    { label: tr("Calendar sync"), desc: tr("Google & Apple Calendar"), path: '/calendar?sync=1', icon: <PiCalendarCheckDuotone />, need: ['calendar'] },
    { label: tr("Account security"), desc: tr("Password and sessions"), path: '/account/security', icon: <PiIdentificationBadgeDuotone />, need: [] },
    { label: tr("All settings"), desc: tr("Every setup option"), path: '/crm/settings', icon: <PiSlidersHorizontalDuotone />, need: ['settings'] },
]

const _SettingsMenu = ({ className, placement = 'bottom-end' }) => {
    const authority = useSessionUser((s) => s.user.authority) || []
    const side = /^(left|right)/.test(placement)
    const admin = authority.includes('admin') || authority.includes('crm.admin')
    const allowed = (need) => !need.length || admin || need.some((f) => authority.some((a) => a.startsWith(`crm.${f}.`)))
    return (
        <Dropdown className="flex" toggleClassName="flex items-center" renderTitle={<div className={`${className || ''} text-2xl`} title={tr("Settings")}><PiGearSixDuotone /></div>} placement={placement}>
            <Dropdown.Item variant="header"><div className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100">{tr("Settings")}</div></Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {ITEMS.filter((i) => allowed(i.need)).map((i) => (
                <Dropdown.Item key={i.path} eventKey={i.label} className="px-0">
                    {side ? (
                        <Link className="rp-link w-full" to={i.path} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`) }}>
                            <span className="ico">{i.icon}</span>
                            <span className="rp-link-t"><b>{i.label}</b><small>{i.desc}</small></span>
                        </Link>
                    ) : (
                    <Link className="flex h-full w-full px-2 py-1" to={i.path}>
                        <span className="flex w-full items-center gap-3">
                            <span className="text-xl text-gray-500">{i.icon}</span>
                            <span className="leading-tight"><span className="block text-sm font-semibold">{i.label}</span><span className="block text-xs text-gray-400">{i.desc}</span></span>
                        </span>
                    </Link>
                    )}
                </Dropdown.Item>
            ))}
        </Dropdown>
    )
}

export default withHeaderItem(_SettingsMenu)

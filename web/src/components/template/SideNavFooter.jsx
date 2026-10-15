import { Link, useNavigate } from 'react-router'
import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import { PiSignOutDuotone, PiUserDuotone } from 'react-icons/pi'
import { useAuth } from '@/auth'
import { useSessionUser } from '@/store/authStore'
import useMe from '@/utils/hooks/useMe'
import classNames from '@/utils/classNames'
import { VERSION as APP_VERSION } from '@/configs/changelog'
import { tr } from '@/utils/t'

/* eslint-disable no-undef */
const VERSION = `v${APP_VERSION}`
const COMMIT = __APP_COMMIT__

/** Sidebar footer: who is signed in (and their role), sign out, and the version. */
const SideNavFooter = ({ collapsed }) => {
    const navigate = useNavigate()
    const about = () => navigate('/versions')
    const { signOut } = useAuth()
    const user = useSessionUser((s) => s.user)
    const me = useMe()
    const name = me?.name || user.userName || tr("Account")
    const role = me?.role || ''
    const picture = me ? me.image : null
    const avatar = picture ? { src: picture } : { icon: <PiUserDuotone /> }

    if (collapsed) {
        return (
            <div className="flex flex-col items-center gap-2 border-t border-gray-200 py-3 dark:border-gray-700">
                <Tooltip title={`${name}${role ? ` · ${role}` : ''}`} placement="right">
                    <Link to="/account/profile"><Avatar size={34} {...avatar} /></Link>
                </Tooltip>
                <Tooltip title={tr("Sign out")} placement="right">
                    <button type="button" onClick={() => signOut()} className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"><PiSignOutDuotone /></button>
                </Tooltip>
                <Tooltip title={tr("trtCRM {VERSION} · {COMMIT}", { VERSION: VERSION, COMMIT: COMMIT })} placement="right"><button type="button" onClick={() => about()} className="text-[10px] text-gray-400 hover:text-primary">{VERSION}</button></Tooltip>
            </div>
        )
    }
    return (
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <Link to="/account/profile" className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar size={38} {...avatar} />
                    <div className="min-w-0 leading-tight">
                        <div className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{name}</div>
                        <div className={classNames('truncate text-xs', me?.admin ? 'text-primary' : 'text-gray-500')}>{role || ' '}</div>
                    </div>
                </Link>
                <Tooltip title={tr("Sign out")}>
                    <button type="button" onClick={() => signOut()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"><PiSignOutDuotone /></button>
                </Tooltip>
            </div>
            <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-gray-400">
                <button type="button" onClick={() => about()} className="hover:text-primary" title={tr("What's new")}>{tr("trtCRM")} {VERSION} · {COMMIT}</button>
                <a href="https://trtdigital.ma" target="_blank" rel="noreferrer" className="hover:text-primary">{tr("Dev by trtAgency")}</a>
            </div>
        </div>
    )
}

export default SideNavFooter

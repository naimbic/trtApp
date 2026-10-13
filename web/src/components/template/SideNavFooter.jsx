import { Link } from 'react-router'
import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import { PiSignOutDuotone, PiUserDuotone } from 'react-icons/pi'
import { useAuth } from '@/auth'
import { useSessionUser } from '@/store/authStore'
import useMe from '@/utils/hooks/useMe'
import classNames from '@/utils/classNames'
import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { CHANGELOG, VERSION as APP_VERSION } from '@/configs/changelog'

/* eslint-disable no-undef */
const VERSION = `v${APP_VERSION}`
const COMMIT = __APP_COMMIT__
const BUILT = __APP_BUILT__

/** Sidebar footer: who is signed in (and their role), sign out, and the version. */
const WhatsNew = ({ open, onClose }) => (
    <Dialog isOpen={open} width={520} onClose={onClose} onRequestClose={onClose}>
        <h5 className="mb-1">trtCRM {VERSION}</h5>
        <p className="mb-4 text-xs text-gray-400">Build {COMMIT} · {BUILT}</p>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
            {CHANGELOG.map((c) => (
                <div key={c.version} className="mb-4 border-l-2 border-gray-200 pl-3 dark:border-gray-600">
                    <div className="flex items-baseline gap-2"><span className="font-bold">v{c.version}</span><span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{c.title}</span><span className="ml-auto text-xs text-gray-400">{c.date}</span></div>
                    <ul className="mt-1 list-disc pl-4 text-sm text-gray-500">{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
            ))}
        </div>
        <div className="mt-2 flex justify-end"><Button onClick={onClose}>Close</Button></div>
    </Dialog>
)

const SideNavFooter = ({ collapsed }) => {
    const [about, setAbout] = useState(false)
    const { signOut } = useAuth()
    const user = useSessionUser((s) => s.user)
    const me = useMe()
    const name = me?.name || user.userName || 'Account'
    const role = me?.role || ''
    const picture = me ? me.image : null
    const avatar = picture ? { src: picture } : { icon: <PiUserDuotone /> }

    if (collapsed) {
        return (
            <div className="flex flex-col items-center gap-2 border-t border-gray-200 py-3 dark:border-gray-700">
                <Tooltip title={`${name}${role ? ` · ${role}` : ''}`} placement="right">
                    <Link to="/account/profile"><Avatar size={34} {...avatar} /></Link>
                </Tooltip>
                <Tooltip title="Sign out" placement="right">
                    <button type="button" onClick={() => signOut()} className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"><PiSignOutDuotone /></button>
                </Tooltip>
                <Tooltip title={`trtCRM ${VERSION} · ${COMMIT}`} placement="right"><button type="button" onClick={() => setAbout(true)} className="text-[10px] text-gray-400 hover:text-primary">{VERSION}</button></Tooltip>
                <WhatsNew open={about} onClose={() => setAbout(false)} />
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
                <Tooltip title="Sign out">
                    <button type="button" onClick={() => signOut()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"><PiSignOutDuotone /></button>
                </Tooltip>
            </div>
            <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-gray-400">
                <button type="button" onClick={() => setAbout(true)} className="hover:text-primary" title="What's new">trtCRM {VERSION} · {COMMIT}</button>
                <button type="button" onClick={() => setAbout(true)} className="hover:text-primary">What's new</button>
                <WhatsNew open={about} onClose={() => setAbout(false)} />
            </div>
        </div>
    )
}

export default SideNavFooter

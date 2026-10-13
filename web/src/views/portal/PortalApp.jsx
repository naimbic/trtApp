import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router'
import { PiHouseDuotone, PiFileTextDuotone, PiFileMagnifyingGlassDuotone, PiPresentationChartDuotone, PiBriefcaseDuotone, PiLifebuoyDuotone, PiUserDuotone, PiSignOutDuotone, PiMoonDuotone, PiSunDuotone } from 'react-icons/pi'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import Spinner from '@/components/ui/Spinner'
import Header from '@/components/template/Header'
import Logo from '@/components/template/Logo'
import Container from '@/components/shared/Container'
import AuthLayout from '@/components/layouts/AuthLayout'
import { useThemeStore } from '@/store/themeStore'
import { APP_NAME } from '@/constants/app.constant'
import classNames from '@/utils/classNames'
import { portal } from './api'
import { SignIn, Forgot, SetPassword } from './PortalAuth'
import Dashboard from './Dashboard'
import Documents from './Documents'
import { Projects, ProjectDetail } from './Projects'
import { Tickets, TicketThread } from './Tickets'
import Profile from './Profile'

const Ctx = createContext(null)
export const usePortal = () => useContext(Ctx)

const NAV = [
    { to: '/portal', end: true, label: 'Overview', icon: <PiHouseDuotone /> },
    { to: '/portal/invoices', label: 'Invoices', icon: <PiFileTextDuotone />, need: 'invoices' },
    { to: '/portal/estimates', label: 'Estimates', icon: <PiFileMagnifyingGlassDuotone />, need: 'estimates' },
    { to: '/portal/proposals', label: 'Proposals', icon: <PiPresentationChartDuotone />, need: 'proposals' },
    { to: '/portal/contracts', label: 'Contracts', icon: <PiFileTextDuotone />, need: 'contracts' },
    { to: '/portal/projects', label: 'Projects', icon: <PiBriefcaseDuotone />, need: 'projects' },
    { to: '/portal/tickets', label: 'Support', icon: <PiLifebuoyDuotone />, need: 'support' },
]

const Shell = () => {
    const nav = useNavigate()
    const [me, setMe] = useState(null)
    const mode = useThemeStore((s) => s.mode)
    const setMode = useThemeStore((s) => s.setMode)
    useEffect(() => { portal('/me').then(setMe).catch(() => {}) }, [])
    if (!me) return <div className="flex h-screen items-center justify-center"><Spinner size={40} /></div>
    const signOut = async () => { await portal('/auth/logout', { method: 'POST', quiet: true }).catch(() => {}); nav('/portal/sign-in', { replace: true }) }
    const avatar = me.contact.image ? { src: me.contact.image } : { icon: <PiUserDuotone /> }
    return (
        <Ctx.Provider value={{ me, reload: () => portal('/me').then(setMe) }}>
            <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
                <Header
                    container
                    className="shadow-sm dark:shadow-2xl"
                    headerStart={<div className="flex items-center gap-3"><Logo imgClass="h-9 w-full object-contain object-left" logoWidth={130} mode={mode} /><span className="hidden border-l border-gray-200 pl-3 text-sm font-semibold text-gray-500 md:block dark:border-gray-700">{me.client.company}</span></div>}
                    headerMiddle={
                        <nav className="hidden items-center gap-1 lg:flex">
                            {NAV.filter((n) => !n.need || me.can.includes(n.need)).map((n) => (
                                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => classNames('flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition-colors', isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700')}><span className="text-xl">{n.icon}</span>{n.label}</NavLink>
                            ))}
                        </nav>
                    }
                    headerEnd={
                        <div className="flex items-center gap-3">
                            <button type="button" className="text-2xl text-gray-500" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>{mode === 'dark' ? <PiSunDuotone /> : <PiMoonDuotone />}</button>
                            <Dropdown className="flex" toggleClassName="flex items-center" renderTitle={<div className="flex cursor-pointer items-center"><Avatar size={32} {...avatar} /></div>} placement="bottom-end">
                                <Dropdown.Item variant="header"><div className="flex items-center gap-3 px-3 py-2"><Avatar {...avatar} /><div><div className="font-bold text-gray-900 dark:text-gray-100">{me.contact.name}</div><div className="text-xs">{me.contact.email}</div></div></div></Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="profile" onClick={() => nav('/portal/profile')}><span className="mr-2 text-xl"><PiUserDuotone /></span>My profile</Dropdown.Item>
                                <Dropdown.Item eventKey="out" onClick={signOut}><span className="mr-2 text-xl"><PiSignOutDuotone /></span>Sign out</Dropdown.Item>
                            </Dropdown>
                        </div>
                    }
                />
                <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 lg:hidden dark:border-gray-700 dark:bg-gray-800">
                    {NAV.filter((n) => !n.need || me.can.includes(n.need)).map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => classNames('flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold', isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-300')}>{n.icon}{n.label}</NavLink>)}
                </nav>
                <main className="flex-1 py-6"><Container><Outlet /></Container></main>
                <footer className="py-4 text-center text-xs text-gray-500">&copy; {new Date().getFullYear()} <span className="font-semibold">{me.company.name || APP_NAME}</span> · Client area</footer>
            </div>
        </Ctx.Provider>
    )
}

const Auth = ({ children }) => <div className="h-screen"><AuthLayout>{children}</AuthLayout></div>

const PortalApp = () => (
    <Routes>
        <Route path="/portal/sign-in" element={<Auth><SignIn /></Auth>} />
        <Route path="/portal/forgot-password" element={<Auth><Forgot /></Auth>} />
        <Route path="/portal/set-password" element={<Auth><SetPassword /></Auth>} />
        <Route path="/portal" element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="invoices" element={<Documents kind="invoices" />} />
            <Route path="estimates" element={<Documents kind="estimates" />} />
            <Route path="proposals" element={<Documents kind="proposals" />} />
            <Route path="contracts" element={<Documents kind="contracts" />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:id" element={<TicketThread />} />
            <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
)

export default PortalApp

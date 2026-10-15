import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router'
import { PiHouseDuotone, PiFileTextDuotone, PiFileMagnifyingGlassDuotone, PiPresentationChartDuotone, PiBriefcaseDuotone, PiLifebuoyDuotone, PiUserDuotone, PiSignOutDuotone, PiMoonDuotone, PiSunDuotone } from 'react-icons/pi'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import Spinner from '@/components/ui/Spinner'
import Header from '@/components/template/Header'
import Logo from '@/components/template/Logo'
import LanguageSelector from '@/components/template/LanguageSelector'
import Container from '@/components/shared/Container'
import AuthLayout from '@/components/layouts/AuthLayout'
import { useThemeStore } from '@/store/themeStore'
import { useLocaleStore } from '@/store/localeStore'
import { APP_NAME } from '@/constants/app.constant'
import classNames from '@/utils/classNames'
import { portal } from './api'
import { useI18n, guessLang } from './i18n'
import { SignIn, Forgot, SetPassword } from './PortalAuth'
import Dashboard from './Dashboard'
import Documents from './Documents'
import { Projects, ProjectDetail } from './Projects'
import { Tickets, TicketThread } from './Tickets'
import Profile from './Profile'
import ChatWidget from './ChatWidget'
import { Knowledge, HelpArticle } from './Knowledge'
import { PiBookOpenTextDuotone } from 'react-icons/pi'

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
    { to: '/portal/help', label: 'Help center', icon: <PiBookOpenTextDuotone /> },
]

const Shell = () => {
    const { t, rtl } = useI18n()
    const nav = useNavigate()
    const [me, setMe] = useState(null)
    const mode = useThemeStore((s) => s.mode)
    const setMode = useThemeStore((s) => s.setMode)
    useEffect(() => { portal('/me').then(setMe).catch(() => {}) }, [])
    // first visit (nothing chosen yet): use the client's own language, else the browser's
    useEffect(() => {
        if (!me) return
        let chosen = true
        try { chosen = !!localStorage.getItem('locale') } catch { /* storage blocked */ }
        if (!chosen) useLocaleStore.getState().setLang(guessLang(me.client.language))
    }, [me])
    if (!me) return <div className="flex h-screen items-center justify-center"><Spinner size={40} /></div>
    const signOut = async () => { await portal('/auth/logout', { method: 'POST', quiet: true }).catch(() => {}); nav('/portal/sign-in', { replace: true }) }
    const avatar = me.contact.image ? { src: me.contact.image } : { icon: <PiUserDuotone /> }
    return (
        <Ctx.Provider value={{ me, reload: () => portal('/me').then(setMe) }}>
            <div dir={rtl ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
                {me.preview && (
                    <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950">
                        <span>{t('Preview: you are viewing the client area as {name} ({company}). It is read-only.', { name: me.contact.name, company: me.client.company })}</span>
                        <button type="button" className="rounded-lg bg-amber-950 px-3 py-1 text-white" onClick={async () => { await portal('/auth/logout', { method: 'POST', quiet: true }).catch(() => {}); window.close(); window.location.assign('/') }}>{t('Exit preview')}</button>
                    </div>
                )}
                <Header
                    container
                    className="shadow-sm dark:shadow-2xl"
                    headerStart={<div className="flex items-center gap-3"><Logo imgClass="h-9 w-full object-contain object-left" logoWidth={130} mode={mode} /><span className="hidden max-w-[160px] truncate border-gray-200 text-sm font-semibold text-gray-500 ltr:border-l ltr:pl-3 rtl:border-r rtl:pr-3 2xl:block dark:border-gray-700">{me.client.company}</span></div>}
                    headerMiddle={
                        <nav className="hidden items-center gap-1 lg:flex">
                            {NAV.filter((n) => !n.need || me.can.includes(n.need)).map((n) => (
                                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => classNames('flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors', isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700')}><span className="text-lg">{n.icon}</span>{t(n.label)}{n.to === '/portal/tickets' && me.unreadTickets > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{me.unreadTickets}</span>}</NavLink>
                            ))}
                        </nav>
                    }
                    headerEnd={
                        <div className="flex items-center gap-3">
                            <LanguageSelector />
                            <button type="button" className="text-2xl text-gray-500" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>{mode === 'dark' ? <PiSunDuotone /> : <PiMoonDuotone />}</button>
                            <Dropdown className="flex" toggleClassName="flex items-center" renderTitle={<div className="flex cursor-pointer items-center"><Avatar size={32} {...avatar} /></div>} placement="bottom-end">
                                <Dropdown.Item variant="header"><div className="flex items-center gap-3 px-3 py-2"><Avatar {...avatar} /><div><div className="font-bold text-gray-900 dark:text-gray-100">{me.contact.name}</div><div className="text-xs">{me.contact.email}</div></div></div></Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="profile" onClick={() => nav('/portal/profile')}><span className="mx-2 text-xl"><PiUserDuotone /></span>{t('My profile')}</Dropdown.Item>
                                <Dropdown.Item eventKey="out" onClick={signOut}><span className="mx-2 text-xl"><PiSignOutDuotone /></span>{t('Sign out')}</Dropdown.Item>
                            </Dropdown>
                        </div>
                    }
                />
                <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 lg:hidden dark:border-gray-700 dark:bg-gray-800">
                    {NAV.filter((n) => !n.need || me.can.includes(n.need)).map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => classNames('flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold', isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-300')}>{n.icon}{t(n.label)}{n.to === '/portal/tickets' && me.unreadTickets > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{me.unreadTickets}</span>}</NavLink>)}
                </nav>
                <main className="flex-1 py-6"><Container><Outlet /></Container></main>
                <footer className="py-4 text-center text-xs text-gray-500">&copy; {new Date().getFullYear()} <span className="font-semibold">{me.company.name || APP_NAME}</span> · {t('Client area')}</footer>
                {!me.preview && <ChatWidget />}
            </div>
        </Ctx.Provider>
    )
}

const Auth = ({ children }) => {
    const { rtl } = useI18n()
    return <div dir={rtl ? 'rtl' : 'ltr'} className="h-screen"><AuthLayout>{children}</AuthLayout></div>
}

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
            <Route path="help" element={<Knowledge />} />
            <Route path="help/:id" element={<HelpArticle />} />
            <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
)

export default PortalApp

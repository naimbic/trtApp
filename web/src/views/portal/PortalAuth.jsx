import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import ActionLink from '@/components/shared/ActionLink'
import Logo from '@/components/template/Logo'
import { useThemeStore } from '@/store/themeStore'
import LanguageSelector from '@/components/template/LanguageSelector'
import { portal } from './api'
import { useI18n } from './i18n'

const Head = ({ title, text }) => {
    const mode = useThemeStore((s) => s.mode)
    return (
        <>
            <div className="mb-4 flex justify-end"><LanguageSelector /></div>
            <div className="mb-8"><Logo type="full" mode={mode} imgClass="mx-auto h-12 w-full object-contain" logoWidth={200} /></div>
            <div className="mb-8"><h2 className="mb-2">{title}</h2><p className="font-semibold heading-text">{text}</p></div>
        </>
    )
}
const backTo = (params) => { const b = params.get('back'); return b && b.startsWith('/portal') ? b : '/portal' }

export const SignIn = () => {
    const { t } = useI18n()
    const nav = useNavigate()
    const [params] = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const submit = async () => {
        setBusy(true); setError('')
        try { await portal('/auth/login', { method: 'POST', body: { email, password }, quiet: true }); nav(backTo(params), { replace: true }) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    return (
        <>
            <Head title={t('Welcome')} text={t('Sign in to your client area to follow your invoices, projects and support requests.')} />
            {error && <Alert showIcon className="mb-4" type="danger">{error}</Alert>}
            <Form onSubmit={(e) => { e.preventDefault(); submit() }}>
                <FormItem label={t('Email')}><Input type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></FormItem>
                <FormItem label={t('Password')}><PasswordInput autoComplete="current-password" placeholder={t('Password')} value={password} onChange={(e) => setPassword(e.target.value)} /></FormItem>
                <div className="mb-7 mt-2"><ActionLink to="/portal/forgot-password" className="mt-2 font-semibold underline heading-text" themeColor={false}>{t('Forgot password')}</ActionLink></div>
                <Button block loading={busy} variant="solid" type="submit" disabled={!email || !password}>{t('Sign in')}</Button>
            </Form>
            <p className="mt-8 text-center text-sm text-gray-500">{t('No password yet? Ask your contact at the agency for an invitation, or use “Forgot password”.')}</p>
        </>
    )
}

export const Forgot = () => {
    const { t } = useI18n()
    const [email, setEmail] = useState('')
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const submit = async () => {
        setBusy(true); setError('')
        try { await portal('/auth/forgot', { method: 'POST', body: { email }, quiet: true }); setDone(true) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    return (
        <>
            <Head title={t('Forgot password')} text={done ? t('Check your inbox.') : t('Enter the email address of your account and we will send you a link.')} />
            {done ? <Alert showIcon type="success" className="mb-6">{t('If an account exists for {email}, a link to choose a new password is on its way. It is valid for one hour.', { email })}</Alert> : (
                <>
                    {error && <Alert showIcon className="mb-4" type="danger">{error}</Alert>}
                    <Form onSubmit={(e) => { e.preventDefault(); submit() }}>
                        <FormItem label={t('Email')}><Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></FormItem>
                        <Button block loading={busy} variant="solid" type="submit" disabled={!email}>{t('Send reset link')}</Button>
                    </Form>
                </>
            )}
            <div className="mt-6 text-center"><ActionLink to="/portal/sign-in" themeColor={false} className="font-bold heading-text">{t('Back to sign in')}</ActionLink></div>
        </>
    )
}

export const SetPassword = () => {
    const { t } = useI18n()
    const nav = useNavigate()
    const [params] = useSearchParams()
    const key = params.get('key') || ''
    const [info, setInfo] = useState(null)
    const [password, setPassword] = useState('')
    const [again, setAgain] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { portal(`/auth/set-password?key=${encodeURIComponent(key)}`, { quiet: true }).then(setInfo).catch(() => setInfo({ valid: false })) }, [key])
    const submit = async () => {
        if (password !== again) return setError(t('The two passwords are not the same'))
        setBusy(true); setError('')
        try { await portal('/auth/set-password', { method: 'POST', body: { key, password }, quiet: true }); nav('/portal', { replace: true }) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    if (!info) return <Head title={t('One moment…')} text="" />
    if (!info.valid) return (<><Head title={t('Link expired')} text={t('This link is no longer valid.')} /><Alert showIcon type="warning" className="mb-6">{t('Links work once and expire after a while. Ask for a new one.')}</Alert><Button block variant="solid" data-href={'/portal/forgot-password'} onClick={() => nav('/portal/forgot-password')}>{t('Get a new link')}</Button></>)
    return (
        <>
            <Head title={info.first ? t('Choose your password') : t('Choose a new password')} text={`${info.name || info.email} · ${info.email}`} />
            {error && <Alert showIcon className="mb-4" type="danger">{error}</Alert>}
            <Form onSubmit={(e) => { e.preventDefault(); submit() }}>
                <FormItem label={t('New password')}><PasswordInput autoComplete="new-password" placeholder={t('At least 8 characters')} value={password} onChange={(e) => setPassword(e.target.value)} /></FormItem>
                <FormItem label={t('Confirm password')}><PasswordInput autoComplete="new-password" placeholder={t('Repeat the password')} value={again} onChange={(e) => setAgain(e.target.value)} /></FormItem>
                <Button block loading={busy} variant="solid" type="submit" disabled={password.length < 8 || !again}>{info.first ? t('Save and sign in') : t('Change password')}</Button>
            </Form>
        </>
    )
}

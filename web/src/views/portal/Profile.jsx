import { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import { portal } from './api'
import { usePortal } from './PortalApp'
import { useI18n } from './i18n'

const Profile = () => {
    const { t } = useI18n()
    const { me, reload } = usePortal()
    const c = me.contact
    const [v, setV] = useState({ firstName: c.firstName || '', lastName: c.lastName || '', phone: c.phone || '', title: c.title || '' })
    const [pw, setPw] = useState({ current: '', password: '', again: '' })
    useEffect(() => { if (window.location.hash === '#password') setTimeout(() => document.getElementById('password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150) }, [])
    const [msg, setMsg] = useState(null)
    const [busy, setBusy] = useState('')
    const note = (type, text) => { setMsg({ type, text }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    const save = async () => { setBusy('p'); try { await portal('/profile', { method: 'PUT', body: v }); await reload(); note('success', t('Your details were saved')) } catch (e) { note('danger', e.message) } finally { setBusy('') } }
    const change = async () => {
        if (pw.password !== pw.again) return note('danger', t('The two new passwords are not the same'))
        setBusy('w'); try { await portal('/auth/password', { method: 'POST', body: { current: pw.current, password: pw.password } }); setPw({ current: '', password: '', again: '' }); note('success', t('Your password was changed')) } catch (e) { note('danger', e.message) } finally { setBusy('') }
    }
    return (
        <div className="mx-auto max-w-3xl">
            <div className="mb-4"><h3>{t('My profile')}</h3><p className="text-sm text-gray-500">{me.client.company}</p></div>
            {msg && <Alert showIcon className="mb-4" type={msg.type}>{msg.text}</Alert>}
            <Card className="mb-4">
                <h5 className="mb-5">{t('Your details')}</h5>
                <Form onSubmit={(e) => { e.preventDefault(); save() }}>
                    <div className="grid gap-x-4 md:grid-cols-2">
                        <FormItem label={t('First name')}><Input value={v.firstName} onChange={(e) => setV({ ...v, firstName: e.target.value })} /></FormItem>
                        <FormItem label={t('Last name')}><Input value={v.lastName} onChange={(e) => setV({ ...v, lastName: e.target.value })} /></FormItem>
                        <FormItem label={t('Email')}><Input disabled value={c.email || ''} /></FormItem>
                        <FormItem label={t('Phone')}><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></FormItem>
                        <FormItem label={t('Position')}><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></FormItem>
                    </div>
                    <div className="flex justify-end"><Button variant="solid" type="submit" loading={busy === 'p'}>{t('Save changes')}</Button></div>
                </Form>
            </Card>
            <Card id="password">
                <h5 className="mb-5">{t('Password')}</h5>
                <Form onSubmit={(e) => { e.preventDefault(); change() }}>
                    <FormItem label={t('Current password')}><PasswordInput autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></FormItem>
                    <div className="grid gap-x-4 md:grid-cols-2">
                        <FormItem label={t('New password')}><PasswordInput autoComplete="new-password" placeholder={t('At least 8 characters')} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></FormItem>
                        <FormItem label={t('Confirm new password')}><PasswordInput autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></FormItem>
                    </div>
                    <div className="flex justify-end"><Button variant="solid" type="submit" loading={busy === 'w'} disabled={!pw.current || pw.password.length < 8}>{t('Change password')}</Button></div>
                </Form>
            </Card>
        </div>
    )
}

export default Profile

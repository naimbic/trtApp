import { useEffect, useState } from 'react'
import Switcher from '@/components/ui/Switcher'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import { portal } from './api'
import { usePortal } from './PortalApp'
import { useI18n } from './i18n'

const SECTION_LABEL = { invoices: 'Invoices', estimates: 'Estimates', proposals: 'Proposals', contracts: 'Contracts', projects: 'Projects', support: 'Support' }
const MAILS = [['invoiceEmails', 'Invoices', 'When an invoice is sent, due or overdue, and payment receipts'], ['estimateEmails', 'Estimates', 'When an estimate is sent or its answer is needed'], ['creditNoteEmails', 'Credit notes', 'When a credit note is issued'], ['contractEmails', 'Contracts', 'When a contract needs your signature or is signed'], ['projectEmails', 'Projects', 'Updates on your projects'], ['taskEmails', 'Tasks', 'Updates on tasks that involve you'], ['ticketEmails', 'Support', 'Replies to your support requests']]

const Profile = () => {
    const { t } = useI18n()
    const { me, reload } = usePortal()
    const c = me.contact
    const [v, setV] = useState({ firstName: c.firstName || '', lastName: c.lastName || '', phone: c.phone || '', title: c.title || '' })
    const [pw, setPw] = useState({ current: '', password: '', again: '' })
    useEffect(() => { if (window.location.hash === '#password') setTimeout(() => document.getElementById('password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150) }, [])
    const [msg, setMsg] = useState(null)
    const [mail, setMail] = useState(c.notifications || {})
    const [ch, setCh] = useState(c.channels || {})
    const [busy, setBusy] = useState('')
    const note = (type, text) => { setMsg({ type, text }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    const save = async () => { setBusy('p'); try { await portal('/profile', { method: 'PUT', body: v }); await reload(); note('success', t('Your details were saved')) } catch (e) { note('danger', e.message) } finally { setBusy('') } }
    const flip = async (key, on) => {
        const was = mail[key]
        setMail((m) => ({ ...m, [key]: on }))
        try { await portal('/profile', { method: 'PUT', body: { notifications: { [key]: on } }, quiet: true }); reload() } catch (e) { setMail((m) => ({ ...m, [key]: was })); note('danger', e.message) }
    }
    const saveChannels = async (next) => { setCh(next); try { await portal('/profile', { method: 'PUT', body: { channels: next }, quiet: true }); reload() } catch (e) { note('danger', e.message) } }
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
            <Card className="mb-4">
                <h5 className="mb-1">{t('Email notifications')}</h5>
                <p className="mb-3 text-sm text-gray-500">{t('Choose which emails you receive from {company}.', { company: me.company.name || me.client.company })}</p>
                <div className="pt-sw">
                    {MAILS.map(([key, label, hint]) => (
                        <label key={key}><span>{t(label)}<small>{t(hint)}</small></span><Switcher checked={mail[key] !== false} disabled={me.preview} onChange={(on) => flip(key, on)} /></label>
                    ))}
                </div>
            </Card>
            <Card className="mb-4">
                <h5 className="mb-1">{t('How do you want to be notified?')}</h5>
                <p className="mb-3 text-sm text-gray-500">{t('Pick one or several: the same notification arrives on each channel you switch on.')}</p>
                <div className="pt-sw">
                    <label><span>{t('Email')}<small>{c.email}</small></span><Switcher checked={ch.notifyEmail !== false} disabled={me.preview} onChange={(on) => saveChannels({ ...ch, notifyEmail: on })} /></label>
                    <label><span>{t('WhatsApp')}<small><input className="mt-1 w-52 rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-600" placeholder="+212 6 12 34 56 78" value={ch.whatsappNumber || ''} disabled={me.preview} onChange={(e) => setCh({ ...ch, whatsappNumber: e.target.value })} onBlur={() => saveChannels(ch)} /></small></span><Switcher checked={!!ch.notifyWhatsapp} disabled={me.preview || !String(ch.whatsappNumber || '').trim()} onChange={(on) => saveChannels({ ...ch, notifyWhatsapp: on })} /></label>
                    <label><span>{t('Telegram')}<small><input className="mt-1 w-52 rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-600" placeholder="123456789" value={ch.telegramChatId || ''} disabled={me.preview} onChange={(e) => setCh({ ...ch, telegramChatId: e.target.value })} onBlur={() => saveChannels(ch)} /></small></span><Switcher checked={!!ch.notifyTelegram} disabled={me.preview || !String(ch.telegramChatId || '').trim()} onChange={(on) => saveChannels({ ...ch, notifyTelegram: on })} /></label>
                </div>
            </Card>
            <Card className="mb-4">
                <h5 className="mb-1">{t('What you can see')}</h5>
                <p className="mb-3 text-sm text-gray-500">{t('The sections of this client area that are open to you. Ask {company} if one is missing.', { company: me.company.name || me.client.company })}</p>
                <div className="pt-chips">{Object.keys(SECTION_LABEL).map((k) => <span key={k} className={`pt-chip${me.can.includes(k) ? '' : ' is-off'}`}>{t(SECTION_LABEL[k])}</span>)}</div>
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

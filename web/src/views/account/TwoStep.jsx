import { useCallback, useEffect, useState } from 'react'
import { TbCopy, TbDeviceMobile, TbDownload, TbKey, TbMail, TbShieldCheck } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import PasswordInput from '@/components/shared/PasswordInput'
import { api, notify } from '@/views/crm/kit/api'

const post = (body) => api('/api/crm/profile/2fa', { method: 'POST', body })

const Row = ({ icon: Icon, title, desc, on, children }) => (
    <div className="flex flex-wrap items-center gap-4 py-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${on ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}><Icon /></span>
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold">{title}{on && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/20">On</span>}</div>
            <div className="text-sm text-gray-500">{desc}</div>
        </div>
        <div className="flex gap-2">{children}</div>
    </div>
)

const CodeInput = (props) => <Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" className="text-center text-xl tracking-[0.4em]" {...props} />

const RecoveryDialog = ({ codes, onClose }) => {
    const text = `Recovery codes\nEach code works once if you cannot use your phone or email.\n\n${(codes || []).join('\n')}\n`
    const copy = async () => { try { await navigator.clipboard.writeText(text); notify('success', 'Codes copied') } catch { notify('danger', 'Could not copy') } }
    const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'recovery-codes.txt'; a.click(); URL.revokeObjectURL(a.href) }
    return (
        <Dialog isOpen={!!codes} width={460} onClose={onClose} onRequestClose={onClose} shouldCloseOnOverlayClick={false}>
            <h5 className="mb-1">Save your recovery codes</h5>
            <p className="mb-4 text-sm text-gray-500">If you lose your phone or cannot receive email, each of these codes lets you sign in once. They are shown only now, keep them somewhere safe.</p>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-4 font-mono text-sm dark:bg-gray-700/50">{(codes || []).map((c) => <span key={c}>{c}</span>)}</div>
            <div className="flex flex-wrap justify-between gap-2"><div className="flex gap-2"><Button size="sm" icon={<TbCopy />} onClick={copy}>Copy</Button><Button size="sm" icon={<TbDownload />} onClick={download}>Download</Button></div><Button variant="solid" onClick={onClose}>I saved them</Button></div>
        </Dialog>
    )
}

/** Two-step verification: authenticator app and/or email code, with recovery codes. */
const TwoStep = () => {
    const [s, setS] = useState(null)
    const [dlg, setDlg] = useState(null) // 'app' | 'email' | { off: 'app'|'email' } | 'recovery'
    const [setup, setSetup] = useState(null)
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [sent, setSent] = useState('')
    const [codes, setCodes] = useState(null)

    const load = useCallback(() => api('/api/crm/profile/2fa').then(setS).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])

    const close = () => { setDlg(null); setSetup(null); setCode(''); setPassword(''); setError(''); setSent('') }
    const run = async (fn, after) => { setBusy(true); setError(''); try { const r = await fn(); await after?.(r); } catch (e) { setError(e.message) } finally { setBusy(false) } }

    const openApp = () => { setDlg('app'); run(() => post({ action: 'app-begin' }), setSetup) }
    const openEmail = () => { setDlg('email'); run(() => post({ action: 'email-send' }), (r) => setSent(r.to)) }
    const done = async (r, msg) => { notify('success', msg); close(); await load(); if (r?.recoveryCodes) setCodes(r.recoveryCodes) }

    if (!s) return <Card className="xl:col-span-2"><div className="flex h-24 items-center justify-center"><Spinner size={24} /></div></Card>
    const needPassword = typeof dlg === 'object' && dlg !== null

    return (
        <Card className="xl:col-span-2">
            <div className="mb-1 flex items-center gap-2"><TbShieldCheck className="text-2xl text-primary" /><h5>Two-step verification</h5></div>
            <p className="mb-2 text-sm text-gray-500">Adds a second check when you sign in, so a stolen password alone is not enough.</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <Row icon={TbDeviceMobile} title="Authenticator app" on={s.app} desc="Use Google Authenticator, Microsoft Authenticator, Authy or 1Password to get a code every 30 seconds.">
                    {s.app ? <Button size="sm" onClick={() => setDlg({ off: 'app' })}>Turn off</Button> : <Button size="sm" variant="solid" onClick={openApp}>Set up</Button>}
                </Row>
                <Row icon={TbMail} title="Email code" on={s.email} desc={`We email a 6-digit code to ${s.address} each time you sign in.`}>
                    {s.email ? <Button size="sm" onClick={() => setDlg({ off: 'email' })}>Turn off</Button> : <Button size="sm" variant="solid" onClick={openEmail}>Turn on</Button>}
                </Row>
                {s.enabled && (
                    <Row icon={TbKey} title="Recovery codes" on={false} desc={`${s.recoveryLeft} unused code${s.recoveryLeft === 1 ? '' : 's'}. Use one if you lose your phone or cannot get the email.`}>
                        <Button size="sm" onClick={() => setDlg('recovery')}>Get new codes</Button>
                    </Row>
                )}
            </div>

            <Dialog isOpen={dlg === 'app'} width={460} onClose={close} onRequestClose={close}>
                <h5 className="mb-1">Set up your authenticator app</h5>
                <p className="mb-4 text-sm text-gray-500">1. Scan this QR code with the app. 2. Enter the 6-digit code it shows.</p>
                {error && <Alert showIcon type="danger" className="mb-3">{error}</Alert>}
                {setup ? (
                    <div className="flex flex-col items-center gap-3">
                        <img src={setup.qr} alt="QR code" className="h-48 w-48 rounded-xl border border-gray-200 bg-white p-2" />
                        <div className="text-center text-xs text-gray-500">Cannot scan? Enter this key in the app:<br /><code className="select-all text-sm font-semibold tracking-wider text-gray-800 dark:text-gray-100">{setup.secret}</code></div>
                        <div className="w-full"><CodeInput value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && run(() => post({ action: 'app-enable', code }), (r) => done(r, 'Authenticator app turned on'))} /></div>
                    </div>
                ) : <div className="flex h-48 items-center justify-center"><Spinner size={28} /></div>}
                <div className="mt-5 flex justify-end gap-2"><Button onClick={close}>Cancel</Button><Button variant="solid" loading={busy} disabled={code.length !== 6} onClick={() => run(() => post({ action: 'app-enable', code }), (r) => done(r, 'Authenticator app turned on'))}>Verify and turn on</Button></div>
            </Dialog>

            <Dialog isOpen={dlg === 'email'} width={440} onClose={close} onRequestClose={close}>
                <h5 className="mb-1">Turn on email codes</h5>
                <p className="mb-4 text-sm text-gray-500">{sent ? `We sent a 6-digit code to ${sent}. It expires in 10 minutes.` : 'Sending a code to your email…'}</p>
                {error && <Alert showIcon type="danger" className="mb-3">{error}</Alert>}
                <CodeInput value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && run(() => post({ action: 'email-enable', code }), (r) => done(r, 'Email codes turned on'))} />
                <div className="mt-2 text-right"><button type="button" className="text-xs text-primary hover:underline" onClick={() => run(() => post({ action: 'email-send' }), (r) => { setSent(r.to); notify('success', 'New code sent') })}>Send a new code</button></div>
                <div className="mt-4 flex justify-end gap-2"><Button onClick={close}>Cancel</Button><Button variant="solid" loading={busy} disabled={code.length !== 6} onClick={() => run(() => post({ action: 'email-enable', code }), (r) => done(r, 'Email codes turned on'))}>Verify and turn on</Button></div>
            </Dialog>

            <Dialog isOpen={needPassword || dlg === 'recovery'} width={440} onClose={close} onRequestClose={close}>
                <h5 className="mb-1">{dlg === 'recovery' ? 'Get new recovery codes' : `Turn off ${dlg?.off === 'app' ? 'the authenticator app' : 'email codes'}`}</h5>
                <p className="mb-4 text-sm text-gray-500">{dlg === 'recovery' ? 'Your old codes stop working. Confirm with your password.' : 'Confirm with your password. Your account will be less protected.'}</p>
                {error && <Alert showIcon type="danger" className="mb-3">{error}</Alert>}
                <PasswordInput autoFocus autoComplete="current-password" placeholder="Current password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="mt-4 flex justify-end gap-2"><Button onClick={close}>Cancel</Button>
                    <Button variant="solid" loading={busy} disabled={!password} onClick={() => run(() => post({ action: dlg === 'recovery' ? 'recovery' : dlg.off === 'app' ? 'app-disable' : 'email-disable', password }), (r) => done(r, dlg === 'recovery' ? 'New codes created' : 'Turned off'))}>{dlg === 'recovery' ? 'Create codes' : 'Turn off'}</Button></div>
            </Dialog>

            <RecoveryDialog codes={codes} onClose={() => { setCodes(null); load() }} />
        </Card>
    )
}

export default TwoStep

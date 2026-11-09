/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import { PiDeviceMobileDuotone, PiBellRingingDuotone, PiShareNetworkDuotone, PiPlusSquareDuotone, PiCheckCircleDuotone, PiTrashDuotone, PiPaperPlaneTiltDuotone } from 'react-icons/pi'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { tr as trStaff } from '@/utils/t'

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))) }
const ua = () => navigator.userAgent || ''
const isIOS = () => /iPad|iPhone|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const deviceName = () => (isIOS() ? 'iPhone / iPad' : /Android/.test(ua()) ? 'Android' : /Mac/.test(ua()) ? 'Mac' : /Windows/.test(ua()) ? 'Windows' : trStaff('This device'))

// the install button of Chrome / Edge / Android is offered once, early: keep it for the dialog
if (typeof window !== 'undefined' && !window.__trtInstall) {
    window.__trtInstall = { event: null }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__trtInstall.event = e })
    window.addEventListener('appinstalled', () => { window.__trtInstall.event = null })
}

const swReady = () => Promise.race([navigator.serviceWorker?.ready, new Promise((r) => setTimeout(() => r(null), 2500))]).catch(() => null)

/** Install the app on the phone and receive notifications on its screen. `base` is the server address of the push API (team or client area). */
const PhoneApp = ({ open, onClose, base = '/api/crm/push', subscribePath = '/subscribe', testBody = null, t }) => {
    const tr = t || trStaff
    const [st, setSt] = useState(null) // { enabled, publicKey, devices }
    const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
    const [here, setHere] = useState(null) // this device's endpoint, when subscribed
    const [busy, setBusy] = useState('')
    const [msg, setMsg] = useState('')
    const [installed, setInstalled] = useState(() => isStandalone())
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
    const ios = isIOS()

    const load = useCallback(async () => {
        try { setSt(await (await fetch(base, { credentials: 'include' })).json()) } catch { setSt({ enabled: false, devices: [] }) }
        if (supported) { const reg = await swReady(); const sub = await reg?.pushManager?.getSubscription(); setHere(sub?.endpoint || null) }
    }, [base, supported])
    useEffect(() => { if (open) { setMsg(''); setPerm(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'); load() } }, [open, load])
    useEffect(() => {
        if (!supported) return undefined
        const h = (e) => { if (e.data?.type === 'push-resubscribe') turnOn(true) }
        navigator.serviceWorker.addEventListener('message', h)
        return () => navigator.serviceWorker.removeEventListener('message', h)
    }) // eslint-disable-line react-hooks/exhaustive-deps

    const install = async () => {
        const ev = window.__trtInstall?.event
        if (!ev) return
        ev.prompt()
        const r = await ev.userChoice.catch(() => null)
        window.__trtInstall.event = null
        if (r?.outcome === 'accepted') setInstalled(true)
        setSt((x) => ({ ...x }))
    }

    const turnOn = async (quiet = false) => {
        setBusy('on'); setMsg('')
        try {
            const p = await Notification.requestPermission()
            setPerm(p)
            if (p !== 'granted') { if (!quiet) setMsg(tr("Notifications are blocked for this site. Allow them in the settings of your phone or browser, then try again.")); return }
            const reg = await swReady()
            if (!reg) throw new Error(tr("The app is not ready yet. Reload the page and try again."))
            const key = st?.publicKey || (await (await fetch(base, { credentials: 'include' })).json()).publicKey
            let sub = await reg.pushManager.getSubscription()
            if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) })
            const r = await fetch(`${base}${subscribePath}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), userAgent: `${deviceName()} · ${ua().slice(0, 120)}` }) })
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || tr("Could not save this device"))
            await load()
            if (!quiet) setMsg(tr("Notifications are on for this device."))
        } catch (e) { setMsg(e.message) } finally { setBusy('') }
    }
    const turnOff = async (endpoint) => {
        setBusy('off')
        try {
            if (endpoint === here) { const reg = await swReady(); await (await reg?.pushManager?.getSubscription())?.unsubscribe() }
            await fetch(`${base}${subscribePath}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) })
            await load()
        } finally { setBusy('') }
    }
    const test = async () => {
        setBusy('test'); setMsg('')
        try {
            const r = await fetch(testBody ? base : `${base}/test`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(testBody || {}) })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j.error || tr("The test could not be sent"))
            setMsg(j.sent ? tr("Sent. It should appear on the screen in a moment.") : j.failed ? `${tr("The phone's push service refused the message.")} ${j.error || ''}`.trim() : tr("Nothing was sent: no device is registered yet."))
        } catch (e) { setMsg(e.message) } finally { setBusy('') }
    }

    const canInstall = !!window.__trtInstall?.event
    const needInstallFirst = ios && !installed // on an iPhone, notifications only work for the app added to the Home Screen
    return (
        <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose} width={480}>
            <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary"><PiDeviceMobileDuotone /></span><div><h5>{tr("Install the app")}</h5><p className="text-xs text-gray-500">{tr("Open it from the home screen of your phone, and get notifications on its screen.")}</p></div></div>

            <div className="mb-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-1 flex items-center gap-2 font-semibold"><span className="text-xl text-primary"><PiPlusSquareDuotone /></span>{tr("1. Add it to your phone")}{installed && <span className="ms-auto flex items-center gap-1 text-xs text-emerald-600"><PiCheckCircleDuotone />{tr("Installed")}</span>}</div>
                {installed ? <p className="text-sm text-gray-500">{tr("You are using the installed app.")}</p>
                    : canInstall ? <Button size="sm" variant="solid" onClick={install}>{tr("Install the app")}</Button>
                        : ios ? (
                            <ol className="list-decimal space-y-1 ps-5 text-sm text-gray-600 dark:text-gray-300">
                                <li>{tr("Open this page in Safari.")}</li>
                                <li>{tr("Press the Share button")} <PiShareNetworkDuotone className="inline text-lg" /> {tr("at the bottom of the screen.")}</li>
                                <li>{tr("Choose “Add to Home Screen”, then “Add”.")}</li>
                                <li>{tr("Open the app from your home screen (not from Safari) and come back here to turn notifications on.")}</li>
                            </ol>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300">{tr("Android: open the menu of Chrome (⋮) and choose “Install app” or “Add to Home screen”. On a computer, use the install icon in the address bar.")}</p>
                        )}
            </div>

            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-1 flex items-center gap-2 font-semibold"><span className="text-xl text-primary"><PiBellRingingDuotone /></span>{tr("2. Notifications on the screen")}</div>
                {!supported ? <p className="text-sm text-amber-600">{tr("This browser cannot receive push notifications. On an iPhone, add the app to the Home Screen first (iOS 16.4 or newer).")}</p>
                    : st && st.enabled === false ? <p className="text-sm text-amber-600">{tr("Push notifications are switched off by the administrator.")}</p>
                        : needInstallFirst ? <p className="text-sm text-amber-600">{tr("On an iPhone, add the app to the Home Screen (step 1), open it from there, then turn notifications on.")}</p>
                            : (
                                <>
                                    <p className="mb-2 text-sm text-gray-500">{tr("You are told on the screen when something happens: a new message, a mention, a task, an answer from a client.")}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {here && perm === 'granted' ? <Button size="sm" icon={<PiTrashDuotone />} loading={busy === 'off'} onClick={() => turnOff(here)}>{tr("Turn off on this device")}</Button> : <Button size="sm" variant="solid" icon={<PiBellRingingDuotone />} loading={busy === 'on'} onClick={() => turnOn()}>{tr("Turn on notifications")}</Button>}
                                        {(st?.devices?.length || 0) > 0 && <Button size="sm" icon={<PiPaperPlaneTiltDuotone />} loading={busy === 'test'} onClick={test}>{tr("Send a test")}</Button>}
                                    </div>
                                    {perm === 'denied' && <p className="mt-2 text-xs text-red-500">{tr("Notifications are blocked for this site. Allow them in the settings of your phone or browser, then try again.")}</p>}
                                    {st?.devices?.length > 1 && <ul className="mt-3 space-y-1 text-xs text-gray-500">{st.devices.map((d) => <li key={d.id} className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate">{(d.userAgent || '').split(' · ')[0] || tr('Device')}{d.endpoint === here ? ` · ${tr('this device')}` : ''}</span><button type="button" aria-label={tr('Remove')} onClick={() => turnOff(d.endpoint)} className="text-gray-400 hover:text-red-500"><PiTrashDuotone /></button></li>)}</ul>}
                                </>
                            )}
            </div>
            {msg && <p className="mt-3 rounded-lg bg-gray-50 p-2.5 text-sm dark:bg-gray-700/40">{msg}</p>}
            <div className="mt-4 flex justify-end"><Button onClick={onClose}>{tr("Close")}</Button></div>
        </Dialog>
    )
}

export default PhoneApp

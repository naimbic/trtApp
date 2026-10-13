import { useEffect, useState } from 'react'
import { TbCopy, TbRefresh } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { api, notify } from '../kit/api'

const Step = ({ n, children }) => <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{n}</span><span>{children}</span></li>

/** Shows the private calendar subscription link and how to add it to Google, Apple and Outlook. */
const SyncDialog = ({ open, onClose }) => {
    const [token, setToken] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) api('/api/crm/calendar/feed').then((d) => setToken(d.token)).catch((e) => notify('danger', e.message)) }, [open])
    const url = token ? `${window.location.origin}/api/crm/calendar/feed/${token}.ics` : ''
    const local = /localhost|127\.0\.0\.1|192\.168\./.test(window.location.hostname)
    const copy = async () => { try { await navigator.clipboard.writeText(url); notify('success', 'Link copied') } catch { notify('danger', 'Could not copy, select the link and copy it') } }
    const regenerate = async () => {
        if (!window.confirm('Create a new link? Calendars using the old one will stop updating.')) return
        setBusy(true)
        try { setToken((await api('/api/crm/calendar/feed', { method: 'POST' })).token); notify('success', 'New link created') } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={620} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1">Sync with Google or Apple Calendar</h5>
            <p className="mb-4 text-sm text-gray-500">Your CRM events (yours, ones you are invited to and public ones) appear in your own calendar app and stay up to date.</p>
            {local && <Alert showIcon type="warning" className="mb-4">The CRM runs on this computer, so only calendar apps on this computer can reach the link. Google Calendar needs the CRM to be online (a public address).</Alert>}
            <label className="form-label mb-2 block">Your private link</label>
            <div className="mb-1 flex gap-2"><Input readOnly value={url} onFocus={(e) => e.target.select()} /><Button icon={<TbCopy />} onClick={copy}>Copy</Button></div>
            <p className="mb-5 text-xs text-gray-400">Anyone with this link can see your events, keep it private. <button type="button" className="text-primary underline" onClick={regenerate} disabled={busy}><TbRefresh className="mr-0.5 inline" />Create a new link</button></p>
            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <h6 className="mb-2">Apple Calendar</h6>
                    <ol className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Step n="1"><Button size="xs" variant="solid" disabled={!url} onClick={() => { window.location.href = url.replace(/^https?:/, 'webcal:') }}>Open in Calendar</Button></Step>
                        <Step n="2">Confirm the subscription. On iPhone: Settings → Calendar → Accounts → Add Subscribed Calendar, then paste the link.</Step>
                    </ol>
                </div>
                <div>
                    <h6 className="mb-2">Google Calendar</h6>
                    <ol className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Step n="1">Copy the link above.</Step>
                        <Step n="2">In Google Calendar open <a className="text-primary underline" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noreferrer">Add calendar → From URL</a> and paste it.</Step>
                    </ol>
                </div>
            </div>
            <p className="mt-5 text-xs text-gray-400">Updates flow from the CRM to your calendar app (Google can take a few hours to refresh). To add a single event right away, open it and use <b>Google Calendar</b> or <b>.ics</b>.</p>
            <div className="mt-5 flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </Dialog>
    )
}

export default SyncDialog

import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import Alert from '@/components/ui/Alert'
import { Link } from 'react-router'
import { api, notify } from '../kit/api'

/** Pick a template, recipients and send a document by email (invoice, estimate, proposal, contract). */
const SendMailDialog = ({ open, kind, id, template, onClose, onSent }) => {
    const [data, setData] = useState(null)
    const [slug, setSlug] = useState(template || null)
    const [picked, setPicked] = useState({})
    const [extra, setExtra] = useState('')
    const [attachPdf, setAttachPdf] = useState(true)
    const [subject, setSubject] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { if (open) setSlug(template || null) }, [open, template])
    useEffect(() => {
        if (!open) return
        let live = true
        setLoading(true); setError('')
        api(`/api/crm/mail/compose?kind=${kind}&id=${id}${slug ? `&template=${slug}` : ''}`)
            .then((d) => {
                if (!live) return
                setData(d); setSubject(d.subject)
                setPicked(Object.fromEntries(d.recipients.map((r) => [r.email, !!r.checked])))
            })
            .catch((e) => live && setError(e.message))
            .finally(() => live && setLoading(false))
        return () => { live = false }
    }, [open, kind, id, slug])

    const send = async () => {
        const to = Object.keys(picked).filter((e) => picked[e])
        const cc = extra.split(/[,;\s]+/).filter(Boolean)
        setSending(true)
        try {
            await api('/api/crm/mail/send', { method: 'POST', body: { kind, id, template: data.template, to, cc, subject, attachPdf: kind === 'invoice' && attachPdf } })
            notify('success', 'Email sent')
            onSent?.(); onClose()
        } catch (e) { setError(e.message) } finally { setSending(false) }
    }
    const options = (data?.templates || []).map((t) => ({ value: t.slug, label: t.label }))
    const count = Object.values(picked).filter(Boolean).length

    return (
        <Dialog isOpen={open} width={760} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4">Send by email</h5>
            {data && !data.smtpReady && (
                <Alert showIcon type="warning" className="mb-4">The mail server is not set up yet, so nothing can be sent. <Link className="underline" to="/crm/mails?tab=settings" onClick={onClose}>Open mail settings</Link></Alert>
            )}
            {error && <Alert showIcon type="danger" className="mb-4">{error}</Alert>}
            {loading && !data && <div className="py-10 text-center text-gray-400">Loading…</div>}
            {data && (
                <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className="form-label mb-2 block">Template</label><Select options={options} value={options.find((o) => o.value === data.template) || null} onChange={(o) => o && setSlug(o.value)} /></div>
                        <div><label className="form-label mb-2 block">From</label><Input disabled value={data.from || ''} /></div>
                    </div>
                    <div>
                        <label className="form-label mb-2 block">To</label>
                        {data.recipients.length ? (
                            <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 p-3 dark:border-gray-600">
                                {data.recipients.map((r) => (
                                    <Checkbox key={r.email} checked={!!picked[r.email]} onChange={(v) => setPicked({ ...picked, [r.email]: v })}>
                                        <span className="font-semibold">{r.name || r.email}</span>{r.name ? <span className="ml-2 text-gray-500">{r.email}</span> : null}{r.primary ? <span className="ml-2 text-xs text-gray-400">primary</span> : null}
                                    </Checkbox>
                                ))}
                            </div>
                        ) : <p className="text-sm text-amber-600">This client has no contact with an email address. Add one below.</p>}
                    </div>
                    <div><label className="form-label mb-2 block">Other recipients</label><Input placeholder="name@company.com, other@company.com" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
                    <div><label className="form-label mb-2 block">Subject</label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                    {kind === 'invoice' && <Checkbox checked={attachPdf} onChange={setAttachPdf}>Attach the invoice as a PDF</Checkbox>}
                    <div>
                        <label className="form-label mb-2 block">Preview</label>
                        <iframe title="Email preview" sandbox="" srcDoc={data.html} className="h-72 w-full rounded-xl border border-gray-200 bg-white dark:border-gray-600" />
                    </div>
                </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="solid" loading={sending} disabled={!data || !data.smtpReady || (!count && !extra.trim())} onClick={send}>Send email</Button>
            </div>
        </Dialog>
    )
}

export default SendMailDialog

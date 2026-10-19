import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import Alert from '@/components/ui/Alert'
import { Link } from 'react-router'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

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
            notify('success', tr("Email sent"))
            onSent?.(); onClose()
        } catch (e) { setError(e.message) } finally { setSending(false) }
    }
    const options = (data?.templates || []).map((t) => ({ value: t.slug, label: t.label }))
    const count = Object.values(picked).filter(Boolean).length

    return (
        <Dialog isOpen={open} width={780} height="min(calc(100vh - 128px), 820px)" contentClassName="flex flex-col overflow-hidden !px-5 !py-4" onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-3 shrink-0">{tr("Send by email")}</h5>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {data && !data.smtpReady && (
                    <Alert showIcon type="warning">{tr("The mail server is not set up yet, so nothing can be sent.")} <Link className="underline" to="/crm/mails?tab=settings" onClick={onClose}>{tr("Open mail settings")}</Link></Alert>
                )}
                {error && <Alert showIcon type="danger">{error}</Alert>}
                {loading && !data && <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>}
                {data && (
                    <>
                        <div className="grid shrink-0 gap-3 sm:grid-cols-3">
                            <div><label className="form-label mb-1 block">{tr("Template")}</label><Select size="sm" options={options} value={options.find((o) => o.value === data.template) || null} onChange={(o) => o && setSlug(o.value)} /></div>
                            <div><label className="form-label mb-1 block">{tr("From")}</label><Input size="sm" disabled value={data.from || ''} /></div>
                            <div><label className="form-label mb-1 block">{tr("Other recipients")}</label><Input size="sm" placeholder={tr("name@company.com, other@company.com")} value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
                        </div>
                        <div className="shrink-0">
                            <label className="form-label mb-1 block">{tr("To")}</label>
                            {data.recipients.length ? (
                                <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-600">
                                    {data.recipients.map((r) => (
                                        <Checkbox key={r.email} checked={!!picked[r.email]} onChange={(v) => setPicked({ ...picked, [r.email]: v })}>
                                            <span className="font-semibold">{r.name || r.email}</span>{r.name ? <span className="ml-1.5 text-gray-500">{r.email}</span> : null}{r.primary ? <span className="ml-1.5 text-xs text-gray-400">{tr("primary")}</span> : null}
                                        </Checkbox>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-amber-600">{tr("This client has no contact with an email address. Add one below.")}</p>}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-end gap-x-5 gap-y-2">
                            <div className="min-w-[260px] flex-1"><label className="form-label mb-1 block">{tr("Subject")}</label><Input size="sm" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                            {kind === 'invoice' && <div className="pb-1.5"><Checkbox checked={attachPdf} onChange={setAttachPdf}>{tr("Attach the invoice as a PDF")}</Checkbox></div>}
                        </div>
                        <div className="flex min-h-[180px] flex-1 flex-col">
                            <label className="form-label mb-1 block shrink-0">{tr("Preview")}</label>
                            <iframe title={tr("Email preview")} sandbox="" srcDoc={data.html} className="min-h-0 w-full flex-1 rounded-xl border border-gray-200 bg-white dark:border-gray-600" />
                        </div>
                    </>
                )}
            </div>
            <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <Button onClick={onClose}>{tr("Cancel")}</Button>
                <Button variant="solid" loading={sending} disabled={!data || !data.smtpReady || (!count && !extra.trim())} onClick={send}>{tr("Send email")}</Button>
            </div>
        </Dialog>
    )
}

export default SendMailDialog

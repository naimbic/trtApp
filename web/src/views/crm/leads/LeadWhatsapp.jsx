/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbBrandWhatsapp, TbSend, TbCheck, TbChecks, TbAlertTriangle, TbClock, TbRefresh } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const day = (d) => dayjs(d).format('DD MMM YYYY')
const hour = (d) => dayjs(d).format('HH:mm')
const KIND = { image: '📷', audio: '🎤', video: '🎬', document: '📄', location: '📍', sticker: '🙂', contacts: '👤' }

/** The mark under a sent message: one tick sent, two delivered, two blue read, a red triangle when WhatsApp refused it. */
const Mark = ({ m }) => m.status === 'failed'
    ? <span className="inline-flex items-center gap-1 text-red-600" title={m.error}><TbAlertTriangle />{tr("Not sent")}</span>
    : m.status === 'read' ? <span className="inline-flex items-center gap-0.5 text-sky-500" title={tr("Read")}><TbChecks /></span>
        : m.status === 'delivered' ? <span className="inline-flex items-center gap-0.5 text-gray-400" title={tr("Delivered")}><TbChecks /></span>
            : <span className="inline-flex items-center gap-0.5 text-gray-400" title={tr("Sent")}><TbCheck /></span>

/**
 * The WhatsApp tab of a lead: the conversation through the WhatsApp Business number of the company, and the box to answer.
 * WhatsApp allows a free answer during the 24 hours after the lead's last message; later the answer goes inside the approved template.
 */
const LeadWhatsapp = ({ leadId }) => {
    const [d, setD] = useState(null)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const end = useRef(null)
    const count = useRef(0)
    const base = `/api/crm/pipeline/leads/${leadId}/whatsapp`
    const load = useCallback((quiet) => api(base).then(setD).catch((e) => { if (!quiet) { notify('danger', e.message); setD({ messages: [], can: {}, failed: e.message }) } }), [base])
    useEffect(() => { setD(null); load() }, [load])
    useEffect(() => { const t = setInterval(() => { if (!document.hidden) load(true) }, 20000); return () => clearInterval(t) }, [load]) // new messages come in by themselves
    useEffect(() => { const n = d?.messages?.length || 0; if (n !== count.current) { count.current = n; end.current?.scrollIntoView({ block: 'nearest' }) } }, [d])

    const send = async () => {
        const body = text.trim()
        if (!body || busy) return
        setBusy(true)
        try { setD(await api(base, { method: 'POST', body: { text: body } })); setText('') } catch (e) { notify('danger', e.message); load(true) } finally { setBusy(false) }
    }

    if (!d) return <p className="py-6 text-center text-sm text-gray-400">{tr("Loading…")}</p>
    if (d.failed) return <p className="py-6 text-center text-sm text-gray-400">{d.failed}</p>
    const canSend = !!d.can?.send && d.ready && !!d.phone && !d.numberError && (d.open || d.template)
    let last = ''
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><TbBrandWhatsapp className="text-base" />{d.phone || tr("No phone number")}</span>
                {d.lastIn && <span className="text-xs text-gray-500">{tr("Last message from the lead")}: {day(d.lastIn)}, {hour(d.lastIn)}</span>}
                <button type="button" title={tr("Refresh")} aria-label={tr("Refresh")} onClick={() => load()} className="ms-auto grid size-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbRefresh /></button>
            </div>
            {!d.ready && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{tr("WhatsApp is not set up yet: add the WhatsApp Business number in Settings → WhatsApp & Telegram.")}</div>}
            {d.ready && !d.phone && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{tr("This lead has no phone number: add it in the Profile tab.")}</div>}
            {d.ready && d.numberError && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{tr("The phone of this lead cannot be used on WhatsApp.")} {tr(d.numberError)}</div>}

            <div className="max-h-[420px] min-h-[160px] overflow-y-auto rounded-xl bg-gray-100 p-3 dark:bg-gray-700/40">
                {!d.messages.length && <p className="py-10 text-center text-sm text-gray-400">{tr("No WhatsApp message with this lead yet.")}</p>}
                {d.messages.map((m) => {
                    const dd = day(m.date), head = dd !== last; last = dd
                    const out = m.direction === 'out'
                    return (
                        <div key={m.id}>
                            {head && <div className="my-2 text-center"><span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">{dd}</span></div>}
                            <div className={`mb-1.5 flex ${out ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${out ? 'rounded-ee-md bg-emerald-100 text-gray-900 dark:bg-emerald-600/30 dark:text-gray-100' : 'rounded-es-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'}`}>
                                    {m.kind === 'template' && <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{tr("Sent with the template")}</div>}
                                    <div className="whitespace-pre-wrap break-words">{KIND[m.kind] ? `${KIND[m.kind]} ` : ''}{m.body || (KIND[m.kind] ? tr("(a file: open WhatsApp to see it)") : '')}</div>
                                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">{out && m.by ? <span>{m.by}</span> : !out && m.name ? <span>{m.name}</span> : null}<span>{hour(m.date)}</span>{out && <Mark m={m} />}</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={end} />
            </div>

            {d.can?.send && d.ready && !!d.phone && !d.numberError && (
                <div>
                    <div className={`mb-1.5 flex items-start gap-1.5 text-xs ${d.open ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        <TbClock className="mt-0.5 shrink-0" />
                        <span>{d.open ? tr("The lead wrote in the last 24 hours: your answer goes as a normal message.")
                            : d.template ? tr("The lead has not written in the last 24 hours: WhatsApp only accepts the approved template then, so your text goes inside it.")
                                : tr("The lead has not written in the last 24 hours: WhatsApp only accepts an approved template then. Choose one in Settings → WhatsApp & Telegram to write first.")}</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <textarea rows={2} maxLength={3900} disabled={!canSend || busy} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() } }}
                            placeholder={tr("Write a WhatsApp message…")} className="min-h-[44px] flex-1 resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800" />
                        <Button variant="solid" icon={<TbSend />} loading={busy} disabled={!canSend || !text.trim()} onClick={send}>{tr("Send")}</Button>
                    </div>
                </div>
            )}
            {d.can && !d.can.send && d.ready && <p className="text-xs text-gray-400">{tr("You can read this conversation; answering needs the \"Lead WhatsApp: Send\" permission.")}</p>}
        </div>
    )
}

export default LeadWhatsapp

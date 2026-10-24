import { useCallback, useEffect, useRef, useState } from 'react'
import Mentioned from '@/components/crm/Mentioned'
import dayjs from 'dayjs'
import { PiPaperPlaneTiltFill, PiPaperclipDuotone, PiMicrophoneDuotone, PiStopFill, PiXBold, PiFileDuotone } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { ping } from './chatKit'
import { tr } from '@/utils/t'

const POLL = 3000
const size = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`)

const Attachment = ({ a, mine }) => {
    if (a.kind === 'image') return <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} loading="lazy" className="mb-1 max-h-56 max-w-full rounded-lg object-cover" /></a>
    if (a.kind === 'audio') return <audio controls preload="metadata" src={a.url} className="mb-1 h-9 w-56 max-w-full" />
    if (a.kind === 'video') return <video controls preload="metadata" src={a.url} className="mb-1 max-h-56 max-w-full rounded-lg" />
    return (
        <a href={a.url} target="_blank" rel="noreferrer" className={classNames('mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5', mine ? 'bg-white/15' : 'bg-white dark:bg-gray-600')}>
            <PiFileDuotone className="shrink-0 text-2xl" /><span className="min-w-0"><span className="block truncate font-semibold">{a.name}</span><span className="text-[11px] opacity-70">{size(a.size)}</span></span>
        </a>
    )
}
const time = (d) => (dayjs(d).isSame(dayjs(), 'day') ? dayjs(d).format('HH:mm') : dayjs(d).format('MMM D, HH:mm'))

/**
 * Message list + composer, shared by the staff widget and the client portal.
 * load(after) -> { messages, ...extra }   send(body) -> message   onData(extra) gets everything but messages.
 */
const ChatThread = ({ load, send, upload, onData, showSender = false, empty = tr("No messages yet. Say hello!"), placeholder = tr("Write a message…") }) => {
    const [msgs, setMsgs] = useState(null)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const box = useRef(null)
    const fileInput = useRef(null)
    const rec = useRef(null)
    const [recording, setRecording] = useState(null) // { seconds }
    const last = useRef(null)
    const stick = useRef(true)

    const pull = useCallback(async (full) => {
        try {
            const { messages, ...rest } = await load(full ? null : last.current)
            onData?.(rest)
            if (full) setMsgs(messages)
            else if (messages.length) {
                setMsgs((cur) => [...(cur || []), ...messages.filter((m) => !(cur || []).some((x) => x.id === m.id))])
                if (messages.some((m) => !m.mine)) ping()
            }
        } catch (e) { if (full) setMsgs([]) }
    }, [load, onData])

    useEffect(() => { last.current = null; setMsgs(null); stick.current = true; pull(true) }, [load]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (msgs?.length) last.current = msgs[msgs.length - 1].at }, [msgs])
    useEffect(() => {
        const t = setInterval(() => { if (!document.hidden) pull(false) }, POLL)
        return () => clearInterval(t)
    }, [pull])
    useEffect(() => { if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight }, [msgs])

    const submit = async (attachment) => {
        const body = attachment ? '' : text.trim()
        if ((!body && !attachment) || busy) return
        setBusy(true); setErr('')
        try {
            const m = await send(body, attachment)
            if (!attachment) setText('')
            stick.current = true
            setMsgs((cur) => [...(cur || []).filter((x) => x.id !== m.id), m])
        } catch (e) { setErr(e.message || tr("Could not send")) } finally { setBusy(false) }
    }

    const sendFile = async (file, voice = false) => {
        if (!file || !upload) return
        setBusy(true); setErr('')
        try {
            const att = await upload(file, voice)
            setBusy(false)
            await submit(att)
        } catch (e) { setErr(e.message || tr("Could not upload")); setBusy(false) } finally { if (fileInput.current) fileInput.current.value = '' }
    }

    const startRec = async () => {
        if (recording || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setErr(tr("Voice messages are not supported in this browser")); return }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
            const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
            const chunks = []
            mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
            const state = { mr, stream, cancelled: false, t: setInterval(() => setRecording((r) => (r ? { seconds: r.seconds + 1 } : r)), 1000) }
            mr.onstop = () => {
                clearInterval(state.t); stream.getTracks().forEach((x) => x.stop()); setRecording(null)
                if (state.cancelled || !chunks.length) return
                const ext = (mr.mimeType || '').includes('mp4') ? 'mp4' : 'webm'
                sendFile(new File([new Blob(chunks, { type: mr.mimeType || 'audio/webm' })], `voice-${Date.now()}.${ext}`, { type: mr.mimeType || 'audio/webm' }), true)
            }
            rec.current = state
            mr.start()
            setRecording({ seconds: 0 })
        } catch { setErr(tr("Allow the microphone to record a voice message")) }
    }
    const stopRec = (cancel = false) => { if (rec.current) { rec.current.cancelled = cancel; if (rec.current.mr.state !== 'inactive') rec.current.mr.stop() } }
    useEffect(() => () => { if (rec.current) { rec.current.cancelled = true; try { rec.current.mr.stop() } catch { /* idle */ } } }, [])

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div ref={box} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }} className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
                {msgs && !msgs.length && <div className="py-10 text-center text-sm text-gray-400">{empty}</div>}
                {(msgs || []).map((m, i) => {
                    const prev = msgs[i - 1]
                    if (m.system) return <div key={m.id} className="py-2 text-center text-xs text-gray-400">{m.body} · {time(m.at)}</div>
                    const firstOfRun = !prev || prev.mine !== m.mine || prev.senderName !== m.senderName || +new Date(m.at) - +new Date(prev.at) > 5 * 60000
                    return (
                        <div key={m.id} className={classNames('flex flex-col', m.mine ? 'items-end' : 'items-start', firstOfRun && i > 0 && 'pt-2')}>
                            {firstOfRun && !m.mine && showSender && <span className="mb-0.5 px-1 text-xs font-semibold text-gray-500">{m.senderName}</span>}
                            <div title={time(m.at)} className={classNames('max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm', m.mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100')}>
                                {m.attachment && <Attachment a={m.attachment} mine={m.mine} />}
                                <Mentioned text={m.body} onDark={m.mine} />
                            </div>
                            {(!msgs[i + 1] || msgs[i + 1].mine !== m.mine || +new Date(msgs[i + 1].at) - +new Date(m.at) > 5 * 60000) && <span className="px-1 pt-0.5 text-[11px] text-gray-400">{time(m.at)}</span>}
                        </div>
                    )
                })}
            </div>
            {err && <div className="px-4 pb-1 text-xs text-red-500">{err}</div>}
            {recording ? (
                <div className="flex items-center gap-3 border-t border-gray-200 p-3 dark:border-gray-700">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{tr("Recording…")} {Math.floor(recording.seconds / 60)}:{String(recording.seconds % 60).padStart(2, '0')}</span>
                    <button type="button" onClick={() => stopRec(true)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-lg text-gray-500 dark:bg-gray-700" title={tr("Cancel")}><PiXBold /></button>
                    <button type="button" onClick={() => stopRec(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-white" title={tr("Send voice message")}><PiPaperPlaneTiltFill /></button>
                </div>
            ) : (
                <div className="flex items-end gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
                    {upload && <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title={tr("Attach a file or picture")}><PiPaperclipDuotone /></button>}
                    <textarea
                        rows={1}
                        value={text}
                        maxLength={2000}
                        placeholder={placeholder}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                        className="max-h-28 min-h-9 flex-1 resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-gray-700"
                    />
                    {text.trim() || !upload
                        ? <button type="button" onClick={() => submit()} disabled={busy || !text.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-white disabled:opacity-40"><PiPaperPlaneTiltFill /></button>
                        : <button type="button" onClick={startRec} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xl text-white disabled:opacity-40" title={tr("Record a voice message")}><PiMicrophoneDuotone /></button>}
                    <input ref={fileInput} type="file" className="hidden" onChange={(e) => sendFile(e.target.files?.[0])} />
                </div>
            )}
        </div>
    )
}

export default ChatThread

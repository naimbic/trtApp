import { useCallback, useEffect, useRef, useState } from 'react'
import Mentioned from '@/components/crm/Mentioned'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import Dropdown from '@/components/ui/Dropdown'
import dayjs from 'dayjs'
import { PiPaperPlaneTiltFill, PiPaperclipDuotone, PiMicrophoneDuotone, PiStopFill, PiXBold, PiFileDuotone, PiArrowBendUpLeftBold, PiCameraDuotone, PiTextAaBold, PiDotsThreeBold, PiCheckSquareDuotone, PiUsersDuotone, PiBuildingsDuotone, PiTagDuotone, PiSmileyDuotone, PiStarDuotone, PiStarFill, PiPushPinDuotone, PiPushPinFill, PiPencilSimpleDuotone, PiTrashDuotone, PiCaretDownBold } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { ping, STAMPS } from './chatKit'
import EmojiPicker from '@/components/crm/EmojiPicker'
import { createPortal } from 'react-dom'
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
const preview = (m) => (m.body ? m.body.replace(/\s+/g, ' ').slice(0, 100) : m.attachment?.kind === 'audio' ? `🎤 ${tr("Voice message")}` : m.attachment?.kind === 'image' ? `🖼 ${tr("Picture")}` : m.attachment ? `📎 ${m.attachment.name}` : '')
const time = (d) => (dayjs(d).isSame(dayjs(), 'day') ? dayjs(d).format('HH:mm') : dayjs(d).format('MMM D, HH:mm'))

/**
 * Message list + composer, shared by the staff widget and the client portal.
 * load(after) -> { messages, ...extra }   send(body) -> message   onData(extra) gets everything but messages.
 */
const ChatThread = ({ load, send, upload, onData, showSender = false, empty = tr("No messages yet. Say hello!"), placeholder = tr("Write a message…"), rich = false, onMessageAction, people = [], refreshSignal = 0, act = null, can = {}, wide = false }) => {
    const [html, setHtml] = useState('')
    const [fmt, setFmt] = useState(false) // the full formatting bar of the rich editor
    const editorRef = useRef(null)
    const [msgs, setMsgs] = useState(null)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [replyTo, setReplyTo] = useState(null) // { id, name, text }: the message being answered
    const input = useRef(null)
    const box = useRef(null)
    const fileInput = useRef(null)
    const rec = useRef(null)
    const [recording, setRecording] = useState(null) // { seconds }
    const last = useRef(null)
    const stick = useRef(true)
    const nowRef = useRef(null)
    const [pinned, setPinned] = useState([])
    const [pinOpen, setPinOpen] = useState(false)
    const [tapped, setTapped] = useState(null) // on a touch screen (no hover) a tap on a message shows its tools: reply, react, save, more
    const [stampFor, setStampFor] = useState(null) // { id, rect }: the message whose stamp picker is open and where its button is
    const [editing, setEditing] = useState(null) // { id, text, html }
    useEffect(() => {
        if (!stampFor) return undefined
        const away = (e) => { if (!e.target.closest?.('[data-stamp-bar]') && !e.target.closest?.('[data-emoji-picker]')) setStampFor(null) }
        document.addEventListener('pointerdown', away, true)
        return () => document.removeEventListener('pointerdown', away, true)
    }, [stampFor])
    const addEmoji = (e) => {
        if (rich) { editorRef.current?.chain().focus().insertContent(e).run(); return }
        const el = input.current
        const a = el ? el.selectionStart : text.length, b = el ? el.selectionEnd : text.length
        setText((t) => `${t.slice(0, a)}${e}${t.slice(b)}`)
        setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(a + e.length, a + e.length) } }, 0)
    }

    const pull = useCallback(async (full) => {
        try {
            const { messages, changed, pinned: pins, now, ...rest } = await load(full ? null : last.current, full ? null : nowRef.current)
            if (now) nowRef.current = now
            if (pins) setPinned(pins)
            onData?.(rest)
            if (full) setMsgs(messages)
            else {
                if (changed?.length) setMsgs((cur) => (cur || []).map((x) => changed.find((c) => c.id === x.id) || x))
                if (messages.length) {
                    setMsgs((cur) => [...(cur || []), ...messages.filter((m) => !(cur || []).some((x) => x.id === m.id))])
                    if (messages.some((m) => !m.mine)) ping()
                }
            }
        } catch (e) { if (full) setMsgs([]) }
    }, [load, onData])

    useEffect(() => { last.current = null; nowRef.current = null; setPinned([]); setEditing(null); setMsgs(null); stick.current = true; pull(true) }, [load]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (refreshSignal) pull(true) }, [refreshSignal]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (msgs?.length) last.current = msgs[msgs.length - 1].at }, [msgs])
    useEffect(() => {
        const t = setInterval(() => { if (!document.hidden) pull(false) }, POLL)
        return () => clearInterval(t)
    }, [pull])
    useEffect(() => { if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight }, [msgs])

    const swap = (m) => setMsgs((cur) => (cur || []).map((x) => (x.id === m.id ? m : x)))
    /** react / bookmark / pin / edit / delete: the server answers, the line on screen follows. */
    const tool = async (m, body) => {
        setErr('')
        try {
            const r = await act(m, body)
            if (r.message) swap(r.message)
            else if (body.action === 'bookmark') swap({ ...m, bookmarked: r.bookmarked })
            else if (body.action === 'pin') { swap({ ...m, pinned: r.pinned }); pull(false) }
            else if (body.action === 'delete') { swap({ ...m, deleted: true, body: '', rich: null, attachment: null, reactions: [], pinned: false, bookmarked: false, canEdit: false, canDelete: false }); pull(false) }
            return r
        } catch (e) { setErr(e.message || tr("Could not do this")) }
    }
    const saveEdit = async (m) => {
        const body = m.rich ? { action: 'edit', rich: editing.html } : { action: 'edit', body: editing.text }
        if (m.rich ? !editing.html?.replace(/<[^>]*>/g, '').trim() && !/<img\b/i.test(editing.html || '') : !editing.text?.trim()) return setErr(tr("A message cannot be empty. Delete it instead."))
        const r = await tool(m, body)
        if (r) setEditing(null)
    }
    const goTo = (id) => { const el = box.current?.querySelector(`[data-mid="${id}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('ring-2', 'ring-amber-400'); setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 1400) } setPinOpen(false) }

    const submit = async (attachment) => {
        const body = attachment ? '' : rich ? '' : text.trim()
        const richHtml = rich && !attachment ? html : ''
        if ((!body && !richHtml && !attachment) || busy) return
        setBusy(true); setErr('')
        try {
            const m = await send(body, attachment, replyTo?.id, richHtml || undefined)
            if (!attachment) { setText(''); setHtml('') }
            setReplyTo(null)
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

    // a picture of the screen (or of a window or tab) straight into the message
    const screenshot = async () => {
        if (!navigator.mediaDevices?.getDisplayMedia) { setErr(tr("Your browser cannot take a screenshot: paste a picture instead (Ctrl+V)")); return }
        let stream
        try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }) } catch { return }
        try {
            const v = document.createElement('video'); v.srcObject = stream; v.muted = true
            await v.play(); await new Promise((r) => setTimeout(r, 350)) // one frame of what is shared
            const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight
            cv.getContext('2d').drawImage(v, 0, 0)
            const blob = await new Promise((r) => cv.toBlob(r, 'image/png'))
            const fd = new FormData(); fd.append('file', new File([blob], 'screenshot.png', { type: 'image/png' }))
            const res = await fetch('/api/crm/media/inline', { method: 'POST', body: fd, credentials: 'include' })
            const j = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(j.error || tr("Upload failed, try again"))
            editorRef.current?.chain().focus().setImage({ src: j.url, alt: 'screenshot' }).run()
        } catch (e) { setErr(e.message || tr("Could not take the screenshot")) } finally { stream.getTracks().forEach((x) => x.stop()) }
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
            {pinned.length > 0 && (
                <div className="relative border-b border-amber-200 bg-amber-50 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                    <button type="button" onClick={() => setPinOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-1.5 text-start"><PiPushPinFill className="shrink-0 text-amber-600" /><span className="min-w-0 flex-1 truncate"><b>{pinned[0].senderName}:</b> {pinned[0].text}</span>{pinned.length > 1 && <span className="shrink-0 rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800">{pinned.length}</span>}<PiCaretDownBold className={classNames('shrink-0 transition', pinOpen && 'rotate-180')} /></button>
                    {pinOpen && <div className="absolute inset-x-0 top-full z-20 max-h-56 overflow-y-auto border-b border-amber-200 bg-amber-50 shadow-lg dark:border-amber-500/30 dark:bg-gray-800">{pinned.map((p) => <button key={p.id} type="button" onClick={() => goTo(p.id)} className="flex w-full items-start gap-2 px-3 py-1.5 text-start hover:bg-amber-100 dark:hover:bg-gray-700"><PiPushPinDuotone className="mt-0.5 shrink-0 text-amber-600" /><span className="min-w-0 flex-1"><b>{p.senderName}</b> <span className="text-gray-400">{time(p.at)}</span><span className="block truncate">{p.text}</span></span></button>)}</div>}
                </div>
            )}
            <div ref={box} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }} className={classNames('flex-1 space-y-1 overflow-y-auto px-4 pt-3', wide ? 'pb-10' : 'pb-3')}>
                {msgs && !msgs.length && <div className="py-10 text-center text-sm text-gray-400">{empty}</div>}
                {(msgs || []).map((m, i) => {
                    const prev = msgs[i - 1]
                    if (m.system) return <div key={m.id} className="py-2 text-center text-xs text-gray-400">{m.body} · {time(m.at)}</div>
                    const firstOfRun = !prev || prev.mine !== m.mine || prev.senderName !== m.senderName || +new Date(m.at) - +new Date(prev.at) > 5 * 60000
                    const isEditing = editing?.id === m.id
                    const onDark = m.mine && !wide // only the bubble in the main colour is dark
                    const hasMenu = (rich && onMessageAction && !m.deleted) || (act && !m.deleted && (can.pin || m.canEdit || m.canDelete))
                    return (
                        <div key={m.id} className={classNames('flex flex-col', wide ? 'w-full items-stretch' : m.mine ? 'items-end' : 'items-start', firstOfRun && i > 0 && 'pt-2')}>
                            {wide && firstOfRun && <div className="mb-0.5 flex items-baseline gap-2 px-1"><b className="text-sm text-gray-800 dark:text-gray-100">{m.mine ? tr("You") : m.senderName}</b><span className="text-[11px] text-gray-400">{time(m.at)}{m.edited ? ` · ${tr("edited")}` : ''}{m.bookmarked ? ' ⭐' : ''}</span></div>}
                            {!wide && firstOfRun && !m.mine && showSender && <span className="mb-0.5 px-1 text-xs font-semibold text-gray-500">{m.senderName}</span>}
                            <div data-tapped={tapped === m.id} onClick={(e) => { if (!window.matchMedia?.('(hover: none)').matches || e.target.closest?.('a, button, input, textarea, [role=button]')) return; setTapped((x) => (x === m.id ? null : m.id)) }} className={classNames('group/msg relative', wide ? 'block w-full pb-1' : classNames('flex max-w-[92%] items-center gap-1', m.mine && 'flex-row-reverse'))}>
                                <div data-mid={m.id} title={time(m.at)} className={classNames('min-w-0 whitespace-pre-wrap break-words px-3 py-2 text-sm', wide ? 'w-full rounded-xl' : 'rounded-2xl', m.deleted ? classNames('border border-dashed border-gray-300 italic text-gray-400 dark:border-gray-600', !wide && 'rounded-bl-md') : wide ? (m.mine ? 'bg-primary/10 text-gray-800 dark:text-gray-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100') : m.mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100', m.pinned && !m.deleted && 'ring-1 ring-amber-400/70')}>
                                    {m.deleted ? <span className="flex items-center gap-1"><PiTrashDuotone />{tr("This message was deleted")}</span> : (
                                        <>
                                            {m.pinned && <span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold opacity-80"><PiPushPinFill />{tr("Pinned")}</span>}
                                            {m.replyTo && (
                                                <button type="button" onClick={() => goTo(m.replyTo.id)} className={classNames('mb-1 block w-full rounded-lg border-s-4 px-2 py-1 text-start text-xs', onDark ? 'border-white/70 bg-white/15' : 'border-primary bg-white/70 dark:bg-gray-600')}>
                                                    <span className="block font-semibold">{m.replyTo.name}</span>
                                                    <span className="line-clamp-2 opacity-80">{m.replyTo.text}</span>
                                                </button>
                                            )}
                                            {m.attachment && <Attachment a={m.attachment} mine={onDark} />}
                                            {isEditing ? (
                                                <div className="min-w-[200px] space-y-1.5 text-gray-800">
                                                    {m.rich
                                                        ? <div className="overflow-hidden rounded-xl bg-white"><RichEditor bare toolbar={false} autoFocus minHeight={40} value={editing.html} onChange={(h) => setEditing((e) => ({ ...e, html: h }))} onSubmit={() => saveEdit(m)} /></div>
                                                        : <textarea autoFocus rows={2} value={editing.text} maxLength={2000} onChange={(e) => setEditing((x) => ({ ...x, text: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(m) } else if (e.key === 'Escape') setEditing(null) }} className="w-full resize-none rounded-lg bg-white px-2 py-1 text-sm outline-none ring-1 ring-primary/40" />}
                                                    <div className="flex justify-end gap-1.5"><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-600">{tr("Cancel")}</button><button type="button" onClick={() => saveEdit(m)} className="rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-primary">{tr("Save")}</button></div>
                                                </div>
                                            ) : m.rich ? <div className={classNames('-mx-1 rounded-xl px-2 py-1', onDark ? 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100' : 'bg-white dark:bg-gray-800')}><RichView html={m.rich} /></div> : <Mentioned text={m.body} onDark={onDark} />}
                                            {(m.tags?.length > 0 || m.assigneeIds?.length > 0 || m.taskId || m.clientId || m.leadId) && (
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                                                    {(m.tags || []).map((t) => <span key={t} className={classNames('rounded-full px-1.5 py-0.5', onDark ? 'bg-white/20' : 'bg-primary/10 text-primary')}>#{t}</span>)}
                                                    {m.assigneeIds?.length > 0 && <span className={classNames('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5', onDark ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600')}><PiUsersDuotone />{m.assigneeIds.map((id) => people.find((p) => p.id === id)?.name?.split(' ')[0]).filter(Boolean).join(', ') || m.assigneeIds.length}</span>}
                                                    {m.taskId && <a href={`/crm/tasks/${m.taskId}`} target="_blank" rel="noreferrer" className={classNames('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold', onDark ? 'bg-white/20 underline' : 'bg-emerald-100 text-emerald-700')}><PiCheckSquareDuotone />{tr("Task")}</a>}
                                                    {m.clientId && <a href={`/crm/clients/${m.clientId}`} target="_blank" rel="noreferrer" className={classNames('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5', onDark ? 'bg-white/20 underline' : 'bg-sky-100 text-sky-700')}><PiBuildingsDuotone />{m.clientMailed ? tr("Client emailed") : tr("Client")}</a>}
                                                    {m.leadId && <a href={`/crm/leads/${m.leadId}`} target="_blank" rel="noreferrer" className={classNames('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5', onDark ? 'bg-white/20 underline' : 'bg-violet-100 text-violet-700')}><PiBuildingsDuotone />{m.clientMailed ? tr("Lead emailed") : tr("Lead")}</a>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {!m.deleted && (
                                    <div className={wide ? 'absolute left-2 top-full z-20 -mt-2 flex items-center gap-0.5 group-data-[tapped=true]/msg:!static group-data-[tapped=true]/msg:!mt-1.5 group-data-[tapped=true]/msg:w-fit rounded-lg border border-gray-200 bg-white px-1 py-0.5 pointer-events-none opacity-0 shadow-md transition focus-within:pointer-events-auto focus-within:opacity-100 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 group-data-[tapped=true]/msg:pointer-events-auto group-data-[tapped=true]/msg:opacity-100 dark:border-gray-600 dark:bg-gray-800 [&_button]:!opacity-100 [&_span[role=button]]:!opacity-100' : 'contents'}>
                                        <button type="button" title={tr("Reply")} aria-label={tr("Reply")} onClick={() => { setReplyTo({ id: m.id, name: m.mine ? tr("You") : m.senderName, text: preview(m) }); input.current?.focus() }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-primary focus:opacity-100 group-hover/msg:opacity-100 group-data-[tapped=true]/msg:opacity-100 dark:hover:bg-gray-700"><PiArrowBendUpLeftBold /></button>
                                        {act && can.react && <button type="button" title={tr("React")} aria-label={tr("React")} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setStampFor((x) => (x?.id === m.id ? null : { id: m.id, rect })) }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-amber-500 focus:opacity-100 group-hover/msg:opacity-100 group-data-[tapped=true]/msg:opacity-100 dark:hover:bg-gray-700"><PiSmileyDuotone /></button>}
                                        {act && can.bookmark && <button type="button" title={m.bookmarked ? tr("Remove from saved") : tr("Save for later")} aria-label={tr("Save for later")} aria-pressed={!!m.bookmarked} onClick={() => tool(m, { action: 'bookmark', on: !m.bookmarked })} className={classNames('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base transition hover:bg-gray-100 dark:hover:bg-gray-700', m.bookmarked ? 'text-amber-500 opacity-100' : 'text-gray-400 opacity-0 hover:text-amber-500 focus:opacity-100 group-hover/msg:opacity-100 group-data-[tapped=true]/msg:opacity-100')}>{m.bookmarked ? <PiStarFill /> : <PiStarDuotone />}</button>}
                                        {hasMenu && (
                                            <Dropdown menuZIndex={100002} placement={m.mine ? 'bottom-end' : 'bottom-start'} renderTitle={<span role="button" tabIndex={0} title={tr("More")} aria-label={tr("More")} className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-base text-gray-400 opacity-0 hover:bg-gray-100 hover:text-gray-600 group-hover/msg:opacity-100 group-data-[tapped=true]/msg:opacity-100 focus:opacity-100 dark:hover:bg-gray-700"><PiDotsThreeBold /></span>}>
                                                {act && can.pin && <Dropdown.Item eventKey="pin" onClick={() => tool(m, { action: 'pin', on: !m.pinned })}>{m.pinned ? <PiPushPinFill className="text-lg" /> : <PiPushPinDuotone className="text-lg" />}<span>{m.pinned ? tr("Unpin") : tr("Pin to the conversation")}</span></Dropdown.Item>}
                                                {act && m.canEdit && <Dropdown.Item eventKey="edit" onClick={() => setEditing({ id: m.id, text: m.body, html: m.rich || '' })}><PiPencilSimpleDuotone className="text-lg" /><span>{tr("Edit")}</span></Dropdown.Item>}
                                                {act && m.canDelete && <Dropdown.Item eventKey="delete" onClick={() => { if (window.confirm(tr("Delete this message? It disappears for everybody."))) tool(m, { action: 'delete' }) }}><PiTrashDuotone className="text-lg text-red-500" /><span className="text-red-500">{tr("Delete")}</span></Dropdown.Item>}
                                                {rich && onMessageAction && <Dropdown.Item eventKey="task" onClick={() => onMessageAction(m, 'task')}><PiCheckSquareDuotone className="text-lg" /><span>{tr("Make a task")}</span></Dropdown.Item>}
                                                {rich && onMessageAction && <Dropdown.Item eventKey="assign" onClick={() => onMessageAction(m, 'assign')}><PiUsersDuotone className="text-lg" /><span>{tr("Assign to the team")}</span></Dropdown.Item>}
                                                {rich && onMessageAction && <Dropdown.Item eventKey="client" onClick={() => onMessageAction(m, 'client')}><PiBuildingsDuotone className="text-lg" /><span>{tr("Link a client and email them")}</span></Dropdown.Item>}
                                            </Dropdown>
                                        )}
                                    </div>
                                )}
                            </div>
                            {m.reactions?.length > 0 && (
                                <div className={classNames('mt-0.5 flex flex-wrap gap-1', wide ? 'w-full justify-start px-1' : classNames('max-w-[92%]', m.mine ? 'justify-end' : 'justify-start'))}>
                                    {m.reactions.map((r) => <button key={r.emoji} type="button" disabled={!act || !can.react} onClick={() => tool(m, { action: 'react', emoji: r.emoji })} className={classNames('flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition', r.mine ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300')}><span>{r.emoji}</span><b>{r.count}</b></button>)}
                                </div>
                            )}
                            {!wide && (!msgs[i + 1] || msgs[i + 1].mine !== m.mine || +new Date(msgs[i + 1].at) - +new Date(m.at) > 5 * 60000) && <span className="px-1 pt-0.5 text-[11px] text-gray-400">{time(m.at)}{m.edited ? ` · ${tr("edited")}` : ''}{m.bookmarked ? ' ⭐' : ''}</span>}
                        </div>
                    )
                })}
            </div>
            {stampFor && (() => {
                const msg = (msgs || []).find((x) => x.id === stampFor.id)
                if (!msg) return null
                const above = stampFor.rect.top > 70
                const left = Math.max(8, Math.min(stampFor.rect.left - 40, window.innerWidth - 400))
                return createPortal(
                    <div data-stamp-bar style={{ position: 'fixed', left, top: above ? stampFor.rect.top - 46 : stampFor.rect.bottom + 6, zIndex: 100003 }} className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
                        {STAMPS.map((e) => <button key={e} type="button" onClick={() => { setStampFor(null); tool(msg, { action: 'react', emoji: e }) }} className="rounded-full px-1 text-xl transition hover:scale-125">{e}</button>)}
                        <EmojiPicker title={tr('More emojis')} onPick={(e) => { setStampFor(null); tool(msg, { action: 'react', emoji: e }) }} className="!size-8 !text-xl" />
                    </div>, document.body)
            })()}
            {err && <div className="px-4 pb-1 text-xs text-red-500">{err}</div>}
            {recording ? (
                <div className="flex items-center gap-3 border-t border-gray-200 p-3 dark:border-gray-700">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{tr("Recording…")} {Math.floor(recording.seconds / 60)}:{String(recording.seconds % 60).padStart(2, '0')}</span>
                    <button type="button" onClick={() => stopRec(true)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-lg text-gray-500 dark:bg-gray-700" title={tr("Cancel")}><PiXBold /></button>
                    <button type="button" onClick={() => stopRec(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-white" title={tr("Send voice message")}><PiPaperPlaneTiltFill /></button>
                </div>
            ) : (
                <div className="border-t border-gray-200 dark:border-gray-700">
                {replyTo && (
                    <div className="flex items-center gap-2 px-3 pt-2">
                        <div className="min-w-0 flex-1 rounded-lg border-s-4 border-primary bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700"><span className="block font-semibold">{tr("Replying to")} {replyTo.name}</span><span className="block truncate text-gray-500">{replyTo.text}</span></div>
                        <button type="button" aria-label={tr("Cancel")} onClick={() => setReplyTo(null)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><PiXBold /></button>
                    </div>
                )}
                <div className="flex items-end gap-2 p-3">
                    {upload && <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title={tr("Attach a file or picture")}><PiPaperclipDuotone /></button>}
                    <EmojiPicker onPick={addEmoji} className="!size-9 shrink-0 !rounded-xl !text-xl" />
                    {rich ? (
                        <>
                            {upload && <button type="button" onClick={screenshot} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title={tr("Take a screenshot")}><PiCameraDuotone /></button>}
                            <button type="button" onClick={() => setFmt((v) => !v)} className={classNames('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg hover:bg-gray-100 dark:hover:bg-gray-700', fmt ? 'bg-primary/10 text-primary' : 'text-gray-500')} title={tr("Formatting")}><PiTextAaBold /></button>
                            <div className="max-h-48 min-w-0 flex-1 overflow-y-auto rounded-xl bg-gray-100 focus-within:ring-2 focus-within:ring-primary/40 dark:bg-gray-700">
                                <RichEditor bare toolbar={fmt} minHeight={36} value={html} onChange={setHtml} placeholder={`${placeholder} (@ ${tr("mention")} · # ${tr("tag")})`} onSubmit={() => submit()} onReady={(e) => { editorRef.current = e }} className="[&_.rich-editor]:!py-2" />
                            </div>
                        </>
                    ) : (
                    <textarea
                        ref={input}
                        rows={1}
                        value={text}
                        maxLength={2000}
                        placeholder={placeholder}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } else if (e.key === 'Escape' && replyTo) { e.stopPropagation(); setReplyTo(null) } }}
                        className="max-h-28 min-h-9 flex-1 resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-gray-700"
                    />
                    )}
                    {(rich ? html : text.trim()) || !upload
                        ? <button type="button" onClick={() => submit()} disabled={busy || !(rich ? html : text.trim())} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-white disabled:opacity-40"><PiPaperPlaneTiltFill /></button>
                        : <button type="button" onClick={startRec} disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xl text-white disabled:opacity-40" title={tr("Record a voice message")}><PiMicrophoneDuotone /></button>}
                    <input ref={fileInput} type="file" className="hidden" onChange={(e) => sendFile(e.target.files?.[0])} />
                </div>
                </div>
            )}
        </div>
    )
}

export default ChatThread

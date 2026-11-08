/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import useMe from '@/utils/hooks/useMe'
import { defaultRemindAt } from '@/utils/remind'
import { TbBellRinging, TbFileText, TbLink, TbMessageCircle, TbMicrophone, TbPalette, TbPaperclip, TbPhoto, TbPlus, TbSend, TbStar, TbStarFilled, TbPin, TbPinFilled, TbTrash, TbUsers, TbX, TbPlayerStopFilled } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import FoldSection from '@/components/crm/FoldSection'
import { CommentTools, CommentEdit, CommentThread } from '@/components/crm/CommentParts'
import { mentionDirectory } from '@/utils/mentions'
import { looksLikeHtml } from '@/lib/crm/richText'
import { api, notify, formatBytes } from '../kit/api'
import { COLORS, cardClass, labelOfColor, notesChanged, uploadNoteFile, videosOf } from './noteKit'
import { tr } from '@/utils/t'

const uid = () => Math.random().toString(36).slice(2, 10)
const EMPTY = { title: '', description: '', kind: 'note', checklist: [], color: null, pinned: false, important: false, labels: [], links: [], attachments: [], sharedWith: [], remindAt: null, remindShared: false }

/** The conversation of a note: the owner and the people it is shared with write here. */
const Comments = ({ noteId }) => {
    const [list, setList] = useState(null)
    const [text, setText] = useState('')
    const [reply, setReply] = useState(null)
    const [edit, setEdit] = useState(null)
    const [busy, setBusy] = useState(false)
    const load = useCallback(() => api(`/api/crm/notes/${noteId}/comments`).then((d) => setList(d.list || [])).catch(() => setList([])), [noteId])
    useEffect(() => { load() }, [load])
    const send = async () => {
        setBusy(true)
        try { await api(`/api/crm/notes/${noteId}/comments`, { method: 'POST', body: { body: text, replyToId: reply?.id } }); setText(''); setReply(null); await load(); notesChanged() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
                <CommentThread comments={list || []} render={(c) => (
                    <div key={c.id} className={`group relative rounded-xl border px-3 py-2 text-sm ${c.mine ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/30'}`}>
                        <div className="text-xs"><b>{c.authorName}</b> <span className="text-gray-400">{dayjs(c.createdAt).format('DD MMM, HH:mm')}{c.edited ? ` · ${tr('edited')}` : ''}</span></div>
                        {c.replyTo && <div className="mt-1 truncate border-s-2 border-gray-300 ps-2 text-xs text-gray-500"><b>{c.replyTo.name}</b> {c.replyTo.text}</div>}
                        {edit === c.id
                            ? <CommentEdit initial={c.body} onCancel={() => setEdit(null)} onSave={async (b) => { try { await api(`/api/crm/notes/${noteId}/comments`, { method: 'PUT', body: { commentId: c.id, body: b } }); setEdit(null); load() } catch (e) { notify('danger', e.message) } }} />
                            : <div className="mt-0.5">{looksLikeHtml(c.body) ? <RichView html={c.body} /> : <p className="whitespace-pre-line">{c.body}</p>}</div>}
                        {edit !== c.id && <CommentTools onReply={() => setReply(c)} onEdit={c.mine ? () => setEdit(c.id) : undefined} onDelete={c.canDelete ? async () => { try { await api(`/api/crm/notes/${noteId}/comments?commentId=${c.id}`, { method: 'DELETE' }); load(); notesChanged() } catch (e) { notify('danger', e.message) } } : undefined} />}
                    </div>
                )} />
                {list && !list.length && <p className="py-2 text-center text-xs text-gray-400">{tr('No comments yet.')}</p>}
            </div>
            {reply && <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:bg-gray-700/40"><span className="min-w-0 flex-1 truncate">{tr('Replying to {name}', { name: reply.authorName })}</span><button type="button" onClick={() => setReply(null)} aria-label={tr('Cancel')}><TbX /></button></div>}
            <div className="mt-2 space-y-2">
                <RichEditor minHeight={70} value={text} onChange={setText} placeholder={tr('Write a comment. Use @ to mention a colleague')} />
                <div className="flex justify-end"><Button size="sm" variant="solid" icon={<TbSend />} loading={busy} disabled={!text.replace(/<[^>]*>/g, '').trim() && !/<img/i.test(text)} onClick={send}>{tr('Send')}</Button></div>
            </div>
        </div>
    )
}

/** Create or change a note. note = null creates one; preset = { kind: 'list' } starts a checklist. Someone who only received the note reads it and comments. */
const NoteEditor = ({ open, note, preset, canShare = true, onClose, onSaved }) => {
    const me = useMe()
    const [v, setV] = useState(EMPTY)
    const [busy, setBusy] = useState(false)
    const [fold, setFold] = useState({ content: true, look: true })
    const [staff, setStaff] = useState([])
    const [who, setWho] = useState('')
    const [labelText, setLabelText] = useState('')
    const [linkText, setLinkText] = useState('')
    const [rec, setRec] = useState(null) // { seconds }
    const recRef = useRef(null)
    const fileRef = useRef(null)
    const imgRef = useRef(null)
    const readOnly = !!note && !note.mine
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const tog = (k) => setFold((f) => ({ ...f, [k]: !f[k] }))

    useEffect(() => {
        if (!open) return
        setV(note ? { ...EMPTY, ...note, sharedWith: (note.sharedWith || []).map((s) => s.id), remindAt: note.remindAt ? new Date(note.remindAt) : null } : { ...EMPTY, ...(preset || {}), checklist: preset?.kind === 'list' ? [{ id: uid(), text: '', done: false }] : [] })
        setFold({ content: true, look: true, media: !!preset?.focus, comments: !!note && !note.mine })
        setWho(''); setLabelText(''); setLinkText('')
        mentionDirectory().then((d) => setStaff((d.staff || []).filter((s) => s.id !== d.me)))
    }, [open, note, preset])
    useEffect(() => () => { try { recRef.current?.mr?.stop() } catch { /* not recording */ } }, [])

    const addFiles = async (files) => {
        setBusy(true)
        try {
            const got = []
            for (const f of files) got.push(await uploadNoteFile(f))
            setV((x) => ({ ...x, attachments: [...x.attachments, ...got].slice(0, 20) }))
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const startRec = async () => {
        if (rec) return
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return notify('warning', tr('Voice messages are not supported in this browser'))
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
            const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
            const chunks = []
            mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
            const state = { mr, cancelled: false, t: setInterval(() => setRec((r) => (r ? { seconds: r.seconds + 1 } : r)), 1000) }
            mr.onstop = async () => {
                clearInterval(state.t); stream.getTracks().forEach((x) => x.stop()); setRec(null)
                if (state.cancelled || !chunks.length) return
                const ext = (mr.mimeType || '').includes('mp4') ? 'mp4' : 'webm'
                setBusy(true)
                try { const a = await uploadNoteFile(new File([new Blob(chunks, { type: mr.mimeType || 'audio/webm' })], `voice-${Date.now()}.${ext}`, { type: mr.mimeType || 'audio/webm' }), true); setV((x) => ({ ...x, attachments: [...x.attachments, a] })) } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
            }
            mr.start(); recRef.current = state; setRec({ seconds: 0 })
        } catch { notify('warning', tr('Allow the microphone to record a voice message')) }
    }
    const stopRec = (cancel = false) => { const s = recRef.current; if (!s) return; s.cancelled = cancel; try { s.mr.stop() } catch { /* already stopped */ } }

    const body = () => ({ title: v.title, description: v.kind === 'list' ? '' : v.description, kind: v.kind, checklist: v.kind === 'list' ? v.checklist : v.checklist.filter((c) => c.text.trim()), color: v.color, pinned: v.pinned, important: v.important, labels: [...new Set([...v.labels, ...(labelText.trim() ? [labelText.trim()] : [])])].slice(0, 10), links: v.links, attachments: v.attachments, remindAt: v.remindAt ? new Date(v.remindAt).toISOString() : null, remindShared: v.remindShared, ...(canShare ? { sharedWith: v.sharedWith } : {}) })
    const save = async () => {
        setBusy(true)
        try {
            const d = await api(note ? `/api/crm/notes/${note.id}` : '/api/crm/notes', { method: note ? 'PATCH' : 'POST', body: body() })
            notify('success', note ? tr('Note saved') : tr('Note added'))
            onSaved?.(d.note); notesChanged(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const remove = async () => {
        setBusy(true)
        try { await api(`/api/crm/notes/${note.id}`, { method: 'DELETE' }); notify('success', tr('Note deleted')); onSaved?.(); notesChanged(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }

    const items = v.checklist
    const setItem = (id, p) => set({ checklist: items.map((c) => (c.id === id ? { ...c, ...p } : c)) })
    const matches = who.trim() ? staff.filter((s) => s.name.toLowerCase().includes(who.trim().toLowerCase()) && !v.sharedWith.includes(s.id)).slice(0, 6) : []
    const nameOf = (id) => staff.find((s) => s.id === id)?.name || note?.sharedWith?.find((s) => s.id === id)?.name || ''

    return (
        <Dialog isOpen={open} width={640} onClose={onClose} onRequestClose={onClose} contentClassName="!p-0">
            <div className={`rounded-t-2xl border-b px-5 pb-3 pt-4 ${cardClass(v.color)}`}>
                <div className="flex items-center gap-2 pe-8">
                    <input value={v.title} disabled={readOnly} onChange={(e) => set({ title: e.target.value })} placeholder={tr('Title')} className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-gray-400" />
                    {!readOnly && <>
                        <button type="button" title={v.important ? tr('Not important') : tr('Mark as important')} onClick={() => set({ important: !v.important })} className={`grid size-8 place-items-center rounded-full text-xl hover:bg-black/10 ${v.important ? 'text-amber-500' : 'text-gray-500'}`}>{v.important ? <TbStarFilled /> : <TbStar />}</button>
                        <button type="button" title={v.pinned ? tr('Unpin') : tr('Pin')} onClick={() => set({ pinned: !v.pinned })} className={`grid size-8 place-items-center rounded-full text-xl hover:bg-black/10 ${v.pinned ? 'text-primary' : 'text-gray-500'}`}>{v.pinned ? <TbPinFilled /> : <TbPin />}</button>
                    </>}
                </div>
                {readOnly && <p className="mt-1 text-xs text-gray-500">{tr('Shared with you by {name}. You can read it and comment.', { name: note.owner })}</p>}
            </div>
            <div className="max-h-[68vh] space-y-2.5 overflow-y-auto px-5 py-4">
                <FoldSection icon={<TbFileText />} tone="amber" title={v.kind === 'list' ? tr('Checklist') : tr('Note')} open={fold.content} onToggle={() => tog('content')}>
                    {!readOnly && (
                        <div className="mb-2 inline-flex rounded-lg border border-gray-200 p-0.5 text-xs dark:border-gray-600">
                            <button type="button" onClick={() => set({ kind: 'note' })} className={`rounded-md px-2.5 py-1 font-semibold ${v.kind === 'note' ? 'bg-primary text-white' : ''}`}>{tr('Text')}</button>
                            <button type="button" onClick={() => set({ kind: 'list', checklist: items.length ? items : [{ id: uid(), text: '', done: false }] })} className={`rounded-md px-2.5 py-1 font-semibold ${v.kind === 'list' ? 'bg-primary text-white' : ''}`}>{tr('Checklist')}</button>
                        </div>
                    )}
                    {v.kind === 'list' ? (
                        <div className="space-y-1">
                            {items.map((c, i) => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <input type="checkbox" checked={c.done} disabled={readOnly} onChange={(e) => setItem(c.id, { done: e.target.checked })} className="size-4 shrink-0" />
                                    <input value={c.text} disabled={readOnly} onChange={(e) => setItem(c.id, { text: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const n = { id: uid(), text: '', done: false }; set({ checklist: [...items.slice(0, i + 1), n, ...items.slice(i + 1)] }) } }} placeholder={tr('List item')} className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-gray-300 dark:focus:border-gray-600 ${c.done ? 'text-gray-400 line-through' : ''}`} />
                                    {!readOnly && <button type="button" aria-label={tr('Delete')} onClick={() => set({ checklist: items.filter((x) => x.id !== c.id) })} className="text-gray-400 hover:text-red-500"><TbX /></button>}
                                </div>
                            ))}
                            {!readOnly && <Button size="xs" icon={<TbPlus />} onClick={() => set({ checklist: [...items, { id: uid(), text: '', done: false }] })}>{tr('Add an item')}</Button>}
                        </div>
                    ) : readOnly
                        ? (looksLikeHtml(v.description) ? <RichView html={v.description} /> : <p className="whitespace-pre-line text-sm">{v.description}</p>)
                        : <RichEditor minHeight={140} value={v.description} onChange={(html) => set({ description: html })} placeholder={tr('Take a note… Use @ to mention a colleague and share it with them')} />}
                </FoldSection>
                {videosOf(v).length > 0 && (
                    <div className="mt-3 grid gap-2">
                        {videosOf(v).map((id) => <div key={id} className="aspect-video w-full overflow-hidden rounded-xl bg-black"><iframe title="YouTube" src={`https://www.youtube-nocookie.com/embed/${id}`} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="size-full border-0" /></div>)}
                    </div>
                )}
                {!readOnly && (
                    <FoldSection icon={<TbPalette />} tone="emerald" title={tr('Colour and labels')} summary={[v.color ? labelOfColor(v.color) : '', v.labels.join(', ')].filter(Boolean).join(' · ')} open={!!fold.look} onToggle={() => tog('look')}>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            <button type="button" title={tr('Default')} onClick={() => set({ color: null })} className={`size-7 rounded-full border border-gray-300 bg-white ${!v.color ? 'ring-2 ring-primary' : ''}`} />
                            {Object.entries(COLORS).map(([k, c]) => <button key={k} type="button" title={labelOfColor(k)} onClick={() => set({ color: k })} className={`size-7 rounded-full ${c.dot} ${v.color === k ? 'ring-2 ring-primary' : ''}`} />)}
                        </div>
                        <div className="mb-1.5 flex flex-wrap gap-1.5">{v.labels.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold dark:bg-gray-700">{l}<button type="button" aria-label={tr('Remove')} onClick={() => set({ labels: v.labels.filter((x) => x !== l) })}><TbX /></button></span>)}</div>
                        <div className="flex gap-2"><Input size="sm" value={labelText} onChange={(e) => setLabelText(e.target.value)} placeholder={tr('Add a label')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (labelText.trim() && v.labels.length < 10) { set({ labels: [...new Set([...v.labels, labelText.trim()])] }); setLabelText('') } } }} /><Button size="sm" icon={<TbPlus />} disabled={!labelText.trim()} onClick={() => { set({ labels: [...new Set([...v.labels, labelText.trim()])] }); setLabelText('') }}>{tr('Add')}</Button></div>
                    </FoldSection>
                )}

                {(!readOnly || v.attachments.length > 0) && (
                    <FoldSection icon={<TbPhoto />} tone="blue" title={tr('Pictures, voice and files')} summary={v.attachments.length ? tr('{n} attached', { n: v.attachments.length }) : ''} open={!!fold.media} onToggle={() => tog('media')}>
                        {!readOnly && (
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} />
                                <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} />
                                <Button size="xs" icon={<TbPhoto />} disabled={busy} onClick={() => imgRef.current?.click()}>{tr('Picture')}</Button>
                                {rec
                                    ? <><span className="flex items-center gap-1.5 text-xs font-semibold text-red-500"><span className="size-2 animate-pulse rounded-full bg-red-500" />{Math.floor(rec.seconds / 60)}:{String(rec.seconds % 60).padStart(2, '0')}</span><Button size="xs" variant="solid" icon={<TbPlayerStopFilled />} onClick={() => stopRec(false)}>{tr('Stop and add')}</Button><Button size="xs" onClick={() => stopRec(true)}>{tr('Cancel')}</Button></>
                                    : <Button size="xs" icon={<TbMicrophone />} disabled={busy} onClick={startRec}>{tr('Record a voice note')}</Button>}
                                <Button size="xs" icon={<TbPaperclip />} disabled={busy} onClick={() => fileRef.current?.click()}>{tr('File')}</Button>
                            </div>
                        )}
                        <div className="space-y-2">
                            {v.attachments.map((a) => (
                                <div key={a.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1.5 text-sm dark:border-gray-700">
                                    {a.kind === 'image' ? <img loading="lazy" decoding="async" src={a.url} alt={a.name} className="size-12 shrink-0 rounded-md object-cover" /> : a.kind === 'audio' ? <TbMicrophone className="mx-2 shrink-0 text-xl text-primary" /> : <TbPaperclip className="mx-2 shrink-0 text-xl text-gray-400" />}
                                    <div className="min-w-0 flex-1">
                                        <a href={a.url} target="_blank" rel="noreferrer" className="block truncate font-semibold hover:underline">{a.kind === 'audio' ? tr('Voice note') : a.name}</a>
                                        {a.kind === 'audio' ? <audio controls preload="none" src={a.url} className="mt-1 h-8 w-full" /> : <span className="text-xs text-gray-400">{formatBytes(a.size)}</span>}
                                    </div>
                                    {!readOnly && <button type="button" aria-label={tr('Remove')} onClick={() => set({ attachments: v.attachments.filter((x) => x.url !== a.url) })} className="text-gray-400 hover:text-red-500"><TbTrash /></button>}
                                </div>
                            ))}
                            {!v.attachments.length && <p className="text-xs text-gray-400">{tr('Add pictures, record a voice note or attach a file. Pictures can also be pasted in the text.')}</p>}
                        </div>
                    </FoldSection>
                )}

                {(!readOnly || v.links.length > 0) && (
                    <FoldSection icon={<TbLink />} tone="violet" title={tr('Links')} summary={v.links.length ? tr('{n} links', { n: v.links.length }) : ''} open={!!fold.links} onToggle={() => tog('links')}>
                        {v.links.map((l) => (
                            <div key={l.url} className="mb-1 flex items-center gap-2 text-sm"><TbLink className="shrink-0 text-gray-400" /><a href={l.url} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate text-primary hover:underline">{l.title || l.url}</a>{!readOnly && <button type="button" aria-label={tr('Remove')} onClick={() => set({ links: v.links.filter((x) => x.url !== l.url) })} className="text-gray-400 hover:text-red-500"><TbX /></button>}</div>
                        ))}
                        {!readOnly && <div className="mt-1 flex gap-2"><Input size="sm" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="https://" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (linkText.trim()) { set({ links: [...v.links, { url: linkText.trim(), title: '' }] }); setLinkText('') } } }} /><Button size="sm" icon={<TbPlus />} disabled={!linkText.trim()} onClick={() => { set({ links: [...v.links, { url: linkText.trim(), title: '' }] }); setLinkText('') }}>{tr('Add')}</Button></div>}
                    </FoldSection>
                )}

                {!readOnly && (
                    <FoldSection icon={<TbBellRinging />} tone="rose" title={tr('Reminder and sharing')} summary={[v.remindAt ? `🔔 ${dayjs(v.remindAt).format('DD MMM HH:mm')}` : '', v.sharedWith.length ? `👥 ${v.sharedWith.length}` : ''].filter(Boolean).join(' · ')} open={!!fold.remind} onToggle={() => tog('remind')}>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                                    <Switcher checked={!!v.remindAt} onChange={(c) => set({ remindAt: c ? defaultRemindAt(me?.notifyHours) : null })} />
                                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><TbBellRinging className="shrink-0" />{tr('Remind me')}</span>
                                </label>
                                {v.remindAt && <div className="w-full sm:w-56"><DatePicker.DateTimepicker size="sm" value={v.remindAt} onChange={(d) => set({ remindAt: d || null })} /></div>}
                            </div>
                            {v.remindAt && <p className="mt-1.5 text-xs text-gray-500">{tr('You are told on the bell, on your phone, by email and on Telegram or WhatsApp (if set in your profile) at the first run of the automatic tasks after that time.')}</p>}
                            {v.remindAt && v.sharedWith.length > 0 && <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm"><Switcher checked={v.remindShared} onChange={(c) => set({ remindShared: c })} />{tr('Remind the people it is shared with too')}</label>}
                        </div>
                        {canShare ? (
                            <div className="mt-3">
                                <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><TbUsers />{tr('Share with colleagues')}</div>
                                <div className="mb-1.5 flex flex-wrap gap-1.5">
                                    {v.sharedWith.map((id) => <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{nameOf(id) || '…'}<button type="button" aria-label={tr('Remove')} onClick={() => set({ sharedWith: v.sharedWith.filter((x) => x !== id) })}><TbX /></button></span>)}
                                </div>
                                <div className="relative">
                                    <Input size="sm" value={who} onChange={(e) => setWho(e.target.value)} placeholder={tr('Type a name')} />
                                    {matches.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">{matches.map((s) => <button key={s.id} type="button" className="block w-full rounded-md px-2 py-1 text-start text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { set({ sharedWith: [...v.sharedWith, s.id] }); setWho('') }}>{s.name}</button>)}</div>}
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{tr('They see the note, get a notification and can comment. A colleague you mention with @ in the text gets it too.')}</p>
                            </div>
                        ) : <p className="mt-2 text-xs text-gray-500">{tr('You do not have the permission to share notes.')}</p>}
                    </FoldSection>
                )}


                {note && (
                    <FoldSection icon={<TbMessageCircle />} tone="blue" title={tr('Comments')} summary={note.comments ? String(note.comments) : ''} open={!!fold.comments} onToggle={() => tog('comments')}>
                        <Comments noteId={note.id} />
                    </FoldSection>
                )}
            </div>
            <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
                {note && !readOnly && <Button variant="plain" className="text-red-500" disabled={busy} onClick={remove}>{tr('Delete')}</Button>}
                <div className="ms-auto flex gap-2"><Button onClick={onClose}>{readOnly ? tr('Close') : tr('Cancel')}</Button>{!readOnly && <Button variant="solid" loading={busy} onClick={save}>{tr('Save')}</Button>}</div>
            </div>
        </Dialog>
    )
}

export default NoteEditor

/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbArrowLeft, TbBell, TbBellOff, TbCheck, TbChecklist, TbCopy, TbEye, TbEyeOff, TbLink, TbLock, TbNote, TbPaperclip, TbPencil, TbPin, TbPinFilled, TbPlus, TbSearch, TbTrash, TbX, TbSquareRoundedCheck, TbNotes, TbSend } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { api, notify, upload } from '@/views/crm/kit/api'
import { confirmDelete } from '@/components/crm/useConfirm'
import { tr } from '@/utils/t'

const BASE = '/api/crm/chat/my-space'
const KINDS = [['note', tr("Note"), TbNotes], ['link', tr("Link"), TbLink], ['password', tr("Password"), TbLock]]
const FILTERS = [['all', tr("All")], ['pinned', tr("Pinned")], ['reminders', tr("Reminders")], ['done', tr("Done")]]
const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800'
const stamp = (d) => dayjs(d).format(dayjs(d).isSame(dayjs(), 'year') ? 'DD MMM, HH:mm' : 'DD MMM YYYY, HH:mm')
const local = (d) => (d ? dayjs(d).format('YYYY-MM-DDTHH:mm') : '')
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : n ? `${n} B` : '')

/** Text with its web addresses made clickable. */
const Linked = ({ text }) => String(text || '').split(/(https?:\/\/[^\s<>"')]+)/g).map((part, i) => (/^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="break-all text-primary hover:underline">{part}</a> : <span key={i}>{part}</span>))

/** The form to add an item, or to change one. */
const Editor = ({ init, onSave, onCancel, saving, compact }) => {
    const [v, setV] = useState({ kind: 'note', title: '', body: '', url: '', secret: true, attachments: [], remindAt: '', ...init })
    const [busy, setBusy] = useState(false)
    const fileRef = useRef(null)
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const addFiles = async (files) => {
        setBusy(true)
        try { const got = []; for (const f of files) { const fd = new FormData(); fd.append('file', f); got.push(await upload('/api/crm/chat/upload', fd)) } set({ attachments: [...v.attachments, ...got].slice(0, 10) }) } catch (e) { notify('danger', e.message) } finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
    }
    const onPaste = (e) => { const files = [...(e.clipboardData?.files || [])]; if (files.length) { e.preventDefault(); addFiles(files) } }
    const submit = () => onSave({ kind: v.kind, title: v.title, body: v.body, url: v.kind === 'link' ? v.url : '', secret: v.kind === 'password', attachments: v.attachments, remindAt: v.remindAt ? new Date(v.remindAt).toISOString() : null })
    const label = v.kind === 'password' ? tr("The secret (hidden, kept encrypted)") : v.kind === 'link' ? tr("Note about the link (optional)") : tr("What do you want to keep?")
    return (
        <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60" onPaste={onPaste}>
            <div className="flex flex-wrap items-center gap-1">
                {KINDS.map(([k, name, Icon]) => <button key={k} type="button" onClick={() => set({ kind: k })} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${v.kind === k ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200'}`}><Icon />{name}</button>)}
            </div>
            <input className={field} placeholder={v.kind === 'password' ? tr("What is it for? (for example Gmail of the agency)") : tr("Title (optional)")} value={v.title} onChange={(e) => set({ title: e.target.value })} />
            {v.kind === 'link' && <input className={field} placeholder="https://" value={v.url} onChange={(e) => set({ url: e.target.value })} />}
            <textarea className={`${field} resize-y`} rows={compact ? 3 : v.kind === 'note' ? 4 : 2} placeholder={label} value={v.body} onChange={(e) => set({ body: e.target.value })} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }} />
            {v.attachments.length > 0 && <div className="space-y-1">{v.attachments.map((a) => <div key={a.url} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-xs dark:bg-gray-700"><TbPaperclip className="shrink-0 text-gray-400" /><span className="min-w-0 flex-1 truncate">{a.name}</span><span className="text-gray-400">{size(a.size)}</span><button type="button" aria-label={tr("Remove")} onClick={() => set({ attachments: v.attachments.filter((x) => x.url !== a.url) })} className="text-gray-400 hover:text-red-500"><TbX /></button></div>)}</div>}
            <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles([...e.target.files])} />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"><TbPaperclip />{busy ? tr("Uploading…") : tr("Attach")}</button>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300"><TbBell />{tr("Remind me")}<input type="datetime-local" className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" value={v.remindAt} onChange={(e) => set({ remindAt: e.target.value })} /></label>
                <span className="ms-auto flex gap-2">{onCancel && <Button size="sm" onClick={onCancel}>{tr("Cancel")}</Button>}<Button size="sm" variant="solid" loading={saving} icon={init?.id ? <TbCheck /> : <TbPlus />} onClick={submit}>{init?.id ? tr("Save") : tr("Add")}</Button></span>
            </div>
        </div>
    )
}

/**
 * My space: a private place to keep anything for later (notes, links, passwords, files), with a reminder, and a way to turn an item into a task or a note.
 * Only its owner writes in it. People with the right (the Super Admin first) can look at somebody else's, read only.
 */
const MySpace = ({ compact = false, onBack = null, openId = '' }) => {
    const [d, setD] = useState(null)
    const [owner, setOwner] = useState('')
    const [q, setQ] = useState('')
    const [filter, setFilter] = useState('all')
    const [adding, setAdding] = useState(false)
    const [edit, setEdit] = useState(null)
    const [saving, setSaving] = useState(false)
    const [shown, setShown] = useState({}) // revealed secrets: id -> text
    const [remind, setRemind] = useState(null) // { id, value }
    const [msg, setMsg] = useState('') // the message bar: write and send, like a chat with yourself
    const [files, setFiles] = useState([])
    const [sending, setSending] = useState(false)
    const [upBusy, setUpBusy] = useState(false)
    const msgFile = useRef(null)
    const listRef = useRef(null)
    const load = useCallback(() => api(`${BASE}?owner=${owner}&q=${encodeURIComponent(q)}`).then(setD).catch((e) => { notify('danger', e.message); setD({ items: [], owners: [], readOnly: false, canViewOthers: false }) }), [owner, q])
    useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t) }, [load, q])
    useEffect(() => { setShown({}); setEdit(null); setAdding(false) }, [owner])
    const ro = !!d?.readOnly
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); await load() } catch (e) { notify('danger', e.message) } }
    const save = async (v) => {
        setSaving(true)
        try {
            await api(BASE, { method: edit?.id ? 'PUT' : 'POST', body: edit?.id ? { id: edit.id, ...v } : v })
            setAdding(false); setEdit(null); setShown({}); notify('success', edit?.id ? tr("Saved") : tr("Kept in My space")); await load()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const addMsgFiles = async (list) => {
        setUpBusy(true)
        try { const got = []; for (const f of list) { const fd = new FormData(); fd.append('file', f); got.push(await upload('/api/crm/chat/upload', fd)) } setFiles((x) => [...x, ...got].slice(0, 10)) } catch (e) { notify('danger', e.message) } finally { setUpBusy(false); if (msgFile.current) msgFile.current.value = '' }
    }
    const send = async () => {
        if (sending || upBusy || (!msg.trim() && !files.length)) return
        setSending(true)
        try {
            await api(BASE, { method: 'POST', body: { kind: 'note', body: msg, attachments: files } })
            setMsg(''); setFiles([]); setQ(''); setFilter('all'); await load()
            listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (e) { notify('danger', e.message) } finally { setSending(false) }
    }
    const patch = (it, body, ok) => run(() => api(BASE, { method: 'PUT', body: { id: it.id, ...body } }), ok)
    const reveal = async (it) => {
        if (shown[it.id] !== undefined) { setShown((s) => { const n = { ...s }; delete n[it.id]; return n }); return }
        try { const r = await api(`${BASE}?reveal=${it.id}`); setShown((s) => ({ ...s, [it.id]: r.body })) } catch (e) { notify('danger', e.message) }
    }
    const copy = async (it) => { try { const text = it.secret ? (shown[it.id] ?? (await api(`${BASE}?reveal=${it.id}`)).body) : it.body; await navigator.clipboard.writeText(text); notify('success', tr("Copied")) } catch { notify('danger', tr("Could not copy")) } }
    const startEdit = async (it) => {
        let body = it.body
        if (it.secret && it.hasBody) { try { body = (await api(`${BASE}?reveal=${it.id}`)).body } catch (e) { return notify('danger', e.message) } }
        setEdit({ id: it.id, kind: it.kind, title: it.title, body, url: it.url, attachments: it.attachments, remindAt: local(it.remindAt) })
    }
    const convert = (it, to) => run(() => api(BASE, { method: 'POST', body: { action: 'convert', id: it.id, to } }), to === 'task' ? tr("Task created") : tr("Note created"))
    const items = (d?.items || []).filter((it) => (filter === 'pinned' ? it.pinned : filter === 'reminders' ? it.remindAt && !it.done : filter === 'done' ? it.done : filter === 'all' ? true : true))
    const ownerOpts = [{ value: '', label: tr("My space") }, ...(d?.owners || []).map((o) => ({ value: o.id, label: `${o.name} (${o.count})` }))]
    const asked = openId && items.find((x) => x.id === openId)

    const card = (it) => {
        const Icon = KINDS.find((k) => k[0] === it.kind)?.[2] || TbNotes
        const late = it.remindAt && !it.done && +new Date(it.remindAt) < Date.now()
        const open = shown[it.id]
        return (
            <div key={it.id} id={`space-${it.id}`} className={`group rounded-2xl border p-3 text-sm transition ${asked?.id === it.id ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200 dark:border-gray-700'} ${it.done ? 'opacity-60' : ''} bg-white dark:bg-gray-800`}>
                <div className="flex items-start gap-2">
                    <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-base ${it.kind === 'password' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20' : it.kind === 'link' ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'}`}><Icon /></span>
                    <div className="min-w-0 flex-1">
                        {it.title && <div className={`font-semibold heading-text ${it.done ? 'line-through' : ''}`}>{it.title}</div>}
                        {it.url && <a href={it.url} target="_blank" rel="noreferrer noopener" className="block break-all text-xs text-primary hover:underline">{it.url}</a>}
                        {it.secret ? (
                            it.hasBody && <div className="mt-1 flex items-center gap-1.5"><code className="min-w-0 flex-1 break-all rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">{open !== undefined ? open : '••••••••••'}</code></div>
                        ) : it.body ? <div className="mt-1 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200"><Linked text={it.body} /></div> : null}
                        {it.attachments.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{it.attachments.map((a) => a.kind === 'image' ? <a key={a.url} href={a.url} target="_blank" rel="noreferrer" title={a.name}><img src={a.url} alt={a.name} loading="lazy" className="h-16 max-w-[140px] rounded-lg object-cover" /></a> : <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-primary dark:bg-gray-700"><TbPaperclip className="shrink-0" /><span className="truncate">{a.name}</span></a>)}</div>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                            <span>{stamp(it.createdAt)}</span>
                            {it.remindAt && !it.done && <span className={`inline-flex items-center gap-1 font-semibold ${late ? 'text-red-500' : 'text-amber-600'}`}><TbBell />{stamp(it.remindAt)}</span>}
                            {it.convertedTo && <span className="inline-flex items-center gap-1 text-emerald-600"><TbCheck />{it.convertedTo.startsWith('task') ? tr("Turned into a task") : tr("Turned into a note")}</span>}
                        </div>
                    </div>
                    {!ro && <button type="button" title={it.pinned ? tr("Unpin") : tr("Pin")} onClick={() => patch(it, { pinned: !it.pinned })} className={`shrink-0 text-lg ${it.pinned ? 'text-primary' : 'text-gray-300 hover:text-gray-500'}`}>{it.pinned ? <TbPinFilled /> : <TbPin />}</button>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-0.5 text-gray-500">
                    {it.secret && it.hasBody && <Button size="xs" variant="plain" icon={open !== undefined ? <TbEyeOff /> : <TbEye />} onClick={() => reveal(it)}>{open !== undefined ? tr("Hide") : tr("Show")}</Button>}
                    {(it.hasBody || it.url) && <Button size="xs" variant="plain" icon={<TbCopy />} onClick={() => (it.url && !it.hasBody ? navigator.clipboard.writeText(it.url).then(() => notify('success', tr("Copied"))) : copy(it))}>{tr("Copy")}</Button>}
                    {!ro && (
                        <>
                            <Button size="xs" variant="plain" icon={it.remindAt && !it.done ? <TbBell className="text-amber-500" /> : <TbBellOff />} onClick={() => setRemind(remind?.id === it.id ? null : { id: it.id, value: local(it.remindAt) })}>{tr("Remind")}</Button>
                            <Button size="xs" variant="plain" icon={<TbSquareRoundedCheck />} onClick={() => patch(it, { done: !it.done })}>{it.done ? tr("Reopen") : tr("Done")}</Button>
                            {!it.secret && <Button size="xs" variant="plain" icon={<TbChecklist />} title={tr("Make a task from it")} onClick={() => convert(it, 'task')}>{tr("Task")}</Button>}
                            {!it.secret && <Button size="xs" variant="plain" icon={<TbNote />} title={tr("Make a note from it")} onClick={() => convert(it, 'note')}>{tr("Note")}</Button>}
                            <Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => startEdit(it)} aria-label={tr("Edit")} />
                            <Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} aria-label={tr("Delete")} onClick={() => confirmDelete(tr("Delete this item?"), () => run(() => api(`${BASE}?id=${it.id}`, { method: 'DELETE' }), tr("Deleted")), { text: tr("It is removed from your My space for good.") })} />
                        </>
                    )}
                </div>
                {remind?.id === it.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-2 dark:bg-gray-700/50">
                        <input type="datetime-local" className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" value={remind.value} onChange={(e) => setRemind({ ...remind, value: e.target.value })} />
                        <Button size="xs" variant="solid" disabled={!remind.value} onClick={() => { patch(it, { remindAt: new Date(remind.value).toISOString(), done: false }, tr("Reminder set")); setRemind(null) }}>{tr("Set")}</Button>
                        {it.remindAt && <Button size="xs" onClick={() => { patch(it, { remindAt: null }, tr("Reminder removed")); setRemind(null) }}>{tr("Remove")}</Button>}
                        <span className="flex gap-1">{[['1h', 60], ['Tomorrow 9:00', 'tm'], ['Next week', 'nw']].map(([l, m]) => <button key={l} type="button" className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300" onClick={() => setRemind({ ...remind, value: local(m === 'tm' ? dayjs().add(1, 'day').hour(9).minute(0) : m === 'nw' ? dayjs().add(7, 'day').hour(9).minute(0) : dayjs().add(m, 'minute')) })}>{l === '1h' ? tr("In 1 hour") : l === 'Tomorrow 9:00' ? tr("Tomorrow 9:00") : tr("Next week")}</button>)}</span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-amber-50 via-orange-50/60 to-rose-50/40 dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-900/30">
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-gray-700 dark:bg-transparent">
                {onBack && <button type="button" className="text-xl text-gray-500 md:hidden" onClick={onBack} aria-label={tr("Back")}><TbArrowLeft /></button>}
                <div className="min-w-0 flex-1">
                    <div className="font-bold heading-text">{ro ? tr("My space of {name}", { name: ownerOpts.find((o) => o.value === d.owner)?.label.replace(/ \(\d+\)$/, '') || '' }) : tr("My space")}</div>
                    {ro && <div className="flex items-center gap-1 text-xs text-gray-500"><TbLock className="shrink-0" />{tr("Read only. This is private to its owner.")}</div>}
                </div>
                {d?.canViewOthers && d.owners.length > 0 && <div className="w-48 shrink-0"><Select size="sm" isSearchable={d.owners.length > 6} options={ownerOpts} value={ownerOpts.find((o) => o.value === (ro ? d.owner : '')) || ownerOpts[0]} onChange={(o) => setOwner(o?.value || '')} /></div>}
            </div>
            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {!ro && !adding && !edit && <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-left text-sm text-gray-500 transition hover:border-primary hover:text-primary dark:border-gray-600"><TbPlus className="text-lg" />{tr("Keep a note, a link, a password, a file…")}</button>}
                {!ro && adding && <Editor compact={compact} saving={saving} onSave={save} onCancel={() => setAdding(false)} />}
                {edit && <Editor compact={compact} init={edit} saving={saving} onSave={save} onCancel={() => setEdit(null)} />}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[140px] flex-1"><TbSearch className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input className={`${field} !ps-8`} placeholder={tr("Search My space")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
                    <div className="flex gap-1">{FILTERS.map(([k, name]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filter === k ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{name}</button>)}</div>
                </div>
                {!d ? <p className="py-8 text-center text-sm text-gray-400">{tr("Loading…")}</p> : items.length ? items.map(card) : <p className="px-6 py-10 text-center text-sm text-gray-400">{q || filter !== 'all' ? tr("Nothing matches.") : ro ? tr("This space is empty.") : tr("Nothing here yet. Keep anything you want to check back later: a memo, a link, a password, a file. Add a reminder, or turn it into a task or a note.")}</p>}
            </div>
            {!ro && (
                <div className="border-t border-amber-100 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/60" onPaste={(e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); addMsgFiles(f) } }}>
                    {files.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{files.map((a) => <span key={a.url} className="inline-flex max-w-[220px] items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700"><TbPaperclip className="shrink-0 text-gray-400" /><span className="truncate">{a.name}</span><button type="button" aria-label={tr("Remove")} onClick={() => setFiles((x) => x.filter((y) => y.url !== a.url))} className="text-gray-400 hover:text-red-500"><TbX /></button></span>)}</div>}
                    <div className="flex items-end gap-2">
                        <input ref={msgFile} type="file" multiple hidden onChange={(e) => addMsgFiles([...e.target.files])} />
                        <button type="button" disabled={upBusy} title={tr("Attach")} aria-label={tr("Attach")} onClick={() => msgFile.current?.click()} className="grid size-10 shrink-0 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-gray-700"><TbPaperclip /></button>
                        <textarea className={`${field} max-h-40 min-h-[40px] flex-1 resize-none !rounded-2xl`} rows={Math.min(5, Math.max(1, msg.split('\n').length))} placeholder={upBusy ? tr("Uploading…") : tr("Write a message to yourself…")} value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }} />
                        <button type="button" disabled={sending || upBusy || (!msg.trim() && !files.length)} title={tr("Send")} aria-label={tr("Send")} onClick={send} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-xl text-white transition hover:opacity-90 disabled:opacity-40"><TbSend /></button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MySpace

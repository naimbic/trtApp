import { useCallback, useEffect, useRef, useState } from 'react'
import { TbPaperclip, TbScreenshot, TbX, TbDownload } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Tooltip from '@/components/ui/Tooltip'
import FileIcon from '@/components/crm/FileIcon'
import cn from '@/utils/classNames'

export const MAX_FILES = 10
export const formatSize = (n = 0) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`)
const kindOf = (file) => (file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : /zip|rar|7z/.test(file.type) ? 'archive' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : /sheet|excel|csv/.test(file.type) ? 'sheet' : /word|document|text/.test(file.type) ? 'doc' : 'other')
let counter = 0

/**
 * Everything a message box needs for files: pick, paste (screenshots from the clipboard), drag and drop, and capture
 * the screen. `notify(type, text)` shows problems; `t` translates the texts (portal).
 */
export function useTicketFiles({ notify, t = (s) => s } = {}) {
    const [items, setItems] = useState([])
    const [dragging, setDragging] = useState(false)
    const [capturing, setCapturing] = useState(false)
    const itemsRef = useRef(items)
    itemsRef.current = items

    const add = useCallback((list) => {
        const incoming = [...(list || [])].filter((f) => f && f.size > 0)
        if (!incoming.length) return
        setItems((cur) => {
            const room = MAX_FILES - cur.length
            if (incoming.length > room) notify?.('warning', t('Up to {n} files per message', { n: MAX_FILES }))
            const next = incoming.slice(0, Math.max(room, 0)).map((file) => ({ id: ++counter, file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null }))
            return [...cur, ...next]
        })
    }, [notify, t])
    const remove = useCallback((id) => setItems((cur) => { const g = cur.find((x) => x.id === id); if (g?.url) URL.revokeObjectURL(g.url); return cur.filter((x) => x.id !== id) }), [])
    const clear = useCallback(() => setItems((cur) => { cur.forEach((x) => x.url && URL.revokeObjectURL(x.url)); return [] }), [])
    useEffect(() => () => itemsRef.current.forEach((x) => x.url && URL.revokeObjectURL(x.url)), [])

    // paste a screenshot (or any copied file) straight into the message box
    const onPaste = useCallback((e) => {
        const files = [...(e.clipboardData?.files || [])]
        if (!files.length) return
        e.preventDefault()
        add(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `screenshot-${stamp()}${files.length > 1 ? `-${i + 1}` : ''}.png`, { type: f.type || 'image/png' }))))
    }, [add])

    const dropProps = {
        onDragOver: (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); setDragging(true) } },
        onDragLeave: () => setDragging(false),
        onDrop: (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); add(e.dataTransfer.files) } setDragging(false) },
    }

    // capture the screen (browser picks the window or tab), keep one frame as a PNG
    const supportsCapture = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
    const capture = async () => {
        if (!supportsCapture) return notify?.('warning', t('Your browser cannot capture the screen. Paste an image instead (Ctrl+V).'))
        setCapturing(true)
        let stream
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            const video = document.createElement('video')
            video.srcObject = stream
            video.muted = true
            await video.play()
            await new Promise((r) => setTimeout(r, 350)) // let the first real frame arrive (the picker overlay fades out)
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d').drawImage(video, 0, 0)
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
            if (blob) add([new File([blob], `screenshot-${stamp()}.png`, { type: 'image/png' })])
        } catch (e) {
            if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') notify?.('danger', t('Could not capture the screen'))
        } finally {
            stream?.getTracks().forEach((tr) => tr.stop())
            setCapturing(false)
        }
    }
    return { items, files: items.map((x) => x.file), add, remove, clear, onPaste, dropProps, dragging, capture, capturing, supportsCapture }
}

const stamp = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` }

/** The two buttons: attach files, capture the screen. */
export const AttachButtons = ({ tf, disabled, t = (s) => s, size = 'md' }) => {
    const input = useRef(null)
    const cls = 'flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-600'
    const box = size === 'sm' ? 'h-8 w-8 text-lg' : 'h-9 w-9 text-xl'
    return (
        <div className="flex items-center gap-1.5">
            <input ref={input} type="file" multiple className="hidden" onChange={(e) => { tf.add(e.target.files); e.target.value = '' }} />
            <Tooltip title={t('Attach files')}><button type="button" disabled={disabled} className={cn(cls, box)} onClick={() => input.current?.click()}><TbPaperclip /></button></Tooltip>
            {tf.supportsCapture && <Tooltip title={t('Capture the screen')}><button type="button" disabled={disabled || tf.capturing} className={cn(cls, box)} onClick={tf.capture}><TbScreenshot /></button></Tooltip>}
        </div>
    )
}

/** Previews of the files waiting to be sent. */
export const FileTray = ({ tf, t = (s) => s }) => (
    tf.items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
            {tf.items.map((x) => (
                <div key={x.id} className="group relative">
                    {x.url ? (
                        <img src={x.url} alt={x.file.name} className="h-16 w-20 rounded-lg border border-gray-200 object-cover dark:border-gray-600" />
                    ) : (
                        <div className="flex h-16 min-w-[140px] max-w-[200px] items-center gap-2 rounded-lg border border-gray-200 px-3 dark:border-gray-600"><FileIcon kind={kindOf(x.file)} className="text-2xl" /><div className="min-w-0"><div className="truncate text-xs font-semibold">{x.file.name}</div><div className="text-[11px] text-gray-400">{formatSize(x.file.size)}</div></div></div>
                    )}
                    <button type="button" title={t('Remove')} onClick={() => tf.remove(x.id)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs text-white opacity-90 hover:bg-red-500"><TbX /></button>
                </div>
            ))}
        </div>
    ) : null
)

/** The drop hint shown over a message box while files are dragged on it. */
export const DropHint = ({ tf, t = (s) => s }) => (tf.dragging ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 text-sm font-semibold text-primary">{t('Drop the files to attach them')}</div> : null)

/** Attachments of a message: pictures as thumbnails (click to enlarge), other files as download chips. */
export const AttachmentList = ({ items, t = (s) => s }) => {
    const [open, setOpen] = useState(null)
    if (!items?.length) return null
    const pics = items.filter((a) => a.image && a.url && !a.missing)
    const rest = items.filter((a) => !(a.image && a.url && !a.missing))
    return (
        <div className="mt-3 space-y-2">
            {pics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {pics.map((a) => <button key={a.id} type="button" onClick={() => setOpen(a)} title={a.name} className="overflow-hidden rounded-lg border border-gray-200 transition hover:shadow-md dark:border-gray-600"><img src={a.url} alt={a.name} loading="lazy" className="h-24 max-w-[180px] object-cover" /></button>)}
                </div>
            )}
            {rest.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {rest.map((a) => (a.url && !a.missing ? (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" download={a.name} className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs transition hover:border-primary dark:border-gray-600"><FileIcon kind={a.image ? 'image' : a.type === 'application/pdf' ? 'pdf' : 'other'} className="text-lg" /><span className="min-w-0"><span className="block truncate font-semibold">{a.name}</span>{a.size > 0 && <span className="text-gray-400">{formatSize(a.size)}</span>}</span><TbDownload className="shrink-0 text-gray-400" /></a>
                    ) : (
                        <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-2.5 py-1.5 text-xs text-gray-400" title={t('This file is no longer available')}><TbPaperclip />{a.name}</span>
                    )))}
                </div>
            )}
            <Dialog isOpen={!!open} width={960} onClose={() => setOpen(null)} onRequestClose={() => setOpen(null)}>
                {open && (<><div className="mb-3 flex items-center justify-between gap-3 pr-8"><span className="truncate font-semibold">{open.name}</span><a className="shrink-0 text-sm text-primary hover:underline" href={open.url} target="_blank" rel="noreferrer">{t('Open the original')}</a></div><img src={open.url} alt={open.name} className="max-h-[75vh] w-full rounded-lg object-contain" /></>)}
            </Dialog>
        </div>
    )
}

/** FormData for a message: the fields as JSON in `data`, the files in `files`. */
export const messageForm = (body, files) => {
    const fd = new FormData()
    fd.append('data', JSON.stringify(body))
    ;(files || []).forEach((f) => fd.append('files', f))
    return fd
}

import { useRef, useState } from 'react'
import { TbPaperclip, TbLink, TbTrash, TbPlus, TbPhoto, TbFolderSymlink } from 'react-icons/tb'

/* Files, screenshots and links on a message (a request or a report): used by the team and by the client area.
   `t` is the translate function of the side that shows it. */
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : n ? `${n} B` : '')
const isLink = (s) => { try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`); return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') } catch { return false } }
export const EMPTY_EXTRAS = { attachments: [], links: [] }
export const hasExtras = (v) => !!v && (v.attachments?.length > 0 || v.links?.length > 0)

/** What a message carries, shown under its text: pictures as thumbnails, other files and links as chips. */
export const CommentFiles = ({ attachments = [], links = [] }) => {
    if (!attachments.length && !links.length) return null
    const images = attachments.filter((a) => a.kind === 'image')
    const others = attachments.filter((a) => a.kind !== 'image')
    return (
        <div className="mt-2 flex flex-col gap-1.5">
            {images.length > 0 && <div className="flex flex-wrap gap-1.5">{images.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" title={a.name}><img loading="lazy" decoding="async" src={a.url} alt={a.name} className="h-20 max-w-[10rem] rounded-lg border border-gray-200 object-cover dark:border-gray-600" /></a>)}</div>}
            {others.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><TbPaperclip className="shrink-0" /><span className="truncate">{a.name}</span><span className="shrink-0 font-normal text-gray-400">{size(a.size)}</span></a>)}
            {links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><TbLink className="shrink-0" /><span className="truncate">{l.title || l.url}</span></a>)}
        </div>
    )
}

/** The tools to write a message with files: attach (or paste a screenshot, or drop files on the box), add a link, and what is already attached.
 *  value: { attachments, links }; uploadFile(file) -> the stored file; onError(message). */
export const CommentAttach = ({ value, onChange, uploadFile, onError, t, disabled = false, onBrowse = null, children }) => { // onBrowse: opens the file manager to pick files already uploaded
    const fileRef = useRef(null)
    const [busy, setBusy] = useState(false)
    const [adding, setAdding] = useState(false)
    const [link, setLink] = useState({ url: '', title: '' })
    const v = value || EMPTY_EXTRAS
    const set = (p) => onChange({ ...v, ...p })
    const add = async (files) => {
        const list = [...files].filter(Boolean)
        if (!list.length || disabled) return
        setBusy(true)
        try {
            const got = []
            for (const f of list) got.push(await uploadFile(f))
            onChange({ ...v, attachments: [...v.attachments, ...got].slice(0, 10) })
        } catch (e) { onError?.(e.message) } finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
    }
    const addLink = () => {
        const url = link.url.trim()
        if (!isLink(url)) return onError?.(t('Enter a valid web address'))
        set({ links: [...v.links, { url, title: link.title.trim() }].slice(0, 10) }); setLink({ url: '', title: '' }); setAdding(false)
    }
    const onPaste = (e) => { const files = [...(e.clipboardData?.files || [])]; if (files.length) { e.preventDefault(); add(files) } }
    const onDrop = (e) => { const files = [...(e.dataTransfer?.files || [])]; if (files.length) { e.preventDefault(); add(files) } }
    return (
        <div onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() }}>
            {children}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => add(e.target.files)} />
                <button type="button" disabled={disabled || busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"><TbPaperclip className="text-base" />{busy ? t('Uploading…') : t('Attach files')}</button>
                {onBrowse && <button type="button" disabled={disabled} onClick={onBrowse} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"><TbFolderSymlink />{t('From the file manager')}</button>}
                <button type="button" disabled={disabled} onClick={() => setAdding((x) => !x)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"><TbLink className="text-base" />{t('Add a link')}</button>
                <span className="hidden items-center gap-1 text-[11px] text-gray-400 sm:inline-flex"><TbPhoto />{t('You can also paste a screenshot or drop files here')}</span>
            </div>
            {adding && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input className="input h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800" placeholder="https://" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} autoFocus />
                    <input className="input h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800" placeholder={t('Name (optional)')} value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
                    <button type="button" onClick={addLink} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 text-sm font-semibold hover:bg-gray-200 dark:bg-gray-700"><TbPlus />{t('Add')}</button>
                </div>
            )}
            {hasExtras(v) && (
                <div className="mt-2 space-y-1">
                    {v.attachments.map((a) => (
                        <div key={a.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1 text-sm dark:border-gray-700">
                            {a.kind === 'image' ? <img src={a.url} alt="" className="size-9 shrink-0 rounded object-cover" /> : <TbPaperclip className="mx-2 shrink-0 text-gray-400" />}
                            <span className="min-w-0 flex-1 truncate">{a.name}</span><span className="text-xs text-gray-400">{size(a.size)}</span>
                            <button type="button" aria-label={t('Remove')} onClick={() => set({ attachments: v.attachments.filter((x) => x.url !== a.url) })} className="px-1 text-gray-400 hover:text-red-500"><TbTrash /></button>
                        </div>
                    ))}
                    {v.links.map((l) => (
                        <div key={l.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-1 text-sm dark:border-gray-700">
                            <TbLink className="mx-2 shrink-0 text-gray-400" /><span className="min-w-0 flex-1 truncate">{l.title || l.url}</span>
                            <button type="button" aria-label={t('Remove')} onClick={() => set({ links: v.links.filter((x) => x.url !== l.url) })} className="px-1 text-gray-400 hover:text-red-500"><TbTrash /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

import { useRef, useState } from 'react'
import { TbCamera, TbPhotoSearch, TbTrash, TbUpload } from 'react-icons/tb'
import MediaPicker from './MediaPicker'
import Spinner from '@/components/ui/Spinner'
import { notify, upload, api, formatBytes } from '@/views/crm/kit/api'
import classNames from '@/utils/classNames'

const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?'
const GRADIENTS = ['from-emerald-400 to-teal-500', 'from-sky-400 to-indigo-500', 'from-amber-400 to-orange-500', 'from-fuchsia-400 to-purple-500', 'from-rose-400 to-red-500']
const gradient = (name = '') => GRADIENTS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENTS.length]

/**
 * Picture picker for avatars and logos. Click or drop an image: the server crops/resizes it, converts it to WebP and stores it
 * in the Space, then onChange(url) gives the new address. `url` empty shows the initials of `name`.
 */
const ImageUpload = ({ url, name, shape = 'circle', size = 112, uploadUrl, canEdit = true, onChange, hint }) => {
    const input = useRef(null)
    const [busy, setBusy] = useState(false)
    const [drag, setDrag] = useState(false)
    const [broken, setBroken] = useState(false)
    const [menu, setMenu] = useState(false)
    const [picker, setPicker] = useState(false)
    const round = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'

    const send = async (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) return notify('danger', 'Please choose an image file')
        if (file.size > 20 * 1024 * 1024) return notify('danger', 'This image is too large (max 20 MB)')
        const fd = new FormData()
        fd.append('file', file)
        setBusy(true)
        try {
            const r = await upload(uploadUrl, fd)
            setBroken(false)
            onChange?.(r.url)
            notify('success', `Saved · ${formatBytes(r.originalSize)} → ${formatBytes(r.size)} (WebP)`)
        } catch (e) { notify('danger', e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
    }
    const pick = async (m) => {
        setPicker(false); setBusy(true)
        try {
            const r = await api(uploadUrl, { method: 'POST', body: { mediaId: m.id } })
            setBroken(false); onChange?.(r.url); notify('success', 'Picture set')
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const remove = async () => {
        setBusy(true)
        try { await api(uploadUrl, { method: 'DELETE' }); onChange?.(null); notify('success', 'Picture removed') } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }

    return (
        <div className="inline-flex flex-col items-center gap-2">
            <div
                style={{ width: size, height: size }}
                className={classNames('group relative shrink-0 overflow-hidden ring-4 ring-white dark:ring-gray-800', round, drag && 'outline outline-2 outline-primary')}
                onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDrag(true) } }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); if (canEdit) send(e.dataTransfer.files?.[0]) }}
            >
                {url && !broken ? <img src={url} alt={name || ''} onError={() => setBroken(true)} className="h-full w-full object-cover" /> : (
                    <div className={classNames('flex h-full w-full items-center justify-center bg-gradient-to-br font-bold text-white', gradient(name))} style={{ fontSize: size / 3 }}>{initials(name)}</div>
                )}
                {canEdit && (
                    <button type="button" onClick={() => setMenu((m) => !m)} className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/45 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100" aria-label="Change picture">
                        <TbCamera className="text-2xl" /><span className="text-[11px] font-semibold">Change</span>
                    </button>
                )}
                {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70"><Spinner size={28} /></div>}
            </div>
            {canEdit && menu && !busy && (
                <div className="flex gap-1">
                    <button type="button" onClick={() => { setMenu(false); input.current?.click() }} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold hover:bg-primary/10 hover:text-primary dark:bg-gray-700"><TbUpload />Upload</button>
                    <button type="button" onClick={() => { setMenu(false); setPicker(true) }} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold hover:bg-primary/10 hover:text-primary dark:bg-gray-700"><TbPhotoSearch />From files</button>
                </div>
            )}
            {canEdit && url && !busy && <button type="button" onClick={remove} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"><TbTrash />Remove</button>}
            {hint && <span className="max-w-[180px] text-center text-[11px] text-gray-400">{hint}</span>}
            <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={pick} />
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => send(e.target.files?.[0])} />
        </div>
    )
}

export { initials }
export default ImageUpload

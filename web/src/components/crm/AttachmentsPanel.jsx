import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbTrash, TbUpload, TbExternalLink, TbPhotoSearch } from 'react-icons/tb'
import MediaPicker from '@/components/crm/MediaPicker'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import FileIcon from '@/components/crm/FileIcon'
import { api, notify, upload, formatBytes, qs } from '@/views/crm/kit/api'

/** Files attached to one record (client, invoice, contract…), stored in the Space. */
const AttachmentsPanel = ({ relType, relId, canEdit = true, showClientToggle = false }) => {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [drag, setDrag] = useState(false)
    const [del, setDel] = useState(null)
    const [picker, setPicker] = useState(false)
    const input = useRef(null)

    const load = useCallback(async () => {
        try { setList((await api(`/api/crm/media?${qs({ relType, relId, pageSize: 200 })}`)).list) } catch (e) { notify('danger', e.message) } finally { setLoading(false) }
    }, [relType, relId])
    useEffect(() => { load() }, [load])

    const send = async (files) => {
        if (!files?.length) return
        const fd = new FormData()
        ;[...files].forEach((f) => fd.append('files', f))
        fd.append('relType', relType); fd.append('relId', relId)
        setBusy(true)
        try {
            const r = await upload('/api/crm/media/upload', fd)
            if (r.saved.length) notify('success', `${r.saved.length} file${r.saved.length > 1 ? 's' : ''} uploaded`)
            r.errors.forEach((e) => notify('danger', `${e.name}: ${e.error}`))
            load()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
    }
    const attach = async (m) => {
        setPicker(false); setBusy(true)
        try { await api('/api/crm/media', { method: 'POST', body: { action: 'attach', mediaId: m.id, relType, relId } }); notify('success', 'File attached'); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const toggle = async (f, v) => {
        setList((l) => l.map((x) => (x.id === f.id ? { ...x, visibleToClient: v } : x)))
        try { await api('/api/crm/media', { method: 'POST', body: { action: 'setVisibility', id: f.id, visibleToClient: v } }) } catch (e) { notify('danger', e.message); load() }
    }
    const remove = async () => {
        try { await api('/api/crm/media', { method: 'POST', body: { action: 'delete', id: del.id } }); notify('success', 'File deleted'); setDel(null); load() } catch (e) { notify('danger', e.message); setDel(null) }
    }

    return (
        <div>
            {canEdit && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files) }}
                    className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition ${drag ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-600'}`}
                >
                    <div className="text-sm text-gray-500">Drop files here or choose them. Images are optimised to WebP automatically. PDF, Office, CSV, ZIP… up to 50 MB.</div>
                    <Button size="sm" icon={busy ? <Spinner size={16} /> : <TbUpload />} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : 'Upload files'}</Button>
                    <Button size="sm" icon={<TbPhotoSearch />} disabled={busy} onClick={() => setPicker(true)}>From files</Button>
                    <input ref={input} type="file" multiple className="hidden" onChange={(e) => send(e.target.files)} />
                    <MediaPicker open={picker} kind="" onClose={() => setPicker(false)} onPick={attach} />
                </div>
            )}
            {loading ? <div className="py-8 text-center text-gray-400">Loading…</div> : !list.length ? <p className="py-6 text-center text-gray-400">No files attached yet.</p> : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                    {list.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 py-2.5">
                            {f.kind === 'image' ? <img src={f.url} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700"><FileIcon kind={f.kind} className="text-2xl" /></span>}
                            <div className="min-w-0 flex-1">
                                <a href={f.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:underline">{f.name}</a>
                                <div className="text-xs text-gray-400">{formatBytes(f.size)} · {f.uploaderName || '—'} · {dayjs(f.createdAt).format('DD MMM YYYY')}</div>
                            </div>
                            {showClientToggle && canEdit && <label className="hidden items-center gap-1.5 text-xs text-gray-500 sm:flex"><Switcher checked={f.visibleToClient} onChange={(v) => toggle(f, v)} />Client can see</label>}
                            <a href={f.url} target="_blank" rel="noreferrer" className="text-lg text-gray-400 hover:text-primary" title="Open"><TbExternalLink /></a>
                            {canEdit && <button type="button" onClick={() => setDel(f)} className="text-lg text-gray-400 hover:text-red-500" title="Delete"><TbTrash /></button>}
                        </div>
                    ))}
                </div>
            )}
            <ConfirmDialog isOpen={!!del} type="danger" title="Delete this file?" confirmText="Delete" onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del?.name} will be removed for good.</p>
            </ConfirmDialog>
        </div>
    )
}

export default AttachmentsPanel

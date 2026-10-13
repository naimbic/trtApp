import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbRefresh, TbCopy, TbDotsVertical, TbFolderPlus, TbGridDots, TbList, TbPencil, TbSearch, TbTrash, TbUpload, TbExternalLink, TbFolderSymlink, TbChevronRight } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Dropdown from '@/components/ui/Dropdown'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import FileIcon from '@/components/crm/FileIcon'
import { api, notify, upload, formatBytes, qs } from '../kit/api'

const KINDS = [['', 'All'], ['image', 'Images'], ['pdf', 'PDF'], ['doc', 'Documents'], ['sheet', 'Sheets'], ['archive', 'Archives'], ['video', 'Video']]

/** Image thumbnail that falls back to the type icon when the file cannot be shown (e.g. a private object). */
const Thumb = ({ f, className, iconClass }) => {
    const [bad, setBad] = useState(false)
    return f.kind === 'image' && !bad ? <img src={f.url} alt="" onError={() => setBad(true)} className={className} loading="lazy" /> : <FileIcon kind={f.kind} className={iconClass} />
}

const FileManager = () => {
    const [parentId, setParentId] = useState(null)
    const [data, setData] = useState({ list: [], total: 0, path: [] })
    const [stats, setStats] = useState(null)
    const [view, setView] = useState('grid')
    const [kind, setKind] = useState('')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [drag, setDrag] = useState(false)
    const [folderDialog, setFolderDialog] = useState(false)
    const [folderName, setFolderName] = useState('')
    const [rename, setRename] = useState(null)
    const [del, setDel] = useState(null)
    const [move, setMove] = useState(null)
    const [folders, setFolders] = useState([])
    const [moveTo, setMoveTo] = useState(null)
    const [preview, setPreview] = useState(null)
    const input = useRef(null)
    const [syncing, setSyncing] = useState(false)

    useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t) }, [search])
    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await api(`/api/crm/media?${qs({ parentId, query, kind, pageSize: 200 })}`))
            setStats(await api('/api/crm/media/stats'))
        } catch (e) { notify('danger', e.message) } finally { setLoading(false) }
    }, [parentId, query, kind])
    useEffect(() => { load() }, [load])

    // Bring in what is already in the Space (files uploaded before the CRM, by other tools, or removed outside it).
    const sync = useCallback(async (force) => {
        setSyncing(true)
        try {
            const r = await api('/api/crm/media/sync', { method: 'POST', body: { force } })
            if (r.added || r.removed) { notify('success', `${r.added ? `${r.added} file${r.added > 1 ? 's' : ''} found in the Space` : ''}${r.added && r.removed ? ' · ' : ''}${r.removed ? `${r.removed} removed` : ''}`); load() }
            else if (force) notify('success', 'Already up to date')
        } catch (e) { notify('danger', e.message) } finally { setSyncing(false) }
    }, [load])
    useEffect(() => { sync(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const send = async (files) => {
        if (!files?.length) return
        const fd = new FormData()
        ;[...files].forEach((f) => fd.append('files', f))
        if (parentId) fd.append('parentId', parentId)
        setBusy(true)
        try {
            const r = await upload('/api/crm/media/upload', fd)
            if (r.saved.length) {
                const before = r.saved.reduce((s, f) => s + (f.originalSize || f.size), 0), after = r.saved.reduce((s, f) => s + f.size, 0)
                notify('success', `${r.saved.length} uploaded${before > after ? ` · saved ${formatBytes(before - after)}` : ''}`)
            }
            r.errors.forEach((e) => notify('danger', `${e.name}: ${e.error}`))
            load()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
    }
    const act = async (body, ok) => { try { await api('/api/crm/media', { method: 'POST', body }); if (ok) notify('success', ok); load(); return true } catch (e) { notify('danger', e.message); return false } }
    const createFolder = async () => { if (await act({ action: 'createFolder', name: folderName, parentId }, 'Folder created')) { setFolderDialog(false); setFolderName('') } }
    const doRename = async () => { if (await act({ action: 'rename', id: rename.id, name: rename.name }, 'Renamed')) setRename(null) }
    const doDelete = async () => { await act({ action: 'delete', id: del.id }, del.isFolder ? 'Folder deleted' : 'File deleted'); setDel(null) }
    const openMove = async (item) => { setMove(item); setMoveTo(null); try { setFolders((await api('/api/crm/media?foldersOnly=1')).list.filter((f) => f.id !== item.id)) } catch { setFolders([]) } }
    const doMove = async () => { if (await act({ action: 'move', id: move.id, parentId: moveTo }, 'Moved')) setMove(null) }
    const copyLink = async (f) => { try { await navigator.clipboard.writeText(f.url); notify('success', 'Link copied') } catch { notify('danger', 'Could not copy') } }
    const open = (f) => { if (f.isFolder) { setParentId(f.id); setSearch('') } else if (f.kind === 'image') setPreview(f); else window.open(f.url, '_blank', 'noopener') }

    const Menu = ({ f }) => (
        <Dropdown renderTitle={<button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbDotsVertical /></button>} placement="bottom-end">
            {!f.isFolder && <Dropdown.Item eventKey="open" onClick={() => window.open(f.url, '_blank', 'noopener')}><TbExternalLink className="mr-2 text-lg" />Open</Dropdown.Item>}
            {!f.isFolder && <Dropdown.Item eventKey="copy" onClick={() => copyLink(f)}><TbCopy className="mr-2 text-lg" />Copy link</Dropdown.Item>}
            <Dropdown.Item eventKey="rename" onClick={() => setRename({ id: f.id, name: f.name })}><TbPencil className="mr-2 text-lg" />Rename</Dropdown.Item>
            <Dropdown.Item eventKey="move" onClick={() => openMove(f)}><TbFolderSymlink className="mr-2 text-lg" />Move to…</Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" className="text-red-500" onClick={() => setDel(f)}><TbTrash className="mr-2 text-lg" />Delete</Dropdown.Item>
        </Dropdown>
    )

    const folderOptions = [{ value: null, label: 'Main folder' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>File manager</h3><p className="text-sm text-gray-500">Everything in your DigitalOcean Space, plus new uploads. Images are converted to WebP.</p></div>
                <div className="flex gap-2">
                    <Button icon={syncing ? <Spinner size={16} /> : <TbRefresh />} disabled={syncing} onClick={() => sync(true)}>Refresh from Space</Button>
                    <Button icon={<TbFolderPlus />} onClick={() => setFolderDialog(true)}>New folder</Button>
                    <Button variant="solid" icon={busy ? <Spinner size={16} /> : <TbUpload />} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : 'Upload'}</Button>
                    <input ref={input} type="file" multiple className="hidden" onChange={(e) => send(e.target.files)} />
                </div>
            </div>
            {stats && (
                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[['Files', stats.files], ['Storage used', formatBytes(stats.size)], ['Saved by optimising', formatBytes(stats.saved)], ['Images', stats.byKind.image || 0]].map(([l, v]) => (
                        <div key={l} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><div className="text-sm text-gray-500">{l}</div><h4 className="mt-1">{v}</h4></div>
                    ))}
                </div>
            )}
            <AdaptiveCard>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
                        <button type="button" className={`font-semibold ${parentId ? 'text-primary hover:underline' : ''}`} onClick={() => setParentId(null)}>Files</button>
                        {data.path.map((p, i) => (<span key={p.id} className="flex items-center gap-1"><TbChevronRight className="text-gray-400" /><button type="button" className={`font-semibold ${i < data.path.length - 1 ? 'text-primary hover:underline' : ''}`} onClick={() => setParentId(p.id)}>{p.name}</button></span>))}
                    </nav>
                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <Segment size="sm" value={kind} onChange={(v) => setKind(v ?? '')}>{KINDS.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
                        <div className="w-52"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search files" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                        <Segment size="sm" value={view} onChange={(v) => v && setView(v)}><Segment.Item value="grid"><TbGridDots /></Segment.Item><Segment.Item value="list"><TbList /></Segment.Item></Segment>
                    </div>
                </div>
                <div
                    className={`relative min-h-[260px] rounded-xl transition ${drag ? 'bg-primary/5 outline-dashed outline-2 outline-primary' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files) }}
                >
                    {loading && !data.list.length ? <div className="flex h-60 items-center justify-center"><Spinner size={32} /></div> : !data.list.length ? (
                        <div className="flex h-60 flex-col items-center justify-center gap-2 text-gray-400"><TbUpload className="text-4xl" /><div>{query || kind ? 'Nothing matches' : 'Drop files here or press Upload'}</div></div>
                    ) : view === 'grid' ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                            {data.list.map((f) => (
                                <div key={f.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                                    <button type="button" onClick={() => open(f)} className="flex h-32 w-full items-center justify-center bg-gray-50 dark:bg-gray-700/40">
                                        <Thumb f={f} className="h-full w-full object-cover" iconClass="text-5xl" />
                                    </button>
                                    <div className="flex items-center gap-1 px-3 py-2">
                                        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold" title={f.name}>{f.name}</div><div className="text-xs text-gray-400">{f.isFolder ? 'Folder' : formatBytes(f.size)}</div></div>
                                        <Menu f={f} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {data.list.map((f) => (
                                <div key={f.id} className="flex items-center gap-3 py-2">
                                    <button type="button" onClick={() => open(f)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md"><Thumb f={f} className="h-9 w-9 object-cover" iconClass="text-2xl" /></span>
                                        <span className="truncate text-sm font-semibold">{f.name}</span>
                                    </button>
                                    <span className="hidden w-24 text-right text-sm text-gray-500 sm:block">{f.isFolder ? '—' : formatBytes(f.size)}</span>
                                    <span className="hidden w-32 text-sm text-gray-500 md:block">{f.uploaderName || '—'}</span>
                                    <span className="hidden w-28 text-sm text-gray-500 md:block">{dayjs(f.createdAt).format('DD MMM YYYY')}</span>
                                    <Menu f={f} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </AdaptiveCard>

            <Dialog isOpen={folderDialog} width={420} onClose={() => setFolderDialog(false)} onRequestClose={() => setFolderDialog(false)}>
                <h5 className="mb-4">New folder</h5>
                <Input autoFocus placeholder="Folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} />
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setFolderDialog(false)}>Cancel</Button><Button variant="solid" disabled={!folderName.trim()} onClick={createFolder}>Create</Button></div>
            </Dialog>
            <Dialog isOpen={!!rename} width={420} onClose={() => setRename(null)} onRequestClose={() => setRename(null)}>
                <h5 className="mb-4">Rename</h5>
                <Input autoFocus value={rename?.name || ''} onChange={(e) => setRename({ ...rename, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setRename(null)}>Cancel</Button><Button variant="solid" disabled={!rename?.name?.trim()} onClick={doRename}>Save</Button></div>
            </Dialog>
            <Dialog isOpen={!!move} width={420} onClose={() => setMove(null)} onRequestClose={() => setMove(null)}>
                <h5 className="mb-4">Move “{move?.name}”</h5>
                <Select options={folderOptions} value={folderOptions.find((o) => o.value === moveTo) || folderOptions[0]} onChange={(o) => setMoveTo(o?.value ?? null)} />
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setMove(null)}>Cancel</Button><Button variant="solid" onClick={doMove}>Move here</Button></div>
            </Dialog>
            <Dialog isOpen={!!preview} width={900} onClose={() => setPreview(null)} onRequestClose={() => setPreview(null)}>
                {preview && (<><img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full rounded-lg object-contain" /><div className="mt-3 flex items-center justify-between text-sm"><span className="font-semibold">{preview.name} <span className="font-normal text-gray-400">· {preview.width}×{preview.height} · {formatBytes(preview.size)}</span></span><Button size="sm" icon={<TbCopy />} onClick={() => copyLink(preview)}>Copy link</Button></div></>)}
            </Dialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={del?.isFolder ? 'Delete this folder?' : 'Delete this file?'} confirmText="Delete" onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={doDelete}>
                <p>{del?.isFolder ? `“${del?.name}” and everything inside it will be removed for good.` : `“${del?.name}” will be removed for good.`}</p>
                {(del?.purpose === 'imported' || del?.purpose === 'space' || del?.isFolder) && <p className="mt-2 text-amber-600">Some of these files were already in your Space before the CRM, so other tools or pages may still use them.</p>}
            </ConfirmDialog>
        </Container>
    )
}

export default FileManager

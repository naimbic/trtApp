import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbRefresh, TbCopy, TbDotsVertical, TbFolderPlus, TbLayoutGrid, TbList, TbPencil, TbSearch, TbTrash, TbUpload, TbExternalLink, TbFolderSymlink, TbChevronRight } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Upload from '@/components/ui/Upload'
import Drawer from '@/components/ui/Drawer'
import CloseButton from '@/components/ui/CloseButton'
import Table from '@/components/ui/Table'
import UploadMedia from '@/assets/svg/UploadMedia'
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

const { Tr, Th, Td, THead, TBody } = Table
const KIND_LABEL = { folder: 'Folder', image: 'Image', pdf: 'PDF', doc: 'Document', text: 'Text', sheet: 'Spreadsheet', slides: 'Presentation', archive: 'Archive', video: 'Video', audio: 'Audio' }
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
    const [selected, setSelected] = useState(null)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [pending, setPending] = useState([])
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
    const open = (f) => { if (f.isFolder) { setParentId(f.id); setSearch(''); setSelected(null) } else window.open(f.url, '_blank', 'noopener') }
    const current = data.list.find((f) => f.id === selected) || null
    const doUpload = async () => { const files = pending.map((p) => p); setUploadOpen(false); setPending([]); await send(files) }

    const Menu = ({ f }) => (
        <Dropdown renderTitle={<button type="button" onClick={(e) => e.stopPropagation()} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbDotsVertical /></button>} placement="bottom-end">
            <Dropdown.Item eventKey="open" onClick={() => open(f)}><TbExternalLink className="mr-2 text-lg" />{f.isFolder ? 'Open' : 'Open in a new tab'}</Dropdown.Item>
            {!f.isFolder && <Dropdown.Item eventKey="copy" onClick={() => copyLink(f)}><TbCopy className="mr-2 text-lg" />Copy link</Dropdown.Item>}
            <Dropdown.Item eventKey="rename" onClick={() => setRename({ id: f.id, name: f.name })}><TbPencil className="mr-2 text-lg" />Rename</Dropdown.Item>
            <Dropdown.Item eventKey="move" onClick={() => openMove(f)}><TbFolderSymlink className="mr-2 text-lg" />Move to…</Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" className="text-red-500" onClick={() => setDel(f)}><TbTrash className="mr-2 text-lg" />Delete</Dropdown.Item>
        </Dropdown>
    )

    const folderOptions = [{ value: null, label: 'Main folder' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]
    const folderList = data.list.filter((f) => f.isFolder)
    const fileList = data.list.filter((f) => !f.isFolder)
    const click = (f) => (f.isFolder ? open(f) : setSelected(f.id))

    const Segmentcard = ({ f }) => (
        <div role="button" onClick={() => click(f)} className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border bg-white px-3.5 py-4 transition-all hover:shadow-[0_0_1rem_0.25rem_rgba(0,0,0,0.04),0px_2rem_1.5rem_-1rem_rgba(0,0,0,0.12)] dark:bg-gray-800 ${selected === f.id ? 'border-primary' : 'border-gray-200 dark:border-transparent'}`}>
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg"><Thumb f={f} className="h-10 w-10 object-cover" iconClass="text-3xl" /></span>
                <div className="min-w-0"><div className="heading-text truncate font-bold" title={f.name}>{f.name}</div><span className="text-xs">{f.isFolder ? `${f.itemCount ?? ''}${f.itemCount !== undefined ? ' items' : 'Folder'}` : formatBytes(f.size)}</span></div>
            </div>
            <Menu f={f} />
        </div>
    )
    const Grid = ({ list }) => <div className="mt-4 grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">{list.map((f) => <Segmentcard key={f.id} f={f} />)}</div>
    const Rows = ({ list }) => (
        <Table className="mt-4">
            <THead><Tr><Th>File</Th><Th>Size</Th><Th>Type</Th><Th>Uploaded by</Th><Th>Date</Th><Th /></Tr></THead>
            <TBody>
                {list.map((f) => (
                    <Tr key={f.id}>
                        <Td width="42%"><div role="button" className="group inline-flex cursor-pointer items-center gap-3" onClick={() => click(f)}><span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md"><Thumb f={f} className="h-9 w-9 object-cover" iconClass="text-3xl" /></span><span className="heading-text font-semibold group-hover:text-primary">{f.name}</span></div></Td>
                        <Td>{f.isFolder ? '—' : formatBytes(f.size)}</Td>
                        <Td>{KIND_LABEL[f.kind] || 'File'}</Td>
                        <Td>{f.uploaderName || '—'}</Td>
                        <Td>{dayjs(f.createdAt).format('MMM DD, YYYY')}</Td>
                        <Td><div className="flex justify-end text-lg"><Menu f={f} /></div></Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    )
    const Section = ({ title, list }) => list.length > 0 && <div className="mt-8 first:mt-0"><h4>{title}</h4>{view === 'grid' ? <Grid list={list} /> : <Rows list={list} />}</div>
    const Info = ({ label, value }) => <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="heading-text text-right font-bold">{value}</span></div>

    return (
        <Container>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h3 className="flex flex-wrap items-center gap-2 text-base sm:text-2xl">
                    <span className={parentId ? 'cursor-pointer hover:text-primary' : ''} role="button" onClick={() => { setParentId(null); setSelected(null) }}>File Manager</span>
                    {data.path.map((p, i) => (<span key={p.id} className="flex items-center gap-2"><TbChevronRight className="text-lg" />{i < data.path.length - 1 ? <span className="cursor-pointer hover:text-primary" role="button" onClick={() => { setParentId(p.id); setSelected(null) }}>{p.name}</span> : <span>{p.name}</span>}</span>))}
                </h3>
                <div className="flex items-center gap-2">
                    <Button icon={syncing ? <Spinner size={16} /> : <TbRefresh />} disabled={syncing} onClick={() => sync(true)}><span className="hidden sm:inline">Refresh from Space</span></Button>
                    <Button icon={<TbFolderPlus />} onClick={() => setFolderDialog(true)}><span className="hidden sm:inline">New folder</span></Button>
                    <Segment value={view} onChange={(v) => v && setView(v)}><Segment.Item value="grid" className="px-3 text-xl"><TbLayoutGrid /></Segment.Item><Segment.Item value="list" className="px-3 text-xl"><TbList /></Segment.Item></Segment>
                    <Button variant="solid" icon={busy ? <Spinner size={16} /> : <TbUpload />} disabled={busy} onClick={() => setUploadOpen(true)}>{busy ? 'Uploading…' : 'Upload'}</Button>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <Segment size="sm" value={kind} onChange={(v) => setKind(v ?? '')}>{KINDS.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
                <div className="w-56"><Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search files" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                {stats && <div className="ml-auto text-sm text-gray-500">{stats.files} files · {formatBytes(stats.size)} used{stats.saved > 0 ? ` · ${formatBytes(stats.saved)} saved by optimising` : ''}</div>}
            </div>

            <div className={`relative mt-6 min-h-[260px] rounded-xl transition ${drag ? 'bg-primary/5 outline-dashed outline-2 outline-primary' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files) }}>
                {loading && !data.list.length ? <div className="flex h-60 items-center justify-center"><Spinner size={32} /></div> : !data.list.length ? (
                    <div className="flex h-60 flex-col items-center justify-center gap-2 text-gray-400"><TbUpload className="text-4xl" /><div>{query || kind ? 'Nothing matches' : 'Drop files here or press Upload'}</div></div>
                ) : (<><Section title="Folders" list={folderList} /><Section title="Files" list={fileList} /></>)}
            </div>

            <Drawer title={null} closable={false} isOpen={!!current} showBackdrop={false} width={350} onClose={() => setSelected(null)} onRequestClose={() => setSelected(null)}>
                {current && (
                    <div>
                        <div className="flex justify-end"><CloseButton onClick={() => setSelected(null)} /></div>
                        <div className="mt-6 flex justify-center">{current.kind === 'image' ? <button type="button" onClick={() => setPreview(current)}><Thumb f={current} className="max-h-[170px] rounded-xl" iconClass="text-[110px]" /></button> : <FileIcon kind={current.kind} className="text-[110px]" />}</div>
                        <div className="mt-8 text-center"><h4 className="break-words">{current.name}</h4></div>
                        <div className="mt-8"><h6>Info</h6>
                            <div className="mt-4 flex flex-col gap-4">
                                <Info label="Size" value={formatBytes(current.size)} />
                                <Info label="Type" value={KIND_LABEL[current.kind] || 'File'} />
                                {current.width ? <Info label="Dimensions" value={`${current.width} × ${current.height}`} /> : null}
                                <Info label="Uploaded by" value={current.uploaderName || '—'} />
                                <Info label="Created" value={dayjs(current.createdAt).format('MMM DD, YYYY')} />
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col gap-2">
                            <Button block variant="solid" icon={<TbExternalLink />} onClick={() => window.open(current.url, '_blank', 'noopener')}>Open</Button>
                            <Button block icon={<TbCopy />} onClick={() => copyLink(current)}>Copy link</Button>
                            <div className="grid grid-cols-3 gap-2">
                                <Button icon={<TbPencil />} onClick={() => setRename({ id: current.id, name: current.name })}>Rename</Button>
                                <Button icon={<TbFolderSymlink />} onClick={() => openMove(current)}>Move</Button>
                                <Button className="text-red-500" icon={<TbTrash />} onClick={() => setDel(current)}>Delete</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            <Dialog isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onRequestClose={() => setUploadOpen(false)}>
                <h4>Upload files</h4>
                <Upload draggable className="mt-6 bg-gray-100 dark:bg-transparent" onChange={setPending} onFileRemove={setPending}>
                    <div className="my-4 text-center">
                        <div className="mb-4 flex justify-center text-6xl"><UploadMedia height={150} width={200} /></div>
                        <p className="font-semibold"><span className="text-gray-800 dark:text-white">Drop your files here, or </span><span className="text-blue-500">browse</span></p>
                        <p className="mt-1 font-semibold opacity-60 dark:text-white">images are converted to WebP automatically</p>
                    </div>
                </Upload>
                <div className="mt-4"><Button block variant="solid" disabled={!pending.length} onClick={doUpload}>Upload{pending.length ? ` ${pending.length} file${pending.length > 1 ? 's' : ''}` : ''}</Button></div>
            </Dialog>

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

/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import { TbPlus } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import NoteCard from '../notes/NoteCard'
import NoteEditor from '../notes/NoteEditor'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

/** The Notes tab of a client: the same note cards as the Notes and Tasks pages, for the notes tagged with this client. A note written here is tagged with it. */
const ClientNotes = ({ clientId, onChanged }) => {
    const [data, setData] = useState(null)
    const [dlg, setDlg] = useState({ open: false, note: null })
    const [del, setDel] = useState(null)
    const load = useCallback(() => api(`/api/crm/notes?clientId=${clientId}&limit=200`).then(setData).catch(() => setData({ list: [], can: {} })), [clientId])
    useEffect(() => { load() }, [load])
    const changed = () => { load(); onChanged?.() }
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); changed() } catch (e) { notify('danger', e.message) } }
    const patch = (n, p) => { setData((d) => ({ ...d, list: d.list.map((x) => (x.id === n.id ? { ...x, ...p } : x)) })); return run(() => api(`/api/crm/notes/${n.id}`, { method: 'PATCH', body: p }), p.archived === true ? tr('Note archived') : '') }
    const toTask = (n) => run(async () => {
        await api('/api/crm/work/tasks', { method: 'POST', body: { name: n.title || String(n.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 80) || tr('Note'), description: n.kind === 'list' ? `<ul>${n.checklist.map((c) => `<li>${c.text}</li>`).join('')}</ul>` : n.description, status: 1, relType: 'customer', relId: clientId } })
        await api(`/api/crm/notes/${n.id}`, { method: 'DELETE' })
    }, tr('The note is now a task'))
    const list = data?.list || []
    return (
        <div>
            <div role="button" tabIndex={0} onClick={() => setDlg({ open: true, note: null })} onKeyDown={(e) => { if (e.key === 'Enter') setDlg({ open: true, note: null }) }} className="mx-auto mb-5 flex max-w-xl cursor-text items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow dark:border-gray-600 dark:bg-gray-800">
                <span className="flex-1 text-gray-400">{tr('Take a note…')}</span>
                <span className="grid size-8 place-items-center rounded-full bg-primary text-lg text-white"><TbPlus /></span>
            </div>
            {list.length > 0 && <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{list.map((n) => <NoteCard key={n.id} note={n} onOpen={(x) => setDlg({ open: true, note: x })} onPatch={patch} onDelete={setDel} onToTask={toTask} />)}</div>}
            {data && !list.length && <div className="py-8 text-center text-gray-400">{tr('No notes yet. Use “Take a note…” to add one.')}</div>}
            {!data && <div className="py-8 text-center text-gray-400">{tr('Loading…')}</div>}
            <NoteEditor open={dlg.open} note={dlg.note} preset={{ clientIds: [clientId] }} canShare={data?.can?.share !== false} onClose={() => setDlg((d) => ({ ...d, open: false }))} onSaved={changed} />
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this note?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const n = del; setDel(null); run(() => api(`/api/crm/notes/${n.id}`, { method: 'DELETE' }), tr('Note deleted')) }}>
                <p>{del?.title}</p>
            </ConfirmDialog>
        </div>
    )
}

export default ClientNotes

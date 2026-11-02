/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbArchive, TbChecklist, TbMicrophone, TbNotes, TbPhoto, TbSearch, TbShare3, TbStar } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import { NOTES_EVENT, notesChanged } from './noteKit'
import { tr } from '@/utils/t'
import { onCreate } from '@/utils/createIntent'

const TABS = [
    { id: 'all', label: 'Notes', icon: <TbNotes /> },
    { id: 'important', label: 'Important', icon: <TbStar /> },
    { id: 'shared', label: 'Shared', icon: <TbShare3 /> },
    { id: 'archive', label: 'Archive', icon: <TbArchive /> },
]

/** Notes like Google Keep: coloured cards in columns, pinned first, checklists, pictures, voice notes, links, reminders, sharing and comments. */
const NotesPage = () => {
    const [params, setParams] = useSearchParams()
    const [data, setData] = useState(null)
    const [tab, setTab] = useState('all')
    const [query, setQuery] = useState('')
    const [label, setLabel] = useState('')
    const [dlg, setDlg] = useState({ open: false, note: null, preset: null })
    const [del, setDel] = useState(null)

    const load = useCallback(() => {
        api(`/api/crm/notes?archived=${tab === 'archive' ? 1 : 0}`).then(setData).catch(() => setData({ list: [], labels: [], can: {} }))
    }, [tab])
    useEffect(() => { load() }, [load])
    useEffect(() => { window.addEventListener(NOTES_EVENT, load); return () => window.removeEventListener(NOTES_EVENT, load) }, [load])
    useEffect(() => onCreate('note', () => setDlg({ open: true, note: null, preset: null })), [])
    // a link from a notification (…/crm/notes?note=ID) opens that note
    const wanted = params.get('note')
    useEffect(() => {
        if (!wanted) return
        api(`/api/crm/notes/${wanted}`).then((d) => setDlg({ open: true, note: d.note, preset: null })).catch(() => notify('warning', tr('Note not found'))).finally(() => { params.delete('note'); setParams(params, { replace: true }) })
    }, [wanted]) // eslint-disable-line react-hooks/exhaustive-deps

    const all = data?.list || []
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        return all.filter((n) => (tab === 'important' ? n.important : tab === 'shared' ? (!n.mine || n.sharedWith.length > 0) : true) && (!label || n.labels.includes(label)) && (!q || `${n.title} ${n.description.replace(/<[^>]+>/g, ' ')} ${n.labels.join(' ')} ${n.checklist.map((c) => c.text).join(' ')}`.toLowerCase().includes(q)))
    }, [all, tab, query, label])
    const pinned = shown.filter((n) => n.pinned)
    const others = shown.filter((n) => !n.pinned)

    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); load(); notesChanged() } catch (e) { notify('danger', e.message) } }
    const patch = (n, p) => {
        setData((d) => ({ ...d, list: d.list.map((x) => (x.id === n.id ? { ...x, ...p } : x)) })) // shown at once
        return run(() => api(`/api/crm/notes/${n.id}`, { method: 'PATCH', body: p }), p.archived === true ? tr('Note archived') : p.archived === false ? tr('Note restored') : '')
    }
    const toTask = (n) => run(async () => { await api('/api/crm/work/tasks', { method: 'POST', body: { name: n.title || n.description.replace(/<[^>]+>/g, ' ').trim().slice(0, 80) || tr('Note'), description: n.kind === 'list' ? `<ul>${n.checklist.map((c) => `<li>${c.text}</li>`).join('')}</ul>` : n.description, status: 1 } }); await api(`/api/crm/notes/${n.id}`, { method: 'DELETE' }) }, tr('The note is now a task'))
    const remove = () => { const n = del; setDel(null); run(() => api(`/api/crm/notes/${n.id}`, { method: 'DELETE' }), tr('Note deleted')) }
    const grid = (list) => <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">{list.map((n) => <NoteCard key={n.id} note={n} onOpen={(x) => setDlg({ open: true, note: x, preset: null })} onPatch={patch} onDelete={setDel} onToTask={toTask} />)}</div>

    return (
        <Container>
            <InvoiceHead title={tr('Notes')} stats={[{ icon: <TbNotes />, label: tr('Notes'), value: String(data ? all.length : '–') }, { icon: <TbStar />, label: tr('Important'), value: String(all.filter((n) => n.important).length) }]} />
            <div className="mx-auto mb-5 max-w-xl">
                <div role="button" tabIndex={0} onClick={() => setDlg({ open: true, note: null, preset: null })} onKeyDown={(e) => { if (e.key === 'Enter') setDlg({ open: true, note: null, preset: null }) }} className="flex cursor-text items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <span className="flex-1 text-gray-400">{tr('Take a note…')}</span>
                    <button type="button" title={tr('New checklist')} aria-label={tr('New checklist')} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, note: null, preset: { kind: 'list' } }) }} className="grid size-8 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbChecklist /></button>
                    <button type="button" title={tr('Note with a picture')} aria-label={tr('Note with a picture')} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, note: null, preset: { focus: 'media' } }) }} className="grid size-8 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbPhoto /></button>
                    <button type="button" title={tr('Note with a voice recording')} aria-label={tr('Note with a voice recording')} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, note: null, preset: { focus: 'media' } }) }} className="grid size-8 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbMicrophone /></button>
                </div>
            </div>
            <div className="cx-tools flex-wrap">
                <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                    {TABS.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${tab === t.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{t.icon}{tr(t.label)}</button>)}
                </div>
                <div className="ms-auto w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            </div>
            {(data?.labels || []).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {data.labels.map((l) => <button key={l} type="button" onClick={() => setLabel(label === l ? '' : l)} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${label === l ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary dark:border-gray-600 dark:text-gray-300'}`}>{l}</button>)}
                </div>
            )}
            {pinned.length > 0 && <><div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{tr('Pinned')}</div>{grid(pinned)}</>}
            {pinned.length > 0 && others.length > 0 && <div className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-gray-400">{tr('Others')}</div>}
            {others.length > 0 && grid(others)}
            {data && !shown.length && <div className="py-12 text-center text-gray-400">{tab === 'archive' ? tr('Nothing archived.') : tr('No notes yet. Use “Take a note…” to add one.')}</div>}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this note?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del?.title || tr('Note')}</p>
            </ConfirmDialog>
            <NoteEditor open={dlg.open} note={dlg.note} preset={dlg.preset} canShare={data?.can?.share !== false} onClose={() => setDlg((d) => ({ ...d, open: false }))} onSaved={load} />
        </Container>
    )
}

export default NotesPage

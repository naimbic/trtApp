/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbX, TbArchive, TbChecklist, TbCircleCheck, TbCircleDashed, TbMicrophone, TbNotes, TbPhoto, TbSearch, TbShare3, TbStar } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import { NOTES_EVENT, notesChanged, COLORS } from './noteKit'
import { tr } from '@/utils/t'
import { onCreate } from '@/utils/createIntent'

const TABS = [
    { id: 'all', label: 'Notes', icon: <TbNotes /> },
    { id: 'important', label: 'Important', icon: <TbStar /> },
    { id: 'shared', label: 'Shared', icon: <TbShare3 /> },
    { id: 'archive', label: 'Archive', icon: <TbArchive /> },
]
const TODO_TABS = [
    { id: 'all', label: 'To-dos', icon: <TbChecklist /> },
    { id: 'open', label: 'Open', icon: <TbCircleDashed /> },
    { id: 'done', label: 'Done', icon: <TbCircleCheck /> },
    { id: 'important', label: 'Important', icon: <TbStar /> },
    { id: 'shared', label: 'Shared', icon: <TbShare3 /> },
    { id: 'archive', label: 'Archive', icon: <TbArchive /> },
]
const isTodo = (n) => n.kind === 'list'
const left = (n) => (n.checklist || []).filter((c) => !c.done).length

/** Notes like Google Keep: coloured cards in columns, pinned first, checklists, pictures, voice notes, links, reminders, sharing and comments. */
const NotesPage = ({ mode = 'notes' }) => {
    const todos = mode === 'todos'
    const [params] = useSearchParams()
    const [data, setData] = useState(null)
    const [tab, setTab] = useState('all')
    const [query, setQuery] = useState('')
    const [label, setLabel] = useState('')
    const [f, setF] = useState({}) // more filters: person, date, colour, files, extras
    const setFilter = (k, o) => setF((x) => ({ ...x, [k]: o ? o.value : undefined }))
    const [dlg, setDlg] = useState({ open: false, note: null, preset: null })
    const [del, setDel] = useState(null)

    const load = useCallback(() => {
        api(`/api/crm/notes?archived=${tab === 'archive' ? 1 : 0}`).then(setData).catch(() => setData({ list: [], labels: [], can: {} }))
    }, [tab])
    useEffect(() => { load() }, [load])
    useEffect(() => { window.addEventListener(NOTES_EVENT, load); return () => window.removeEventListener(NOTES_EVENT, load) }, [load])
    useEffect(() => onCreate(todos ? 'todo' : 'note', () => setDlg({ open: true, note: null, preset: todos ? { kind: 'list' } : null })), [todos])
    useEffect(() => { if (todos) api('/api/crm/notes/import-todos', { method: 'POST' }).then((r) => r.imported && load()).catch(() => {}) }, [todos]) // eslint-disable-line react-hooks/exhaustive-deps
    // a link from a notification (…/crm/notes?note=ID) opens that note
    const wanted = params.get('note')
    useEffect(() => {
        if (!wanted) return
        api(`/api/crm/notes/${wanted}`).then((d) => setDlg({ open: true, note: d.note, preset: null })).catch(() => notify('warning', tr('Note not found'))).finally(() => { // the link is spent: take it out of the address WITHOUT going through the router (every router change reloads the whole page, which closed the note again at once)
            try { const u = new URL(window.location.href); u.searchParams.delete('note'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash) } catch { /* the address stays as it is */ }
        })
    }, [wanted]) // eslint-disable-line react-hooks/exhaustive-deps

    const all = (data?.list || []).filter((n) => !todos || isTodo(n))
    const people = useMemo(() => [...new Set(all.flatMap((n) => [n.owner, ...n.sharedWith.map((x) => x.name)]).filter(Boolean))].sort(), [all])
    const DATES = [['today', tr('Today'), 0], ['week', tr('Last 7 days'), 6], ['month', tr('Last 30 days'), 29], ['year', tr('This year'), -1]]
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        const since = f.date ? (f.date === 'year' ? dayjs().startOf('year') : dayjs().subtract(DATES.find((d) => d[0] === f.date)[2], 'day').startOf('day')) : null
        return all.filter((n) => (tab === 'important' ? n.important : tab === 'shared' ? (!n.mine || n.sharedWith.length > 0) : tab === 'open' ? left(n) > 0 : tab === 'done' ? (n.checklist || []).length > 0 && left(n) === 0 : true) && (!label || n.labels.includes(label)) && (!q || `${n.title} ${n.description.replace(/<[^>]+>/g, ' ')} ${n.labels.join(' ')} ${n.checklist.map((c) => c.text).join(' ')}`.toLowerCase().includes(q))
            && (!f.person || n.owner === f.person || n.sharedWith.some((x) => x.name === f.person))
            && (!since || !dayjs(n.updatedAt).isBefore(since))
            && (!f.color || (n.color || 'none') === f.color)
            && (!f.files || (f.files === 'with' ? n.attachments.length > 0 : f.files === 'without' ? n.attachments.length === 0 : n.attachments.some((a) => a.kind === f.files)))
            && (!f.extra || (f.extra === 'links' ? n.links.length > 0 : f.extra === 'reminder' ? !!n.remindAt : f.extra === 'comments' ? n.comments > 0 : f.extra === 'pinned' ? n.pinned : f.extra === 'shared' ? n.sharedWith.length > 0 : true)))
    }, [all, tab, query, label, f]) // eslint-disable-line react-hooks/exhaustive-deps
    const filtered = !!(label || f.person || f.date || f.color || f.files || f.extra)
    const opt = (list) => list.map(([value, text]) => ({ value, label: text }))
    const pick = (k, list, ph) => <div className="w-40"><Select size="sm" isClearable isSearchable={false} placeholder={ph} options={opt(list)} value={opt(list).find((o) => o.value === f[k]) || null} onChange={(o) => setFilter(k, o)} menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: (b) => ({ ...b, zIndex: 10000 }) }} /></div>
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
            <InvoiceHead title={todos ? tr('To-dos') : tr('Notes')} stats={todos ? [{ icon: <TbChecklist />, label: tr('To-dos'), value: String(data ? all.length : '–') }, { icon: <TbCircleDashed />, label: tr('Open'), value: String(all.filter((n) => left(n) > 0).length) }, { icon: <TbStar />, label: tr('Important'), value: String(all.filter((n) => n.important).length) }] : [{ icon: <TbNotes />, label: tr('Notes'), value: String(data ? all.length : '–') }, { icon: <TbStar />, label: tr('Important'), value: String(all.filter((n) => n.important).length) }]} />
            <div className="mx-auto mb-5 max-w-xl">
                <div role="button" tabIndex={0} onClick={() => setDlg({ open: true, note: null, preset: todos ? { kind: 'list' } : null })} onKeyDown={(e) => { if (e.key === 'Enter') setDlg({ open: true, note: null, preset: todos ? { kind: 'list' } : null }) }} className="flex cursor-text items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <span className="flex-1 text-gray-400">{todos ? tr('Add a to-do…') : tr('Take a note…')}</span>
                    <button type="button" title={tr('New checklist')} aria-label={tr('New checklist')} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, note: null, preset: { kind: 'list' } }) }} className="grid size-8 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbChecklist /></button>
                    {!todos && <button type="button" title={tr('Note with a picture')} aria-label={tr('Note with a picture')} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, note: null, preset: { focus: 'media' } }) }} className="grid size-8 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbPhoto /></button>}
                    {!todos && <button type="button" title={tr('Note with a voice recording')} aria-label={tr('Note with a voice recording')} onClick={(e) => { e.stopPropagation(); setDlg({ open: true, note: null, preset: { focus: 'media' } }) }} className="grid size-8 place-items-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbMicrophone /></button>}
                </div>
            </div>
            <div className="cx-tools flex-wrap">
                <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-sm dark:border-gray-700">
                    {(todos ? TODO_TABS : TABS).map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${tab === t.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{t.icon}{tr(t.label)}</button>)}
                </div>
                <div className="ms-auto w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {pick('person', people.map((p) => [p, p]), tr('Person'))}
                {pick('date', DATES, tr('Date'))}
                {pick('color', [['none', tr('Default')], ...Object.keys(COLORS).map((c) => [c, tr(COLORS[c].label)])], tr('Colour'))}
                {pick('files', [['with', tr('With files')], ['without', tr('No files')], ['image', tr('Pictures')], ['audio', tr('Voice notes')], ['pdf', tr('PDF')], ['doc', tr('Documents')], ['sheet', tr('Sheets')]], tr('Attached files'))}
                {pick('extra', [['links', tr('With links')], ['reminder', tr('With a reminder')], ['comments', tr('With comments')], ['pinned', tr('Pinned')], ['shared', tr('Shared with someone')]], tr('More'))}
                {filtered && <button type="button" onClick={() => { setF({}); setLabel('') }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbX />{tr('Clear filters')}</button>}
                <span className="ms-auto text-xs text-gray-500">{shown.length} / {all.length}</span>
            </div>
            {(data?.labels || []).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {data.labels.map((l) => <button key={l} type="button" onClick={() => setLabel(label === l ? '' : l)} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${label === l ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary dark:border-gray-600 dark:text-gray-300'}`}>{l}</button>)}
                </div>
            )}
            {pinned.length > 0 && <><div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{tr('Pinned')}</div>{grid(pinned)}</>}
            {pinned.length > 0 && others.length > 0 && <div className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-gray-400">{tr('Others')}</div>}
            {others.length > 0 && grid(others)}
            {data && !shown.length && <div className="py-12 text-center text-gray-400">{tab === 'archive' ? tr('Nothing archived.') : (todos ? tr('No to-dos yet. Use “Add a to-do…” to start a list.') : tr('No notes yet. Use “Take a note…” to add one.'))}</div>}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this note?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del?.title || tr('Note')}</p>
            </ConfirmDialog>
            <NoteEditor open={dlg.open} note={dlg.note} preset={dlg.preset} canShare={data?.can?.share !== false} onClose={() => setDlg((d) => ({ ...d, open: false }))} onSaved={load} />
        </Container>
    )
}

export default NotesPage

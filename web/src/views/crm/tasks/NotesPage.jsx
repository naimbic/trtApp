/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbCopy, TbChecklist, TbDots, TbNotes, TbPencil, TbPlus, TbSearch, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Dropdown from '@/components/ui/Dropdown'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import NoteDialog, { NOTES_EVENT } from './NoteDialog'
import { RemindTag } from './shared'
import { tr } from '@/utils/t'
import { onCreate } from '@/utils/createIntent'

/** All my quick notes as a grid of cards: title and description. Click one to edit it. */
const NotesPage = () => {
    const [notes, setNotes] = useState(null)
    const [query, setQuery] = useState('')
    const [dlg, setDlg] = useState({ open: false, note: null })
    const [del, setDel] = useState(null)
    useEffect(() => onCreate('note', () => setDlg({ open: true, note: null })), [])
    const load = useCallback(() => { api('/api/crm/quick-notes?pageSize=500').then((d) => setNotes(d.list || [])).catch(() => setNotes([])) }, [])
    useEffect(() => { load() }, [load])
    useEffect(() => { window.addEventListener(NOTES_EVENT, load); return () => window.removeEventListener(NOTES_EVENT, load) }, [load])
    const shown = useMemo(() => { const q = query.trim().toLowerCase(); return (notes || []).filter((n) => !q || `${n.title} ${n.description || ''}`.toLowerCase().includes(q)) }, [notes, query])

    const run = async (fn, ok) => { try { await fn(); notify('success', ok); load() } catch (e) { notify('danger', e.message) } }
    const duplicate = (n) => run(() => api('/api/crm/quick-notes', { method: 'POST', body: { title: n.title, description: n.description || '' } }), tr('Note added'))
    const copy = (n) => navigator.clipboard?.writeText(`${n.title}\n\n${n.description || ''}`.trim()).then(() => notify('success', tr('Copied')), () => {})
    const toTask = (n) => run(async () => { await api('/api/crm/work/tasks', { method: 'POST', body: { name: n.title, description: n.description || '', status: 1 } }); await api(`/api/crm/quick-notes/${n.id}`, { method: 'DELETE' }) }, tr('The note is now a task'))
    const remove = () => { const n = del; setDel(null); run(() => api(`/api/crm/quick-notes/${n.id}`, { method: 'DELETE' }), tr('Note deleted')) }

    return (
        <Container>
            <InvoiceHead title={tr('Notes')} stats={[{ icon: <TbNotes />, label: tr('Notes'), value: String(notes ? notes.length : '–') }]} />
            <div className="cx-tools">
                <div className="w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
                <Button size="sm" variant="solid" className="ml-auto" icon={<TbPlus />} onClick={() => setDlg({ open: true, note: null })}>{tr('New note')}</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((n) => (
                    <div key={n.id} role="button" tabIndex={0} onClick={() => setDlg({ open: true, note: n })} onKeyDown={(e) => { if (e.key === 'Enter') setDlg({ open: true, note: n }) }} className="group relative flex h-40 cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary dark:border-gray-700 dark:bg-gray-800">
                        <span className="truncate pr-8 font-semibold text-gray-900 dark:text-gray-100">{n.title}</span>
                        <span className="mt-1 line-clamp-4 flex-1 whitespace-pre-line text-sm text-gray-500">{n.description}</span>
                        <span className="mt-2 text-xs text-gray-400">{dayjs(n.createdAt).format('DD MMM YYYY, HH:mm')}{n.remindAt ? <span className="ms-2 font-semibold text-amber-600">🔔 {dayjs(n.remindAt).format('DD MMM, HH:mm')}<RemindTag when={n.remindAt} /></span> : null}</span>
                        <div className="absolute right-2 top-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <Dropdown placement="bottom-end" renderTitle={<button type="button" aria-label={tr('Options')} className="flex size-7 items-center justify-center rounded-full text-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><TbDots /></button>}>
                                <Dropdown.Item eventKey="edit" onClick={() => setDlg({ open: true, note: n })}><span className="flex items-center"><TbPencil className="mr-2 text-lg" />{tr('Edit')}</span></Dropdown.Item>
                                <Dropdown.Item eventKey="dup" onClick={() => duplicate(n)}><span className="flex items-center"><TbCopy className="mr-2 text-lg" />{tr('Duplicate')}</span></Dropdown.Item>
                                <Dropdown.Item eventKey="copy" onClick={() => copy(n)}><span className="flex items-center"><TbCopy className="mr-2 text-lg" />{tr('Copy text')}</span></Dropdown.Item>
                                <Dropdown.Item eventKey="task" onClick={() => toTask(n)}><span className="flex items-center"><TbChecklist className="mr-2 text-lg" />{tr('Make it a task')}</span></Dropdown.Item>
                                <Dropdown.Item eventKey="del" onClick={() => setDel(n)}><span className="flex items-center text-red-500"><TbTrash className="mr-2 text-lg" />{tr('Delete')}</span></Dropdown.Item>
                            </Dropdown>
                        </div>
                    </div>
                ))}
            </div>
            {notes && !shown.length && <div className="py-10 text-center text-gray-400">{tr('No notes yet. Use New note to add one.')}</div>}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this note?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del?.title}</p>
            </ConfirmDialog>
            <NoteDialog open={dlg.open} note={dlg.note} onClose={() => setDlg({ open: false, note: null })} onSaved={load} />
        </Container>
    )
}

export default NotesPage

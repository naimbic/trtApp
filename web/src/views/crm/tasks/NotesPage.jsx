/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbNotes, TbPlus, TbSearch } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { api } from '../kit/api'
import { InvoiceHead } from '../sales/InvoiceInsights'
import NoteDialog from './NoteDialog'
import { tr } from '@/utils/t'

/** All my quick notes as a grid of cards: title and description. Click one to edit it. */
const NotesPage = () => {
    const [notes, setNotes] = useState(null)
    const [query, setQuery] = useState('')
    const [dlg, setDlg] = useState({ open: false, note: null })
    const load = useCallback(() => { api('/api/crm/quick-notes?pageSize=500').then((d) => setNotes(d.list || [])).catch(() => setNotes([])) }, [])
    useEffect(() => { load() }, [load])
    const shown = useMemo(() => { const q = query.trim().toLowerCase(); return (notes || []).filter((n) => !q || `${n.title} ${n.description || ''}`.toLowerCase().includes(q)) }, [notes, query])

    return (
        <Container>
            <InvoiceHead title={tr('Notes')} stats={[{ icon: <TbNotes />, label: tr('Notes'), value: String(notes ? notes.length : '–') }]} />
            <div className="cx-tools">
                <div className="w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr('Search')} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
                <Button size="sm" variant="solid" className="ml-auto" icon={<TbPlus />} onClick={() => setDlg({ open: true, note: null })}>{tr('New note')}</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((n) => (
                    <button key={n.id} type="button" onClick={() => setDlg({ open: true, note: n })} className="flex h-40 flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary dark:border-gray-700 dark:bg-gray-800">
                        <span className="truncate font-semibold text-gray-900 dark:text-gray-100">{n.title}</span>
                        <span className="mt-1 line-clamp-4 flex-1 whitespace-pre-line text-sm text-gray-500">{n.description}</span>
                        <span className="mt-2 text-xs text-gray-400">{dayjs(n.createdAt).format('DD MMM YYYY, HH:mm')}</span>
                    </button>
                ))}
            </div>
            {notes && !shown.length && <div className="py-10 text-center text-gray-400">{tr('No notes yet. Use New note to add one.')}</div>}
            <NoteDialog open={dlg.open} note={dlg.note} onClose={() => setDlg({ open: false, note: null })} onSaved={load} />
        </Container>
    )
}

export default NotesPage

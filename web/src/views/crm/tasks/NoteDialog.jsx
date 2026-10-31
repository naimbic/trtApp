/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { TbBellRinging } from 'react-icons/tb'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

// Tell every open notes list (Notes page, Tasks board) that a note was added, changed or removed.
export const NOTES_EVENT = 'crm:notes-changed'
const NOTES_CHANGED = () => window.dispatchEvent(new Event(NOTES_EVENT))

/** A quick note (only its owner sees it): a title, a description and, if wished, a reminder. note = null creates one. */
const NoteDialog = ({ open, note, onClose, onSaved }) => {
    const [v, setV] = useState({ title: '', description: '', remindAt: null })
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) setV({ title: note?.title || '', description: note?.description || '', remindAt: note?.remindAt ? new Date(note.remindAt) : null }) }, [open, note])
    const save = async () => {
        if (!v.title.trim()) return notify('warning', tr("Give the note a title"))
        setBusy(true)
        try {
            await api(note ? `/api/crm/quick-notes/${note.id}` : '/api/crm/quick-notes', { method: note ? 'PATCH' : 'POST', body: { title: v.title.trim(), description: v.description, remindAt: v.remindAt ? new Date(v.remindAt).toISOString() : null } })
            notify('success', note ? tr("Note saved") : tr("Note added"))
            onSaved?.(); NOTES_CHANGED(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const remove = async () => {
        setBusy(true)
        try { await api(`/api/crm/quick-notes/${note.id}`, { method: 'DELETE' }); notify('success', tr("Note deleted")); onSaved?.(); NOTES_CHANGED(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={520} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4 pr-10">{note ? tr("Note") : tr("New note")}</h5>
            <div className="flex flex-col gap-3">
                <div><label className="form-label mb-1 block">{tr("Title")}</label><Input autoFocus value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') save() }} /></div>
                <div><label className="form-label mb-1 block">{tr("Description")}</label><Input textArea rows={6} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                            <Switcher checked={!!v.remindAt} onChange={(c) => setV({ ...v, remindAt: c ? dayjs().add(1, 'hour').minute(0).second(0).toDate() : null })} />
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><TbBellRinging className="shrink-0" />{tr("Remind me")}</span>
                        </label>
                        {v.remindAt && <div className="w-full sm:w-56"><DatePicker.DateTimepicker size="sm" value={v.remindAt} onChange={(d) => setV({ ...v, remindAt: d || null })} /></div>}
                    </div>
                    {v.remindAt && <p className="mt-1.5 text-xs text-gray-500">{tr("You are told on the bell, by email and on Telegram or WhatsApp (if set in your profile) at the first run of the automatic tasks after that time. Only you see this note.")}</p>}
                </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
                {note && <Button variant="plain" className="text-red-500" disabled={busy} onClick={remove}>{tr("Delete")}</Button>}
                <div className="ml-auto flex gap-2"><Button onClick={onClose}>{tr("Cancel")}</Button><Button variant="solid" loading={busy} onClick={save}>{tr("Save")}</Button></div>
            </div>
        </Dialog>
    )
}

export default NoteDialog

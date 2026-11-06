/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbBellPlus, TbTrash } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import useMe from '@/utils/hooks/useMe'
import { defaultRemindAt } from '@/utils/remind'
import Select from '@/components/ui/Select'
import { mentionDirectory } from '@/utils/mentions'
import { api, notify } from '@/views/crm/kit/api'
import { tr } from '@/utils/t'

/** "Remind me": a reminder with a date AND a time on this record (a task, a lead...), only for the person who sets it. */
const RemindMe = ({ relType, relId, size = 'sm', iconOnly = false, initialNote = '', tab = null, assignedIds = [] }) => {
    const me = useMe()
    const [open, setOpen] = useState(false)
    const [list, setList] = useState([])
    const [date, setDate] = useState(null)
    const [note, setNote] = useState('')
    const [mail, setMail] = useState(!iconOnly) // a reminder on a comment tells the people in the app first: the email is an extra
    const [dir, setDir] = useState({ me: null, staff: [] })
    const [rows, setRows] = useState([]) // the people listed, in order
    const [on, setOn] = useState({}) // who is reminded
    const [busy, setBusy] = useState(false)
    const load = useCallback(() => api(`/api/crm/my-reminders?relType=${relType}&relId=${relId}`).then((r) => setList(r.list || [])).catch(() => {}), [relType, relId])
    useEffect(() => { if (relId) load() }, [relId, load])
    useEffect(() => { if (open) { setDate(defaultRemindAt(me?.notifyHours)); setNote(initialNote); setMail(!iconOnly) } }, [open])
    // a reminder on a comment: the people assigned to the record (and the person setting it) are listed, all switched on
    useEffect(() => {
        if (!open || !iconOnly) return
        mentionDirectory().then((d) => {
            setDir(d)
            const ids = [...new Set([...(assignedIds || []), d.me].filter(Boolean))]
            setRows(ids); setOn(Object.fromEntries(ids.map((i) => [i, true])))
        })
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps // eslint-disable-line react-hooks/exhaustive-deps
    if (!relId) return null
    const pending = list.filter((r) => !r.done)
    const nh = me?.notifyHours
    const add = async () => {
        setBusy(true)
        try { await api('/api/crm/my-reminders', { method: 'POST', body: { relType, relId, date: new Date(date).toISOString(), note, notifyByEmail: mail, tab, ...(iconOnly ? { staffIds: rows.filter((i) => on[i]) } : {}) } }); notify('success', tr('Reminder set')); setNote(iconOnly ? initialNote : ''); setDate(defaultRemindAt(nh)); await load(); if (iconOnly) setOpen(false) } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <>
            {iconOnly ? <button type="button" title={tr('Remind me')} aria-label={tr('Remind me')} onClick={() => setOpen(true)} className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"><TbBellPlus /></button> : <Button size={size} icon={<TbBellPlus />} onClick={() => setOpen(true)}>{tr('Remind me')}{pending.length > 0 && <span className="ms-1.5 rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">{pending.length}</span>}</Button>}
            <Dialog isOpen={open} width={460} onClose={() => setOpen(false)} onRequestClose={() => setOpen(false)}>
                <h5 className="mb-1">{tr('Remind me about this')}</h5>
                <p className="mb-3 text-sm text-gray-500">{iconOnly ? tr('Each person switched on is told on the bell and on their phone at that time; the email is only sent if you switch it on.') : tr('Only you are told: on the bell, on your phone, by email and on Telegram or WhatsApp (if set in your profile).')}{nh?.on !== false && nh ? ` ${tr('The CRM notifies between {from}:00 and {to}:00: a reminder that comes outside these hours is sent when they open.', { from: nh.from, to: nh.to })}` : ''}</p>
                {pending.length > 0 && <div className="mb-3 space-y-1.5">{pending.map((r) => <div key={r.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-gray-700/40"><span className="font-semibold">{dayjs(r.date).format('DD MMM YYYY, HH:mm')}</span><span className="min-w-0 flex-1 truncate text-gray-500">{r.note}</span><button type="button" aria-label={tr('Delete')} onClick={() => api(`/api/crm/my-reminders?id=${r.id}`, { method: 'DELETE' }).then(load).catch((e) => notify('danger', e.message))} className="text-gray-400 hover:text-red-500"><TbTrash /></button></div>)}</div>}
                <div className="space-y-3">
                    <div><label className="mb-1 block text-xs font-semibold text-gray-500">{tr('Date and time')}</label><DatePicker.DateTimepicker value={date} onChange={(d) => setDate(d || date)} /></div>
                    <div><label className="mb-1 block text-xs font-semibold text-gray-500">{tr('Note (optional)')}</label><Input textArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                    {iconOnly && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-500">{tr('Who is reminded')}</label>
                            <div className="space-y-1">
                                {rows.map((id) => {
                                    const person = dir.staff.find((x) => x.id === id)
                                    return <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-gray-700/40"><Switcher checked={!!on[id]} onChange={(c) => setOn((x) => ({ ...x, [id]: c }))} /><span className="min-w-0 flex-1 truncate">{person?.name || '…'}{id === dir.me ? ` (${tr('you')})` : ''}</span>{(assignedIds || []).includes(id) && <span className="shrink-0 text-[11px] text-gray-400">{tr('assigned')}</span>}</label>
                                })}
                            </div>
                            <div className="mt-2"><Select size="sm" isSearchable placeholder={tr('Add another person')} options={dir.staff.filter((x) => !rows.includes(x.id)).map((x) => ({ value: x.id, label: x.name }))} value={null} onChange={(o) => { if (o) { setRows((r) => [...r, o.value]); setOn((x) => ({ ...x, [o.value]: true })) } }} /></div>
                        </div>
                    )}
                    <label className="flex items-center gap-2 text-sm"><Switcher checked={mail} onChange={setMail} />{tr('Send an email too')}</label>
                </div>
                <div className="mt-4 flex justify-end gap-2"><Button onClick={() => setOpen(false)}>{tr('Close')}</Button><Button variant="solid" loading={busy} disabled={!date || (iconOnly && !rows.some((i) => on[i]))} onClick={add}>{tr('Set the reminder')}</Button></div>
            </Dialog>
        </>
    )
}

export default RemindMe

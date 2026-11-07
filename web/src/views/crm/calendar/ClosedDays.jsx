/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbCalendarOff, TbPlus, TbTrash } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const range = (r) => (r.fromDay === r.toDay ? dayjs(r.fromDay).format('ddd D MMM YYYY') : `${dayjs(r.fromDay).format('ddd D MMM')} → ${dayjs(r.toDay).format('ddd D MMM YYYY')}`)
const days = (r) => dayjs(r.toDay).diff(dayjs(r.fromDay), 'day') + 1

/** The days the team takes no appointments (holidays, out of office, too busy): the Meet booking page does not offer them. */
const ClosedDays = ({ open, onClose }) => {
    const [d, setD] = useState(null)
    const [v, setV] = useState({ fromDay: '', toDay: '', label: '' })
    const [busy, setBusy] = useState(false)
    const load = useCallback(() => api('/api/crm/calendar/closed').then(setD).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { if (open) { setV({ fromDay: '', toDay: '', label: '' }); load() } }, [open, load])
    const add = async () => {
        if (!v.fromDay) return notify('warning', tr('Choose the first day'))
        setBusy(true)
        try { await api('/api/crm/calendar/closed', { method: 'POST', body: { fromDay: v.fromDay, toDay: v.toDay || v.fromDay, label: v.label } }); setV({ fromDay: '', toDay: '', label: '' }); await load(); notify('success', tr('Days closed')) } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const remove = async (r) => { try { await api(`/api/crm/calendar/closed?id=${r.id}`, { method: 'DELETE' }); await load() } catch (e) { notify('danger', e.message) } }
    const fill = (from, to) => setV((x) => ({ ...x, fromDay: from.format('YYYY-MM-DD'), toDay: to.format('YYYY-MM-DD') }))
    const first = d ? dayjs(d.today).add(d.minNoticeDays, 'day') : null
    return (
        <Dialog isOpen={open} width={560} onClose={onClose} onRequestClose={onClose}>
            <div className="mb-3 flex items-center gap-3 pe-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-2xl text-rose-600"><TbCalendarOff /></span><div><h5>{tr('Closed days')}</h5><p className="text-xs text-gray-500">{tr('No appointment can be booked on these days on the Meet booking page. Use it for holidays, or when you are out or too busy.')}</p></div></div>
            {d && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">{d.minNoticeDays > 0 ? tr('Visitors can book from {date} at the earliest (minimum notice: {n} day(s), in Settings → Calendar).', { date: first.format('ddd D MMM'), n: d.minNoticeDays }) : tr('There is no minimum notice (Settings → Calendar).')}</p>}
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {(d?.list || []).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm dark:bg-rose-500/10">
                        <div className="min-w-0 flex-1"><div className="font-semibold">{range(r)}</div>{r.label && <div className="truncate text-xs text-gray-500">{r.label}</div>}</div>
                        <span className="shrink-0 text-xs text-gray-400">{days(r)} {tr('day(s)')}</span>
                        {d.can.edit && <button type="button" aria-label={tr('Remove')} onClick={() => remove(r)} className="text-gray-400 hover:text-red-500"><TbTrash /></button>}
                    </div>
                ))}
                {d && !d.list.length && <p className="py-4 text-center text-sm text-gray-400">{tr('No closed day yet.')}</p>}
            </div>
            {d?.can.edit ? (
                <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        <span className="self-center text-xs font-semibold text-gray-500">{tr('Quick pick')}</span>
                        <button type="button" className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold hover:bg-gray-200 dark:bg-gray-700" onClick={() => fill(dayjs().add(1, 'week').startOf('week').add(1, 'day'), dayjs().add(1, 'week').endOf('week').add(1, 'day'))}>{tr('Next week')}</button>
                        <button type="button" className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold hover:bg-gray-200 dark:bg-gray-700" onClick={() => fill(dayjs().startOf('month'), dayjs().endOf('month'))}>{tr('This month')}</button>
                        <button type="button" className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold hover:bg-gray-200 dark:bg-gray-700" onClick={() => fill(dayjs().add(1, 'month').startOf('month'), dayjs().add(1, 'month').endOf('month'))}>{tr('Next month')}</button>
                        <input type="month" className="rounded-full bg-gray-100 px-3 py-0.5 text-xs dark:bg-gray-700" aria-label={tr('A whole month')} onChange={(e) => e.target.value && fill(dayjs(`${e.target.value}-01`), dayjs(`${e.target.value}-01`).endOf('month'))} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div><label className="mb-1 block text-xs font-semibold text-gray-500">{tr('First day')}</label><Input size="sm" type="date" value={v.fromDay} min={d.today} onChange={(e) => setV({ ...v, fromDay: e.target.value, toDay: v.toDay && v.toDay < e.target.value ? '' : v.toDay })} /></div>
                        <div><label className="mb-1 block text-xs font-semibold text-gray-500">{tr('Last day (empty = the same day)')}</label><Input size="sm" type="date" value={v.toDay} min={v.fromDay || d.today} onChange={(e) => setV({ ...v, toDay: e.target.value })} /></div>
                    </div>
                    <div className="mt-2"><label className="mb-1 block text-xs font-semibold text-gray-500">{tr('Reason (only for the team)')}</label><Input size="sm" value={v.label} maxLength={80} placeholder={tr('Holidays, Eid, away, too busy…')} onChange={(e) => setV({ ...v, label: e.target.value })} /></div>
                    <div className="mt-3 flex justify-end"><Button size="sm" variant="solid" icon={<TbPlus />} loading={busy} onClick={add}>{tr('Close these days')}</Button></div>
                </div>
            ) : d && <p className="mt-3 text-xs text-gray-500">{tr('You can see the closed days. Closing days needs the permission “Close days for appointments”.')}</p>}
            <div className="mt-4 flex justify-end"><Button onClick={onClose}>{tr('Close')}</Button></div>
        </Dialog>
    )
}

export default ClosedDays

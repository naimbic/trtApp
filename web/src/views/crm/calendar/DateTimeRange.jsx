/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dayjs from 'dayjs'
import { TbCalendarTime } from 'react-icons/tb'
import RangeCalendar from '@/components/ui/DatePicker/RangeCalendar'
import Button from '@/components/ui/Button'
import { tr } from '@/utils/t'

const timeOf = (d, fb) => (d ? dayjs(d).format('HH:mm') : fb)
const withTime = (day, hhmm) => { const [h, m] = String(hhmm || '09:00').split(':').map(Number); return dayjs(day).hour(h || 0).minute(m || 0).second(0).millisecond(0).toDate() }

/**
 * One field for a whole period: a date range and, unless the event lasts all day, its start and end time.
 * Click the field: pick the first and the last day on the calendar, set the times, press Done.
 */
const DateTimeRange = ({ start, end, allDay, onChange, disabled }) => {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const box = useRef(null)
    const panel = useRef(null)

    useEffect(() => {
        if (!open) return undefined
        const place = () => {
            const r = box.current?.getBoundingClientRect()
            if (!r) return
            const h = panel.current?.offsetHeight || 440
            const below = window.innerHeight - r.bottom - 8, above = r.top - 8
            let top = below >= h || below >= above ? r.bottom + 6 : r.top - h - 6
            top = Math.max(8, Math.min(top, window.innerHeight - h - 8)) // always fully inside the screen
            setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 336)), top })
        }
        place()
        const t = window.setTimeout(place, 0) // again once the panel has its real height
        const iv = window.setInterval(place, 120) // and while the dialog is still settling into place
        const stop = window.setTimeout(() => window.clearInterval(iv), 700)
        const out = (e) => { if (!panel.current?.contains(e.target) && !box.current?.contains(e.target)) setOpen(false) }
        const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
        document.addEventListener('mousedown', out)
        document.addEventListener('keydown', key, true)
        window.addEventListener('resize', place)
        return () => { window.clearTimeout(t); window.clearTimeout(stop); window.clearInterval(iv); document.removeEventListener('mousedown', out); document.removeEventListener('keydown', key, true); window.removeEventListener('resize', place) }
    }, [open])

    const s = start ? dayjs(start) : null
    const e = end ? dayjs(end) : s
    const same = s && e && s.isSame(e, 'day')
    const d = (x) => x.format('DD MMM YYYY')
    const text = !s ? '' : allDay ? (same ? d(s) : `${d(s)}  →  ${d(e)}`) : same ? `${d(s)}, ${s.format('HH:mm')} → ${e.format('HH:mm')}` : `${d(s)}, ${s.format('HH:mm')}  →  ${d(e)}, ${e.format('HH:mm')}`

    const pickDays = (range) => {
        if (!range?.[0]) return
        const [a, b] = [range[0], range[1] || range[0]]
        const st = withTime(a, timeOf(start, '09:00'))
        let en = withTime(b, timeOf(end || start, '10:00'))
        if (!allDay && dayjs(en).isBefore(st)) en = dayjs(st).add(1, 'hour').toDate()
        onChange({ start: st, end: en })
    }
    const setTime = (which, hhmm) => {
        if (!hhmm || !s) return
        if (which === 'start') {
            const st = withTime(start, hhmm)
            const shift = dayjs(st).diff(dayjs(start), 'minute')
            onChange({ start: st, end: end ? dayjs(end).add(shift, 'minute').toDate() : dayjs(st).add(1, 'hour').toDate() }) // moving the start moves the end with it
        } else onChange({ start, end: withTime(end || start, hhmm) })
    }

    return (
        <>
            <button type="button" ref={box} disabled={disabled} onClick={() => !disabled && setOpen((o) => !o)} className="flex h-11 w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-left text-sm transition hover:border-primary disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800" aria-haspopup="dialog" aria-expanded={open}>
                <TbCalendarTime className="shrink-0 text-lg text-gray-400" />
                <span className={text ? 'truncate font-semibold' : 'text-gray-400'}>{text || tr("Pick a date and a time")}</span>
            </button>
            {open && createPortal(
                <div ref={panel} role="dialog" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 3000, width: 328 }} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
                    <RangeCalendar singleDate value={[start ? dayjs(start).startOf('day').toDate() : null, end ? dayjs(end).startOf('day').toDate() : null]} onChange={pickDays} />
                    {!allDay && (
                        <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                            <label className="flex items-center gap-2 text-sm"><span className="text-gray-500">{tr("From")}</span><input type="time" value={timeOf(start, '')} onChange={(ev) => setTime('start', ev.target.value)} className="h-9 rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-800" /></label>
                            <label className="flex items-center gap-2 text-sm"><span className="text-gray-500">{tr("to")}</span><input type="time" value={timeOf(end, '')} onChange={(ev) => setTime('end', ev.target.value)} className="h-9 rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-800" /></label>
                        </div>
                    )}
                    <div className="mt-3 flex justify-end"><Button size="sm" variant="solid" type="button" onClick={() => setOpen(false)}>{tr("Done")}</Button></div>
                </div>,
                document.body,
            )}
        </>
    )
}

export default DateTimeRange

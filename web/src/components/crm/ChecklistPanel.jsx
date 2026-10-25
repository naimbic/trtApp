/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbGripVertical, TbTrash, TbPencil, TbPlus, TbCalendar, TbBell, TbBellOff, TbUserPlus, TbSortAscending, TbEyeOff, TbEye, TbCheck } from 'react-icons/tb'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import Button from '@/components/ui/Button'
import Mentioned from '@/components/crm/Mentioned'
import classNames from '@/utils/classNames'
import { tr, trn } from '@/utils/t'

const REMINDERS = [[null, 'No reminder'], [0, 'At the due time'], [60, '1 hour before'], [1440, '1 day before'], [2880, '2 days before']]
const ini = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

/** The colour and wording of a due date: red late, amber today, yellow soon, grey later, green when done. */
export function dueLook(due, done) {
    if (!due) return null
    const days = dayjs(due).startOf('day').diff(dayjs().startOf('day'), 'day')
    if (done) return { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10', label: dayjs(due).format('DD MMM') }
    if (days < 0) return { cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300', label: tr('{n} d late', { n: -days }) }
    if (days === 0) return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', label: tr('Today') }
    if (days === 1) return { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300', label: tr('Tomorrow') }
    if (days <= 3) return { cls: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300', label: dayjs(due).format('DD MMM') }
    return { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', label: dayjs(due).format('DD MMM') }
}

const day = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '')

/** A date chip: the visible chip is a label, a transparent date field over it opens the browser's date picker. */
const DateChip = ({ value, done, onChange, disabled, empty }) => {
    const look = dueLook(value, done)
    return (
        <label className={classNames('relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-bold', look ? look.cls : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', disabled && 'pointer-events-none opacity-60')}>
            <TbCalendar className="text-sm" />{look ? look.label : empty}
            <input type="date" value={day(value)} disabled={disabled} onChange={(e) => onChange(e.target.value || null)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={tr('Due date')} />
        </label>
    )
}

const Person = ({ p, size = 24 }) => (p ? <Avatar size={size} shape="circle" src={p.image || undefined} title={p.name}>{ini(p.name)}</Avatar> : <span className="grid size-6 place-items-center rounded-full border border-dashed border-gray-300 text-sm text-gray-400"><TbUserPlus /></span>)

/** Pick a team member (or nobody) from a small menu. */
const AssignMenu = ({ staff, current, onPick, disabled }) => (
    <Dropdown placement="bottom-end" disabled={disabled} renderTitle={<button type="button" disabled={disabled} className="grid shrink-0 place-items-center rounded-full hover:ring-2 hover:ring-primary/30" title={tr('Assign')} aria-label={tr('Assign')}><Person p={current} /></button>}>
        <Dropdown.Item eventKey="none" onClick={() => onPick(null)}><span className="text-gray-500">{tr('Nobody')}</span></Dropdown.Item>
        {staff.map((s) => <Dropdown.Item key={s.id} eventKey={s.id} onClick={() => onPick(s.id)}><span className="flex items-center gap-2"><Avatar size={20} shape="circle" src={s.image || undefined}>{ini(s.name)}</Avatar>{s.name}{current?.id === s.id && <TbCheck className="ml-auto" />}</span></Dropdown.Item>)}
    </Dropdown>
)

const ReminderMenu = ({ value, due, onPick, disabled }) => (
    <Dropdown placement="bottom-end" disabled={disabled || !due} renderTitle={<button type="button" disabled={disabled || !due} className={classNames('grid size-7 shrink-0 place-items-center rounded-full text-base', value != null ? 'bg-primary/10 text-primary' : 'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700', !due && 'opacity-40')} title={due ? tr('Reminder') : tr('Set a due date first')} aria-label={tr('Reminder')}>{value != null ? <TbBell /> : <TbBellOff />}</button>}>
        {REMINDERS.map(([v, l]) => <Dropdown.Item key={String(v)} eventKey={String(v)} onClick={() => onPick(v)}><span className="flex items-center">{tr(l)}{value === v && <TbCheck className="ml-3" />}</span></Dropdown.Item>)}
    </Dropdown>
)

/**
 * The checklist of a task: tick, edit in place, give a step to someone, a due date (red when late, amber today) and a reminder,
 * drag to reorder, sort by date, hide what is done. "@" and "#" work in the text. `act(op)` sends one change to the server.
 */
const ChecklistPanel = ({ items, staff = [], canEdit = true, act, empty }) => {
    const [list, setList] = useState(items)
    const [text, setText] = useState('')
    const [who, setWho] = useState(null)
    const [due, setDue] = useState(null)
    const [editing, setEditing] = useState(null) // { id, text }
    const [hideDone, setHideDone] = useState(false)
    const [over, setOver] = useState(null)
    const drag = useRef(null)
    useEffect(() => setList(items), [items])
    const person = (id) => staff.find((s) => s.id === id) || null
    const done = list.filter((c) => c.finished).length
    const shown = useMemo(() => list.filter((c) => !(hideDone && c.finished)), [list, hideDone])
    const add = async () => {
        const description = text.trim()
        if (!description) return
        await act({ action: 'add', description, assigned: who, dueDate: due })
        setText(''); setWho(null); setDue(null)
    }
    const drop = async (to) => {
        const from = drag.current; drag.current = null; setOver(null)
        if (from === null || from === to) return
        const next = [...list]; const [m] = next.splice(from, 1); next.splice(to, 0, m)
        setList(next)
        await act({ action: 'reorder', ids: next.map((x) => x.id) })
    }
    const sortByDate = async () => {
        const next = [...list].sort((a, b) => (+!!a.finished - +!!b.finished) || ((a.dueDate ? +new Date(a.dueDate) : Infinity) - (b.dueDate ? +new Date(b.dueDate) : Infinity)))
        setList(next)
        await act({ action: 'reorder', ids: next.map((x) => x.id) })
    }
    const upd = (c, patch) => act({ action: 'update', itemId: c.id, ...patch })
    const saveText = async () => {
        const e = editing; setEditing(null)
        if (e && e.text.trim() && e.text.trim() !== list.find((x) => x.id === e.id)?.description) await upd({ id: e.id }, { description: e.text })
    }
    const pct = list.length ? Math.round((done / list.length) * 100) : 0
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="min-w-[140px] flex-1">
                    <div className="mb-1 flex items-baseline justify-between text-xs font-semibold text-gray-500"><span>{list.length ? tr('{a} of {b} done', { a: done, b: list.length }) : tr('Checklist')}</span><span>{pct}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
                {list.length > 1 && canEdit && <Button size="xs" icon={<TbSortAscending />} onClick={sortByDate}>{tr('Sort by date')}</Button>}
                {done > 0 && <Button size="xs" icon={hideDone ? <TbEye /> : <TbEyeOff />} onClick={() => setHideDone((v) => !v)}>{hideDone ? trn(done, 'done step shown') : tr('Hide done')}</Button>}
            </div>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {shown.map((c) => {
                    const i = list.indexOf(c)
                    const p = c.person || person(c.assigned)
                    return (
                        <div key={c.id} className={classNames('group flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2', over === i && 'bg-primary/5')}
                            onDragOver={(e) => { if (drag.current !== null) { e.preventDefault(); setOver(i) } }} onDrop={(e) => { e.preventDefault(); drop(i) }}>
                            <TbGripVertical className={classNames('shrink-0 text-lg text-gray-300', canEdit && !hideDone ? 'cursor-grab' : 'opacity-0')} draggable={canEdit && !hideDone} onDragStart={() => { drag.current = i }} onDragEnd={() => { drag.current = null; setOver(null) }} aria-hidden="true" />
                            <button type="button" role="checkbox" aria-checked={c.finished} aria-label={tr('Done')} onClick={() => act({ action: 'toggle', itemId: c.id, finished: !c.finished })}
                                className={classNames('grid size-5 shrink-0 place-items-center rounded-full border-2 text-xs transition', c.finished ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 hover:border-primary')}>{c.finished && <TbCheck />}</button>
                            <div className="min-w-[120px] flex-1 text-sm">
                                {editing?.id === c.id
                                    ? <input data-mention autoFocus value={editing.text} maxLength={500} onChange={(e) => setEditing({ id: c.id, text: e.target.value })} onBlur={saveText} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(null) }} className="h-8 w-full rounded-lg border border-primary bg-white px-2 text-sm outline-none dark:bg-gray-800" />
                                    : <button type="button" disabled={!canEdit} onClick={() => setEditing({ id: c.id, text: c.description })} className={classNames('w-full text-left', c.finished && 'text-gray-400 line-through')}><Mentioned text={c.description} /></button>}
                            </div>
                            <div className="ml-auto flex items-center gap-1">
                                <DateChip value={c.dueDate} done={c.finished} disabled={!canEdit} empty={tr('Date')} onChange={(v) => upd(c, { dueDate: v, ...(v ? {} : { reminder: null }) })} />
                                <ReminderMenu value={c.reminder} due={c.dueDate} disabled={!canEdit} onPick={(v) => upd(c, { reminder: v })} />
                                <AssignMenu staff={staff} current={p} disabled={!canEdit} onPick={(id) => upd(c, { assigned: id })} />
                                {canEdit && <button type="button" aria-label={tr('Edit')} title={tr('Edit')} onClick={() => setEditing({ id: c.id, text: c.description })} className="grid size-7 place-items-center rounded-full text-base text-gray-300 opacity-0 hover:bg-gray-100 hover:text-primary group-hover:opacity-100 focus:opacity-100 dark:hover:bg-gray-700"><TbPencil /></button>}
                                {canEdit && <button type="button" aria-label={tr('Delete')} title={tr('Delete')} onClick={() => act({ action: 'delete', itemId: c.id })} className="grid size-7 place-items-center rounded-full text-base text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-gray-700"><TbTrash /></button>}
                            </div>
                        </div>
                    )
                })}
                {!shown.length && <div className="px-4 py-5 text-sm text-gray-400">{list.length ? tr('Everything is done.') : (empty || tr('No checklist yet. Break the task into small steps.'))}</div>}
                {canEdit && (
                    <form className="flex flex-wrap items-center gap-2 bg-gray-50/60 px-2.5 py-2 dark:bg-gray-700/20" onSubmit={(e) => { e.preventDefault(); add() }}>
                        <TbPlus className="shrink-0 text-lg text-gray-400" />
                        <input data-mention value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={tr('Add a step (@ to mention, # for a tag)')} className="h-8 min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-1 text-sm outline-none focus:border-gray-200 dark:focus:border-gray-600" />
                        <DateChip value={due} onChange={setDue} empty={tr('Date')} />
                        <AssignMenu staff={staff} current={person(who)} onPick={setWho} />
                        <Button size="xs" variant="solid" type="submit" disabled={!text.trim()}>{tr('Add')}</Button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ChecklistPanel

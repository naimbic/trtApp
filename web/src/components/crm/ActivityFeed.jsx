/*! © 2026 TRT Digital — trtCRM. */
import dayjs from 'dayjs'
import { TbCircleCheck, TbFlag, TbMail, TbMessage, TbNote, TbPaperclip, TbPencil, TbPlus, TbUsers, TbCalendarEvent, TbChecklist, TbClock, TbArrowsExchange, TbListCheck } from 'react-icons/tb'
import { tr } from '@/utils/t'

// kind -> icon and colour; items that only carry a text (the lead's log) are sorted by what the text says
const KINDS = {
    created: [TbPlus, 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20'], status: [TbArrowsExchange, 'bg-blue-100 text-blue-600 dark:bg-blue-500/20'], finished: [TbCircleCheck, 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20'],
    priority: [TbFlag, 'bg-orange-100 text-orange-600 dark:bg-orange-500/20'], dates: [TbCalendarEvent, 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'], people: [TbUsers, 'bg-violet-100 text-violet-600 dark:bg-violet-500/20'],
    edit: [TbPencil, 'bg-gray-100 text-gray-600 dark:bg-gray-600/40'], relation: [TbPencil, 'bg-gray-100 text-gray-600 dark:bg-gray-600/40'], checklist: [TbChecklist, 'bg-teal-100 text-teal-600 dark:bg-teal-500/20'],
    file: [TbPaperclip, 'bg-sky-100 text-sky-600 dark:bg-sky-500/20'], comment: [TbMessage, 'bg-pink-100 text-pink-600 dark:bg-pink-500/20'], timer: [TbClock, 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20'],
    mail: [TbMail, 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20'], note: [TbNote, 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20'], meeting: [TbCalendarEvent, 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20'], task: [TbListCheck, 'bg-lime-100 text-lime-700 dark:bg-lime-500/20'],
}
const kindOf = (t) => {
    const x = String(t || '').toLowerCase()
    if (/^comment/.test(x)) return 'comment'
    if (/^status changed|^marked as|^lead restored/.test(x)) return 'status'
    if (/mail|email/.test(x)) return 'mail'
    if (/^note|reply added in the notes/.test(x)) return 'note'
    if (/^meeting/.test(x)) return 'meeting'
    if (/^file /.test(x)) return 'file'
    if (/^task/.test(x)) return /checklist/.test(x) ? 'checklist' : 'task'
    if (/assigned|followers/.test(x)) return 'people'
    if (/created|added through/.test(x)) return 'created'
    return 'edit'
}
const dayLabel = (d) => { const m = dayjs(d); const t = dayjs(); return m.isSame(t, 'day') ? tr('Today') : m.isSame(t.subtract(1, 'day'), 'day') ? tr('Yesterday') : m.format('dddd, DD MMM YYYY') }

/** A trail of what happened, newest first, grouped by day: an icon by kind, the sentence, who did it and when.
 *  items: [{ id?, type?, text, staff?: { name }, by?: string, at | date }] */
const ActivityFeed = ({ items = [], empty }) => {
    const rows = items.map((x, i) => ({ ...x, key: x.id || i, at: x.at || x.date, who: x.staff?.name || x.by || '', kind: x.type && KINDS[x.type] ? x.type : kindOf(x.text) })).filter((x) => x.at)
    if (!rows.length) return <p className="text-sm text-gray-500">{empty || tr('Nothing logged yet.')}</p>
    const groups = []
    for (const r of rows) { const k = dayjs(r.at).format('YYYY-MM-DD'); const g = groups[groups.length - 1]; if (g && g.k === k) g.rows.push(r); else groups.push({ k, at: r.at, rows: [r] }) }
    return (
        <div className="space-y-5">
            {groups.map((g) => (
                <div key={g.k}>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{dayLabel(g.at)}</div>
                    <ol className="relative space-y-3 border-s border-gray-200 ps-5 dark:border-gray-700">
                        {g.rows.map((r) => {
                            const [Icon, tone] = KINDS[r.kind] || KINDS.edit
                            return (
                                <li key={r.key} className="relative">
                                    <span className={`absolute -start-[34px] top-0 flex size-7 items-center justify-center rounded-full text-sm ${tone}`}><Icon /></span>
                                    <div className="text-sm leading-snug text-gray-800 dark:text-gray-100">{r.text}</div>
                                    <div className="mt-0.5 text-xs text-gray-500">{r.who ? <b className="font-semibold text-gray-600 dark:text-gray-300">{r.who}</b> : null}{r.who ? ' · ' : ''}{dayjs(r.at).format('HH:mm')}</div>
                                </li>
                            )
                        })}
                    </ol>
                </div>
            ))}
        </div>
    )
}

export default ActivityFeed

/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbCircleCheck, TbFlag, TbMail, TbMessage, TbNote, TbPaperclip, TbPencil, TbPlus, TbUsers, TbCalendarEvent, TbChecklist, TbClock, TbArrowsExchange, TbListCheck, TbChevronLeft, TbChevronRight } from 'react-icons/tb'
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
const LABEL = { created: 'Created', status: 'Status', finished: 'Finished', priority: 'Priority', dates: 'Dates', people: 'People', edit: 'Edit', relation: 'Link', checklist: 'Checklist', file: 'File', comment: 'Comment', timer: 'Time', mail: 'Email', note: 'Note', meeting: 'Meeting', task: 'Task' }
const PAGE = 10

/** What happened, newest first: one card per activity (a tag for the kind, the date and time, who did it, what was done), in pages when there are many.
 *  items: [{ id?, type?, text, staff?: { name }, by?: string, at | date }] */
const ActivityFeed = ({ items = [], empty }) => {
    const [page, setPage] = useState(0)
    const rows = items.map((x, i) => ({ ...x, key: x.id || i, at: x.at || x.date, who: x.staff?.name || x.by || '', kind: x.type && KINDS[x.type] ? x.type : kindOf(x.text) })).filter((x) => x.at)
    const pages = Math.max(1, Math.ceil(rows.length / PAGE))
    useEffect(() => { if (page > pages - 1) setPage(pages - 1) }, [pages, page])
    if (!rows.length) return <p className="text-sm text-gray-500">{empty || tr('Nothing logged yet.')}</p>
    const shown = rows.slice(page * PAGE, page * PAGE + PAGE)
    return (
        <div className="min-w-0 space-y-3">
            {shown.map((r) => {
                const [Icon, tone] = KINDS[r.kind] || KINDS.edit
                return (
                    <article key={r.key} className="min-w-0 rounded-2xl border border-gray-200/80 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800">
                        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}><Icon />{tr(LABEL[r.kind] || 'Edit')}</span>
                            <time className="text-xs text-gray-500" dateTime={dayjs(r.at).toISOString()}>{dayjs(r.at).format('DD MMM YYYY')} · {dayjs(r.at).format('HH:mm')}</time>
                        </header>
                        <p className="mt-2.5 break-words text-sm leading-relaxed text-gray-800 dark:text-gray-100">{r.text}</p>
                        {r.who && (
                            <footer className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5 text-xs text-gray-500 dark:border-gray-700">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-100">{r.who[0]?.toUpperCase()}</span>
                                <b className="truncate font-semibold text-gray-700 dark:text-gray-200">{r.who}</b>
                            </footer>
                        )}
                    </article>
                )
            })}
            {pages > 1 && (
                <nav className="flex items-center justify-between gap-2 pt-1 text-sm" aria-label={tr('Pages')}>
                    <span className="text-xs text-gray-500">{page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} / {rows.length}</span>
                    <span className="flex items-center gap-1">
                        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label={tr('Previous')} className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600 enabled:hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-200"><TbChevronLeft /></button>
                        <span className="min-w-[3.5rem] text-center text-xs font-semibold text-gray-600 dark:text-gray-300">{page + 1} / {pages}</span>
                        <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label={tr('Next')} className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600 enabled:hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-200"><TbChevronRight /></button>
                    </span>
                </nav>
            )}
        </div>
    )
}

export default ActivityFeed

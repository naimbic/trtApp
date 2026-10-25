/*! © 2026 TRT Digital — trtCRM. */
import { useMemo } from 'react'
import dayjs from 'dayjs'
import { TbNote, TbMessageCircle, TbListCheck, TbRepeat, TbAlertTriangle } from 'react-icons/tb'
import { People, STATUS, statusOf, statusPillStyle, prioOf, isOverdue } from './shared'
import { tr, trn } from '@/utils/t'

const startOf = (d) => dayjs(d).startOf('day')

/** Which group a task belongs to: Overdue, a day, or no date. */
function groupKey(t) {
    if (!t.dueDate) return 'none'
    const d = startOf(t.dueDate)
    if (t.status !== 5 && d.isBefore(startOf(new Date()))) return 'late'
    return d.format('YYYY-MM-DD')
}

const Row = ({ t, onOpen }) => {
    const st = statusOf(t.status)
    const late = isOverdue(t)
    const done = t.status === 5
    return (
        <button type="button" onClick={onOpen} className="group flex w-full items-center gap-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-left shadow-sm backdrop-blur transition hover:-translate-y-px hover:bg-white hover:shadow-md dark:border-gray-700/60 dark:bg-gray-800/70 dark:hover:bg-gray-800">
            <span className="h-11 w-1 shrink-0 rounded-full" style={{ background: late ? '#ef4444' : st.color }} />
            <div className="hidden w-[84px] shrink-0 sm:block">
                <div className={`text-sm font-extrabold tabular-nums ${late ? 'text-red-500' : ''}`}>{t.dueDate ? dayjs(t.dueDate).format('DD MMM') : '—'}</div>
                <div className={`text-xs font-semibold ${prioOf(t.priority).text}`}>{prioOf(t.priority).label}</div>
            </div>
            <div className="min-w-0 flex-1">
                <div className={`flex items-center gap-2 truncate text-[15px] font-bold ${done ? 'text-gray-400 line-through' : ''}`}>
                    <span className="truncate">{t.name}</span>
                    {late && <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-extrabold text-red-600 dark:bg-red-500/20"><TbAlertTriangle />{tr('{n} d late', { n: Math.max(1, startOf(new Date()).diff(startOf(t.dueDate), 'day')) })}</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">{t.code}</span>
                    {t.rel?.label && <span className="max-w-[240px] truncate font-semibold text-primary/80">{t.rel.label}</span>}
                    {t.checklistTotal > 0 && <span className="inline-flex items-center gap-1"><TbListCheck />{t.checklistDone}/{t.checklistTotal}</span>}
                    {t.comments > 0 && <span className="inline-flex items-center gap-1"><TbMessageCircle />{t.comments}</span>}
                    {t.recurring && <span className="inline-flex items-center gap-1"><TbRepeat />{tr('Repeats')}</span>}
                </div>
            </div>
            <span className="tpill hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold sm:inline-flex" style={statusPillStyle(t.status)}><i className="size-1.5 rounded-full" style={{ background: st.color }} />{st.label}</span>
            <div className="shrink-0"><People list={t.assignees} size={30} /></div>
        </button>
    )
}

/**
 * The task list as an agenda: tasks grouped by due day (Overdue first, then Today, Tomorrow, each weekday, and No date), each one a soft
 * rounded row with its status colour on the left, the date and priority, the title with its project, counts, status and people.
 */
const TaskAgenda = ({ tasks, notes = [], onOpen, onOpenNote }) => {
    const groups = useMemo(() => {
        const map = new Map()
        for (const t of tasks) { const k = groupKey(t); if (!map.has(k)) map.set(k, []); map.get(k).push(t) }
        const keys = [...map.keys()].sort((a, b) => (a === 'late' ? -1 : b === 'late' ? 1 : a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)))
        return keys.map((k) => ({ key: k, list: map.get(k).sort((x, y) => (k === 'late' ? +new Date(x.dueDate) - +new Date(y.dueDate) : 0) || (y.priority - x.priority) || x.name.localeCompare(y.name)) }))
    }, [tasks])
    const head = (k) => {
        if (k === 'late') return { big: tr('Overdue'), small: '', tone: 'text-red-500' }
        if (k === 'none') return { big: tr('No date'), small: '', tone: '' }
        const d = dayjs(k), today = startOf(new Date()), diff = d.diff(today, 'day')
        return { big: diff === 0 ? tr('Today') : diff === 1 ? tr('Tomorrow') : d.format('ddd'), small: d.format('MMMM D'), tone: diff === 0 ? 'text-primary' : '' }
    }
    const projects = new Set(tasks.map((t) => t.rel?.label).filter(Boolean)).size
    return (
        <div className="rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/30 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><h4 className="text-[22px] font-extrabold">{tr('Agenda')}</h4><div className="text-sm text-gray-500">{trn(tasks.length, 'task')}{projects > 0 && ` · ${trn(projects, 'project')}`}</div></div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    {STATUS.filter((s) => s.active).map((s) => <span key={s.value} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>)}
                </div>
            </div>
            {notes.length > 0 && (
                <section className="mb-6">
                    <h5 className="mb-2 flex items-baseline gap-2"><span className="text-lg font-extrabold">{tr('Notes')}</span><span className="text-sm font-normal text-gray-400">{trn(notes.length, 'note')}</span></h5>
                    <div className="space-y-2">
                        {notes.map((n) => (
                            <button key={n.id} type="button" onClick={() => onOpenNote(n)} className="flex w-full items-center gap-4 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-left shadow-sm transition hover:-translate-y-px hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
                                <span className="h-9 w-1 shrink-0 rounded-full bg-amber-400" /><TbNote className="shrink-0 text-xl text-amber-500" />
                                <div className="min-w-0 flex-1"><div className="truncate font-bold">{n.title}</div><div className="truncate text-xs text-gray-500">{n.description || ''}</div></div>
                                <span className="shrink-0 text-xs text-gray-400">{dayjs(n.createdAt).format('DD MMM')}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
            {groups.map(({ key, list }) => {
                const h = head(key)
                return (
                    <section key={key} className="mb-6 last:mb-0">
                        <h5 className="mb-2 flex items-baseline gap-2"><span className={`text-lg font-extrabold ${h.tone}`}>{h.big}</span>{h.small && <span className="text-sm font-normal text-gray-500">{h.small}</span>}<span className="text-sm font-normal text-gray-400">· {trn(list.length, 'task')}</span></h5>
                        <div className="space-y-2">{list.map((t) => <Row key={t.id} t={t} onOpen={() => onOpen(t.id)} />)}</div>
                    </section>
                )
            })}
            {!tasks.length && !notes.length && <div className="py-12 text-center text-gray-400">{tr('No tasks match')}</div>}
        </div>
    )
}

export default TaskAgenda

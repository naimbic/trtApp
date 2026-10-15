import { TbBug, TbSparkles, TbBulb, TbHelpCircle } from 'react-icons/tb'
import Tag from '@/components/ui/Tag'
import { tr } from '@/utils/t'

export const STATUS = [
    { value: 'open', label: tr('Open'), cls: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300', dot: 'bg-blue-500' },
    { value: 'in_progress', label: tr('In progress'), cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300', dot: 'bg-amber-500' },
    { value: 'in_review', label: tr('In review'), cls: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300', dot: 'bg-violet-500' },
    { value: 'resolved', label: tr('Resolved'), cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300', dot: 'bg-emerald-500' },
    { value: 'closed', label: tr('Closed'), cls: 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200', dot: 'bg-gray-400' },
]
export const PRIORITY = [
    { value: 'low', label: tr('Low'), cls: 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200' },
    { value: 'medium', label: tr('Medium'), cls: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
    { value: 'high', label: tr('High'), cls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300' },
    { value: 'critical', label: tr('Critical'), cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300' },
]
export const TYPE = [
    { value: 'bug', label: tr('Bug'), icon: <TbBug />, cls: 'text-red-500' },
    { value: 'improvement', label: tr('Improvement'), icon: <TbSparkles />, cls: 'text-sky-500' },
    { value: 'feature', label: tr('New feature'), icon: <TbBulb />, cls: 'text-violet-500' },
    { value: 'question', label: tr('Question'), icon: <TbHelpCircle />, cls: 'text-amber-500' },
]
export const KINDS = [
    { value: 'website', label: tr('Website') },
    { value: 'platform', label: tr('Platform') },
    { value: 'app', label: tr('App') },
    { value: 'other', label: tr('Other') },
]
const find = (list, v) => list.find((x) => x.value === v) || list[0]
export const statusOf = (v) => find(STATUS, v)
export const priorityOf = (v) => find(PRIORITY, v)
export const typeOf = (v) => find(TYPE, v)

export const StatusTag = ({ status }) => <Tag className={statusOf(status).cls}>{statusOf(status).label}</Tag>
export const PriorityTag = ({ priority }) => <Tag className={priorityOf(priority).cls}>{priorityOf(priority).label}</Tag>
export const TypeLabel = ({ type }) => { const t = typeOf(type); return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={`text-lg ${t.cls}`}>{t.icon}</span>{t.label}</span> }
export const Labels = ({ list = [] }) => (list.length ? <span className="inline-flex flex-wrap gap-1">{list.map((l) => <span key={l} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">{l}</span>)}</span> : null)

/** One line of the history of an issue. */
export const eventText = (m = {}) => {
    switch (m.field) {
        case 'created': return tr('opened the issue')
        case 'status': return tr('changed the status from {from} to {to}', { from: statusOf(m.from).label, to: statusOf(m.to).label })
        case 'priority': return tr('changed the priority from {from} to {to}', { from: priorityOf(m.from).label, to: priorityOf(m.to).label })
        case 'type': return tr('changed the type from {from} to {to}', { from: typeOf(m.from).label, to: typeOf(m.to).label })
        case 'title': return tr('renamed the issue to “{to}”', { to: m.to })
        case 'platform': return m.to ? tr('moved the issue to {to}', { to: m.to }) : tr('removed the platform')
        case 'dueDate': return m.to ? tr('set the due date to {to}', { to: m.to }) : tr('removed the due date')
        case 'labels': return m.to ? tr('set the labels to {to}', { to: m.to }) : tr('removed the labels')
        case 'assignees': return [m.added?.length ? tr('assigned {names}', { names: m.added.join(', ') }) : '', m.removed?.length ? tr('unassigned {names}', { names: m.removed.join(', ') }) : ''].filter(Boolean).join(' · ')
        default: return ''
    }
}

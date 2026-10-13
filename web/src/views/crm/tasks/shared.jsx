import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import dayjs from 'dayjs'

export const STATUS = [
    { value: 1, label: 'Not started', dot: 'bg-gray-400' },
    { value: 4, label: 'In progress', dot: 'bg-blue-500' },
    { value: 3, label: 'Testing', dot: 'bg-violet-500' },
    { value: 2, label: 'Awaiting feedback', dot: 'bg-amber-500' },
    { value: 5, label: 'Complete', dot: 'bg-emerald-500' },
]
export const PRIORITY = [
    { value: 1, label: 'Low', bar: 'bg-gray-300', text: 'text-gray-500' },
    { value: 2, label: 'Medium', bar: 'bg-blue-400', text: 'text-blue-600' },
    { value: 3, label: 'High', bar: 'bg-orange-500', text: 'text-orange-600' },
    { value: 4, label: 'Urgent', bar: 'bg-red-500', text: 'text-red-600' },
]
export const REL_TYPES = [
    { value: 'customer', label: 'Client', resource: 'clients' },
    { value: 'lead', label: 'Lead', resource: 'leads' },
    { value: 'project', label: 'Project', resource: 'projects' },
]
export const statusOf = (v) => STATUS.find((s) => s.value === +v) || STATUS[0]
export const prioOf = (v) => PRIORITY.find((p) => p.value === +v) || PRIORITY[1]
export const fmtDate = (d) => (d ? dayjs(d).format('DD MMM') : '')
export const isOverdue = (t) => t.dueDate && t.status !== 5 && dayjs(t.dueDate).endOf('day').isBefore(dayjs())
export const duration = (sec = 0) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m` }
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

export const People = ({ list = [], max = 3, size = 24 }) => {
    const shown = list.slice(0, max)
    return (
        <div className="flex -space-x-1.5">
            {shown.map((p) => <Tooltip key={p.id} title={p.name}><Avatar size={size} shape="circle" src={p.image || undefined} className="ring-2 ring-white dark:ring-gray-800">{initials(p.name)}</Avatar></Tooltip>)}
            {list.length > max && <Avatar size={size} shape="circle" className="ring-2 ring-white dark:ring-gray-800">+{list.length - max}</Avatar>}
        </div>
    )
}

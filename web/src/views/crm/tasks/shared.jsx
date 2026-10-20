import Avatar from '@/components/ui/Avatar'
import StaffRing from '@/components/crm/StaffRing'
import dayjs from 'dayjs'
import { tr } from '@/utils/t'

export const STATUS = [
    { value: 1, label: tr("Not started"), dot: 'bg-gray-400' },
    { value: 4, label: tr("In progress"), dot: 'bg-blue-500' },
    { value: 3, label: tr("Testing"), dot: 'bg-violet-500' },
    { value: 2, label: tr("Awaiting feedback"), dot: 'bg-amber-500' },
    { value: 5, label: tr("Complete"), dot: 'bg-emerald-500' },
]
export const PRIORITY = [
    { value: 1, label: tr("Low"), bar: 'bg-gray-300', text: "text-gray-500" },
    { value: 2, label: tr("Medium"), bar: 'bg-blue-400', text: "text-blue-600" },
    { value: 3, label: tr("High"), bar: 'bg-orange-500', text: "text-orange-600" },
    { value: 4, label: tr("Urgent"), bar: 'bg-red-500', text: "text-red-600" },
]
export const REL_TYPES = [
    { value: 'customer', label: tr("Client"), resource: 'clients' },
    { value: 'lead', label: tr("Lead"), resource: 'leads' },
    { value: 'project', label: tr("Project"), resource: 'projects' },
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
            {shown.map((p) => <StaffRing key={p.id} id={p.id} name={p.name} size={size}><Avatar size={size} shape="circle" src={p.image || undefined} className="ring-2 ring-white dark:ring-gray-800">{initials(p.name)}</Avatar></StaffRing>)}
            {list.length > max && <Avatar size={size} shape="circle" className="ring-2 ring-white dark:ring-gray-800">+{list.length - max}</Avatar>}
        </div>
    )
}

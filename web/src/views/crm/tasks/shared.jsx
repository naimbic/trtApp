import Avatar from '@/components/ui/Avatar'
import StaffRing from '@/components/crm/StaffRing'
import dayjs from 'dayjs'
import { create } from 'zustand'
import { tr } from '@/utils/t'

// The five status codes are fixed (they are stored on every task); each one can be renamed and recoloured in Settings -> Tasks.
// STATUS is changed in place when those settings arrive, and useTaskStatuses() makes a screen draw again when it happens.
const DEFAULT_STATUS = [
    { value: 1, label: tr("Not started"), color: '#9ca3af' },
    { value: 4, label: tr("In progress"), color: '#3b82f6' },
    { value: 3, label: tr("Testing"), color: '#8b5cf6' },
    { value: 2, label: tr("Awaiting feedback"), color: '#f59e0b' },
    { value: 5, label: tr("Complete"), color: '#10b981' },
]
export const STATUS = DEFAULT_STATUS.map((s) => ({ ...s, custom: false }))
const useStatusVersion = create(() => ({ v: 0 }))
export const applyTaskStatuses = (list = []) => {
    for (const s of list) {
        const t = STATUS.find((x) => x.value === +s.value), d = DEFAULT_STATUS.find((x) => x.value === +s.value)
        if (!t || !d) continue
        t.label = s.custom && s.name !== d.label ? s.name : d.label
        t.color = s.color || d.color
        t.custom = !!s.custom
    }
    useStatusVersion.setState((st) => ({ v: st.v + 1 }))
}
let statusLoad = null
export const loadTaskStatuses = (force = false) => {
    if (statusLoad && !force) return statusLoad
    statusLoad = fetch('/api/crm/work/task-statuses', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.statuses) applyTaskStatuses(d.statuses) }).catch(() => { statusLoad = null })
    return statusLoad
}
/** Call at the top of a screen that prints task statuses: loads the names and colours once and redraws when they arrive. */
export const useTaskStatuses = () => { useStatusVersion((s) => s.v); loadTaskStatuses() }
export const taskColorByName = (name) => STATUS.find((s) => s.label === name)?.color
/** A soft tint of a status colour (pills, chips). */
export const statusPillStyle = (v) => { const c = statusOf(v).color; return { background: `${c}26`, color: c } }
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

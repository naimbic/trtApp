import Avatar from '@/components/ui/Avatar'
import StaffRing from '@/components/crm/StaffRing'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { create } from 'zustand'
import { tr } from '@/utils/t'

// The five statuses that come with the app (codes 1-5, stored on every task) plus any added in Settings -> Tasks -> Statuses.
// STATUS is replaced in place when that list arrives, and useTaskStatuses() makes a screen draw again when it happens.
const DEFAULT_STATUS = [
    { value: 1, en: 'Not started', label: tr("Not started"), color: '#9ca3af' },
    { value: 4, en: 'In progress', label: tr("In progress"), color: '#3b82f6' },
    { value: 3, en: 'Testing', label: tr("Testing"), color: '#8b5cf6' },
    { value: 2, en: 'Awaiting feedback', label: tr("Awaiting feedback"), color: '#f59e0b' },
    { value: 5, en: 'Complete', label: tr("Complete"), color: '#10b981' },
]
export const STATUS = DEFAULT_STATUS.map((s) => ({ value: s.value, label: s.label, color: s.color, custom: false }))
const useStatusVersion = create(() => ({ v: 0 }))
export const applyTaskStatuses = (list = []) => {
    if (!list.length) return
    STATUS.splice(0, STATUS.length, ...list.map((s) => {
        const d = DEFAULT_STATUS.find((x) => x.value === +s.value)
        return { value: +s.value, label: d && s.name === d.en ? d.label : s.name, color: s.color || d?.color || '#9ca3af', custom: !d || !!s.custom }
    }))
    useStatusVersion.setState((st) => ({ v: st.v + 1 }))
}
export const loadTaskStatuses = () => fetch('/api/crm/work/task-statuses', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.statuses) applyTaskStatuses(d.statuses) }).catch(() => {})
/** Call at the top of a screen that prints task statuses: reads the list when the screen opens and redraws when it arrives. */
export const useTaskStatuses = () => { useStatusVersion((s) => s.v); useEffect(() => { loadTaskStatuses() }, []) }
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

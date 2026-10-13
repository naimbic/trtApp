import Progress from '@/components/ui/Progress'
import Tag from '@/components/ui/Tag'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { api } from '../kit/api'

export const STATUS = [
    { value: 1, label: 'Not started', cls: 'border-gray-400 text-gray-500' },
    { value: 2, label: 'In progress', cls: 'border-blue-500 text-blue-600' },
    { value: 3, label: 'On hold', cls: 'border-amber-500 text-amber-600' },
    { value: 4, label: 'Finished', cls: 'border-emerald-500 text-emerald-600' },
    { value: 5, label: 'Cancelled', cls: 'border-red-400 text-red-500' },
]
export const BILLING = [{ value: 1, label: 'Fixed rate' }, { value: 2, label: 'Project hours' }, { value: 3, label: 'Task hours' }]
export const statusOf = (v) => STATUS.find((s) => s.value === +v) || STATUS[0]
export const StatusTag = ({ status }) => <Tag className={`rounded-full border-2 bg-transparent dark:bg-transparent ${statusOf(status).cls}`}>{statusOf(status).label}</Tag>
export const fmt = (d, f = 'DD MMM YYYY') => (d ? dayjs(d).format(f) : '—')
export const hours = (sec = 0) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return `${h}h ${String(m).padStart(2, '0')}m` }

export const Bar = ({ value = 0 }) => <Progress size="sm" percent={value} customColorClass={value > 70 ? 'bg-success' : value < 40 ? 'bg-error' : 'bg-amber-400'} />

export const useStaff = () => {
    const [staff, setStaff] = useState([])
    useEffect(() => { api('/api/crm/work/tasks/lookups').then((l) => setStaff(l.staff)).catch(() => {}) }, [])
    return staff
}

import Tag from '@/components/ui/Tag'
import Progress from '@/components/ui/Progress'
import dayjs from 'dayjs'

const TONE = {
    Paid: 'bg-emerald-100 text-emerald-700', Accepted: 'bg-emerald-100 text-emerald-700', Finished: 'bg-emerald-100 text-emerald-700', Complete: 'bg-emerald-100 text-emerald-700',
    Unpaid: 'bg-amber-100 text-amber-700', 'Partially paid': 'bg-sky-100 text-sky-700', Overdue: 'bg-red-100 text-red-700', Sent: 'bg-blue-100 text-blue-700', Open: 'bg-blue-100 text-blue-700', Revised: 'bg-purple-100 text-purple-700',
    Declined: 'bg-red-100 text-red-700', Cancelled: 'bg-gray-200 text-gray-600', Expired: 'bg-gray-200 text-gray-600', 'In progress': 'bg-sky-100 text-sky-700', 'On hold': 'bg-amber-100 text-amber-700', 'Not started': 'bg-gray-100 text-gray-600',
}
export const StatusTag = ({ label }) => <Tag className={`whitespace-nowrap ${TONE[label] || 'bg-gray-100 text-gray-600'}`}>{label}</Tag>
export const date = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '—')
export const Bar = ({ value = 0 }) => <Progress size="sm" percent={value} customColorClass={value > 70 ? 'bg-success' : value < 40 ? 'bg-error' : 'bg-amber-400'} />
export const Empty = ({ children }) => <p className="py-8 text-center text-gray-500">{children}</p>

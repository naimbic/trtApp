import Tag from '@/components/ui/Tag'

export const STATUS = {
    1: { label: 'Unpaid', cls: 'bg-amber-100 text-amber-700' },
    2: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
    3: { label: 'Partially paid', cls: 'bg-blue-100 text-blue-700' },
    4: { label: 'Overdue', cls: 'bg-red-100 text-red-700' },
    5: { label: 'Cancelled', cls: 'bg-gray-200 text-gray-600' },
    6: { label: 'Draft', cls: 'bg-gray-200 text-gray-600' },
}
export const StatusTag = ({ status }) => <Tag className={STATUS[status]?.cls}>{STATUS[status]?.label || status}</Tag>
export const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

export const ESTIMATE_STATUS = {
    1: { label: 'Draft', cls: 'bg-gray-200 text-gray-600' },
    2: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
    3: { label: 'Declined', cls: 'bg-red-100 text-red-700' },
    4: { label: 'Accepted', cls: 'bg-emerald-100 text-emerald-700' },
    5: { label: 'Expired', cls: 'bg-amber-100 text-amber-700' },
}
export const EstimateStatusTag = ({ status }) => <Tag className={ESTIMATE_STATUS[status]?.cls}>{ESTIMATE_STATUS[status]?.label || status}</Tag>

export const PO_STATUS = {
    1: { label: 'Draft', cls: 'bg-gray-200 text-gray-600' },
    2: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
    3: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
    4: { label: 'Delivered', cls: 'bg-teal-100 text-teal-700' },
    5: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
}
export const PoStatusTag = ({ status }) => <Tag className={PO_STATUS[status]?.cls}>{PO_STATUS[status]?.label || status}</Tag>

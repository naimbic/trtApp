import Tag from '@/components/ui/Tag'
import { useSessionUser } from '@/store/authStore'
import { tr } from '@/utils/t'

export const STATUS = {
    1: { label: tr("Unpaid"), cls: 'bg-amber-100 text-amber-700' },
    2: { label: tr("Paid"), cls: 'bg-emerald-100 text-emerald-700' },
    3: { label: tr("Partially paid"), cls: 'bg-blue-100 text-blue-700' },
    4: { label: tr("Overdue"), cls: 'bg-red-100 text-red-700' },
    5: { label: tr("Cancelled"), cls: 'bg-gray-200 text-gray-600' },
    6: { label: tr("Draft"), cls: 'bg-gray-200 text-gray-600' },
}
export const StatusTag = ({ status }) => <Tag className={STATUS[status]?.cls}>{STATUS[status]?.label || status}</Tag>
export const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

export const ESTIMATE_STATUS = {
    1: { label: tr("Draft"), cls: 'bg-gray-200 text-gray-600' },
    2: { label: tr("Sent"), cls: 'bg-blue-100 text-blue-700' },
    3: { label: tr("Declined"), cls: 'bg-red-100 text-red-700' },
    4: { label: tr("Accepted"), cls: 'bg-emerald-100 text-emerald-700' },
    5: { label: tr("Expired"), cls: 'bg-amber-100 text-amber-700' },
}
export const EstimateStatusTag = ({ status }) => <Tag className={ESTIMATE_STATUS[status]?.cls}>{ESTIMATE_STATUS[status]?.label || status}</Tag>

export const PO_STATUS = {
    1: { label: tr("Draft"), cls: 'bg-gray-200 text-gray-600' },
    2: { label: tr("Sent"), cls: 'bg-blue-100 text-blue-700' },
    3: { label: tr("Confirmed"), cls: 'bg-emerald-100 text-emerald-700' },
    4: { label: tr("Delivered"), cls: 'bg-teal-100 text-teal-700' },
    5: { label: tr("Cancelled"), cls: 'bg-red-100 text-red-700' },
}
export const PoStatusTag = ({ status }) => <Tag className={PO_STATUS[status]?.cls}>{PO_STATUS[status]?.label || status}</Tag>

export const PROPOSAL_STATUS = {
    6: { label: tr("Draft"), cls: 'bg-gray-200 text-gray-600' },
    1: { label: tr("Open"), cls: 'bg-sky-100 text-sky-700' },
    4: { label: tr("Sent"), cls: 'bg-blue-100 text-blue-700' },
    5: { label: tr("Revised"), cls: 'bg-violet-100 text-violet-700' },
    3: { label: tr("Accepted"), cls: 'bg-emerald-100 text-emerald-700' },
    2: { label: tr("Declined"), cls: 'bg-red-100 text-red-700' },
    7: { label: tr("Expired"), cls: 'bg-amber-100 text-amber-700' },
}
export const ProposalStatusTag = ({ status }) => <Tag className={PROPOSAL_STATUS[status]?.cls}>{PROPOSAL_STATUS[status]?.label || status}</Tag>

/** Administrators and super admins can type the number of a document themselves (empty on a new one = the next number). */
export const NumberField = ({ value, onChange }) => {
    const authority = useSessionUser((x) => x.user.authority) || []
    if (!(authority.includes('admin') || authority.includes('crm.admin'))) return null
    return (
        <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{tr("Number")}</span>
            <input type="number" min={1} placeholder={tr("auto")} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="h-9 w-28 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
        </label>
    )
}

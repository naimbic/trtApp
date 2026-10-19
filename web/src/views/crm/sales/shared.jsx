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

const prefixOf = (p) => (/\s-$/.test(p || '') ? `${p} ` : p || '')
/** What stands around the typed number for the chosen format: before / after, for example "FA - " [0089] " - 09 - 26". */
const around = ({ prefix, format, date }) => {
    const [y, m] = String(date || new Date().toISOString()).slice(0, 10).split('-')
    const yyyy = y || String(new Date().getFullYear()), mm = m || '01', yy = yyyy.slice(2)
    const pre = prefixOf(prefix)
    switch (Number(format)) {
        case 2: return [`${pre}${yyyy}-`, '']
        case 3: return [pre, `-${yy}`]
        case 4: return [pre, `-${mm}-${yyyy}`]
        default: return [pre, '']
    }
}

/**
 * The number of a document as it will read, for example #FA - [0089] - 09 - 26: the prefix and the month / year follow the settings and the
 * document date, the number in the middle is typed by administrators and super admins (empty on a new document = the next number).
 */
export const NumberField = ({ value, onChange, prefix, format, padding = 6, date, label = true }) => {
    const authority = useSessionUser((x) => x.user.authority) || []
    const admin = authority.includes('admin') || authority.includes('crm.admin')
    const [before, after] = around({ prefix, format, date })
    const shown = value === '' || value === undefined || value === null ? '' : String(value).padStart(padding, '0')
    const frame = 'flex h-11 items-center rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'
    if (!admin && !prefix) return null
    return (
        <div>
            {label && <label className="form-label mb-1 block">{tr("Number")}</label>}
            <div className={frame}>
                <span className="whitespace-pre text-gray-400">#{before}</span>
                {admin ? (
                    <input type="number" min={1} placeholder={'-'.repeat(Math.min(padding, 4))} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mx-1 w-20 rounded-md bg-gray-100 px-1.5 py-0.5 text-center font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700" aria-label={tr("Number")} />
                ) : <span className="mx-1 font-bold tabular-nums">{shown || '----'}</span>}
                <span className="whitespace-pre text-gray-400">{after}</span>
            </div>
        </div>
    )
}

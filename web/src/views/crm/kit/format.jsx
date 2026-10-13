import dayjs from 'dayjs'
import Tag from '@/components/ui/Tag'

const TAG = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-gray-200 text-gray-700',
}

export const money = (v, d = 2) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }))
let padding = 6
/** Set from the CRM `number_padding_prefixes` option once the lookups have loaded. */
export const setDocPadding = (n) => { if (n > 0) padding = n }
/** Perfex sales_number_format: formats 1-4, drafts show as <prefix>DRAFT. */
export const docNumber = (r) => {
    const pre = r.prefix || ''
    if (r.status === 6 && 'sent' in r) return `${pre}DRAFT`
    const p = String(r.number ?? 0).padStart(padding, '0')
    const d = r.date ? new Date(r.date) : new Date()
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    switch (Number(r.numberFormat)) {
        case 2: return `${pre}${yyyy}/${p}`
        case 3: return `${pre}${p}-${String(yyyy).slice(2)}`
        case 4: return `${pre}${p}/${mm}/${yyyy}`
        default: return `${pre}${p}`
    }
}
export const optionLabel = (field, value) => field.options?.find((o) => String(o.value) === String(value))?.label ?? value

/** Renders one cell for a column config. `row._rel` carries labels of relation columns. */
export function renderCell(col, row, resource) {
    const v = row[col.key]
    if (col.format === 'documentNumber') return docNumber(row)
    switch (col.type) {
        case 'boolean':
            return <Tag className={v ? TAG.green : TAG.gray}>{v ? 'Yes' : 'No'}</Tag>
        case 'select': {
            if (v === null || v === undefined) return ''
            const color = resource?.statusColors?.[v] ?? resource?.statusColors?.[String(v)]
            const label = optionLabel(col, v)
            return color || col.badge ? <Tag className={TAG[color] || TAG.gray}>{label}</Tag> : label
        }
        case 'money':
            return <span className="tabular-nums">{money(v)}</span>
        case 'number':
            return v ?? ''
        case 'date':
            return v ? dayjs(v).format('YYYY-MM-DD') : ''
        case 'datetime':
            return v ? dayjs(v).format('YYYY-MM-DD HH:mm') : ''
        case 'relation':
            return row._rel?.[col.key] ?? (v ? '…' : '')
        case 'multiselect':
        case 'tags':
            return Array.isArray(v) ? v.map((t) => <Tag key={t} className="mr-1">{t}</Tag>) : ''
        case 'color':
            return v ? <span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border" style={{ background: v }} />{v}</span> : ''
        case 'json':
            return v ? <code className="text-xs">{typeof v === 'string' ? v.slice(0, 60) : JSON.stringify(v).slice(0, 60)}</code> : ''
        default:
            return v === null || v === undefined ? '' : String(v).length > 90 ? `${String(v).slice(0, 90)}…` : String(v)
    }
}

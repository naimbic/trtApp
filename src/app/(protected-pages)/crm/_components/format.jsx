import dayjs from 'dayjs'
import Tag from '@/components/ui/Tag'

const TAG_COLORS = {
    green: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    red: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
    amber: 'bg-amber-200 dark:bg-amber-200 text-gray-900 dark:text-gray-900',
    blue: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    gray: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
}

export const optionLabel = (field, value) => {
    const o = field.options?.find((x) => String(x.value) === String(value))
    return o ? o.label : value
}

export const formatMoney = (v) =>
    v === null || v === undefined || v === ''
        ? ''
        : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Plain-text/JSX rendering of one cell value according to its column type. */
export const renderValue = (col, row, resource) => {
    const v = row[col.key]
    switch (col.type) {
        case 'boolean':
            return (
                <Tag className={v ? TAG_COLORS.green : TAG_COLORS.gray}>
                    {v ? 'Yes' : 'No'}
                </Tag>
            )
        case 'select': {
            if (v === null || v === undefined) return ''
            const color = resource?.statusColors?.[v] || resource?.statusColors?.[String(v)]
            const label = optionLabel(col, v)
            return color || col.badge ? (
                <Tag className={TAG_COLORS[color] || TAG_COLORS.gray}>{label}</Tag>
            ) : (
                label
            )
        }
        case 'money':
            return formatMoney(v)
        case 'date':
            return v ? dayjs(v).format('YYYY-MM-DD') : ''
        case 'datetime':
            return v ? dayjs(v).format('YYYY-MM-DD HH:mm') : ''
        case 'relation':
            return row._rel?.[col.key] ?? (v ? '…' : '')
        case 'multiselect':
        case 'tags':
            return Array.isArray(v) ? v.join(', ') : ''
        case 'color':
            return v ? (
                <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full border" style={{ background: v }} />
                    {v}
                </span>
            ) : ''
        case 'json':
            return v ? JSON.stringify(v).slice(0, 60) : ''
        case 'richtext':
        case 'textarea':
            return v ? String(v).replace(/<[^>]*>/g, '').slice(0, 80) : ''
        default:
            return v === null || v === undefined ? '' : String(v)
    }
}

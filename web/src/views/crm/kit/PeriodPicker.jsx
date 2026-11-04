/*! © 2026 TRT Digital — trtCRM. */
import dayjs from 'dayjs'
import Segment from '@/components/ui/Segment'
import Input from '@/components/ui/Input'
import { tr } from '@/utils/t'

export const PERIODS = [['month', tr('This month')], ['lastmonth', tr('Last month')], ['year', tr('This year')], ['all', tr('All time')], ['custom', tr('Custom')]]

/** The period as { from, to } (YYYY-MM-DD, or '' for no limit) for a preset or a custom range. */
export function periodRange(p) {
    const today = dayjs()
    if (p.preset === 'month') return { from: today.startOf('month').format('YYYY-MM-DD'), to: today.endOf('month').format('YYYY-MM-DD') }
    if (p.preset === 'lastmonth') { const m = today.subtract(1, 'month'); return { from: m.startOf('month').format('YYYY-MM-DD'), to: m.endOf('month').format('YYYY-MM-DD') } }
    if (p.preset === 'year') return { from: today.startOf('year').format('YYYY-MM-DD'), to: today.endOf('year').format('YYYY-MM-DD') }
    if (p.preset === 'custom') return { from: p.from || '', to: p.to || '' }
    return { from: '', to: '' }
}

/** Choose the period of a list: this month (by default), last month, this year, all time, or two dates. */
const PeriodPicker = ({ value, onChange }) => (
    <div className="flex flex-wrap items-center gap-2">
        <Segment size="sm" value={value.preset} onChange={(v) => onChange({ ...value, preset: Array.isArray(v) ? v[0] || value.preset : v || value.preset })}>{PERIODS.map(([k, l]) => <Segment.Item key={k} value={k}>{l}</Segment.Item>)}</Segment>
        {value.preset === 'custom' && (
            <div className="flex items-center gap-1.5">
                <Input size="sm" type="date" className="w-36" value={value.from || ''} onChange={(e) => onChange({ ...value, from: e.target.value })} />
                <span className="text-gray-400">→</span>
                <Input size="sm" type="date" className="w-36" value={value.to || ''} onChange={(e) => onChange({ ...value, to: e.target.value })} />
            </div>
        )}
    </div>
)

export default PeriodPicker

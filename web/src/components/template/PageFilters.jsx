import dayjs from 'dayjs'
import Segment from '@/components/ui/Segment'
import DatePicker from '@/components/ui/DatePicker'
import { PAGE_PRESETS, PAGE_FILTERS, usePageFilters, resolveRange } from '@/store/pageFilterStore'

/** Same date filter as the dashboard, for every list and report that filters by date. */
const PageFilters = ({ pathname }) => {
    const cfg = PAGE_FILTERS[pathname]
    const page = usePageFilters((s) => s.pages[cfg?.key])
    const { setRange, setCustom } = usePageFilters()
    if (!cfg) return null
    const range = page?.range || cfg.default || 'all'
    const value = range === 'custom' ? resolveRange('custom', page?.from, page?.to).filter(Boolean) : undefined
    return (
        <div className="flex max-w-full items-center gap-3 overflow-x-auto py-1" aria-label={cfg.label}>
            <span className="hidden shrink-0 text-xs font-semibold uppercase text-gray-400 xl:block">{cfg.label}</span>
            <Segment size="sm" value={range === 'custom' ? '' : range} onChange={(v) => v && setRange(cfg.key, v)}>
                {PAGE_PRESETS.map(([key, label]) => <Segment.Item key={key} value={key}>{label}</Segment.Item>)}
            </Segment>
            <div className="w-[15.5rem] shrink-0">
                <DatePicker.DatePickerRange size="sm" clearable={false} placeholder="Custom range" inputFormat="DD MMM YYYY" separator="→" value={value && value.length === 2 ? value : undefined}
                    onChange={(vals) => { if (Array.isArray(vals) && vals[0] && vals[1]) setCustom(cfg.key, dayjs(vals[0]).format('YYYY-MM-DD'), dayjs(vals[1]).format('YYYY-MM-DD')) }} />
            </div>
        </div>
    )
}

export default PageFilters

import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import Segment from '@/components/ui/Segment'
import DatePicker from '@/components/ui/DatePicker'
import { PiPaletteDuotone, PiCoinsDuotone, PiGlobeDuotone } from 'react-icons/pi'
import HoverPicker from './HoverPicker'
import { useDashFilters, ACCENTS } from '@/store/dashFilterStore'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

const PRESETS = [
    ['today', tr("Today")],
    ['7d', '7D'],
    ['30d', '30D'],
    ['month', tr("Month")],
    ['lastmonth', tr("Last month")],
    ['year', tr("Year")],
    ['12m', '12M'],
]

const Group = ({ children, className }) => (
    <div className={classNames('flex shrink-0 items-center gap-2', className)}>{children}</div>
)
const Divider = () => <span className="hidden h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-600 md:block" />

/** Date range, currency and colour filters shown in the top bar on the dashboard (template components only). */
const DashboardFilters = ({ stacked = false }) => {
    const { range, from, to, currencyId, accent, currencies, setRange, setCustom, setCurrency, setAccent } = useDashFilters()
    // ALL adds currencies together with the rate saved on each one: say which ones have none
    const [noRate, setNoRate] = useState([])
    const several = currencies.length > 1
    useEffect(() => {
        if (!several) return
        fetch('/api/crm/currencies?pageSize=100', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
            const rows = j?.list || j?.data || []
            setNoRate(rows.filter((c) => !c.isDefault && !(Number(c.rate) > 0)).map((c) => c.name))
        }).catch(() => {})
    }, [several, currencyId])
    const customValue = range === 'custom' && from && to ? [new Date(`${from}T00:00:00`), new Date(`${to}T00:00:00`)] : undefined

    return (
        <div className={stacked ? 'flex flex-col items-stretch gap-3 px-4 py-3' : 'flex min-w-0 max-w-full items-center gap-3 py-1'} aria-label={tr("Dashboard filters")}>
            <div className={stacked ? 'flex min-w-0 flex-col gap-2' : 'flex min-w-0 items-center gap-2 overflow-x-auto'}>
                <div className={stacked ? 'overflow-x-auto [&_button]:whitespace-nowrap' : undefined}><Segment size="sm" value={range === 'custom' ? '' : range} onChange={(v) => v && setRange(v)}>
                    {PRESETS.map(([key, label]) => (
                        <Segment.Item key={key} value={key}>{label}</Segment.Item>
                    ))}
                </Segment></div>
                <div className={stacked ? 'w-full' : 'w-[15.5rem]'}>
                    <DatePicker.DatePickerRange
                        size="sm"
                        clearable={false}
                        placeholder={tr("Custom range")}
                        inputFormat="DD MMM YYYY"
                        separator="→"
                        maxDate={new Date()}
                        value={customValue}
                        onChange={(vals) => {
                            if (Array.isArray(vals) && vals[0] && vals[1]) {
                                setCustom({ from: dayjs(vals[0]).format('YYYY-MM-DD'), to: dayjs(vals[1]).format('YYYY-MM-DD') })
                            }
                        }}
                    />
                </div>
            </div>

            <div className={stacked ? 'flex items-center gap-5' : 'contents'}>
                {currencies.length > 1 && (
                    <>
                        {!stacked && <Divider />}
                        <HoverPicker
                            label={tr("Currency")}
                            lead={<PiCoinsDuotone className="text-lg text-gray-400" />}
                            value={currencyId || ''}
                            onChange={setCurrency}
                            items={currencies.map((c) => (c.id === 'all'
                                ? { key: 'all', label: noRate.length ? tr("All currencies in the base currency. No rate for {n}: left out (set it in Settings → Currencies)", { n: noRate.join(', ') }) : tr("All currencies, converted into the base currency"), node: <span className="inline-flex items-center gap-1"><PiGlobeDuotone className="text-base" />{tr("ALL")}{noRate.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}</span> }
                                : { key: c.id, label: c.name, node: c.name }))}
                        />
                    </>
                )}

                {!stacked && <Divider />}
                <HoverPicker
                    label={tr("Colour")}
                    lead={<PiPaletteDuotone className="text-lg text-gray-400" />}
                    value={accent}
                    onChange={setAccent}
                    items={ACCENTS.map((a) => ({ key: a.key, label: tr(a.label), node: <span className="block h-4 w-4 rounded-full ring-2 ring-white/70 dark:ring-gray-800" style={{ background: a.hex }} /> }))}
                />
            </div>
        </div>
    )
}

export default DashboardFilters

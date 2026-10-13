import dayjs from 'dayjs'
import Segment from '@/components/ui/Segment'
import DatePicker from '@/components/ui/DatePicker'
import Tooltip from '@/components/ui/Tooltip'
import { PiPaletteDuotone } from 'react-icons/pi'
import { useDashFilters, ACCENTS } from '@/store/dashFilterStore'
import classNames from '@/utils/classNames'

const PRESETS = [
    ['today', 'Today'],
    ['7d', '7D'],
    ['30d', '30D'],
    ['month', 'Month'],
    ['lastmonth', 'Last month'],
    ['year', 'Year'],
    ['12m', '12M'],
]

const Group = ({ children, className }) => (
    <div className={classNames('flex shrink-0 items-center gap-2', className)}>{children}</div>
)
const Divider = () => <span className="hidden h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-600 md:block" />

/** Date range, currency and colour filters shown in the top bar on the dashboard (template components only). */
const DashboardFilters = () => {
    const { range, from, to, currencyId, accent, currencies, setRange, setCustom, setCurrency, setAccent } = useDashFilters()
    const customValue = range === 'custom' && from && to ? [new Date(`${from}T00:00:00`), new Date(`${to}T00:00:00`)] : undefined

    return (
        <div className="flex max-w-full items-center gap-3 overflow-x-auto py-1" aria-label="Dashboard filters">
            <Group>
                <Segment size="sm" value={range === 'custom' ? '' : range} onChange={(v) => v && setRange(v)}>
                    {PRESETS.map(([key, label]) => (
                        <Segment.Item key={key} value={key}>{label}</Segment.Item>
                    ))}
                </Segment>
                <div className="w-[15.5rem]">
                    <DatePicker.DatePickerRange
                        size="sm"
                        clearable={false}
                        placeholder="Custom range"
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
            </Group>

            {currencies.length > 1 && (
                <>
                    <Divider />
                    <Group>
                        <Segment size="sm" value={currencyId || ''} onChange={(v) => v && setCurrency(v)}>
                            {currencies.map((c) => (
                                <Segment.Item key={c.id} value={c.id}>{c.name}</Segment.Item>
                            ))}
                        </Segment>
                    </Group>
                </>
            )}

            <Divider />
            <Group className="rounded-full border border-gray-200 px-2.5 py-1.5 dark:border-gray-600" aria-label="Colour">
                <PiPaletteDuotone className="text-lg text-gray-400" />
                {ACCENTS.map((a) => (
                    <Tooltip key={a.key} title={a.label}>
                        <button
                            type="button"
                            aria-label={a.label}
                            aria-pressed={accent === a.key}
                            onClick={() => setAccent(a.key)}
                            className={classNames(
                                'h-4 w-4 rounded-full transition-transform hover:scale-110',
                                accent === a.key && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800',
                            )}
                            style={{ background: a.hex, '--tw-ring-color': a.hex }}
                        />
                    </Tooltip>
                ))}
            </Group>
        </div>
    )
}

export default DashboardFilters

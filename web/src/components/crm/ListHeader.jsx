import Segment from '@/components/ui/Segment'
import cn from '@/utils/classNames'
import { Delta } from '@/views/crm/kit/widgets'

/** The pastel figure tile used on every list (same look as the template dashboards). */
export const StatTile = ({ title, value, sub, icon, className, change }) => (
    <div className={cn('flex items-center justify-between gap-3 rounded-2xl px-4 py-3', className)}>
        <div className="min-w-0"><div className="text-sm font-bold text-gray-900">{title}</div><h4 className="truncate text-gray-900">{value ?? '–'}</h4>{change && <div className="mt-0.5"><Delta {...change} /></div>}{sub && <div className="truncate text-xs text-gray-700">{sub}</div>}</div>
        {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xl text-white">{icon}</div>}
    </div>
)

export const TileGrid = ({ children, cols = 4 }) => <div className={cn('mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2', cols === 4 ? 'xl:grid-cols-4' : cols === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-3')}>{children}</div>

/** Status chips with counts; click one to filter, click again to clear. */
export const StatusPills = ({ order, labels, counts = {}, value, onChange, dots, inline }) => (
    <div className={cn('flex flex-wrap items-center gap-1.5', inline ? 'min-w-0 flex-1 justify-center' : 'mb-3')}>
        {order.map((s) => (
            <button key={s} type="button" onClick={() => onChange(value === s ? null : s)} className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors', value === s ? 'bg-primary/10 text-primary ring-1 ring-primary' : 'bg-gray-100 text-gray-600 hover:text-primary dark:bg-gray-700 dark:text-gray-300')}>
                {dots?.[s] && <span className="h-2 w-2 rounded-full" style={{ background: dots[s] }} />}{labels[s]}
                <span className={cn('rounded-md px-1.5 text-xs', value === s ? 'bg-primary/20' : 'bg-white text-gray-500 dark:bg-gray-600')}>{counts[s] || 0}</span>
            </button>
        ))}
    </div>
)

export const CurrencySwitch = ({ currencies, value, onChange, names }) => (currencies.length > 1 ? <div className="mb-4"><Segment size="sm" value={value} onChange={(v) => v && onChange(v)}>{currencies.map((k) => <Segment.Item key={k} value={k}>{names(k)}</Segment.Item>)}</Segment></div> : null)

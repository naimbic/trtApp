import { TbChevronDown } from 'react-icons/tb'

/**
 * A foldable group of rows with a coloured dot, a title, a count and a side note: the look of the list pages (reminders, events, leave...).
 * `right` is a control shown at the top right of the header (a switch, a button); a card without `onToggle` has no arrow:
 * it is opened and closed by its control (a section that exists only when its switch is on).
 */
const AccordionCard = ({ title, dot = '#9ca3af', count, note, open, onToggle, tone = '', right, children }) => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center transition hover:bg-gray-50 dark:hover:bg-gray-700/40">
            <button type="button" aria-expanded={open} disabled={!onToggle} onClick={onToggle} className={`flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2 text-start ${onToggle ? '' : 'cursor-default'}`}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: dot }} />
                <span className={`shrink-0 font-semibold heading-text ${tone}`}>{title}</span>
                {count !== undefined && <span className="rounded-full bg-gray-100 px-2 text-xs font-bold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">{count}</span>}
                {note && <span className="truncate text-xs text-gray-400">{note}</span>}
                <span className="flex-1" />
                {onToggle && <TbChevronDown className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
            </button>
            {right && <span className="flex shrink-0 items-center pe-4">{right}</span>}
        </div>
        {open && children && <div className="border-t border-gray-100 dark:border-gray-700">{children}</div>}
    </div>
)

export default AccordionCard

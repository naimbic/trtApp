import { TbChevronDown } from 'react-icons/tb'

/** Each section has its own colour (header tint, border and icon badge) so the groups are told apart at a glance. */
const TONES = {
    blue: { box: 'border-blue-200 dark:border-blue-500/30', head: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20', badge: 'bg-blue-500 text-white' },
    emerald: { box: 'border-emerald-200 dark:border-emerald-500/30', head: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20', badge: 'bg-emerald-500 text-white' },
    amber: { box: 'border-amber-200 dark:border-amber-500/30', head: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20', badge: 'bg-amber-500 text-white' },
    rose: { box: 'border-rose-200 dark:border-rose-500/30', head: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20', badge: 'bg-rose-500 text-white' },
    violet: { box: 'border-violet-200 dark:border-violet-500/30', head: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20', badge: 'bg-violet-500 text-white' },
}

/** One foldable group of fields of the profile: coloured icon, title, a one-line summary while closed, and the fields when open. */
const FoldSection = ({ icon, tone = 'blue', title, summary, open, onToggle, children }) => {
    const c = TONES[tone]
    return (
        <div className={`overflow-hidden rounded-xl border ${c.box}`}>
            <button type="button" aria-expanded={open} onClick={onToggle} className={`flex w-full items-center gap-2.5 px-3 py-2 text-start transition ${c.head}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base ${c.badge}`}>{icon}</span>
                <span className="shrink-0 text-sm font-semibold heading-text">{title}</span>
                {!open && summary && <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{summary}</span>}
                <span className="flex-1" />
                <TbChevronDown className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="p-3">{children}</div>}
        </div>
    )
}

export default FoldSection

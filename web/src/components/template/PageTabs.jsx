import { usePageTabsStore } from '@/store/pageTabsStore'
import classNames from '@/utils/classNames'

/** The current page's tabs, shown in the top bar (same look as the period chips). */
const PageTabs = () => {
    const { tabs, active, onChange } = usePageTabsStore()
    if (!tabs) return null
    return (
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-700">
            {tabs.map((t) => (
                <button
                    key={t.key}
                    type="button"
                    onClick={() => onChange?.(t.key)}
                    className={classNames('flex h-8 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors', active === t.key ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100')}
                >
                    {t.icon}{t.label}
                    {t.count !== undefined && <span className={classNames('rounded-full px-1.5 text-xs', active === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500 dark:bg-gray-600')}>{t.count}</span>}
                </button>
            ))}
        </div>
    )
}

export default PageTabs

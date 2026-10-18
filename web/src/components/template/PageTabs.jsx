import { useId } from 'react'
import { motion } from 'framer-motion'
import { usePageTabsStore } from '@/store/pageTabsStore'
import classNames from '@/utils/classNames'

/** The current page's tabs, shown in the top bar: the same pill track as every other set of tabs. */
const PageTabs = () => {
    const { tabs, active, onChange } = usePageTabsStore()
    const barId = useId()
    if (!tabs) return null
    return (
        <div className="tab-list tab-list-pill" role="tablist">
            {tabs.map((t) => {
                const on = active === t.key
                return (
                    <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => onChange?.(t.key)} className={classNames('tab-nav', on && 'tab-nav-active')}>
                        {on && <motion.span layoutId={`tab-bg-${barId}`} className="tab-nav-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                        <span className="tab-nav-text">{t.icon}{t.label}{t.count !== undefined && <em className="tab-nav-count">{t.count}</em>}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default PageTabs

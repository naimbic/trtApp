import { Link } from 'react-router'
import Card from '@/components/ui/Card'
import { TbTrendingUp, TbTrendingDown, TbMinus } from 'react-icons/tb'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

// Small building blocks shared by the dashboards and the scrum board.
export const TONES = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', red: 'bg-red-100 text-red-600 dark:bg-red-500/20', amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20', violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', teal: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20',
}

/** Change against the previous period, in percent (null when there is nothing to compare with). */
export const pctChange = (cur, prev) => {
    const c = Number(cur), p = Number(prev)
    if (!Number.isFinite(c) || !Number.isFinite(p)) return null
    if (p === 0) return c === 0 ? 0 : c > 0 ? 100 : -100 // nothing before: shown as +100% rather than a word
    return Math.round(((c - p) / Math.abs(p)) * 1000) / 10
}

/** The `change` of a money tile from the server's trend ({ cur, prev } per currency and figure, last 30 days against the 30 before). */
export const moneyChange = (trend, currencyId, metric, goodUp = true) => {
    if (!trend?.cur) return undefined
    const key = currencyId || 'none'
    const pick = (side) => (metric ? side?.[key]?.[metric] : side?.[key]) ?? 0
    return { cur: pick(trend.cur), prev: pick(trend.prev), goodUp, label: tr('vs previous {n} days', { n: trend.days || 30 }) }
}

/** "+23%" in green or "-33%" in red (`goodUp` false for figures where less is better: overdue, outstanding, backlog). */
export const Delta = ({ cur, prev, goodUp = true, label, className }) => {
    const p = pctChange(cur, prev)
    if (cur === null || cur === undefined || prev === null || prev === undefined) return null
    const up = p > 0
    const flat = p === 0
    const good = flat ? null : up === goodUp
    const shown = `${p > 0 ? '+' : p < 0 ? '-' : ''}${Math.abs(p)}%`
    return (
        <span className={classNames('inline-flex items-center gap-1 whitespace-nowrap', className)}>
            <span className={classNames('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold', flat ? 'bg-gray-100 text-gray-500 dark:bg-gray-700' : good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15' : 'bg-red-50 text-red-500 dark:bg-red-500/15')}>
                {flat ? <TbMinus /> : up ? <TbTrendingUp /> : <TbTrendingDown />}{shown}
            </span>
            {label && <span className="text-xs text-gray-400">{label}</span>}
        </span>
    )
}

export const StatCard = ({ icon, label, value, sub, tone = 'blue', to, change }) => {
    const body = (
        <Card className="h-full" bodyClass="p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm text-gray-500">{label}</div><h3 className="mt-1">{value}</h3>{change && <div className="mt-1"><Delta {...change} /></div>}{sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}</div>
                <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl', TONES[tone])}>{icon}</div>
            </div>
        </Card>
    )
    return to ? <Link to={to} className="block h-full">{body}</Link> : body
}

export const Panel = ({ title, subtitle, action, className, children }) => (
    <Card className={className}>
        <div className="flex items-start justify-between gap-3"><div><h4>{title}</h4>{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}</div>{action}</div>
        <div className="mt-4">{children}</div>
    </Card>
)

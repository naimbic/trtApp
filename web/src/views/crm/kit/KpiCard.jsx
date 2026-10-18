import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { TbTrendingUp, TbTrendingDown, TbMinus } from 'react-icons/tb'
import Chart from '@/components/shared/Chart'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

/** Change against the previous period, in percent (nothing before: +100%). */
export const pctChange = (cur, prev) => {
    const c = Number(cur), p = Number(prev)
    if (!Number.isFinite(c) || !Number.isFinite(p)) return null
    if (p === 0) return c === 0 ? 0 : c > 0 ? 100 : -100
    return Math.round(((c - p) / Math.abs(p)) * 1000) / 10
}

/** The `change` of a money tile from the server's trend ({ cur, prev } per currency and figure, last 30 days against the 30 before). */
export const moneyChange = (trend, currencyId, metric, goodUp = true) => {
    if (!trend?.cur) return undefined
    const key = currencyId || 'none'
    const pick = (side) => (metric ? side?.[key]?.[metric] : side?.[key]) ?? 0
    return { cur: pick(trend.cur), prev: pick(trend.prev), goodUp, label: tr('vs previous {n} days', { n: trend.days || 30 }) }
}

/** "+23%" in green or "-33%" in red (`goodUp` false for figures where less is better). Give either cur + prev, or the percent itself. */
export const Delta = ({ cur, prev, pct, goodUp = true, label, className }) => {
    const p = pct !== undefined && pct !== null ? Number(pct) : cur === null || cur === undefined || prev === null || prev === undefined ? null : pctChange(cur, prev)
    if (p === null || !Number.isFinite(p)) return null
    const flat = p === 0, up = p > 0, good = flat ? null : up === goodUp
    return (
        <span className={classNames('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
            <span className={classNames('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums', flat ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300' : good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400')}>
                {flat ? <TbMinus /> : up ? <TbTrendingUp /> : <TbTrendingDown />}{`${p > 0 ? '+' : p < 0 ? '-' : ''}${Math.abs(p)}%`}
            </span>
            {label && <span className="text-xs text-gray-400">{label}</span>}
        </span>
    )
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const NUM = /(\d[\d,]*(?:\.\d+)?)/

/** Counts up to the first number in a text ("1.19M MAD" counts 0 to 1.19), once on arrival and again whenever it changes. */
export const CountUp = ({ value, duration = 900 }) => {
    const text = typeof value === 'number' ? String(value) : value
    const [shown, setShown] = useState(text)
    const last = useRef(0)
    useEffect(() => {
        if (typeof text !== 'string' || reduced()) { setShown(text); return undefined }
        const m = NUM.exec(text)
        if (!m) { setShown(text); return undefined }
        const target = parseFloat(m[1].replace(/,/g, ''))
        const decimals = (m[1].split('.')[1] || '').length
        const grouped = m[1].includes(',')
        const from = last.current, start = performance.now()
        let raf
        const fmt = (n) => (grouped ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals))
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration), e = 1 - (1 - t) ** 3
            setShown(text.replace(m[1], fmt(from + (target - from) * e)))
            if (t < 1) raf = requestAnimationFrame(tick)
            else last.current = target
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [text, duration])
    return <>{typeof text === 'string' ? shown : value}</>
}

const Sparkline = ({ data, color }) => (
    <Chart type="area" height={46} width="100%" series={[{ name: '', data }]} xAxis={data.map((_, i) => i)}
        customOptions={{ colors: [color], chart: { sparkline: { enabled: true }, animations: { enabled: true, speed: 900 } }, stroke: { width: 2, curve: 'smooth' }, fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } }, tooltip: { enabled: false } }} />
)

export const KPI_TONES = {
    blue: { chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', color: '#3b82f6' },
    green: { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', color: '#10b981' },
    amber: { chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', color: '#f59e0b' },
    red: { chip: 'bg-red-500/10 text-red-600 dark:text-red-400', color: '#ef4444' },
    violet: { chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', color: '#8b5cf6' },
    purple: { chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', color: '#8b5cf6' },
    teal: { chip: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', color: '#14b8a6' },
    pink: { chip: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', color: '#ec4899' },
}

/**
 * The figure card used everywhere. Label on the left, icon chip on the right, the figure big underneath (it counts up), then the
 * change against the previous period and a short note; an optional sparkline fills the bottom. Cards that sit in the same grid
 * slide in one after the other, lift on hover and the icon pops.
 */
export const KpiCard = ({ icon, label, value, sub, tone = 'blue', accent, to, onClick, active, change, spark, title, className, animate = true }) => {
    const t = KPI_TONES[tone] || KPI_TONES.blue
    const color = accent && tone !== 'red' ? accent : t.color
    const body = (
        <div className={classNames('kpi-card relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-4 dark:bg-gray-800', active ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200 dark:border-gray-700', className)}>
            <span className="kpi-glow pointer-events-none absolute -end-8 -top-8 h-28 w-28 rounded-full blur-2xl" style={{ background: color, opacity: 0.12 }} />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 pt-0.5 text-[13px] font-semibold leading-snug text-gray-500 dark:text-gray-400">{label}</div>
                <div className={classNames('kpi-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[22px]', accent && tone !== 'red' ? '' : t.chip)} style={accent && tone !== 'red' ? { background: `${accent}1f`, color: accent } : undefined}>{icon}</div>
            </div>
            <div className="relative mt-2 truncate text-[26px] font-bold leading-tight tracking-tight tabular-nums text-gray-900 dark:text-gray-50" title={title || undefined}>{animate ? <CountUp value={value} /> : value}</div>
            {(change || sub) && (
                <div className="relative mt-1.5 flex flex-col gap-1">
                    {change && <Delta {...change} />}
                    {sub && <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
                </div>
            )}
            {spark && spark.length > 1 && <div className="kpi-spark relative -mx-4 -mb-4 mt-auto pt-2"><Sparkline data={spark} color={color} /></div>}
        </div>
    )
    if (to) return <Link to={to} className="kpi-item">{body}</Link>
    if (onClick) return <button type="button" onClick={onClick} className="kpi-item w-full cursor-pointer outline-hidden">{body}</button>
    return <div className="kpi-item">{body}</div>
}

export default KpiCard

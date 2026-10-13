import { useEffect, useId, useState } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import {
    ArrowDownRight, ArrowUpRight, Minus, Users, Sparkles, Trophy, Percent, Receipt, Coins, Hourglass,
    AlertTriangle, Wallet, TrendingUp, LifeBuoy, CheckSquare,
} from 'lucide-react'
import cn from '@/utils/classNames'
import { useDashUI, accentColor } from './dashUI'
import { fmtNumber, fmtPercent } from './format'

const ICONS = {
    users: Users, sparkles: Sparkles, trophy: Trophy, percent: Percent, receipt: Receipt, coins: Coins, hourglass: Hourglass,
    alert: AlertTriangle, wallet: Wallet, trending: TrendingUp, lifebuoy: LifeBuoy, check: CheckSquare,
}

export function CountUp({ value, format = (n) => String(Math.round(n)), className }) {
    const reduce = useReducedMotion()
    const [display, setDisplay] = useState(reduce ? value : 0)
    useEffect(() => {
        if (reduce) {
            setDisplay(value)
            return undefined
        }
        const controls = animate(0, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(v) })
        return () => controls.stop()
    }, [value, reduce])
    return <span className={className}>{format(display)}</span>
}

export function Sparkline({ data, color }) {
    const id = useId().replace(/:/g, '')
    const d = data?.length ? data.map((v, i) => ({ i, v })) : [{ i: 0, v: 0 }]
    return (
        <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={d} margin={{ top: 4, right: 0, bottom: 2, left: 0 }}>
                <defs>
                    <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#spark-${id})`} dot={false} isAnimationActive animationDuration={700} />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export function TrendBadge({ pct, dir, lowerIsBetter = false }) {
    const good = dir === 'flat' ? null : (dir === 'up') !== lowerIsBetter
    const cls = good === null ? 'text-d-muted bg-d-muted/10' : good ? 'text-d-success bg-d-success/12' : 'text-d-danger bg-d-danger/12'
    const Arrow = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus
    return (
        <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold num', cls)}>
            <Arrow className="h-3 w-3" strokeWidth={2.5} />
            {Math.abs(pct).toFixed(0)}%
        </span>
    )
}

export function FadeIn({ children, delay = 0, className }) {
    const reduce = useReducedMotion()
    if (reduce) return <div className={className}>{children}</div>
    return (
        <motion.div className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    )
}

/** props: label, value, format ('number'|'percent'|'currency'), money(fn), spark, trend, icon, lowerIsBetter, breakdown, note, delay */
export function KPICard({ label, value, format = 'number', money, spark, trend, icon, lowerIsBetter, breakdown, note, delay = 0 }) {
    const accent = useDashUI((s) => s.accent)
    const color = accentColor(accent)
    const Icon = icon ? ICONS[icon] : null
    const fmt = format === 'currency' ? (n) => money(n, { compact: Math.abs(value) >= (typeof window !== 'undefined' && window.innerWidth < 640 ? 10000 : 100000) }) : format === 'percent' ? fmtPercent : fmtNumber
    return (
        <FadeIn delay={delay} className="dcard dcard-hover group relative overflow-hidden p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-d-text2">
                    {Icon && (
                        <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-d-accent/12 text-d-accent sm:grid">
                            <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                    )}
                    <span className="text-sm font-medium leading-tight">{label}</span>
                </div>
                {trend && <span className="shrink-0"><TrendBadge pct={trend.pct} dir={trend.dir} lowerIsBetter={lowerIsBetter} /></span>}
            </div>
            <div className="mt-3 num text-lg sm:text-xl xl:text-2xl font-bold tracking-tight text-d-text truncate" title={format === 'currency' ? money(value, { decimals: 2 }) : undefined}>
                <CountUp value={value} format={fmt} />
            </div>
            {breakdown && breakdown.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-d-muted">
                    {breakdown.map((b, i) => (
                        <span key={b.label} className="whitespace-nowrap">
                            {i > 0 && <span className="mr-2 text-d-text2/40">·</span>}
                            <span className="num font-semibold text-d-text2">{b.n}</span> {b.label}
                        </span>
                    ))}
                </div>
            )}
            {note && !breakdown?.length && <div className="mt-1.5 text-xs text-d-muted">{note}</div>}
            {spark && spark.length > 1 && (
                <div className="pointer-events-none mt-3 -mb-1 opacity-90">
                    <Sparkline data={spark} color={color} />
                </div>
            )}
        </FadeIn>
    )
}

export function ChartCard({ title, subtitle, right, children, className, delay = 0 }) {
    return (
        <FadeIn delay={delay} className={cn('dcard min-w-0 p-4 sm:p-5', className)}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-d-text text-base">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-sm text-d-muted">{subtitle}</p>}
                </div>
                {right}
            </div>
            {children}
        </FadeIn>
    )
}

export const ComparePill = ({ range }) => (
    <span className="shrink-0 rounded-full border border-d-border px-2 py-0.5 text-[11px] text-d-muted">
        {range ? `vs ${range.prevFrom.slice(8)}/${range.prevFrom.slice(5, 7)} – ${range.prevTo.slice(8)}/${range.prevTo.slice(5, 7)}` : 'No comparison period'}
    </span>
)

export const Empty = ({ children = 'No activity in this period' }) => (
    <div className="py-10 text-center text-sm text-d-muted">{children}</div>
)

/** Small signed delta used in tables (green when good, red when bad). */
export function DeltaPill({ cur, prev, lowerIsBetter = false, suffix = '%', points = false }) {
    if (prev === undefined || prev === null) return null
    const diff = points ? cur - prev : prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0
    if (Math.abs(diff) < 0.5) return <span className="num text-[11px] text-d-muted">±0{points ? ' pts' : suffix}</span>
    const good = diff > 0 !== lowerIsBetter
    return (
        <span className={cn('num text-[11px] font-semibold', good ? 'text-d-success' : 'text-d-danger')}>
            {diff > 0 ? '+' : ''}
            {diff.toFixed(0)}
            {points ? ' pts' : suffix}
        </span>
    )
}

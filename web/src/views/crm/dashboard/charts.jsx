import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown } from 'lucide-react'
import dayjs from 'dayjs'
import cn from '@/utils/classNames'
import { ChartCard, ComparePill, DeltaPill, Empty } from './ui'
import { useDashUI, accentColor } from './dashUI'
import { fmtCompact, fmtNumber, pct1 } from './format'

const AXIS = { fill: 'rgb(148 158 172)', fontSize: 12 }
const GRID = 'rgba(148,163,184,0.14)'
const PREV = 'rgb(148 163 184)'

const Takeaway = ({ warn, children }) => (
    <p className={cn('mt-4 text-sm', warn ? 'text-d-warning' : 'text-d-text2')}>{children}</p>
)

/* ------------------------------------------------------------------ 7.1 time series */

const METRICS = [
    { key: 'invoiced', label: 'Invoiced', dot: 'rgb(59 130 246)', lowerIsBetter: false },
    { key: 'collected', label: 'Collected', dot: 'rgb(34 197 94)', lowerIsBetter: false },
    { key: 'expenses', label: 'Expenses', dot: 'rgb(239 68 68)', lowerIsBetter: true },
    { key: 'net', label: 'Net cash flow', dot: 'rgb(20 184 166)', lowerIsBetter: false },
]

export function RevenueTimeCard({ data, range, money, delay }) {
    const accent = useDashUI((s) => s.accent)
    const color = accentColor(accent)
    const [metric, setMetric] = useState('collected')
    const m = METRICS.find((x) => x.key === metric)
    const pts = data.points
    const chart = useMemo(() => pts.map((p) => ({ label: p.label, weekday: p.weekday, cur: p.cur[metric], prev: p.prev ? p.prev[metric] : null, prevLabel: p.prevLabel })), [pts, metric])
    const empty = pts.every((p) => !p.cur.invoiced && !p.cur.collected && !p.cur.expenses)
    const every = Math.max(1, Math.ceil(pts.length / (window.innerWidth < 640 ? 5 : 8)))

    return (
        <ChartCard title="Revenue over time" subtitle={`${data.weekly ? 'By week' : 'By day'} · ${range.label}`} right={<ComparePill range={range} />} delay={delay}>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METRICS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setMetric(t.key)}
                        className={cn('rounded-xl border px-3 py-2 text-left transition-colors', metric === t.key ? 'border-d-accent bg-d-accent/8' : 'border-d-border hover:bg-d-muted/5')}
                    >
                        <div className="flex items-center gap-1.5 text-xs text-d-text2">
                            <span className="h-2 w-2 rounded-full" style={{ background: t.dot }} />
                            {t.label}
                        </div>
                        <div className="mt-0.5 flex items-baseline gap-2">
                            <span className="num text-lg font-semibold text-d-text">{money(data.totals.cur[t.key], { compact: true })}</span>
                            <DeltaPill cur={data.totals.cur[t.key]} prev={data.totals.prev[t.key]} lowerIsBetter={t.lowerIsBetter} />
                        </div>
                    </button>
                ))}
            </div>

            {empty ? (
                <Empty />
            ) : (
                <div role="img" aria-label={`${m.label}: ${money(data.totals.cur[metric])} this period, ${money(data.totals.prev[metric])} previous period`}>
                    <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : 260}>
                        <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke={GRID} />
                            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={every - 1} minTickGap={16} />
                            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmtCompact(v)} />
                            <Tooltip
                                cursor={{ stroke: PREV, strokeDasharray: 3 }}
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null
                                    const p = payload[0].payload
                                    const d = p.prev ? ((p.cur - p.prev) / p.prev) * 100 : null
                                    return (
                                        <div className="dcard border border-d-border px-3 py-2 text-xs shadow-lg">
                                            <div className="font-semibold text-d-text">{p.label} <span className="text-d-muted">· {p.weekday}</span></div>
                                            <div className="mt-1 flex items-center gap-2 text-d-text2">
                                                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                                                {m.label}: <b className="num text-d-text">{money(p.cur)}</b>
                                                {d !== null && <span className={cn('num font-semibold', d >= 0 !== m.lowerIsBetter ? 'text-d-success' : 'text-d-danger')}>{d >= 0 ? '+' : ''}{d.toFixed(0)}%</span>}
                                            </div>
                                            {p.prev !== null && <div className="mt-0.5 text-d-muted">vs {p.prevLabel}: <span className="num">{money(p.prev)}</span></div>}
                                        </div>
                                    )
                                }}
                            />
                            <Line type="monotone" dataKey="prev" stroke={PREV} strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                            <Area type="monotone" dataKey="cur" stroke={color} strokeWidth={2.25} fill="url(#rev-fill)" dot={false} activeDot={{ r: 4 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
            <Takeaway warn={data.daysBelow > data.points.length / 2}>
                {data.daysBelow} of {data.points.length} {data.weekly ? 'weeks' : 'days'} below the previous period (collected)
                {data.trough ? ` · weakest ${data.weekly ? 'week' : 'day'}: ${data.trough.label} (${money(data.trough.count, { compact: true })})` : ''}.
            </Takeaway>
        </ChartCard>
    )
}

/* ------------------------------------------------------------------ 7.2 source × outcome heat-table */

const FAMILIES = {
    open: { rgb: '245 158 11', label: 'Open' },
    won: { rgb: '34 197 94', label: 'Converted' },
    lost: { rgb: '132 142 157', label: 'Lost' },
    junk: { rgb: '239 68 68', label: 'Junk' },
}

const HeatPill = ({ value, max, family }) => {
    const f = FAMILIES[family]
    const a = 0.12 + 0.3 * (max ? value / max : 0)
    return (
        <span className="num inline-block min-w-[2.25rem] rounded-md px-2 py-0.5 text-center text-sm font-semibold" style={{ background: `rgb(${f.rgb} / ${value ? a : 0.05})`, color: `rgb(${f.rgb})` }}>
            {value}
        </span>
    )
}

export function SourceOutcomeCard({ data, range, delay }) {
    const rows = data.rows
    const total = rows.reduce((s, r) => ({ cur: sumC(s.cur, r.cur), prev: sumC(s.prev, r.prev) }), { cur: zero(), prev: zero() })
    const max = (k) => Math.max(1, ...rows.map((r) => r.cur[k]))
    const rate = (c) => (c.leads ? (c.won / c.leads) * 100 : 0)
    const empty = !total.cur.leads && !total.cur.junk
    const best = [...rows].filter((r) => r.cur.leads >= 3).sort((a, b) => rate(b.cur) - rate(a.cur))[0]

    const Row = ({ r, bold }) => (
        <tr className={cn('border-t border-d-border', bold && 'font-semibold')}>
            <td className="py-2.5 pr-3 text-d-text">{r.source}</td>
            <Cell c={r} k="leads" family={null} />
            <Cell c={r} k="open" family="open" max={max('open')} hideMobile />
            <Cell c={r} k="won" family="won" max={max('won')} />
            <Cell c={r} k="lost" family="lost" max={max('lost')} lowerIsBetter hideMobile />
            <Cell c={r} k="junk" family="junk" max={max('junk')} lowerIsBetter />
            <td className="py-2.5 pl-3 text-right">
                <div className="num text-sm font-semibold text-d-text">{pct1(rate(r.cur))}</div>
                <DeltaPill cur={rate(r.cur)} prev={rate(r.prev)} points />
            </td>
        </tr>
    )

    return (
        <ChartCard title="Lead source × outcome" subtitle="Which source brings leads that convert" right={<ComparePill range={range} />} delay={delay}>
            {empty && !rows.length ? (
                <Empty>No leads in this period</Empty>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Lead source by outcome">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-d-muted">
                                <th className="pb-2 pr-3 font-medium">Source</th>
                                <th className="pb-2 px-2 text-center font-medium">Leads</th>
                                <th className="hidden pb-2 px-2 text-center font-medium sm:table-cell">Open</th>
                                <th className="pb-2 px-2 text-center font-medium">Converted</th>
                                <th className="hidden pb-2 px-2 text-center font-medium sm:table-cell">Lost</th>
                                <th className="pb-2 px-2 text-center font-medium">Junk</th>
                                <th className="pb-2 pl-3 text-right font-medium">Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => <Row key={r.source} r={r} />)}
                            <Row r={{ source: 'Total', cur: total.cur, prev: total.prev, breakdown: {} }} bold />
                        </tbody>
                    </table>
                </div>
            )}
            <Takeaway>{best ? `${best.source} converts best (${pct1(rate(best.cur))} of ${best.cur.leads} leads).` : 'Not enough leads to compare sources yet.'}</Takeaway>
        </ChartCard>
    )
}
const zero = () => ({ leads: 0, open: 0, won: 0, lost: 0, junk: 0 })
const sumC = (a, b) => ({ leads: a.leads + b.leads, open: a.open + b.open, won: a.won + b.won, lost: a.lost + b.lost, junk: a.junk + b.junk })

function Cell({ c, k, family, max, lowerIsBetter, hideMobile }) {
    const v = c.cur[k]
    const tip = c.breakdown?.[k]?.length ? c.breakdown[k].map((b) => `${b.name} ${b.count}`).join(', ') : undefined
    return (
        <td className={cn('px-2 py-2.5 text-center align-middle', hideMobile && 'hidden sm:table-cell')} title={tip}>
            <div className="flex flex-col items-center gap-0.5">
                {family ? <HeatPill value={v} max={max} family={family} /> : <span className="num text-sm font-semibold text-d-text">{v}</span>}
                <DeltaPill cur={v} prev={c.prev[k]} lowerIsBetter={lowerIsBetter} />
            </div>
        </td>
    )
}

/* ------------------------------------------------------------------ 7.3 client performance table */

export function ClientPerfCard({ data, range, money, delay }) {
    const totalCollected = data.total.cur.collected
    const share = (c) => (totalCollected ? (c.collected / totalCollected) * 100 : 0)
    const sharePrev = (c) => (data.total.prev.collected ? (c.collected / data.total.prev.collected) * 100 : 0)
    const avg = (c) => (c.invoices ? c.invoiced / c.invoices : 0)
    const empty = !data.total.cur.invoices && !data.total.cur.collected
    const named = data.rows.filter((r) => !r.isOthers).sort((a, b) => b.cur.invoiced + b.cur.collected - (a.cur.invoiced + a.cur.collected))
    const rows = [...named, ...data.rows.filter((r) => r.isOthers), { label: 'Total', total: true, cur: data.total.cur, prev: data.total.prev }]
    const gain = [...named].sort((a, b) => b.cur.collected - b.prev.collected - (a.cur.collected - a.prev.collected))[0]
    const loss = [...named].sort((a, b) => a.cur.collected - a.prev.collected - (b.cur.collected - b.prev.collected))[0]
    const drops = loss && loss.prev.collected > 0 && loss.cur.collected < loss.prev.collected * 0.5 ? loss : null

    return (
        <ChartCard title="Performance by client" subtitle="Invoiced, collected and share of revenue per client" right={<ComparePill range={range} />} delay={delay}>
            {empty ? (
                <Empty>No invoices in this period</Empty>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Performance by client">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-d-muted">
                                <th className="pb-2 pr-3 font-medium">Client</th>
                                <th className="pb-2 px-2 text-right font-medium">Invoices</th>
                                <th className="pb-2 px-2 text-right font-medium">Invoiced</th>
                                <th className="pb-2 px-2 text-right font-medium">Collected</th>
                                <th className="hidden pb-2 px-2 text-right font-medium sm:table-cell">Share</th>
                                <th className="hidden pb-2 pl-2 text-right font-medium md:table-cell">Avg invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.label} className={cn('border-t border-d-border', r.total && 'font-semibold')}>
                                    <td className="py-2.5 pr-3 text-d-text max-w-[220px] truncate">{r.label}</td>
                                    <td className="px-2 py-2.5 text-right"><div className="num text-d-text">{r.cur.invoices}</div><DeltaPill cur={r.cur.invoices} prev={r.prev.invoices} /></td>
                                    <td className="px-2 py-2.5 text-right"><div className="num text-d-text">{money(r.cur.invoiced)}</div><DeltaPill cur={r.cur.invoiced} prev={r.prev.invoiced} /></td>
                                    <td className="px-2 py-2.5 text-right"><div className="num text-d-text">{money(r.cur.collected)}</div><DeltaPill cur={r.cur.collected} prev={r.prev.collected} /></td>
                                    <td className="hidden px-2 py-2.5 text-right sm:table-cell"><div className="num text-d-text">{pct1(share(r.cur))}</div><DeltaPill cur={share(r.cur)} prev={sharePrev(r.prev)} points /></td>
                                    <td className="hidden py-2.5 pl-2 text-right md:table-cell"><div className="num text-d-text">{money(avg(r.cur))}</div><DeltaPill cur={avg(r.cur)} prev={avg(r.prev)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Takeaway warn={!!drops}>
                {drops
                    ? `${drops.label} paid ${money(drops.prev.collected - drops.cur.collected)} less than in the previous period.`
                    : gain && gain.cur.collected > gain.prev.collected
                      ? `${gain.label} increased the most: +${money(gain.cur.collected - gain.prev.collected)} collected.`
                      : `Total collected: ${money(data.total.cur.collected)}.`}
            </Takeaway>
        </ChartCard>
    )
}

/* ------------------------------------------------------------------ 7.4 day × hour heatmap */

export function WeekHourCard({ data, range, delay }) {
    const [hover, setHover] = useState(null)
    const accent = useDashUI((s) => s.accent)
    const color = accentColor(accent)
    const max = Math.max(1, ...data.cur.flat())
    const total = data.cur.flat().reduce((a, b) => a + b, 0)
    let peak = { v: 0, d: 0, b: 0 }
    data.cur.forEach((row, d) => row.forEach((v, b) => { if (v > peak.v) peak = { v, d, b } }))
    const dayTotals = data.weekdays.map((_, d) => ({ d, cur: data.cur[d].reduce((a, b) => a + b, 0), prev: data.prev[d].reduce((a, b) => a + b, 0) }))
    const mover = [...dayTotals].sort((a, b) => Math.abs(b.cur - b.prev) - Math.abs(a.cur - a.prev))[0]

    return (
        <ChartCard title="Day × hour" subtitle="When new leads and tickets arrive, by time block" right={<ComparePill range={range} />} delay={delay}>
            {!total ? (
                <Empty>No inbound activity in this period</Empty>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[420px]" role="img" aria-label={`Inbound activity heatmap, peak ${data.weekdays[peak.d]} ${data.blocks[peak.b]}`}>
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: `3rem repeat(${data.blocks.length}, minmax(0,1fr))` }}>
                            <div />
                            {data.blocks.map((b, bi) => (
                                <div key={b} className={cn('pb-1 text-center text-xs', hover?.b === bi ? 'text-d-text' : 'text-d-muted')}>{b}</div>
                            ))}
                            {data.weekdays.map((day, d) => (
                                <div key={day} className="contents">
                                    <div className={cn('flex items-center text-xs', hover?.d === d ? 'text-d-text' : 'text-d-muted')}>{day}</div>
                                    {data.blocks.map((b, bi) => {
                                        const v = data.cur[d][bi]
                                        const p = data.prev[d][bi]
                                        const dim = hover && hover.d !== d && hover.b !== bi
                                        const detail = data.src[d][bi].map((s) => `${s.name} ${s.count}`).join(', ')
                                        return (
                                            <button
                                                key={b}
                                                type="button"
                                                onMouseEnter={() => setHover({ d, b: bi })}
                                                onMouseLeave={() => setHover(null)}
                                                onFocus={() => setHover({ d, b: bi })}
                                                onBlur={() => setHover(null)}
                                                title={`${day} · ${b}\nCurrent: ${v}\nPrevious: ${p}${detail ? `\n${detail}` : ''}`}
                                                className={cn('num h-10 rounded-md text-xs font-semibold transition-opacity', dim ? 'opacity-40' : 'opacity-100')}
                                                style={{ background: v ? `color-mix(in srgb, ${color} ${Math.round(14 + 70 * (v / max))}%, transparent)` : 'rgb(var(--dsh-muted) / 0.08)', color: v / max > 0.55 ? '#fff' : 'rgb(var(--dsh-text2))' }}
                                            >
                                                {v || ''}
                                            </button>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <Takeaway>
                {total ? `Peak: ${data.weekdays[peak.d]} ${data.blocks[peak.b]} (${peak.v}).` : ''}
                {mover && mover.cur !== mover.prev ? ` ${data.weekdays[mover.d]} moved most vs previous period (${mover.cur - mover.prev > 0 ? '+' : ''}${mover.cur - mover.prev}).` : ''}
            </Takeaway>
        </ChartCard>
    )
}

/* ------------------------------------------------------------------ 7.5 cities with drill-down */

export function CitiesCard({ data, range, money, delay }) {
    const [open, setOpen] = useState(data.rows[0]?.zone ?? null)
    const topInvoiced = Math.max(1, ...data.rows.filter((r) => !r.special).map((r) => r.cur.invoiced))
    const empty = !data.total.cur.invoiced && !data.total.cur.collected
    const lead = data.rows.find((r) => !r.special)
    const noCityPct = data.clientCount ? (data.noCity / data.clientCount) * 100 : 0
    const cols = 'grid-cols-[1fr_5rem_5.5rem] sm:grid-cols-[minmax(7rem,1fr)_minmax(5rem,1.2fr)_4rem_6.5rem_6.5rem_4.5rem]'

    return (
        <ChartCard title="By city" subtitle="Most active cities and their clients" right={<ComparePill range={range} />} delay={delay}>
            {empty ? (
                <Empty>No invoices in this period</Empty>
            ) : (
                <div>
                    <div className={cn('grid items-center gap-3 pb-2 text-xs uppercase tracking-wide text-d-muted', cols)}>
                        <span>City</span>
                        <span className="hidden sm:block" />
                        <span className="hidden text-right sm:block">Clients</span>
                        <span className="text-right">Invoiced</span>
                        <span className="hidden text-right sm:block">Collected</span>
                        <span className="text-right">Δ</span>
                    </div>
                    {data.rows.map((r) => {
                        const isOpen = open === r.zone
                        return (
                            <div key={r.zone} className="border-t border-d-border">
                                <button type="button" onClick={() => setOpen(isOpen ? null : r.zone)} className={cn('grid w-full items-center gap-3 py-2.5 text-left', cols)} aria-expanded={isOpen}>
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-d-text">
                                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-d-muted transition-transform', !isOpen && '-rotate-90')} />
                                        <span className="truncate">{r.zone}</span>
                                    </span>
                                    <span className="hidden h-2 rounded-full bg-d-muted/10 sm:block">
                                        {!r.special && <span className="block h-2 rounded-full bg-d-accent" style={{ width: `${Math.max(3, (r.cur.invoiced / topInvoiced) * 100)}%` }} />}
                                    </span>
                                    <span className="num hidden text-right text-sm text-d-text sm:block">{r.cur.clients}</span>
                                    <span className="num whitespace-nowrap text-right text-sm text-d-text">{money(r.cur.invoiced, { compact: true })}</span>
                                    <span className="num hidden whitespace-nowrap text-right text-sm text-d-text sm:block">{money(r.cur.collected, { compact: true })}</span>
                                    <span className="text-right"><DeltaPill cur={r.cur.invoiced} prev={r.prev.invoiced} /></span>
                                </button>
                                {isOpen && (
                                    <div className="pb-2 pl-6">
                                        {r.cities.filter((c) => c.cur.invoiced || c.prev.invoiced).map((c) => (
                                            <div key={c.clientId} className={cn('grid items-center gap-3 py-1.5 text-sm', cols)}>
                                                <Link className="truncate text-d-text2 hover:underline" to={`/crm/clients/${c.clientId}`}>{c.name}</Link>
                                                <span className="hidden sm:block" />
                                                <span className="hidden sm:block" />
                                                <span className="num text-right text-d-text2">{money(c.cur.invoiced, { compact: true })}</span>
                                                <span className="num hidden text-right text-d-text2 sm:block">{money(c.cur.collected, { compact: true })}</span>
                                                <span className="text-right"><DeltaPill cur={c.cur.invoiced} prev={c.prev.invoiced} /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
            <Takeaway warn={noCityPct >= 10}>
                {noCityPct >= 10 ? `${Math.round(noCityPct)}% of clients have no city — fill it in for better insights. ` : ''}
                {lead ? `${lead.zone} leads (${money(lead.cur.invoiced)} invoiced, ${lead.cur.clients} clients).` : ''}
            </Takeaway>
        </ChartCard>
    )
}

/* ------------------------------------------------------------------ kept CRM lists */

export function ListsRow({ lists, money, delay }) {
    const Item = ({ children }) => <li className="flex items-center justify-between gap-3 border-t border-d-border py-2.5 text-sm first:border-t-0">{children}</li>
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {lists.overdue && (
                <ChartCard title="Overdue invoices" subtitle="Oldest first" delay={delay}>
                    {lists.overdue.length ? (
                        <ul>{lists.overdue.map((o) => (
                            <Item key={o.id}>
                                <div className="min-w-0"><Link to={`/crm/invoices/${o.id}`} className="font-medium text-d-text hover:underline">{o.number}</Link><div className="truncate text-xs text-d-muted">{o.company} · due {dayjs(o.dueDate).format('YYYY-MM-DD')}</div></div>
                                <span className="num shrink-0 font-semibold text-d-danger">{money(o.due)}</span>
                            </Item>
                        ))}</ul>
                    ) : <Empty>Nothing overdue</Empty>}
                </ChartCard>
            )}
            {lists.payments && (
                <ChartCard title="Latest payments" subtitle="In the selected period" delay={delay + 0.04}>
                    {lists.payments.length ? (
                        <ul>{lists.payments.map((p) => (
                            <Item key={p.id}>
                                <div className="min-w-0"><Link to={`/crm/invoices/${p.invoiceId}`} className="font-medium text-d-text hover:underline">{p.company || 'Payment'}</Link><div className="text-xs text-d-muted">{dayjs(p.date).format('YYYY-MM-DD')}</div></div>
                                <span className="num shrink-0 font-semibold text-d-success">+{money(p.amount)}</span>
                            </Item>
                        ))}</ul>
                    ) : <Empty>No payments in this period</Empty>}
                </ChartCard>
            )}
            {lists.tasks && (
                <ChartCard title="Tasks due this week" subtitle="Open tasks" delay={delay + 0.08}>
                    {lists.tasks.length ? (
                        <ul>{lists.tasks.map((t) => (
                            <Item key={t.id}><span className="truncate text-d-text">{t.name}</span><span className="num shrink-0 text-xs text-d-muted">{dayjs(t.dueDate).format('MMM D')}</span></Item>
                        ))}</ul>
                    ) : <Empty>No tasks due in the next 7 days</Empty>}
                </ChartCard>
            )}
        </div>
    )
}

export { fmtNumber }

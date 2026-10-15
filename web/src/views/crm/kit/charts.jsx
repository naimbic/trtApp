import Chart from '@/components/shared/Chart'

// Same palette and chart styling as the dashboard, so a status looks the same everywhere.
export const PALETTE = { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6', teal: '#14b8a6', pink: '#ec4899', slate: '#64748b' }
const SERIES = [PALETTE.blue, PALETTE.green, PALETTE.red, PALETTE.purple, PALETTE.amber, PALETTE.teal, PALETTE.pink, PALETTE.slate]
const STATUS_COLOR = {
    paid: PALETTE.green, accepted: PALETTE.green, finished: PALETTE.green, signed: PALETTE.green, closed: PALETTE.green, done: PALETTE.green,
    partial: PALETTE.blue, 'in progress': PALETTE.blue, sent: PALETTE.blue, open: PALETTE.amber,
    unpaid: PALETTE.amber, 'on hold': PALETTE.amber, revised: PALETTE.purple, 'not signed': PALETTE.amber,
    draft: PALETTE.slate, 'not started': PALETTE.slate,
    overdue: PALETTE.red, cancelled: PALETTE.red, declined: PALETTE.red, expired: PALETTE.red,
}
export const statusColor = (name, i = 0) => STATUS_COLOR[name] || SERIES[i % SERIES.length]
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
export const nfi = (v) => Number(v || 0).toLocaleString('en-US')
export const compact = (v) => Number(v || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 })

const grid = { borderColor: 'rgba(148,163,184,0.25)', strokeDashArray: 4, padding: { left: 8, right: 8 } }
const axisText = { style: { colors: '#94a3b8', fontSize: '12px' } }

/** Grouped columns per month (two series). `money(v)` formats the tooltip. */
export const ColumnChart = ({ labels, series, colors, height = 230, money }) => (
    <Chart
        type="bar"
        height={height}
        series={series}
        xAxis={labels}
        customOptions={{
            colors,
            chart: { toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: { bar: { borderRadius: 5, borderRadiusApplication: 'end', columnWidth: '55%' } },
            dataLabels: { enabled: false },
            grid,
            legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', markers: { radius: 12 }, itemMargin: { horizontal: 10 } },
            xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { ...axisText, rotate: 0, hideOverlappingLabels: true, trim: false } },
            yaxis: { labels: { ...axisText, formatter: (v) => compact(v) } },
            tooltip: { shared: true, intersect: false, y: { formatter: (v) => (money ? money(v) : nfi(v)) } },
        }}
    />
)

/** Donut of { name: count } with the total in the middle. */
export const DonutChart = ({ data, height = 210, title = 'Total' }) => {
    const names = Object.keys(data || {}).filter((n) => data[n] > 0)
    const total = names.reduce((s, n) => s + data[n], 0)
    if (!total) return <p className="py-10 text-center text-sm text-gray-400">Nothing yet</p>
    return (
        <Chart
            type="donut"
            height={height}
            series={names.map((n) => data[n])}
            donutTitle={title}
            donutText={nfi(total)}
            customOptions={{
                labels: names.map(cap),
                colors: names.map((n, i) => statusColor(n, i)),
                legend: { position: 'bottom', fontSize: '12px', markers: { radius: 12 }, itemMargin: { horizontal: 6, vertical: 2 } },
                dataLabels: { enabled: false },
                chart: { fontFamily: 'inherit' },
            }}
        />
    )
}

/** One compact card: title, big total, stacked status bar and a legend. Optional click opens the matching tab. */
export const StackedStat = ({ title, icon, data, onClick, emptyText = 'None yet' }) => {
    const names = Object.keys(data || {}).filter((n) => data[n] > 0)
    const total = names.reduce((s, n) => s + data[n], 0)
    return (
        <button type="button" onClick={onClick} disabled={!onClick} className="w-full rounded-2xl border border-gray-200 p-4 text-left transition enabled:hover:border-primary dark:border-gray-600">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-500"><span className="text-lg">{icon}</span>{title}</span>
                <span className="text-2xl font-bold heading-text">{nfi(total)}</span>
            </div>
            {total ? (
                <>
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        {names.map((n, i) => <div key={n} title={`${cap(n)}: ${data[n]}`} style={{ width: `${(data[n] / total) * 100}%`, background: statusColor(n, i) }} />)}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        {names.map((n, i) => <span key={n} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: statusColor(n, i) }} />{cap(n)} <b className="text-gray-700 dark:text-gray-200">{data[n]}</b></span>)}
                    </div>
                </>
            ) : <div className="mt-3 text-xs text-gray-400">{emptyText}</div>}
        </button>
    )
}

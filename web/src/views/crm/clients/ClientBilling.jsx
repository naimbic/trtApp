import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbCash, TbReceipt2, TbHash, TbHourglass } from 'react-icons/tb'
import Chart from '@/components/shared/Chart'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import { useDashFilters } from '@/store/dashFilterStore'
import { useRegisterCurrency } from '@/store/pageFilterStore'
import classNames from '@/utils/classNames'
import { api, qs } from '../kit/api'
import { PALETTE, DonutChart } from '../kit/charts'

const growth = (cur, prev) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : null)
const labelOf = (l) => (l.length === 7 ? dayjs(`${l}-01`).format('MMM YY') : dayjs(l).format('DD MMM'))

const Tile = ({ title, value, sub, icon, iconClass, g, active, onClick }) => (
    <button type="button" disabled={!onClick} className={classNames('rounded-2xl p-4 text-left outline-hidden transition duration-150', onClick && 'cursor-pointer', active && 'bg-white shadow-md dark:bg-gray-900')} onClick={onClick}>
        <div className="flex justify-between gap-2">
            <div className="min-w-0">
                <div className="mb-3 text-sm font-semibold">{title}</div>
                <h4 className="mb-1">{value}</h4>
                {g !== undefined ? (
                    <div className="inline-flex flex-wrap items-center gap-1">{g === null ? <span className="text-xs text-gray-400">no earlier data</span> : <><GrowShrinkValue className="font-bold" value={g} suffix="%" positiveIcon="+" negativeIcon="" /><span className="text-xs">vs the period before</span></>}</div>
                ) : <div className="text-xs">{sub}</div>}
            </div>
            <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-gray-900', iconClass)}>{icon}</div>
        </div>
    </button>
)

/**
 * Billing section of the client overview, in the same style as the Reports overview: growth tiles, a line for the
 * period with the previous period dashed behind it. The period and currency come from the top-bar filter.
 */
const ClientBilling = ({ id, c, lookups, money, cur, setCur, charts }) => {
    const { range, from, to } = useDashFilters()
    const [d, setD] = useState(null)
    const [sel, setSel] = useState(0)
    const options = useMemo(() => Object.keys(c.money).map((k) => ({ id: k, name: lookups.currencies.find((x) => x.id === k)?.name || '?' })), [c.money, lookups.currencies])
    useRegisterCurrency(options, cur, setCur)

    useEffect(() => {
        let alive = true
        api(`/api/crm/customers/${id}/billing?${qs({ range, from, to, currencyId: cur })}`).then((x) => { if (alive) setD(x) }).catch(() => { if (alive) setD(null) })
        return () => { alive = false }
    }, [id, range, from, to, cur])

    const m = c.money[cur]
    if (!options.length) return <p className="text-sm text-gray-400">No invoices yet.</p>
    if (d?.hidden) return <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400 dark:bg-gray-700/40">Money figures are hidden for your role.</p>

    const fmt = (v) => money(v, cur)
    const tiles = d ? [
        { title: 'Invoiced', value: fmt(d.invoiced.total), g: growth(d.invoiced.total, d.invoiced.prevTotal), icon: <TbReceipt2 />, iconClass: 'bg-sky-200', s: d.invoiced, color: PALETTE.blue, money: true },
        { title: 'Paid', value: fmt(d.paid.total), g: growth(d.paid.total, d.paid.prevTotal), icon: <TbCash />, iconClass: 'bg-emerald-200', s: d.paid, color: PALETTE.green, money: true },
        { title: 'Invoices', value: String(d.count.total), g: growth(d.count.total, d.count.prevTotal), icon: <TbHash />, iconClass: 'bg-purple-200', s: d.count, color: PALETTE.purple },
    ] : []
    const t = tiles[sel] || tiles[0]
    const labels = d ? d.labels.map(labelOf) : []

    return (
        <div>
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-100 p-3 md:grid-cols-2 xl:grid-cols-4 dark:bg-gray-700">
                {tiles.map((x, i) => <Tile key={x.title} {...x} active={sel === i} onClick={() => setSel(i)} />)}
                <Tile title="Balance due" value={fmt(m?.outstanding)} sub={<span className={m?.overdue > 0 ? 'font-semibold text-red-600' : ''}>{fmt(m?.overdue)} overdue · all time</span>} icon={<TbHourglass />} iconClass="bg-red-200" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold">{t?.title || 'Invoiced'} · {d?.range.label || ''}</span><span className="text-gray-400">dashed line: the period before</span></div>
                    {t ? (
                        <Chart
                            type="line"
                            height={300}
                            series={[{ name: t.title, data: t.s.series }, { name: `${t.title} · previous period`, data: labels.map((_, i) => t.s.prev[i] ?? 0) }]}
                            xAxis={labels}
                            customOptions={{
                                legend: { show: true, position: 'top', horizontalAlign: 'left', fontSize: '12px' },
                                colors: [t.color, `${t.color}8c`],
                                stroke: { width: [3, 2], curve: 'smooth', dashArray: [0, 6] },
                                xaxis: { categories: labels, labels: { style: { fontSize: '11px' }, rotate: -45 }, tickAmount: Math.min(labels.length, 12) },
                                yaxis: { labels: { formatter: (v) => (t.money ? Number(v).toLocaleString('en-US', { notation: 'compact' }) : String(Math.round(v * 10) / 10)) } },
                                tooltip: { shared: true, y: { formatter: (v) => (t.money ? fmt(v) : String(v)) } },
                            }}
                        />
                    ) : <div className="py-24 text-center text-sm text-gray-400">Loading…</div>}
                </div>
                <div>
                    <div className="mb-1 text-sm font-semibold">Invoices by status · all time</div>
                    <DonutChart data={charts?.invoiceStatus} title="Invoices" />
                </div>
            </div>
        </div>
    )
}

export default ClientBilling

import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import cn from '@/utils/classNames'
import { useDashUI } from './dashboard/dashUI'
import { makeMoney } from './dashboard/format'
import { KPICard, FadeIn } from './dashboard/ui'
import DashHeader from './dashboard/DashHeader'
import { RevenueTimeCard, SourceOutcomeCard, ClientPerfCard, WeekHourCard, CitiesCard, ListsRow } from './dashboard/charts'

// Ratokil-style dashboard (KPI cards + chart cards, date range, previous-period comparison) on CRM data.
const Dashboard = () => {
    const theme = useDashUI((s) => s.theme)
    const accent = useDashUI((s) => s.accent)
    const hydrate = useDashUI((s) => s.hydrate)
    const [params, setParams] = useSearchParams()
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const seq = useRef(0)

    useEffect(() => hydrate(), [hydrate])

    const query = params.toString()
    const load = useCallback(() => {
        const id = ++seq.current
        setLoading(true)
        fetch(`/api/crm/dashboard?${query}`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Dashboard failed (${r.status})`))))
            .then((d) => seq.current === id && (setData(d), setError(null)))
            .catch((e) => seq.current === id && setError(e.message))
            .finally(() => seq.current === id && setLoading(false))
    }, [query])
    useEffect(load, [load])

    const currency = useMemo(() => data?.currencies.find((c) => c.id === data.currencyId), [data])
    const money = useMemo(() => makeMoney(currency), [currency])

    return (
        <div className={cn('dash rounded-2xl p-3 sm:p-5 antialiased', theme === 'light' && 'theme-light')} data-accent={accent}>
            <DashHeader title="Dashboard" params={params} setParams={setParams} currencies={data?.currencies} currencyId={data?.currencyId} onRefresh={load} refreshing={loading} />

            {error && <div className="dcard p-5 text-d-danger">Could not load the dashboard: {error}</div>}
            {!data && !error && <div className="dcard grid h-72 place-items-center text-d-muted">Loading…</div>}

            {data && (
                <main className={cn('space-y-4 transition-opacity', loading && 'opacity-60')}>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                        {data.kpis.map((k, i) => (
                            <KPICard key={k.key} {...k} money={money} delay={i * 0.04} />
                        ))}
                    </div>

                    {data.timeSeries && <RevenueTimeCard data={data.timeSeries} range={data.range} money={money} delay={0.1} />}
                    {data.sourceOutcome && <SourceOutcomeCard data={data.sourceOutcome} range={data.range} delay={0.18} />}
                    {data.clientPerf && <ClientPerfCard data={data.clientPerf} range={data.range} money={money} delay={0.22} />}
                    {data.weekHour && <WeekHourCard data={data.weekHour} range={data.range} delay={0.26} />}
                    {data.cities && <CitiesCard data={data.cities} range={data.range} money={money} delay={0.3} />}
                    <ListsRow lists={data.lists} money={money} delay={0.34} />

                    <FadeIn delay={0.4}>
                        <p className="pt-1 text-center text-xs text-d-muted">
                            {data.footer.invoices} invoices · {money(data.footer.invoiced)} invoiced · {money(data.footer.collected)} collected · {data.footer.leads} leads · {data.footer.won} converted · {data.footer.junk} junk filtered
                        </p>
                    </FadeIn>
                </main>
            )}
        </div>
    )
}

export default Dashboard

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import ReactMarkdown from 'react-markdown'
import { TbSparkles, TbCopy, TbTargetArrow, TbUsers, TbChartLine, TbSettings, TbMessageChatbot, TbAlertTriangle, TbPercentage, TbClockHour4, TbCash, TbTrendingUp, TbTrendingDown, TbUserExclamation } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import classNames from '@/utils/classNames'
import AiChat from './AiChat'
import { api, notify } from '../kit/api'
import { ColumnChart, DonutChart, TrendChart, PALETTE } from '../kit/charts'
import { StatCard, Panel, Delta } from '../kit/widgets'
import { tr } from '@/utils/t'
import { useLocaleStore } from '@/store/localeStore'

const KINDS = () => [['chat', tr('Chat'), <TbMessageChatbot key="h" />], ['leads', tr('Leads'), <TbTargetArrow key="l" />], ['clients', tr('Clients'), <TbUsers key="c" />], ['income', tr('Yearly income'), <TbChartLine key="i" />]]
const nf = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const pctTag = (v) => (v === null || v === undefined ? '—' : <span className={classNames('inline-flex items-center gap-0.5 font-semibold', v >= 0 ? 'text-emerald-600' : 'text-red-500')}>{v >= 0 ? <TbTrendingUp /> : <TbTrendingDown />}{Math.abs(v)}%</span>)
const MD = 'text-sm leading-relaxed [&_h2]:mb-1.5 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h2:first-child]:mt-0 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-2 [&_strong]:font-semibold [&_table]:my-2 [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:ps-5 dark:[&_td]:border-gray-600 dark:[&_th]:border-gray-600'

/* ---- the figures of each analysis (computed by the CRM, drawn here; the AI is only given the same numbers) ---- */
const LeadsFigures = ({ d }) => (
    <>
        <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={<TbTargetArrow />} label={tr('Leads')} value={d.total} sub={tr('{n} open', { n: d.open })} tone="blue" />
            <StatCard icon={<TbPercentage />} label={tr('Conversion')} value={d.conversionRatePct === null ? '—' : `${d.conversionRatePct}%`} sub={tr('{n} converted', { n: d.converted })} tone="green" />
            <StatCard icon={<TbClockHour4 />} label={tr('Days to convert')} value={d.avgDaysToConvert ?? '—'} sub={tr('on average')} tone="violet" />
            <StatCard icon={<TbAlertTriangle />} label={tr('Need attention')} value={d.attention.neverContacted + d.attention.noContactFor30Days} sub={tr('{a} never contacted · {b} silent for 30 days', { a: d.attention.neverContacted, b: d.attention.noContactFor30Days })} tone={d.attention.neverContacted ? 'amber' : 'teal'} />
        </div>
        <div className="mb-4 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title={tr('Last 12 months')} subtitle={tr('New leads and conversions')}><ColumnChart labels={d.last12Months.map((m) => m.month.slice(2))} height={230} colors={[PALETTE.blue, PALETTE.green]} series={[{ name: tr('New leads'), data: d.last12Months.map((m) => m.created) }, { name: tr('Converted'), data: d.last12Months.map((m) => m.converted) }]} /></Panel>
            <Panel title={tr('Open leads by status')}><DonutChart data={d.openByStatus} height={230} title={tr('Open')} /></Panel>
        </div>
        <Panel title={tr('Sources')} subtitle={tr('Where leads come from and how many become clients')}>
            <table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400"><th className="pb-2">{tr('Source')}</th><th className="pb-2 text-end">{tr('Leads')}</th><th className="pb-2 text-end">{tr('Converted')}</th><th className="pb-2 text-end">{tr('Rate')}</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{d.sources.map((s) => <tr key={s.name}><td className="py-2 font-semibold">{s.name}</td><td className="py-2 text-end">{s.total}</td><td className="py-2 text-end">{s.converted}</td><td className="py-2 text-end">{s.conversionRatePct}%</td></tr>)}</tbody></table>
        </Panel>
    </>
)

const ClientsFigures = ({ d }) => (
    <>
        <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={<TbUsers />} label={tr('Clients')} value={d.total} sub={tr('{n} active', { n: d.active })} tone="blue" />
            <StatCard icon={<TbPercentage />} label={tr('Top 5 share')} value={d.top5SharePct === null ? '—' : `${d.top5SharePct}%`} sub={tr('of the invoiced amount')} tone={d.top5SharePct > 60 ? 'amber' : 'green'} />
            <StatCard icon={<TbCash />} label={tr('Overdue')} value={nf(d.clientsWithOverdue.totalOverdue)} sub={`${d.currency || ''} · ${tr('{n} clients', { n: d.clientsWithOverdue.count })}`} tone={d.clientsWithOverdue.count ? 'red' : 'green'} />
            <StatCard icon={<TbUserExclamation />} label={tr('Dormant')} value={d.dormantOverAYear.count} sub={tr('no invoice for a year')} tone={d.dormantOverAYear.count ? 'amber' : 'teal'} />
        </div>
        <div className="mb-4 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title={tr('Top clients')} subtitle={`${tr('Invoiced')} · ${d.currency || ''}`}>
                <div className="flex flex-col gap-3">
                    {d.topClientsByInvoiced.map((c) => (
                        <div key={c.company}>
                            <div className="mb-1 flex items-center justify-between text-sm"><span className="truncate font-semibold">{c.company}</span><span className="text-xs text-gray-500"><b className="text-gray-700 dark:text-gray-200">{nf(c.invoiced)}</b> · {tr('paid {n}', { n: nf(c.paid) })}{c.overdue > 0 && <b className="text-red-500"> · {tr('{n} overdue', { n: nf(c.overdue) })}</b>}</span></div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.invoiced / d.topClientsByInvoiced[0].invoiced) * 100}%` }} /></div>
                        </div>
                    ))}
                    {!d.topClientsByInvoiced.length && <p className="py-6 text-center text-sm text-gray-400">{tr('No invoice yet.')}</p>}
                </div>
            </Panel>
            <Panel title={tr('New clients per year')}><ColumnChart labels={Object.keys(d.newClientsPerYear)} height={230} colors={[PALETTE.teal]} series={[{ name: tr('Clients'), data: Object.values(d.newClientsPerYear) }]} /></Panel>
        </div>
    </>
)

const IncomeFigures = ({ d }) => {
    if (!d.years.length) return <Alert showIcon type="info">{tr('No invoice yet, so there is nothing to compare.')}</Alert>
    const labels = d.years.map((y) => String(y.year))
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
    const ytd = d.yearToDate
    const yoy = tr('last 12 months vs the 12 before')
    return (
        <>
            <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard icon={<TbCash />} label={tr('Invoiced, all time')} value={nf(d.lifetime.invoiced)} change={{ ...d.last12Months.invoiced, label: yoy }} sub={d.mainCurrency} tone="blue" />
                <StatCard icon={<TbCash />} label={tr('Collected, all time')} value={nf(d.lifetime.collected)} change={{ ...d.last12Months.collected, label: yoy }} sub={tr('{n}% of the invoiced', { n: d.lifetime.invoiced ? Math.round((d.lifetime.collected / d.lifetime.invoiced) * 100) : 0 })} tone="green" />
                <StatCard icon={<TbCash />} label={tr('Expenses, all time')} value={nf(d.lifetime.expenses)} change={{ ...d.last12Months.expenses, goodUp: false, label: yoy }} sub={d.mainCurrency} tone="amber" />
                <StatCard icon={<TbTrendingUp />} label={tr('{y} so far', { y: ytd.year })} value={nf(ytd.invoiced)} sub={ytd.samePeriodLastYear ? <span>{pctTag(ytd.changePct)} {tr('vs the same months of {y}', { y: ytd.year - 1 })}</span> : tr('nothing invoiced in the same months of {y}', { y: ytd.year - 1 })} tone={ytd.changePct < 0 ? 'red' : 'green'} />
            </div>
            <div className="mb-4 grid gap-4 xl:grid-cols-3">
                <Panel className="xl:col-span-2" title={tr('Year by year')} subtitle={tr('Invoiced, collected and expenses ({c})', { c: d.mainCurrency })}><ColumnChart labels={labels} height={260} colors={[PALETTE.blue, PALETTE.green, PALETTE.amber]} series={[{ name: tr('Invoiced'), data: d.years.map((y) => y.invoiced) }, { name: tr('Collected'), data: d.years.map((y) => y.collected) }, { name: tr('Expenses'), data: d.years.map((y) => y.expenses) }]} /></Panel>
                <Panel title={tr('{a} against {b}', { a: ytd.year, b: ytd.year - 1 })} subtitle={tr('Invoiced per month')}><TrendChart type="line" labels={months} height={260} colors={[PALETTE.blue, '#94a3b8']} series={[{ name: String(ytd.year), data: d.monthlyThisYear }, { name: String(ytd.year - 1), data: d.monthlyLastYear }]} /></Panel>
            </div>
            <Panel title={tr('All years')} subtitle={tr('Growth is compared with the year before')}>
                <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-gray-400"><th className="pb-2">{tr('Year')}</th><th className="pb-2 text-end">{tr('Invoiced')}</th><th className="pb-2 text-end">{tr('Growth')}</th><th className="pb-2 text-end">{tr('Collected')}</th><th className="pb-2 text-end">{tr('Expenses')}</th><th className="pb-2 text-end">{tr('Invoices')}</th><th className="pb-2 text-end">{tr('Best month')}</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{[...d.years].reverse().map((y) => <tr key={y.year}><td className="py-2 font-bold">{y.year}{y.partialYear && <span className="ms-1 text-xs font-normal text-gray-400">{tr('so far')}</span>}</td><td className="py-2 text-end">{nf(y.invoiced)}</td><td className="py-2 text-end">{pctTag(y.invoicedChangePct)}</td><td className="py-2 text-end">{nf(y.collected)}</td><td className="py-2 text-end">{nf(y.expenses)}</td><td className="py-2 text-end">{y.invoices}</td><td className="py-2 text-end text-gray-500">{y.bestMonth ? `${y.bestMonth.month} · ${nf(y.bestMonth.invoiced)}` : '—'}</td></tr>)}</tbody></table></div>
            </Panel>
        </>
    )
}

const FIGURES = { leads: LeadsFigures, clients: ClientsFigures, income: IncomeFigures }

/** The super administrator's AI page: the figures of leads, clients and yearly income, and an AI reading of them. */
const AiInsights = () => {
    const lang = useLocaleStore((s) => s.currentLang)
    const [kind, setKind] = useState('chat')
    const [chatMessages, setChatMessages] = useState([])
    const [cfg, setCfg] = useState(null)
    const [provider, setProvider] = useState('')
    const [model, setModel] = useState('')
    const [figs, setFigs] = useState({})
    const [error, setError] = useState('')
    const [question, setQuestion] = useState('')
    const [running, setRunning] = useState(false)
    const [results, setResults] = useState({})

    useEffect(() => { api('/api/crm/ai/settings').then((s) => { setCfg(s); setProvider(s.provider); setModel(s.model) }).catch((e) => setError(e.message)) }, [])
    useEffect(() => { if (kind === 'chat' || figs[kind]) return; api(`/api/crm/ai/figures?kind=${kind}`).then((f) => setFigs((x) => ({ ...x, [kind]: f }))).catch((e) => setError(e.message)) }, [kind, figs])

    const ready = useMemo(() => (cfg?.providers || []).filter((p) => p.hasKey), [cfg])
    const current = ready.find((p) => p.id === provider)
    const models = useMemo(() => [...new Set([...(current?.presets || []), current?.model, model].filter(Boolean))], [current, model])
    const run = useCallback(async () => {
        setRunning(true)
        try { const r = await api('/api/crm/ai/analyze', { method: 'POST', body: { kind, question: question.trim() || undefined, provider, model, lang } }); setResults((x) => ({ ...x, [kind]: r })) } catch (e) { notify('danger', e.message) } finally { setRunning(false) }
    }, [kind, question, provider, model, lang])

    if (error && !cfg) return <Container><Alert showIcon type="warning">{error}</Alert></Container>
    const Figures = FIGURES[kind]
    const isChat = kind === 'chat'
    const res = results[kind]

    return (
        <Container>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="flex items-center gap-2"><TbSparkles className="text-primary" />{tr('AI insights')}</h3><p className="text-gray-500">{tr('Your figures, read for you. Only the super administrator sees this page.')}</p></div>
                <Link to="/crm/settings?group=ai"><Button size="sm" icon={<TbSettings />}>{tr('AI settings')}</Button></Link>
            </div>

            <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                {KINDS().map(([k, label, icon]) => <button key={k} type="button" onClick={() => setKind(k)} className={classNames('inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold transition', kind === k ? 'bg-white text-primary shadow-sm dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700')}>{icon}{label}</button>)}
            </div>

            {isChat ? <AiChat cfg={cfg} ready={ready} provider={provider} setProvider={setProvider} model={model} setModel={setModel} messages={chatMessages} setMessages={setChatMessages} lang={lang} /> : <>
            <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                {cfg && !ready.length ? (
                    <Alert showIcon type="info">{tr('Add an API key (Claude, ChatGPT, DeepSeek or OpenRouter) in')} <Link to="/crm/settings?group=ai" className="font-semibold underline">{tr('Settings → AI')}</Link> {tr('to get the analysis written for you. The figures below work without it.')}</Alert>
                ) : (
                    <>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-52"><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Provider')}</div><Select size="sm" isSearchable={false} options={ready.map((p) => ({ value: p.id, label: p.label }))} value={current ? { value: current.id, label: current.label } : null} onChange={(o) => { setProvider(o.value); setModel(ready.find((p) => p.id === o.value)?.model || '') }} /></div>
                            <div className="w-64"><div className="mb-1 text-xs font-semibold text-gray-500">{tr('Model')}</div><Select size="sm" options={models.map((m) => ({ value: m, label: m }))} value={model ? { value: model, label: model } : null} onChange={(o) => setModel(o.value)} /></div>
                            <div className="min-w-[240px] flex-1"><div className="mb-1 text-xs font-semibold text-gray-500">{tr('A question about these figures (optional)')}</div><Input size="sm" value={question} placeholder={tr('For example: which sources should we stop paying for?')} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !running && run()} /></div>
                            <Button variant="solid" icon={<TbSparkles />} loading={running} disabled={!provider || !model || !figs[kind]} onClick={run}>{res ? tr('Analyse again') : tr('Analyse with AI')}</Button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">{tr('Sent to the provider: totals, rates and company names. Never emails, phone numbers or addresses.')}</p>
                    </>
                )}
                {running && <div className="mt-4 space-y-2"><Skeleton height={16} width="40%" /><Skeleton height={12} /><Skeleton height={12} /><Skeleton height={12} width="80%" /></div>}
                {res && !running && (
                    <div className="mt-4 rounded-xl bg-white p-5 dark:bg-gray-800">
                        <div className={MD}><ReactMarkdown>{res.markdown}</ReactMarkdown></div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-700">
                            <span>{res.model} · {res.ms < 1000 ? `${res.ms} ms` : `${(res.ms / 1000).toFixed(1)} s`}{res.usage?.output ? ` · ${res.usage.input ?? '?'} → ${res.usage.output} ${tr('tokens')}` : ''}</span>
                            <button type="button" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" onClick={() => { navigator.clipboard?.writeText(res.markdown); notify('success', tr('Copied')) }}><TbCopy />{tr('Copy')}</button>
                        </div>
                    </div>
                )}
            </div>

            {!figs[kind] ? <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={92} />)}</div> : <Figures d={figs[kind]} />}
            </>}
        </Container>
    )
}

export default AiInsights

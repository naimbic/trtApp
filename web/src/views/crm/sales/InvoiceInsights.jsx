/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import { gsap, $, dur, landCards, fileIn, countTo, settled } from '@/vendor/rapport/motion'
import { areaChart } from '@/vendor/rapport/charts'
import { FORMATS } from '@/vendor/rapport/ui'
import { STATUS } from './shared'
import { tr } from '@/utils/t'

const TONE = { 1: 'butter', 2: 'pine', 3: 'ink', 4: 'tomato', 5: 'muted', 6: 'muted' }
const Card = ({ id, cls, title, tools, children }) => (
    <section className={`card ${cls || ''}`} id={id}>
        <header className="card__head"><h2 className="card__title">{title}</h2><div className="card__tools">{tools}</div></header>
        {children}
    </section>
)

/**
 * The Rapport finance cards above the invoice list: Revenue (collected against invoiced), Invoices (by status) and Cash flow (running
 * totals, the gap is what is still to collect). Fed by the same filters and currency as the four figures cards.
 */
const InvoiceInsights = ({ series, counts = {}, money, moneyShort }) => {
    const root = useRef(null)
    const live = useRef({ rev: null, cash: null, first: true })
    const labels = useMemo(() => (series?.labels || []).map((k) => (series.byDay ? dayjs(k).format('D MMM') : dayjs(`${k}-01`).format('MMM YY'))), [series])
    const cum = (a) => { let t = 0; return a.map((v) => (t += v)) }
    const revSeries = () => [{ name: tr('Collected'), values: series.collected, tone: 'tomato' }, { name: tr('Invoiced'), values: series.invoiced, tone: 'ink', dashed: true }]
    const cashSeries = () => [{ name: tr('Collected'), values: cum(series.collected), tone: 'pine' }, { name: tr('Invoiced'), values: cum(series.invoiced), tone: 'ink', dashed: true }]
    const totals = useMemo(() => ({ col: (series?.collected || []).reduce((a, b) => a + b, 0), inv: (series?.invoiced || []).reduce((a, b) => a + b, 0) }), [series])
    const rows = Object.keys(STATUS).map((k) => ({ k: +k, name: STATUS[k].label, count: counts[k] || 0, tone: TONE[k] })).filter((r) => r.count).sort((a, b) => b.count - a.count)
    const total = rows.reduce((a, r) => a + r.count, 0)

    useLayoutEffect(() => {
        const el = root.current
        if (!el || !series) return undefined
        const ctx = gsap.context(() => {
            FORMATS.money = (v) => money(v)
            live.current.rev = areaChart($('[data-k="rev"]', el), { labels, label: tr('Revenue'), format: moneyShort, height: 230, series: revSeries() })
            live.current.cash = areaChart($('[data-k="cash"]', el), { labels, label: tr('Cash flow'), format: moneyShort, height: 230, series: cashSeries() })
            landCards(Array.from(el.querySelectorAll('.inv-grid > .card')), { delay: 0.05 })
            live.current.rev.play(0.25); live.current.cash.play(0.4)
            fileIn(Array.from(el.querySelectorAll('.ov-mix__legend li')), { y: 8, stagger: 0.05, delay: 0.5 })
            gsap.delayedCall(dur(1.6), () => { settled.v = true })
        }, el)
        return () => ctx.revert()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // another currency or period: the charts morph
    useEffect(() => {
        if (live.current.first) { live.current.first = false; return }
        live.current.rev?.update(revSeries(), labels)
        live.current.cash?.update(cashSeries(), labels)
        FORMATS.money = (v) => money(v)
        const a = $('[data-k="revTotal"]', root.current), b = $('[data-k="cashGap"]', root.current)
        if (a) countTo(a, totals.col, FORMATS.money, { duration: 0.9 })
        if (b) countTo(b, Math.max(0, totals.inv - totals.col), FORMATS.money, { duration: 0.9 })
    }, [JSON.stringify([series?.labels, series?.collected, series?.invoiced])]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!series) return null
    return (
        <div className="rp-ov inv-insights" ref={root}>
            <div data-view="overview" className="inv-grid">
                <Card id="inv-rev" cls="inv-rev" title={tr('Revenue')}>
                    <div className="ov-rev__sum"><b className="ov-rev__total num" data-k="revTotal">{money(totals.col)}</b><span className="ov-rev__sub">{tr('{a} collected of {b} invoiced', { a: moneyShort(totals.col), b: moneyShort(totals.inv) })}</span></div>
                    <div className="legend ov-rev__legend"><span><i className="tone--tomato" />{tr('Collected')}</span><span><i className="ov-dash" aria-hidden="true" />{tr('Invoiced')}</span></div>
                    <div className="ov-rev__chart" data-k="rev" />
                </Card>
                <Card id="inv-status" cls="inv-status ov-mix" title={tr('Invoices')}>
                    <p className="ov-mix__sum"><b className="num">{total}</b><span className="card__sub">{tr('invoices in this period')}</span></p>
                    <div className="ov-mix__bar">{rows.map((r) => <span key={r.k} className={`ov-mix__seg tone--${r.tone}`} style={{ flexGrow: r.count }} title={`${r.name} · ${r.count}`} />)}</div>
                    <ul className="ov-mix__legend">{rows.map((r) => <li key={r.k}><i className={`tone--${r.tone}`} /><span>{r.name}</span><b className="num">{r.count}</b><span className="num ov-mix__share">{total ? Math.round((r.count / total) * 100) : 0}%</span></li>)}</ul>
                </Card>
                <Card id="inv-cash" cls="inv-cash" title={tr('Cash flow')}>
                    <div className="ov-rev__sum"><b className="ov-rev__total num" data-k="cashGap">{money(Math.max(0, totals.inv - totals.col))}</b><span className="ov-rev__sub">{tr('still to collect from what was invoiced')}</span></div>
                    <div className="legend ov-rev__legend"><span><i className="tone--pine" />{tr('Collected')}</span><span><i className="ov-dash" aria-hidden="true" />{tr('Invoiced')}</span></div>
                    <div className="ov-rev__chart" data-k="cash" />
                </Card>
            </div>
        </div>
    )
}

export default InvoiceInsights

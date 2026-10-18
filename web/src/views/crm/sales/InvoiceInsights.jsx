/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import { gsap, $, dur, landCards, countTo, settled, fileIn, riseTitle } from '@/vendor/rapport/motion'
import { areaChart } from '@/vendor/rapport/charts'
import { FORMATS } from '@/vendor/rapport/ui'
import { tr } from '@/utils/t'

const Card = ({ id, cls, title, tools, children }) => (
    <section className={`card ${cls || ''}`} id={id}>
        <header className="card__head"><h2 className="card__title">{title}</h2><div className="card__tools">{tools}</div></header>
        {children}
    </section>
)

/**
 * The Cash flow card under the figure cards: running totals of collected against invoiced, the gap is what is still to collect.
 * Axis and tooltips use the short money (12.5K, 1.2M).
 */
export const InvoiceCash = ({ series, money, moneyShort }) => {
    const root = useRef(null)
    const live = useRef({ cash: null, first: true })
    const labels = useMemo(() => (series?.labels || []).map((k) => (series.byDay ? dayjs(k).format('D MMM') : dayjs(`${k}-01`).format('MMM YY'))), [series])
    const cum = (a) => { let t = 0; return a.map((v) => (t += v)) }
    const cashSeries = () => [{ name: tr('Collected'), values: cum(series.collected), tone: 'pine' }, { name: tr('Invoiced'), values: cum(series.invoiced), tone: 'ink', dashed: true }]
    const totals = useMemo(() => ({ col: (series?.collected || []).reduce((a, b) => a + b, 0), inv: (series?.invoiced || []).reduce((a, b) => a + b, 0) }), [series])

    useLayoutEffect(() => {
        const el = root.current
        if (!el || !series) return undefined
        const ctx = gsap.context(() => {
            FORMATS.money = (v) => money(v)
            live.current.cash = areaChart($('[data-k="cash"]', el), { labels, label: tr('Cash flow'), format: moneyShort, height: 230, series: cashSeries() })
            landCards(Array.from(el.querySelectorAll('.inv-grid > .card')), { delay: 0.05 })
            live.current.cash.play(0.25)
            gsap.delayedCall(dur(1.6), () => { settled.v = true })
        }, el)
        return () => ctx.revert()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // another currency or period: the charts morph
    useEffect(() => {
        if (live.current.first) { live.current.first = false; return }
        live.current.cash?.update(cashSeries(), labels)
        FORMATS.money = (v) => money(v)
        const b = $('[data-k="cashGap"]', root.current)
        if (b) countTo(b, Math.max(0, totals.inv - totals.col), FORMATS.money, { duration: 0.9 })
    }, [JSON.stringify([series?.labels, series?.collected, series?.invoiced])]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!series) return null
    return (
        <div className="rp-ov inv-insights" ref={root}>
            <div data-view="overview" className="inv-grid">
                <Card id="inv-cash" cls="inv-cash" title={tr('Cash flow')}>
                    <div className="ov-rev__sum"><b className="ov-rev__total num" data-k="cashGap">{money(Math.max(0, totals.inv - totals.col))}</b><span className="ov-rev__sub">{tr('still to collect from what was invoiced')}</span></div>
                    <div className="legend ov-rev__legend"><span><i className="tone--pine" />{tr('Collected')}</span><span><i className="ov-dash" aria-hidden="true" />{tr('Invoiced')}</span></div>
                    <div className="ov-rev__chart" data-k="cash" />
                </Card>
            </div>
        </div>
    )
}



const Stat = ({ icon, value, label, badge }) => (
    <div className="stat"><span className="stat__ico">{icon}</span><div className="stat__body"><dd className="stat__value"><b>{value}</b>{badge}</dd><dt className="stat__label">{label}</dt></div></div>
)

/** The page head of the Rapport Overview for the invoices: a big title and three metrics with their icons (Revenue, Invoices, Cash flow). */
export const InvoiceHead = ({ title, stats, action }) => {
    const root = useRef(null)
    useLayoutEffect(() => {
        const el = root.current
        const ctx = gsap.context(() => {
            const t = el.querySelector('.head__title')
            if (/[؀-ۿ぀-ヿ㐀-鿿]/.test(t.textContent)) gsap.fromTo(t, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: dur(0.8), ease: 'power4.out', clearProps: 'transform,opacity' })
            else riseTitle(t)
            fileIn(Array.from(el.querySelectorAll('.head .stat')), { y: 14, stagger: 0.08, delay: 0.12 })
        }, el)
        return () => ctx.revert()
    }, [])
    return (
        <div className="rp-ov inv-head" ref={root}>
            <div data-view="overview">
                <header className="head">
                    <div className="head__lead"><h1 className="head__title" tabIndex={-1}>{title}</h1></div>
                    <dl className="head__stats">{stats.map((s) => <Stat key={s.label} {...s} />)}</dl>
                    {action && <div className="head__tools">{action}</div>}
                </header>
            </div>
        </div>
    )
}

/*! © 2026 TRT Digital — trtCRM. The Rapport look is built on the licensed Rapport component (© 2026 Hasib / OVERSHOOT), used under licence. */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import { TbTrophy, TbChartBar, TbPercentage, TbArrowUpRight, TbReceipt2, TbCash, TbNotes } from 'react-icons/tb'
import { gsap, $, $$, $maybe, dur, landCards, fileIn, deal, countTo, hoverLift, settled, riseTitle } from '@/vendor/rapport/motion'
import { areaChart } from '@/vendor/rapport/charts'
import { FORMATS, playCounts, recount, segmented } from '@/vendor/rapport/ui'
import { pctChange } from '../kit/KpiCard'
import { tr } from '@/utils/t'

// The Overview of the Rapport template, fed with the CRM's own figures. Markup, classes and animations are the template's
// (page head, landing cards, dealt tiles, chart that draws itself, ring, stacked bar...); the figures and texts are ours.
const JOINED = /[؀-ۿ぀-ヿ㐀-鿿]/
const C = 2 * Math.PI * 84
const TONE_OF = { 'Paid': 'pine', 'Unpaid': 'butter', 'Partially paid': 'ink', 'Overdue': 'tomato', 'Draft': 'muted' }
const ACT_ICON = [TbReceipt2, TbCash, TbNotes]

const Ibtn = ({ label, children, ...rest }) => <button type="button" className="ibtn" aria-label={label} {...rest}>{children}</button>
const Card = ({ id, cls, title, tools, children }) => (
    <section className={`card ${cls || ''}`} id={id} aria-labelledby={`${id}-t`}>
        <header className="card__head"><h2 className="card__title" id={`${id}-t`}>{title}</h2><div className="card__tools">{tools}</div></header>
        {children}
    </section>
)
const initials = (n = '') => n.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()

const RapportOverview = ({ data, inv, labels, series, currencyId, money, moneyShort, topClients = [], upcoming = [], activity = [], paidDelta }) => {
    const root = useRef(null)
    const live = useRef({ first: true, rev: null, seg: null, metric: 'collected', ringP: 0, rtl: false })
    const paid = inv.paid || 0, invoiced = inv.invoiced || 0
    const rate = invoiced ? paid / invoiced : 0
    const outstanding = inv.outstanding || 0, overdue = inv.overdue || 0

    // the money waiting: unpaid / overdue invoices and open estimates, biggest first
    const hot = useMemo(() => {
        const all = (data.hot || []).filter((x) => (currencyId === 'all' ? x.amountBase !== null : (x.currencyId || 'none') === (currencyId || 'none')))
        return all.sort((a, b) => (currencyId === 'all' ? b.amountBase - a.amountBase : b.amount - a.amount)).slice(0, 6)
    }, [data.hot, currencyId])

    const byStatus = inv.byStatus || {}
    const statusRows = useMemo(() => Object.entries(byStatus).map(([name, count]) => ({ name, count, tone: TONE_OF[name] || 'muted' })).sort((a, b) => b.count - a.count), [byStatus])
    const statusTotal = statusRows.reduce((a, s) => a + s.count, 0)
    const rank = topClients.slice(0, 5)
    const rankMax = Math.max(1, ...rank.map((c) => c.total))

    const metricSeries = (m) => {
        const cur = m === 'invoiced' ? series.invoiced : series.collected
        const prev = m === 'invoiced' ? series.prevInvoiced : series.prevCollected
        return [{ name: m === 'invoiced' ? tr('Invoiced') : tr('Collected'), values: cur, tone: 'tomato' }, ...(prev ? [{ name: tr('Previous period'), values: prev, tone: 'ink', dashed: true }] : [])]
    }
    const k$ = (k) => $maybe(`[data-k="${k}"]`, root.current)

    const figures = (animate) => {
        FORMATS.money = (v) => money(v)
        const m = live.current.metric
        const total = (m === 'invoiced' ? series.invoiced : series.collected).reduce((a, b) => a + b, 0)
        countTo(k$('revTotal'), total, FORMATS.money, { duration: animate ? 0.9 : 0 })
        $$('.head [data-count]', root.current).forEach((el) => { const v = Number(el.dataset.target); el.dataset.count = String(v); if (!animate) el.textContent = (FORMATS[el.dataset.fmt] || String)(v) })
    }
    const ring = (animate, delay = 0) => {
        const arc = $maybe('.ov-ring__arc', root.current)
        if (!arc) return
        const to = Math.min(1, rate)
        const st = { p: animate ? live.current.ringP : to }
        live.current.ringP = to
        gsap.killTweensOf(st)
        const draw = () => arc.setAttribute('stroke-dashoffset', String(C * (1 - st.p)))
        arc.setAttribute('stroke-dasharray', String(C)); draw()
        if (animate) gsap.to(st, { p: to, duration: dur(1.3), delay: dur(delay), ease: 'power3.inOut', onUpdate: draw })
        countTo(k$('qPct'), rate, (v) => `${(v * 100).toFixed(0)}%`, { duration: animate ? 1.3 : 0, delay: dur(delay) })
        countTo(k$('qWon'), paid, moneyShort, { duration: animate ? 1.2 : 0, delay: dur(delay) })
    }
    const playMix = (delay) => {
        const segs = $$('.ov-mix__seg', root.current).filter((s) => s.offsetWidth > 0)
        const tl = gsap.timeline({ delay: dur(delay) })
        segs.forEach((s) => tl.fromTo(s, { scaleX: 0 }, { scaleX: 1, transformOrigin: live.current.rtl ? '100% 50%' : '0 50%', duration: dur(0.42), ease: 'power2.inOut', clearProps: 'transform' }, '>-0.06'))
        fileIn($$('.ov-mix__legend li', root.current), { y: 8, stagger: 0.05, delay: delay + 0.25 })
    }
    const playRank = (delay) => {
        const rows = $$('.ov-rank__row', root.current)
        fileIn(rows, { y: 12, stagger: 0.06, delay })
        $$('.meter__fill', $maybe('.ov-rank', root.current) || root.current).forEach((f, i) => gsap.fromTo(f, { scaleX: 0 }, { scaleX: 1, transformOrigin: live.current.rtl ? '100% 50%' : '0 50%', duration: dur(0.9), delay: dur(delay + 0.1 + i * 0.06), ease: 'power3.out', clearProps: 'transform' }))
        $$('.ov-rank__val', root.current).forEach((el, i) => countTo(el, Number(el.dataset.v), (v) => moneyShort(v), { from: 0, duration: 1.1, delay: dur(delay + i * 0.06) }))
    }

    // the page lands exactly as the template's Overview does
    useLayoutEffect(() => {
        const el = root.current
        const ctx = gsap.context(() => {
            live.current.rtl = getComputedStyle(el).direction === 'rtl'
            FORMATS.money = (v) => money(v)
            live.current.rev = areaChart($('[data-k="revChart"]', el), { labels, label: tr('Revenue per month'), format: moneyShort, height: 236, series: metricSeries('collected') })
            live.current.seg = segmented($('.ov-rev .seg', el), (v) => { live.current.metric = v; updateRev() })
            ring(false)
            hoverLift(el)
            const d = 0.38
            const title = $('.head__title', el)
            if (JOINED.test(title.textContent)) gsap.fromTo(title, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: dur(0.8), ease: 'power4.out', clearProps: 'transform,opacity' })
            else riseTitle(title)
            fileIn($$('.head .stat', el), { y: 14, stagger: 0.08, delay: 0.12 })
            playCounts($('.head', el), { delay: 0.15 })
            landCards($$('.ov-grid > .card', el), { delay: 0.12 })
            live.current.rev.play(d + 0.05)
            countTo(k$('revTotal'), series.collected.reduce((a, b) => a + b, 0), FORMATS.money, { from: 0, delay: dur(d), duration: 1.3 })
            deal($$('.ov-tile', el), { delay: d + 0.08, stagger: 0.07 })
            live.current.ringP = 0
            ring(true, d + 0.15)
            playMix(d + 0.3)
            playRank(d + 0.35)
            fileIn($$('.ov-task, .ov-today__prog', el), { y: 10, stagger: 0.05, delay: d + 0.4 })
            fileIn($$('.ov-feed__item', el), { x: live.current.rtl ? -12 : 12, y: 0, stagger: 0.05, delay: d + 0.45 })
            gsap.delayedCall(2, () => { settled.v = true })
            live.current.seg.place(false)
        }, el)
        return () => ctx.revert()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const updateRev = () => {
        live.current.rev?.update(metricSeries(live.current.metric), labels)
        figures(true)
    }
    // new figures (another period or currency): the chart morphs, the numbers roll on, the ring re-sweeps
    const key = JSON.stringify([currencyId, paid, invoiced, outstanding, overdue, series.collected, series.invoiced])
    useEffect(() => {
        if (live.current.first) { live.current.first = false; return }
        updateRev()
        ;[['won', paid], ['open', outstanding], ['rate', rate]].forEach(([k, v]) => { const el = $maybe(`[data-stat="${k}"] [data-count]`, root.current); if (el) recount(el, v) })
        ring(true)
    }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

    const delta = paidDelta
    const badge = delta === null || delta === undefined ? null : { text: `${delta >= 0 ? '+' : '−'}${Math.abs(delta)}%`, tone: delta >= 0 ? 'pine' : 'tomato' }
    const tileDate = (x) => (x.date ? `${x.kind === 'estimate' ? tr('Expires') : tr('Due')} ${dayjs(x.date).format('MMM D')}` : '')
    const paceLeft = outstanding

    return (
        <div className="rp-ov">
            <div data-view="overview" ref={root}>
                <header className="head">
                    <div className="head__lead"><h1 className="head__title" tabIndex={-1} data-text={`${tr('Business')}\n${tr('Overview')}`} dangerouslySetInnerHTML={{ __html: `${tr('Business')}<br>${tr('Overview')}` }} /></div>
                    <dl className="head__stats">
                        <div className="stat" data-stat="won"><span className="stat__ico"><TbTrophy /></span><div className="stat__body"><dd className="stat__value"><b data-count={paid} data-target={paid} data-fmt="money" />{badge && <span className={`badge badge--${badge.tone}`}>{badge.text}</span>}</dd><dt className="stat__label">{tr('Collected in this period')}</dt></div></div>
                        <div className="stat" data-stat="open"><span className="stat__ico"><TbChartBar /></span><div className="stat__body"><dd className="stat__value"><b data-count={outstanding} data-target={outstanding} data-fmt="money" /></dd><dt className="stat__label">{tr('Still to collect')}</dt></div></div>
                        <div className="stat" data-stat="rate"><span className="stat__ico"><TbPercentage /></span><div className="stat__body"><dd className="stat__value"><b data-count={rate} data-target={rate} data-fmt="pct" /></dd><dt className="stat__label">{tr('Collected, of what was invoiced')}</dt></div></div>
                    </dl>
                </header>

                <div className="ov-grid">
                    <Card id="ov-rev" cls="ov-rev" title={tr('Revenue')} tools={<div className="seg" role="group" aria-label={tr('Revenue shown')}><span className="seg__pill" aria-hidden="true" /><button type="button" className="seg__btn" data-value="collected" aria-pressed="true">{tr('Collected')}</button><button type="button" className="seg__btn" data-value="invoiced" aria-pressed="false">{tr('Invoiced')}</button></div>}>
                        <div className="ov-rev__sum"><b className="ov-rev__total num" data-k="revTotal" /><span className="ov-rev__sub">{tr('{a} collected of {b} invoiced', { a: moneyShort(paid), b: moneyShort(invoiced) })}</span></div>
                        <div className="legend ov-rev__legend"><span><i className="tone--tomato" />{tr('This period')}</span><span><i className="ov-dash" aria-hidden="true" />{tr('Previous period')}</span></div>
                        <div className="ov-rev__chart" data-k="revChart" />
                    </Card>

                    <Card id="ov-hot" cls="ov-hot" title={tr('Money waiting')} tools={<span className="card__sub ov-hot__sub">{tr('biggest first')}</span>}>
                        <div className="ov-hot__grid" data-k="hot">
                            {hot.length ? hot.map((x) => (
                                <article key={`${x.kind}-${x.id}`} className={`ov-tile ov-tile--${x.tone}`} data-lift>
                                    <div className="ov-tile__top"><span className="ov-tile__date">{tileDate(x)}</span></div>
                                    <h3 className="ov-tile__title"><Link className="ov-tile__link" to={`/crm/${x.kind === 'estimate' ? 'estimates' : 'invoices'}/${x.id}`}>{x.number}</Link></h3>
                                    <p className="ov-tile__co">{x.client}</p>
                                    <div className="ov-tile__foot"><div><b className="ov-tile__amt num">{money(currencyId === 'all' ? x.amountBase : x.amount, currencyId === 'all' ? 'all' : x.currencyId)}</b><small>{tr(x.status)}</small></div></div>
                                </article>
                            )) : <div className="empty"><b className="empty__title">{tr('Nothing waiting')}</b><span className="empty__text">{tr('Unpaid invoices and open estimates show up here.')}</span></div>}
                        </div>
                    </Card>

                    <Card id="ov-quota" cls="ov-quota" title={tr('Collection')}>
                        <div className="ov-quota__body">
                            <div className="ov-ring" role="img" data-k="qRing" aria-label={`${(rate * 100).toFixed(0)}% ${tr('collected')}`}>
                                <svg viewBox="0 0 200 200" aria-hidden="true"><circle className="ov-ring__track" cx="100" cy="100" r="84" /><circle className="ov-ring__arc" cx="100" cy="100" r="84" /></svg>
                                <div className="ov-ring__mid"><b className="num" data-k="qPct">0%</b><span>{tr('of invoiced')}</span></div>
                            </div>
                            <dl className="ov-quota__facts">
                                <div><dt>{tr('Collected')}</dt><dd className="num" data-k="qWon" /></div>
                                <div><dt>{tr('Invoiced')}</dt><dd className="num">{moneyShort(invoiced)}</dd></div>
                                <div><dt>{tr('Overdue')}</dt><dd className="num">{moneyShort(overdue)}</dd></div>
                            </dl>
                        </div>
                        <p className="ov-quota__pace">{paceLeft > 0 ? <>{tr('Still to collect')} <b>{moneyShort(paceLeft)}</b></> : <b>{tr('Everything is collected')}</b>}</p>
                    </Card>

                    <Card id="ov-mix" cls="ov-mix" title={tr('Invoices by status')}>
                        <p className="ov-mix__sum"><b className="num">{statusTotal}</b><span className="card__sub">{tr('invoices in this period')}</span></p>
                        <div className="ov-mix__bar">{statusRows.map((s) => <Link key={s.name} to="/crm/invoices" className={`ov-mix__seg tone--${s.tone}`} style={{ flexGrow: s.count }} aria-label={`${tr(s.name)}: ${s.count}`} title={`${tr(s.name)} · ${s.count}`} />)}</div>
                        <ul className="ov-mix__legend">{statusRows.map((s) => <li key={s.name}><i className={`tone--${s.tone}`} /><span>{tr(s.name)}</span><b className="num">{s.count}</b><span className="num ov-mix__share">{statusTotal ? Math.round((s.count / statusTotal) * 100) : 0}%</span></li>)}</ul>
                    </Card>

                    <Card id="ov-team" cls="ov-team" title={tr('Top clients')} tools={<span className="card__sub">{tr('by invoiced')}</span>}>
                        <ol className="ov-rank">
                            {rank.length ? rank.map((c, i) => (
                                <li key={`${c.clientId}-${c.currencyId}`} className={`ov-rank__row${i === 0 ? ' is-lead' : ''}`}>
                                    <span className="ov-rank__n num">{i + 1}</span><span className="av av--md">{initials(c.company)}</span>
                                    <div className="ov-rank__body"><div className="ov-rank__line"><Link to={`/crm/clients/${c.clientId}`}><b>{c.company}</b></Link><span className="ov-rank__val num" data-v={c.total}>{moneyShort(c.total)}</span></div><span className="meter" aria-hidden="true"><span className="meter__fill" style={{ width: `${(c.total / rankMax) * 100}%` }} /></span></div>
                                </li>
                            )) : <li className="ov-next__none">{tr('No invoice yet.')}</li>}
                        </ol>
                    </Card>

                    <Card id="ov-today" cls="ov-today" title={tr('Tasks this week')} tools={<Link to="/crm/tasks" className="btn btn--sm btn--ghost">{tr('Open tasks')}</Link>}>
                        <div className="ov-today__prog"><span>{tr('{n} due in the next 7 days', { n: upcoming.length })}</span></div>
                        <ul className="ov-tasks">
                            {upcoming.length ? upcoming.slice(0, 5).map((t) => <li key={t.id} className="ov-task"><label className="ov-task__body"><b>{t.name}</b><small>{dayjs(t.dueDate).format('ddd, MMM D')} · {tr(t.status)}</small></label></li>) : <li className="ov-next__none">{tr('Nothing due this week.')}</li>}
                        </ul>
                    </Card>

                    <Card id="ov-act" cls="ov-act" title={tr('Recent activity')}>
                        <ol className="ov-feed">
                            {activity.length ? activity.slice(0, 6).map((a, i) => { const I = ACT_ICON[i % ACT_ICON.length]; return <li key={a.id || i} className="ov-feed__item"><span className="av av--sm">{initials(a.description)}</span><div><span>{a.description}</span><small>{dayjs(a.date).format('MMM D, HH:mm')}</small></div><span className="ov-feed__ico" aria-hidden="true"><I /></span></li> }) : <li className="ov-next__none">{tr('No activity yet')}</li>}
                        </ol>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default RapportOverview

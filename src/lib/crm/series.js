import { round2 } from '@/lib/crm/sales/calc'
import { toBase } from '@/lib/crm/rates'

const day = (d) => new Date(d).toISOString().slice(0, 10)
const startOfDay = (d) => new Date(`${day(d)}T00:00:00Z`)

/**
 * Chart series for a list page. The window is from..to (default: the last 12 months); up to 62 days it is drawn by day, else by month.
 *   rows   the records of the page (before the status filter)
 *   lines  [{ key, pick(row) -> { date, amount, currencyId } | null }]
 *   cur    the currency keys of the page's figure cards ('all' converts with the Settings rates, 'none' = no currency)
 * Returns { [cur]: { labels:[iso day or YYYY-MM], byDay, lines:[{ key, values }] } }.
 */
export function buildSeries({ from, to, rt, cur, rows, lines }) {
    const winTo = to ? startOfDay(to) : startOfDay(new Date())
    const winFrom = from ? startOfDay(from) : new Date(Date.UTC(winTo.getUTCFullYear(), winTo.getUTCMonth() - 11, 1))
    const span = Math.round((winTo - winFrom) / 86400000) + 1
    const byDay = span <= 62
    const bucket = (d) => (byDay ? day(d) : day(d).slice(0, 7))
    const keys = []
    if (byDay) for (let i = 0; i < span; i++) keys.push(day(new Date(winFrom.getTime() + i * 86400000)))
    else for (let d = new Date(Date.UTC(winFrom.getUTCFullYear(), winFrom.getUTCMonth(), 1)); d <= winTo && keys.length < 60; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) keys.push(day(d).slice(0, 7))
    const out = {}
    for (const key of cur) {
        const acc = Object.fromEntries(lines.map((l) => [l.key, Object.fromEntries(keys.map((k) => [k, 0]))]))
        for (const l of lines) {
            for (const r of rows) {
                const p = l.pick(r)
                if (!p || !p.date) continue
                const b = bucket(p.date)
                if (!(b in acc[l.key])) continue
                const cid = p.currencyId || 'none'
                const v = key === 'all' ? toBase(p.amount, cid === 'none' ? null : cid, rt) : cid === key ? p.amount : 0
                acc[l.key][b] = round2(acc[l.key][b] + (v || 0))
            }
        }
        out[key] = { labels: keys, byDay, lines: lines.map((l) => ({ key: l.key, values: keys.map((k) => acc[l.key][k]) })) }
    }
    return out
}

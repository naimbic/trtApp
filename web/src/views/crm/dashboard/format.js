const nf = new Intl.NumberFormat('en-US')
export const fmtNumber = (n) => nf.format(Math.round(n || 0))
export const fmtPercent = (n) => `${Math.round(n || 0)} %`
export const fmtCompact = (n) => Number(n || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
export const pct1 = (n) => `${(n || 0).toFixed(1)} %`

/** Currency formatter factory from a CRM currency ({symbol, name, placement}). */
export const makeMoney = (currency) => {
    const sym = currency?.symbol || currency?.name || ''
    return (n, { compact = false, decimals = 0 } = {}) => {
        const v = Number(n || 0)
        const body = compact
            ? fmtCompact(v)
            : v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        return currency?.placement === 'after' ? `${body} ${sym}` : `${sym ? sym + ' ' : ''}${body}`
    }
}

/** Period-over-period delta, divide-by-zero safe, flat within ±0.5 %. */
export function delta(current, previous) {
    if (!previous) return current ? { pct: 100, dir: 'up' } : { pct: 0, dir: 'flat' }
    const pct = ((current - previous) / previous) * 100
    return { pct, dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' }
}

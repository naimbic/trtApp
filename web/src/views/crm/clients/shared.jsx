import { moneyHidden, MASK } from '@/utils/money'
import { useEffect, useState } from 'react'
import { api } from '../kit/api'
import { setDocPadding } from '../kit/format'

let cache
/** Lookups (countries, currencies, groups, staff) shared by all client screens. */
export function useClientLookups() {
    const [data, setData] = useState(cache || { countries: [], currencies: [], groups: [], staff: [] })
    useEffect(() => {
        if (cache) return
        api('/api/crm/customers/lookups').then((d) => { cache = d; setDocPadding(d.numberPadding); setData(d) }).catch(() => {})
    }, [])
    return data
}

/** (amount, currencyId) -> "1,234.00 DH" using the CRM currency list. */
export const makeMoney = (currencies = []) => (n, currencyId, opts = {}) => {
    if (moneyHidden()) return MASK
    const c = currencies.find((x) => x.id === currencyId)
    const sym = c?.symbol || c?.name || ''
    const v = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: opts.decimals ?? 2, maximumFractionDigits: opts.decimals ?? 2 })
    return c?.placement === 'after' ? `${v} ${sym}` : `${sym ? sym + ' ' : ''}${v}`
}

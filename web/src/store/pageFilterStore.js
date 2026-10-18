import { useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { useDashFilters } from '@/store/dashFilterStore'

/** Pages that show the dashboard filter bar in the top bar (exact paths). They all share the dashboard's period and currency. */
export const PAGE_FILTERS = {
    '/crm/reports': true, '/crm/expenses': true, '/crm/invoices': true, '/crm/estimates': true, '/crm/proposals': true,
    '/crm/purchase-orders': true, '/crm/payments': true, '/crm/tickets': true, '/crm/leads': true,
}

/** Exact paths above, plus a client's own page (its billing chart follows the same period and currency). */
export const hasPageFilter = (pathname) => !!PAGE_FILTERS[pathname] || /^\/crm\/clients\/[a-f0-9]{24}$/i.test(pathname)

/** preset (or custom from/to as YYYY-MM-DD) → [Date, Date] at local midnight, like the pickers. */
export function resolveRange(range = '12m', from, to) {
    const today = dayjs().startOf('day')
    const d = (x) => x.toDate()
    switch (range) {
        case 'today': return [d(today), d(today)]
        case '7d': return [d(today.subtract(6, 'day')), d(today)]
        case '30d': return [d(today.subtract(29, 'day')), d(today)]
        case 'month': return [d(today.startOf('month')), d(today)]
        case 'lastmonth': return [d(today.subtract(1, 'month').startOf('month')), d(today.subtract(1, 'month').endOf('month').startOf('day'))]
        case 'year': return [d(today.startOf('year')), d(today)]
        case '12m': return [d(today.subtract(11, 'month').startOf('month')), d(today)]
        case 'custom': return from && to ? [d(dayjs(from)), d(dayjs(to))] : [null, null]
        default: return [null, null]
    }
}

/** [range] with the lists' old shape ([Date|null, Date|null]), taken from the dashboard filter bar in the top bar. */
export function usePageRange() {
    const { range, from, to } = useDashFilters()
    const dates = useMemo(() => resolveRange(range, from, to), [range, from, to])
    return [dates, () => {}, range]
}

/** Shows the page's currencies in the top-bar filter and keeps the page and the bar on the same one. */
export function useRegisterCurrency(rawOptions, value, onChange) {
    // the pages list their real currencies; with two or more the bar also offers ALL (everything converted into the base currency)
    const real = rawOptions.filter((o) => o.id !== 'all')
    const options = real.length > 1 ? [...real, { id: 'all', name: 'ALL' }] : real
    const sig = options.map((o) => o.id).join(',')
    const picked = useDashFilters((s) => s.currencyId)
    useEffect(() => { useDashFilters.setState({ currencies: options }) }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (picked && options.some((o) => o.id === picked) && picked !== value) onChange(picked) }, [picked, sig]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (value && value !== picked && !options.some((o) => o.id === picked)) useDashFilters.setState({ currencyId: value }) }, [sig, value]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => useDashFilters.setState({ currencies: [] }), [])
}

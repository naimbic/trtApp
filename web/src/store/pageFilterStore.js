import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import dayjs from 'dayjs'

export const PAGE_PRESETS = [['today', 'Today'], ['7d', '7D'], ['30d', '30D'], ['month', 'Month'], ['lastmonth', 'Last month'], ['year', 'Year'], ['12m', '12M'], ['all', 'All']]

/** Pages that get the date filter in the top bar (exact paths) and the key their filter is stored under. */
export const PAGE_FILTERS = {
    '/crm/reports': { key: 'reports', default: 'year', label: 'Reports period' },
    '/crm/expenses': { key: 'expenses', label: 'Expense date' },
    '/crm/invoices': { key: 'invoices', label: 'Invoice date' },
    '/crm/estimates': { key: 'estimates', label: 'Estimate date' },
    '/crm/proposals': { key: 'proposals', label: 'Proposal date' },
    '/crm/purchase-orders': { key: 'purchase-orders', label: 'Order date' },
    '/crm/payments': { key: 'payments', label: 'Payment date' },
    '/crm/tickets': { key: 'tickets', label: 'Opened' },
    '/crm/leads': { key: 'leads', label: 'Created' },
}

/** preset (or custom from/to as YYYY-MM-DD) → [Date, Date], or [null, null] for "all". Local midnight dates, like the pickers. */
export function resolveRange(range = 'all', from, to) {
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

export const usePageFilters = create()(
    persist(
        (set) => ({
            pages: {},
            setRange: (key, range) => set((s) => ({ pages: { ...s.pages, [key]: { range } } })),
            setCustom: (key, from, to) => set((s) => ({ pages: { ...s.pages, [key]: { range: 'custom', from, to } } })),
        }),
        { name: 'pageFilters' },
    ),
)

/** [range, setRange] with the same shape as the lists' old local state: range is [Date|null, Date|null]. The picker lives in the top bar. */
export function usePageRange(key, def = 'all') {
    const page = usePageFilters((s) => s.pages[key])
    const range = page?.range || def
    const dates = useMemo(() => resolveRange(range, page?.from, page?.to), [range, page?.from, page?.to])
    return [dates, () => {}, range]
}

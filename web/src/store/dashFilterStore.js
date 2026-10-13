import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ACCENTS = [
    { key: 'blue', label: 'Blue', hex: '#3b82f6' },
    { key: 'green', label: 'Green', hex: '#10b981' },
    { key: 'purple', label: 'Purple', hex: '#8b5cf6' },
    { key: 'amber', label: 'Amber', hex: '#f59e0b' },
    { key: 'rose', label: 'Rose', hex: '#f43f5e' },
    { key: 'teal', label: 'Teal', hex: '#14b8a6' },
]

export const RANGES = [
    ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'],
    ['lastmonth', 'Last month'], ['year', 'This year'], ['12m', 'Last 12 months'], ['custom', 'Custom range'],
]

/** Dashboard filters shared between the top bar and the dashboard page. */
export const useDashFilters = create()(
    persist(
        (set) => ({
            range: '12m',
            from: '',
            to: '',
            currencyId: null,
            accent: 'blue',
            currencies: [], // filled by the dashboard once data is loaded (not persisted)
            setRange: (range) => set({ range }),
            setCustom: (patch) => set({ range: 'custom', ...patch }),
            setCurrency: (currencyId) => set({ currencyId }),
            setAccent: (accent) => set({ accent }),
            setCurrencies: (currencies) => set({ currencies }),
        }),
        {
            name: 'dashboardFilters',
            partialize: (s) => ({ range: s.range, from: s.from, to: s.to, currencyId: s.currencyId, accent: s.accent }),
        },
    ),
)

export const accentHex = (key) => ACCENTS.find((a) => a.key === key)?.hex || ACCENTS[0].hex

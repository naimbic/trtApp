import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ACCENTS = [
    { key: 'blue', label: 'Blue', hex: '#3b82f6' },
    { key: 'green', label: 'Green', hex: '#10b981' },
    { key: 'purple', label: 'Purple', hex: '#8b5cf6' },
    { key: 'amber', label: 'Amber', hex: '#f59e0b' },
    { key: 'rose', label: 'Rose', hex: '#f43f5e' },
    { key: 'teal', label: 'Teal', hex: '#14b8a6' },
    { key: 'terracotta', label: 'Terracotta', hex: '#d8532d' },
    { key: 'pine', label: 'Pine', hex: '#2f7d62' },
    { key: 'indigo', label: 'Indigo', hex: '#6366f1' },
    { key: 'sky', label: 'Sky', hex: '#0ea5e9' },
    { key: 'pink', label: 'Pink', hex: '#ec4899' },
    { key: 'orange', label: 'Orange', hex: '#f97316' },
    { key: 'gold', label: 'Gold', hex: '#d4a017' },
    { key: 'lime', label: 'Lime', hex: '#84cc16' },
    { key: 'crimson', label: 'Crimson', hex: '#dc2626' },
    { key: 'slate', label: 'Slate', hex: '#475569' },
    // soft, light colours: the text on them turns dark by itself
    { key: 'mist', label: 'Mist', hex: '#cbd2da', soft: true },
    { key: 'sage', label: 'Sage', hex: '#a9d6b5', soft: true },
    { key: 'mint', label: 'Mint', hex: '#a0e4d0', soft: true },
    { key: 'baby', label: 'Baby blue', hex: '#a9d8f2', soft: true },
    { key: 'lavender', label: 'Lavender', hex: '#c8bbf8', soft: true },
    { key: 'peach', label: 'Peach', hex: '#fbc2a3', soft: true },
    { key: 'butter', label: 'Butter', hex: '#f6df8c', soft: true },
    { key: 'blush', label: 'Blush', hex: '#f6c1d3', soft: true },
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
            customHex: '#7c3aed',
            currencies: [], // filled by the dashboard once data is loaded (not persisted)
            setRange: (range) => set({ range }),
            setCustom: (patch) => set({ range: 'custom', ...patch }),
            setCurrency: (currencyId) => set({ currencyId }),
            setAccent: (accent) => set({ accent }),
            setCustomHex: (customHex) => set({ customHex, accent: 'custom' }),
            setCurrencies: (currencies) => set({ currencies }),
        }),
        {
            name: 'dashboardFilters',
            partialize: (s) => ({ range: s.range, from: s.from, to: s.to, currencyId: s.currencyId, accent: s.accent, customHex: s.customHex }),
        },
    ),
)

export const accentHex = (key) => (key === 'custom' ? useDashFilters.getState().customHex || '#7c3aed' : ACCENTS.find((a) => a.key === key)?.hex || ACCENTS[0].hex)

/** Readable text on a colour: dark on light colours (lime, gold, amber...), white on the rest. */
export const onHex = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
    const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
    return L > 0.4 ? '#17191a' : '#ffffff'
}

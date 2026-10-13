import { create } from 'zustand'

/** Accent presets — mirror the [data-accent] rules in others/dashboard.css. */
export const ACCENTS = [
    { key: 'brand', label: 'Brand', rgb: 'var(--dsh-brand, 37 99 235)' },
    { key: 'emerald', label: 'Emerald', rgb: '16 185 129' },
    { key: 'blue', label: 'Blue', rgb: '59 130 246' },
    { key: 'violet', label: 'Violet', rgb: '139 92 246' },
    { key: 'rose', label: 'Rose', rgb: '244 63 94' },
    { key: 'amber', label: 'Amber', rgb: '245 158 11' },
]

export const accentColor = (key) => `rgb(${ACCENTS.find((a) => a.key === key)?.rgb ?? ACCENTS[0].rgb})`

const STORAGE_KEY = 'trt-dash-ui'
const persist = (theme, accent) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent }))
    } catch {
        /* storage unavailable */
    }
}

/** SSR-safe default (light + brand); `hydrate()` reads localStorage after mount. */
export const useDashUI = create((set, get) => ({
    theme: 'light',
    accent: 'brand',
    hydrated: false,
    setTheme: (theme) => {
        persist(theme, get().accent)
        set({ theme })
    },
    toggleTheme: () => get().setTheme(get().theme === 'light' ? 'dark' : 'light'),
    setAccent: (accent) => {
        persist(get().theme, accent)
        set({ accent })
    },
    hydrate: () => {
        if (get().hydrated) return
        let { theme, accent } = get()
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const p = JSON.parse(raw)
                if (p.theme === 'light' || p.theme === 'dark') theme = p.theme
                if (ACCENTS.some((a) => a.key === p.accent)) accent = p.accent
            }
        } catch {
            /* ignore */
        }
        set({ theme, accent, hydrated: true })
    },
}))

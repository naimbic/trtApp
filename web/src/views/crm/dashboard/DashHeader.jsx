import { useTransition } from 'react'
import { RefreshCw, Sun, Moon } from 'lucide-react'
import cn from '@/utils/classNames'
import { ACCENTS, useDashUI } from './dashUI'

export const PRESETS = [
    ['today', 'Today'], ['yesterday', 'Yesterday'], ['3d', '3 days'], ['7d', '7 days'], ['30d', '30 days'],
    ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Custom'],
]

/** URL-driven range/currency filter. `params` = URLSearchParams, `setParams(next)` updates the URL. */
const DashHeader = ({ title, params, setParams, currencies, currencyId, onRefresh, refreshing }) => {
    const theme = useDashUI((s) => s.theme)
    const toggleTheme = useDashUI((s) => s.toggleTheme)
    const accent = useDashUI((s) => s.accent)
    const setAccent = useDashUI((s) => s.setAccent)
    const [, startTransition] = useTransition()
    const range = params.get('range') || '30d'
    const set = (patch) => {
        const next = new URLSearchParams(params)
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
        startTransition(() => setParams(next, { replace: true }))
    }

    return (
        <div className="mb-4 rounded-2xl border border-d-border bg-d-bg/80 backdrop-blur">
            <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 sm:px-5">
                <h2 className="mr-2 shrink-0 text-lg font-bold text-d-text">{title}</h2>
                <div className="flex shrink-0 items-center gap-1" role="tablist" aria-label="Date range">
                    {PRESETS.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={range === key}
                            onClick={() => (key === 'custom' ? set({ range: 'custom', from: params.get('from') || '', to: params.get('to') || '' }) : set({ range: key, from: '', to: '' }))}
                            className={cn('rounded-full px-3 py-1 text-sm transition-colors', range === key ? 'bg-d-accent text-white' : 'text-d-text2 hover:bg-d-muted/10')}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {range === 'custom' && (
                    <div className="flex shrink-0 items-center gap-1.5 text-sm">
                        <input type="date" value={params.get('from') || ''} onChange={(e) => set({ from: e.target.value })} className="rounded-lg border border-d-border bg-d-input px-2 py-1 text-d-text" />
                        <span className="text-d-muted">→</span>
                        <input type="date" value={params.get('to') || ''} onChange={(e) => set({ to: e.target.value })} className="rounded-lg border border-d-border bg-d-input px-2 py-1 text-d-text" />
                    </div>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-3">
                    {currencies?.length > 1 && (
                        <div className="flex items-center rounded-full border border-d-border p-0.5" role="tablist" aria-label="Currency">
                            {currencies.map((c) => (
                                <button key={c.id} type="button" role="tab" aria-selected={c.id === currencyId} onClick={() => set({ currency: c.id })} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', c.id === currencyId ? 'bg-d-accent text-white' : 'text-d-text2')}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5" aria-label="Accent colour">
                        {ACCENTS.map((a) => (
                            <button key={a.key} type="button" title={a.label} aria-label={a.label} onClick={() => setAccent(a.key)} className={cn('h-4 w-4 rounded-full ring-offset-2 ring-offset-transparent transition', accent === a.key && 'ring-2 ring-d-text2')} style={{ background: `rgb(${a.rgb})` }} />
                        ))}
                    </div>
                    <button type="button" onClick={onRefresh} aria-label="Refresh" className="grid h-8 w-8 place-items-center rounded-lg text-d-text2 hover:bg-d-muted/10">
                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    </button>
                    <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="grid h-8 w-8 place-items-center rounded-lg text-d-text2 hover:bg-d-muted/10">
                        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DashHeader

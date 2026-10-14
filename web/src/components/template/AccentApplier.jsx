import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useDashFilters, accentHex } from '@/store/dashFilterStore'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import { mapTheme } from '@/utils/hooks/useThemeSchema'

const mix = (hex, to, t) => {
    const n = parseInt(hex.slice(1), 16), m = parseInt(to.slice(1), 16)
    const ch = (s) => Math.round(((n >> s) & 255) * (1 - t) + ((m >> s) & 255) * t)
    return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`
}

/** The colour picked in the top bar paints every page (buttons, links, active tabs, progress…), not only the dashboard. */
const AccentApplier = () => {
    const accent = useDashFilters((s) => s.accent)
    const mode = useThemeStore((s) => s.mode)
    const schema = useThemeStore((s) => s.themeSchema)
    useEffect(() => {
        const apply = () => {
            const root = document.documentElement
            const vars = accent === 'blue' || !accent
                ? mapTheme(presetThemeSchemaConfig[schema || 'default']?.[mode] || presetThemeSchemaConfig.default?.[mode] || {})
                : (() => { const h = accentHex(accent); return { '--primary': h, '--primary-deep': mix(h, '#000000', 0.18), '--primary-mild': mix(h, '#ffffff', 0.18), '--primary-subtle': `${h}1a`, '--neutral': '#ffffff' } })()
            Object.entries(vars).forEach(([k, v]) => v && root.style.setProperty(k, v))
        }
        apply()
        const t = setTimeout(apply, 0) // after the template's own theme effect
        return () => clearTimeout(t)
    }, [accent, mode, schema])
    return null
}

export default AccentApplier

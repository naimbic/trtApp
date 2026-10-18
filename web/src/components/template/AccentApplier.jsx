import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useDashFilters, accentHex, onHex } from '@/store/dashFilterStore'
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
    const customHex = useDashFilters((s) => s.customHex)
    const mode = useThemeStore((s) => s.mode)
    const schema = useThemeStore((s) => s.themeSchema)
    useEffect(() => {
        const apply = () => {
            const root = document.documentElement
            const vars = accent === 'blue' || !accent
                ? mapTheme(presetThemeSchemaConfig[schema || 'default']?.[mode] || presetThemeSchemaConfig.default?.[mode] || {})
                : (() => { const h = accentHex(accent); return { '--primary': h, '--primary-deep': mix(h, '#000000', 0.18), '--primary-mild': mix(h, '#ffffff', 0.18), '--primary-subtle': `${h}1a`, '--neutral': onHex(h) } })()
            Object.entries(vars).forEach(([k, v]) => v && root.style.setProperty(k, v))
            // the Rapport layout: the colour paints its warm tiles, the dark card and the mesh behind the page
            const rp = document.querySelector('.rp-app')
            if (rp) {
                const custom = accent && accent !== 'blue'
                const h = custom ? accentHex(accent) : null
                const set = { '--rp-tomato': h, '--rp-on-tomato': h && onHex(h), '--rp-pine': h && mix(h, '#000000', 0.55), '--rp-on-pine': h && '#ffffff', '--rp-mesh-a': h && `${h}59`, '--rp-mesh-c': h && `${h}33` }
                Object.entries(set).forEach(([k, v]) => (v ? rp.style.setProperty(k, v) : rp.style.removeProperty(k)))
            }
        }
        apply()
        const t = setTimeout(apply, 0) // after the template's own theme effect
        return () => clearTimeout(t)
    }, [accent, customHex, mode, schema])
    return null
}

export default AccentApplier

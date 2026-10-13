import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import useMe from '@/utils/hooks/useMe'

/** Applies the theme chosen in the profile once, when the user loads (Automatic follows the computer). */
const PreferencesApplier = () => {
    const me = useMe()
    const setMode = useThemeStore((s) => s.setMode)
    const theme = me?.display?.theme
    useEffect(() => {
        if (!theme) return
        if (theme === 'system') setMode(window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        else setMode(theme)
    }, [theme, setMode])
    return null
}

export default PreferencesApplier

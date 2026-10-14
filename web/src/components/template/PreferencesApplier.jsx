import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import useMe from '@/utils/hooks/useMe'

/** Applies the theme set in the profile when the user has not picked one here yet (Automatic follows the computer). */
const PreferencesApplier = () => {
    const me = useMe()
    const theme = me?.display?.theme
    useEffect(() => {
        if (!theme) return
        try { if (localStorage.getItem('themeModeChosen')) return } catch { /* private mode */ }
        useThemeStore.setState({ mode: theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme })
    }, [theme])
    return null
}

export default PreferencesApplier

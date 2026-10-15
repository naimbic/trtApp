import { useEffect } from 'react'
import useMe, { resetMe } from '@/utils/hooks/useMe'
import { useLocaleStore } from '@/store/localeStore'
import { useThemeStore } from '@/store/themeStore'
import { savedLang } from '@/utils/t'
import { nameOfCode } from '@/lib/crm/langCodes'

/** Saves the language a signed-in person picks (profile, staff or client area) so it follows them on every browser. */
export function saveAccountLanguage(code) {
    const name = nameOfCode(code)
    if (!name) return Promise.resolve()
    const portal = window.location.pathname.startsWith('/portal')
    const url = portal ? '/api/portal/profile' : '/api/crm/profile'
    const body = portal ? { language: name } : { staff: { defaultLanguage: name } }
    return fetch(url, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(() => resetMe()).catch(() => {})
}

/** Applies the language saved on the account when it differs from this browser's (once per sign-in); the page restarts so every text switches. */
const AccountLanguage = () => {
    const me = useMe()
    useEffect(() => {
        const code = me?.language
        if (!code || code === savedLang()) return
        const key = `account-lang:${code}`
        try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1') } catch { /* storage blocked */ }
        useLocaleStore.getState().setLang(code)
        useThemeStore.getState().setDirection(code === 'ar' ? 'rtl' : 'ltr')
        setTimeout(() => window.location.reload(), 120)
    }, [me])
    return null
}

export default AccountLanguage

/*! © 2026 TRT Digital — trtCRM. */
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import useBranding from '@/utils/hooks/useBranding'
import { pageTitleFor } from '@/utils/pageTitle'
import { useLocaleStore } from '@/store/localeStore'

/** Keeps the browser tab (and its history entries) titled with the page, then the platform name: "Invoices · trtCRM". Renders nothing. */
const PageTitle = () => {
    const { pathname, search } = useLocation()
    const brand = useBranding()
    const lang = useLocaleStore((s) => s.currentLang)
    useEffect(() => {
        let alive = true
        const name = brand?.name || 'trtCRM'
        let page = pageTitleFor(pathname)
        const set = () => { if (alive) document.title = `${page} · ${name}` }
        document.documentElement.dataset.titled = '1' // the branding no longer overwrites the title with the bare platform name
        // settings: the open group too ("Settings · Calendar")
        const group = pathname === '/crm/settings' ? new URLSearchParams(search).get('group') : null
        if (group) import('@/lib/crm/settings/registry').then((m) => { const l = m.GROUPS[group]?.label; if (l) page = `${page} · ${l}`; set() }).catch(set)
        else set()
        return () => { alive = false }
    }, [pathname, search, brand, lang])
    return null
}

export default PageTitle

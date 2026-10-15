import { useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/zh'
import 'dayjs/locale/ar'
import { useLocaleStore } from '@/store/localeStore'
import fr from './lang/fr'
import es from './lang/es'
import zh from './lang/zh'
import ar from './lang/ar'

dayjs.extend(relativeTime)

// The English text is the key; a language that has no entry for it simply shows the English text.
const DICTS = { fr, es, zh, ar }

// Perfex-style language names stored on the client record -> language codes of the app.
const CLIENT_LANG = { english: 'en', french: 'fr', spanish: 'es', chinese: 'zh', 'chinese_simplified': 'zh', arabic: 'ar' }

/** The language a first-time visitor should get: the client's own language, else the browser's, else English. */
export const guessLang = (clientLanguage) => {
    const byClient = CLIENT_LANG[String(clientLanguage || '').toLowerCase()]
    if (byClient) return byClient
    const nav = String(navigator.language || 'en').slice(0, 2).toLowerCase()
    return ['en', 'fr', 'es', 'zh', 'ar'].includes(nav) ? nav : 'en'
}

/** t('English text', { name }) · date(value, format) · ago(value) · lang · rtl, following the language chosen in the header. */
export function useI18n() {
    const lang = useLocaleStore((s) => s.currentLang)
    return useMemo(() => {
        const dict = DICTS[lang]
        const t = (text, vars) => {
            let out = dict?.[text] ?? text
            if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
            return out
        }
        const date = (v, format = 'DD MMM YYYY') => (v ? dayjs(v).locale(lang).format(format) : '—')
        const ago = (v) => dayjs(v).locale(lang).fromNow()
        return { t, lang, date, ago, rtl: lang === 'ar' }
    }, [lang])
}

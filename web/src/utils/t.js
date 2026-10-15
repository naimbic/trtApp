import dayjs from 'dayjs'
import { dateLocales } from '@/locales'

// Staff-area translation. The English text is the key; a language without an entry shows the English text.
// The dictionary of the chosen language is loaded before the app renders (see main.jsx) and the page is reloaded when the
// language changes, so a plain function is enough: tr('Record payment'), tr('{n} members', { n }).
export const STAFF_LANGS = ['en', 'fr', 'es', 'ja', 'ar']
let dict = {}

export const savedLang = () => {
    try {
        const l = JSON.parse(localStorage.getItem('locale'))?.state?.currentLang
        return STAFF_LANGS.includes(l) ? l : 'en'
    } catch {
        return 'en'
    }
}

export const tr = (text, vars) => {
    let out = dict[text] ?? text
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
    return out
}

/** Count + noun with a plural: trn(3, 'file') -> "3 files" (the dictionary has both 'file' and 'files'; pass the plural when it is irregular). */
export const trn = (n, one, many = `${one}s`) => `${n} ${tr(Number(n) === 1 ? one : many)}`

/** Loads the dictionary and the date language of the saved language. Called once before the first render. */
export async function loadStaffLang() {
    const lang = savedLang()
    document.documentElement.lang = lang
    if (lang !== 'en') {
        try {
            dict = (await import(`../locales/staff/${lang}.js`)).default
            await dateLocales[lang]?.()
            dayjs.locale(lang)
        } catch {
            dict = {}
        }
    }
    return lang
}

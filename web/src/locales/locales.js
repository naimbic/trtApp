import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './lang/en.json'
import fr from './lang/fr.json'
import es from './lang/es.json'
import ja from './lang/ja.json'
import ar from './lang/ar.json'
import appConfig from '@/configs/app.config'

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    ja: { translation: ja },
    ar: { translation: ar },
}

// the language chosen last time (the locale store keeps it), so the first paint is already in it
const saved = (() => {
    try { return JSON.parse(localStorage.getItem('locale'))?.state?.currentLang } catch { return null }
})()

i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'en',
    lng: resources[saved] ? saved : appConfig.locale,
    interpolation: {
        escapeValue: false,
    },
})

export const dateLocales = {
    en: () => import('dayjs/locale/en'),
    fr: () => import('dayjs/locale/fr'),
    es: () => import('dayjs/locale/es'),
    ja: () => import('dayjs/locale/ja'),
    ar: () => import('dayjs/locale/ar'),
}

export default i18n

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './lang/en.json'
import fr from './lang/fr.json'
import es from './lang/es.json'
import zh from './lang/zh.json'
import ar from './lang/ar.json'
import appConfig from '@/configs/app.config'

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    zh: { translation: zh },
    ar: { translation: ar },
}

i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'en',
    lng: appConfig.locale,
    interpolation: {
        escapeValue: false,
    },
})

export const dateLocales = {
    en: () => import('dayjs/locale/en'),
    fr: () => import('dayjs/locale/fr'),
    es: () => import('dayjs/locale/es'),
    zh: () => import('dayjs/locale/zh'),
    ar: () => import('dayjs/locale/ar'),
}

export default i18n

import appConfig from '@/configs/app.config'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import i18n from 'i18next'
import { dateLocales } from '@/locales'
import dayjs from 'dayjs'

export const useLocaleStore = create()(
    devtools(
        persist(
            (set) => ({
                currentLang: appConfig.locale,
                setLang: (lang) => {
                    const formattedLang = lang.replace(
                        /-([a-z])/g,
                        function (g) {
                            return g[1].toUpperCase()
                        },
                    )

                    i18n.changeLanguage(formattedLang)

                    dateLocales[formattedLang]().then(() => {
                        dayjs.locale(formattedLang)
                    })

                    return set({ currentLang: lang })
                },
            }),
            {
                name: 'locale',
                version: 1,
                // Chinese was removed: anyone who had chosen it goes back to English
                migrate: (s) => ({ ...s, currentLang: s?.currentLang === 'zh' ? 'en' : s?.currentLang }),
            },
        ),
    ),
)

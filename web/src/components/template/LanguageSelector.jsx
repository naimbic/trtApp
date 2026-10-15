import { useMemo } from 'react'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useLocaleStore } from '@/store/localeStore'
import { HiCheck } from 'react-icons/hi'
import { useThemeStore } from '@/store/themeStore'
import { useSessionUser } from '@/store/authStore'
import { saveAccountLanguage } from './AccountLanguage'
import { tr } from '@/utils/t'

const languageList = [
    { label: tr("English"), value: 'en', flag: 'US' },
    { label: tr("Français"), value: 'fr', flag: 'FR' },
    { label: tr("Español"), value: 'es', flag: 'ES' },
    { label: '日本語', value: 'ja', flag: 'JP' },
    { label: 'العربية', value: 'ar', flag: 'MA' },
]

const _LanguageSelector = ({ className }) => {
    const { currentLang: locale, setLang } = useLocaleStore((state) => state)
    const user = useSessionUser((s) => s.user)

    const selectLangFlag = useMemo(() => {
        return languageList.find((lang) => lang.value === locale)?.flag
    }, [locale])

    const selectedLanguage = (
        <div className={classNames(className)}>
            <Avatar
                size={24}
                shape="circle"
                src={`/img/countries/${selectLangFlag}.png`}
            />
        </div>
    )

    return (
        <Dropdown renderTitle={selectedLanguage} placement="bottom-end">
            {languageList.map((lang) => (
                <Dropdown.Item
                    key={lang.label}
                    className="justify-between"
                    eventKey={lang.label}
                    onClick={() => {
                        if (lang.value === locale) return
                        setLang(lang.value)
                        useThemeStore.getState().setDirection(lang.value === 'ar' ? 'rtl' : 'ltr')
                        // every text of the staff area is drawn once, so the page restarts in the new language
                        const signedIn = window.location.pathname.startsWith('/portal') ? !window.location.pathname.includes('sign-in') && !window.location.pathname.includes('forgot') : !!user?.authority?.length
                        // a signed-in person's choice is stored on the account first, then the page restarts in the new language
                        Promise.race([signedIn ? saveAccountLanguage(lang.value) : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).finally(() => window.location.reload())
                    }}
                >
                    <span className="flex items-center">
                        <Avatar
                            size={18}
                            shape="circle"
                            src={`/img/countries/${lang.flag}.png`}
                        />
                        <span className="ltr:ml-2 rtl:mr-2">{lang.label}</span>
                    </span>
                    {locale === lang.value && (
                        <HiCheck className="text-emerald-500 text-lg" />
                    )}
                </Dropdown.Item>
            ))}
        </Dropdown>
    )
}

const LanguageSelector = withHeaderItem(_LanguageSelector)

export default LanguageSelector

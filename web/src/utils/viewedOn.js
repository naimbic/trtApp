import dayjs from 'dayjs'
import { savedLang, tr } from '@/utils/t'

const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}` }

/** "Viewed on 12th Nov 2026 at 12:34pm" (the other languages: "… 12 Nov 2026, 12:34"). */
export const viewedOn = (d) => {
    const x = dayjs(d)
    const when = (savedLang() || 'en') === 'en' ? `${ordinal(x.date())} ${x.format('MMM YYYY')} at ${x.format('h:mma')}` : x.format('DD MMM YYYY, HH:mm')
    return tr('Viewed on {when}', { when })
}

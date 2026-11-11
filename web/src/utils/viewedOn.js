import dayjs from 'dayjs'
import { savedLang, tr } from '@/utils/t'

const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}` }

/** "Viewed: 12th Oct 26 - 22h34" (the other languages: "12 Oct 26 - 22h34"). */
export const viewedOn = (d) => {
    const x = dayjs(d)
    const when = `${(savedLang() || 'en') === 'en' ? ordinal(x.date()) : x.format('DD')} ${x.format('MMM YY')} - ${x.format('HH[h]mm')}`
    return tr('Viewed: {when}', { when })
}

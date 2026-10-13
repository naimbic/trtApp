/** Amounts in letters ("Mille deux cents dirhams et cinquante centimes"), French and English. */
const FR_U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
const FR_T = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function fr99(n) {
    if (n < 17) return FR_U[n]
    if (n < 20) return `dix-${FR_U[n - 10]}`
    if (n < 70) {
        const t = Math.floor(n / 10), u = n % 10
        return u === 0 ? FR_T[t] : u === 1 ? `${FR_T[t]} et un` : `${FR_T[t]}-${FR_U[u]}`
    }
    if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${fr99(n - 60)}`
    if (n === 80) return 'quatre-vingts'
    return `quatre-vingt-${fr99(n - 80)}`
}
function fr999(n, final) {
    const h = Math.floor(n / 100), r = n % 100
    let s = ''
    if (h) s = h === 1 ? 'cent' : `${FR_U[h]} cent`
    if (h > 1 && r === 0 && final) s += 's'
    if (r) s += `${s ? ' ' : ''}${r === 80 && !final ? 'quatre-vingt' : fr99(r)}`
    return s
}
function frInt(n) {
    if (n === 0) return 'zéro'
    const parts = [['milliard', 1e9], ['million', 1e6], ['mille', 1e3]]
    let out = [], rest = n
    for (const [name, v] of parts) {
        const q = Math.floor(rest / v)
        if (!q) continue
        rest %= v
        if (name === 'mille') out.push(q === 1 ? 'mille' : `${fr999(q, false)} mille`)
        else out.push(`${fr999(q, false)} ${name}${q > 1 ? 's' : ''}`)
    }
    if (rest) out.push(fr999(rest, true))
    return out.join(' ')
}

const EN_U = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_T = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const en99 = (n) => (n < 20 ? EN_U[n] : `${EN_T[Math.floor(n / 10)]}${n % 10 ? `-${EN_U[n % 10]}` : ''}`)
const en999 = (n) => { const h = Math.floor(n / 100), r = n % 100; return `${h ? `${EN_U[h]} hundred` : ''}${h && r ? ' and ' : ''}${r ? en99(r) : ''}` }
function enInt(n) {
    if (n === 0) return 'zero'
    const out = []
    let rest = n
    for (const [name, v] of [['billion', 1e9], ['million', 1e6], ['thousand', 1e3]]) { const q = Math.floor(rest / v); if (q) { out.push(`${en999(q)} ${name}`); rest %= v } }
    if (rest) out.push(en999(rest))
    return out.join(' ')
}

const UNITS = {
    MAD: { fr: ['dirham', 'dirhams', 'centime', 'centimes'], en: ['dirham', 'dirhams', 'centime', 'centimes'] },
    EUR: { fr: ['euro', 'euros', 'centime', 'centimes'], en: ['euro', 'euros', 'cent', 'cents'] },
    USD: { fr: ['dollar', 'dollars', 'cent', 'cents'], en: ['dollar', 'dollars', 'cent', 'cents'] },
    GBP: { fr: ['livre', 'livres', 'penny', 'pence'], en: ['pound', 'pounds', 'penny', 'pence'] },
}

/** amount → words. `currency` is a code (MAD, EUR…) or null. */
export function amountInWords(amount, { lang = 'french', currency = null, lowercase = false } = {}) {
    const total = Math.round(Math.abs(Number(amount) || 0) * 100)
    const whole = Math.floor(total / 100), cents = total % 100
    const fr = lang === 'french'
    const u = UNITS[String(currency || '').toUpperCase()]?.[fr ? 'fr' : 'en']
    const w = fr ? frInt(whole) : enInt(whole)
    const de = fr && u && whole >= 1e6 && whole % 1e6 === 0 ? ' de' : ''
    let s = `${w}${de}${u ? ` ${whole > 1 ? u[1] : u[0]}` : ''}`
    if (cents) { const c = fr ? frInt(cents) : enInt(cents); s += u ? ` ${fr ? 'et' : 'and'} ${c} ${cents > 1 ? u[3] : u[2]}` : ` ${fr ? 'virgule' : 'point'} ${c}` }
    s = s.replace(/\s+/g, ' ').trim()
    return lowercase ? s.toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1)
}

// Is this the same email, phone or company? No database: tested on its own.
export const normEmail = (v) => String(v || '').trim().toLowerCase()
/** The last 9 digits of a phone number (a country code or a 0 in front does not matter); '' when there are fewer than 7 digits. */
export const normPhone = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-9) : '' }
/** A company name without case, spaces, punctuation and the usual legal endings; '' when it is too short to compare. */
export const normCompany = (v) => {
    const s = String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\./g, '').replace(/\b(sarl|sa|sas|sasu|ltd|llc|inc|gmbh|srl|spa|ag|bv|co)\b/g, ' ').replace(/[^a-z0-9]+/g, '')
    return s.length >= 3 ? s : ''
}
export const sameEmail = (a, b) => !!normEmail(a) && normEmail(a) === normEmail(b)
export const samePhone = (a, b) => !!normPhone(a) && normPhone(a) === normPhone(b)
export const sameCompany = (a, b) => !!normCompany(a) && normCompany(a) === normCompany(b)
/** Why two records look alike: the list of reasons ('email', 'phone', 'company'), empty when they do not. */
export function reasons(a, b) {
    return [sameEmail(a.email, b.email) && 'email', samePhone(a.phone, b.phone) && 'phone', sameCompany(a.company, b.company) && 'company'].filter(Boolean)
}

import prisma from '@/lib/prisma'

/**
 * Merge terms for the company and client blocks printed on documents (and available to email templates).
 * Company: {company_name} {address} {city} {state} {zip_code} {country_code} {phone} {email} {vat_number}
 *          {vat_number_with_label} {company_ice} {company_if} {company_rc} {company_patente} {company_cnss} …
 * Client:  {company_name} {street} {city} {state} {zip_code} {country_code} {country_name} {phone} {email}
 *          {vat_number} {vat_number_with_label} {cf_<id>} (custom fields)
 */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const COMPANY_KEYS = ['invoice_company_name', 'companyname', 'invoice_company_address', 'invoice_company_city', 'company_state', 'invoice_company_postal_code', 'invoice_company_country_code', 'invoice_company_phonenumber', 'company_email', 'company_vat', 'company_ice', 'company_if', 'company_rc', 'company_patente', 'company_cnss', 'company_capital', 'company_bank', 'company_rib', 'company_swift', 'main_domain']

/** `o` is the getter returned by getOptions(). */
export function companyTokenData(o, vatLabel = 'VAT Number') {
    const vat = o('company_vat')
    return {
        company_name: o('invoice_company_name', o('companyname')), address: o('invoice_company_address'), city: o('invoice_company_city'), state: o('company_state'),
        zip_code: o('invoice_company_postal_code'), country_code: o('invoice_company_country_code'), phone: o('invoice_company_phonenumber'), email: o('company_email'),
        vat_number: vat, vat_number_with_label: vat ? `${vatLabel}: ${vat}` : '', website: o('main_domain'),
        company_ice: o('company_ice'), company_if: o('company_if'), company_rc: o('company_rc'), company_patente: o('company_patente'),
        company_cnss: o('company_cnss'), company_capital: o('company_capital'), company_bank: o('company_bank'), company_rib: o('company_rib'), company_swift: o('company_swift'),
    }
}

/** Fills the terms (values are escaped), drops lines left empty and keeps basic formatting tags. */
export function renderInfoFormat(format, data) {
    const filled = String(format || '').replace(/\{([a-z0-9_]+)\}/gi, (_, k) => esc(data[k] ?? ''))
    return filled
        .replace(/<(?!\/?(b|strong|i|em|u|br|p|span|div)\b)[^>]*>/gi, '')
        .split(/<br\s*\/?>|\r?\n/i)
        .map((l) => l.replace(/\s+,/g, ',').replace(/,\s*$/, '').replace(/\s{2,}/g, ' ').trim())
        .filter((l) => l.replace(/<[^>]+>/g, '').replace(/[,\-·\s]/g, ''))
        .join('<br />')
}

/** Data for the client block: billing address first, then the main address; custom field values as {cf_N}. */
export async function clientTokenData(client, doc = {}, vatLabel = 'VAT Number') {
    const countryId = doc.billingCountry ?? client?.billingCountry ?? client?.country
    const country = countryId ? await prisma.crmCountry.findFirst({ where: { legacyId: countryId }, select: { shortName: true, iso2: true } }) : null
    const data = {
        company_name: client?.company || doc.deletedCustomerName || '', street: doc.billingStreet || client?.billingStreet || client?.address || '',
        city: doc.billingCity || client?.billingCity || client?.city || '', state: doc.billingState || client?.billingState || client?.state || '',
        zip_code: doc.billingZip || client?.billingZip || client?.zip || '', country_code: country?.iso2 || '', country_name: country?.shortName || '',
        phone: client?.phoneNumber || '', email: '', vat_number: client?.vat || '', vat_number_with_label: client?.vat ? `${vatLabel}: ${client.vat}` : '',
    }
    if (client?.id) {
        try {
            const [vals, fields] = await Promise.all([
                prisma.crmCustomFieldValue.findMany({ where: { relId: client.id, fieldTo: 'customers' } }),
                prisma.crmCustomField.findMany({ where: { fieldTo: 'customers' }, select: { id: true, legacyId: true } }),
            ])
            const legacy = Object.fromEntries(fields.map((f) => [f.id, f.legacyId]))
            for (const v of vals) if (legacy[v.fieldId] != null) data[`cf_${legacy[v.fieldId]}`] = v.value || ''
        } catch { /* custom fields are optional */ }
        const c = await prisma.crmContact.findFirst({ where: { clientId: client.id, active: true }, orderBy: { isPrimary: 'desc' }, select: { email: true } })
        data.email = c?.email || ''
    }
    return data
}

/** PHP-style date format ("d/m/Y|%d/%m/%Y" as stored by Perfex) → text. */
export function phpDate(d, fmt = 'd/m/Y', tz) {
    if (!d) return ''
    const f = String(fmt).split('|')[0] || 'd/m/Y'
    const x = new Date(d)
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(x).reduce((a, p) => ({ ...a, [p.type]: p.value }), {})
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const map = { d: parts.day, j: String(Number(parts.day)), m: parts.month, n: String(Number(parts.month)), Y: parts.year, y: parts.year.slice(2), M: MON[Number(parts.month) - 1].slice(0, 3), F: MON[Number(parts.month) - 1], H: parts.hour === '24' ? '00' : parts.hour, i: parts.minute }
    return f.replace(/[djmnYyMFHi]/g, (c) => map[c])
}

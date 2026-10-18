// Merge terms usable in the company and client blocks printed on documents.
export const COMPANY_TOKENS = ['company_name', 'address', 'city', 'state', 'zip_code', 'country_code', 'phone', 'email', 'vat_number', 'vat_number_with_label', 'company_ice', 'company_if', 'company_rc', 'company_patente', 'company_cnss', 'company_capital', 'company_bank', 'company_rib', 'company_swift', 'company_bank_holder']
export const CLIENT_TOKENS = ['company_name', 'street', 'city', 'state', 'zip_code', 'country_code', 'country_name', 'phone', 'email', 'vat_number', 'vat_number_with_label']

const SAFE = /<(?!\/?(b|strong|i|em|u|br|p|span|div)\b)[^>]*>/gi
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Fills a format with data; unknown or empty terms disappear, and lines that end up empty are dropped. */
export function renderFormat(format, data) {
    const filled = String(format || '').replace(/\{([a-z0-9_]+)\}/gi, (_, k) => esc(data[k] ?? ''))
    return filled.replace(SAFE, '').split(/<br\s*\/?>|\n/i).map((l) => l.trim()).filter((l) => l.replace(/<[^>]+>/g, '').replace(/[,\-·\s]/g, '')).join('<br />')
}

export const companyData = (v) => ({
    company_name: v.invoice_company_name, address: v.invoice_company_address, city: v.invoice_company_city, state: v.company_state, zip_code: v.invoice_company_postal_code,
    country_code: v.invoice_company_country_code, phone: v.invoice_company_phonenumber, email: v.company_email, vat_number: v.company_vat,
    vat_number_with_label: v.company_vat ? `VAT Number: ${v.company_vat}` : '',
    company_ice: v.company_ice, company_if: v.company_if, company_rc: v.company_rc, company_patente: v.company_patente, company_cnss: v.company_cnss,
    company_capital: v.company_capital, company_bank: v.company_bank, company_rib: v.company_rib, company_swift: v.company_swift, company_bank_holder: '',
})

export const SAMPLE_CLIENT = { company_name: 'Atlas Studio SARL', street: '12 Rue des Orangers', city: 'Casablanca', state: 'Grand Casablanca', zip_code: '20250', country_code: 'MA', country_name: 'Morocco', phone: '+212 522 00 00 00', email: 'contact@atlas.ma', vat_number: '001234567000089', vat_number_with_label: 'VAT Number: 001234567000089' }

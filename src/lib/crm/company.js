import { PermissionError, requirePermission } from '@/lib/crm/permissions'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { uploadImage, deleteMedia, keyFromUrl, MediaError } from '@/lib/media'

const fail = (message, status = 400) => { throw new PermissionError(message, status) }
const KEYS = ['companyname', 'invoice_company_name', 'invoice_company_address', 'invoice_company_city', 'invoice_company_postal_code', 'invoice_company_phonenumber', 'company_email', 'main_domain', 'company_vat', 'company_info_format', 'company_logo_url', 'company_logo_dark_url', 'company_signature_url']
const IMAGES = { logo: ['company_logo_url', 'logo'], logoDark: ['company_logo_dark_url', 'logo'], signature: ['company_signature_url', 'signature'] }

const brToLines = (h) => String(h || '').replace(/<br\s*\/?>\s*/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function getCompany() {
    await requirePermission('settings', 'view')
    const o = await getOptions(KEYS)
    return {
        name: o('invoice_company_name', o('companyname')), brand: o('companyname'), address: o('invoice_company_address'), city: o('invoice_company_city'), postcode: o('invoice_company_postal_code'),
        phone: o('invoice_company_phonenumber'), email: o('company_email'), website: o('main_domain'), vat: o('company_vat'), details: brToLines(o('company_info_format')),
        logo: o('company_logo_url'), logoDark: o('company_logo_dark_url'), signature: o('company_signature_url'),
    }
}

export async function saveCompany(b) {
    await requirePermission('settings', 'edit')
    const t = (v, max = 200) => String(v ?? '').trim().slice(0, max)
    const email = t(b.email)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid company email')
    const website = t(b.website)
    if (website && !/^https?:\/\/[^\s]+$/i.test(website)) fail('The website must start with https://')
    if (!t(b.name)) fail('Company name is required')
    const lines = t(b.details, 1500).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    await setOptions({
        invoice_company_name: t(b.name), companyname: t(b.brand) || t(b.name), invoice_company_address: t(b.address), invoice_company_city: t(b.city, 80), invoice_company_postal_code: t(b.postcode, 20),
        invoice_company_phonenumber: t(b.phone, 40), company_email: email, main_domain: website, company_vat: t(b.vat, 60),
        company_info_format: lines.map(esc).join('<br />\n'),
    })
    return getCompany()
}

export async function setCompanyImage(kind, file) {
    await requirePermission('settings', 'edit')
    const spec = IMAGES[kind]
    if (!spec) fail('Unknown image')
    const old = (await getOptions([spec[0]]))(spec[0])
    try {
        const up = await uploadImage(file, spec[1], 'company')
        await setOptions({ [spec[0]]: up.url })
        await deleteMedia(keyFromUrl(old)).catch(() => {})
        return { url: up.url, size: up.size, originalSize: up.originalSize }
    } catch (e) {
        if (e instanceof MediaError) fail(e.message, e.status)
        throw e
    }
}

export async function removeCompanyImage(kind) {
    await requirePermission('settings', 'edit')
    const spec = IMAGES[kind]
    if (!spec) fail('Unknown image')
    const old = (await getOptions([spec[0]]))(spec[0])
    await setOptions({ [spec[0]]: '' })
    await deleteMedia(keyFromUrl(old)).catch(() => {})
    return { url: null }
}

// ---- used by the PDF / public pages: the logo as a data URI (so documents render and print without outside requests)
const cache = new Map()
export async function companyImageDataUri(kind, fallbackFile, keys) {
    const spec = IMAGES[kind] || IMAGES.logo
    const lookup = keys || [spec[0]]
    const get = await getOptions(lookup)
    const url = lookup.map((k) => get(k)).find(Boolean) || ''
    if (url) {
        const hit = cache.get(url)
        if (hit && Date.now() - hit.at < 600000) return hit.uri
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
            if (res.ok) {
                const uri = `data:${res.headers.get('content-type') || 'image/webp'};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
                cache.set(url, { uri, at: Date.now() })
                return uri
            }
        } catch { /* fall back to the bundled file */ }
    }
    return fallbackFile || ''
}

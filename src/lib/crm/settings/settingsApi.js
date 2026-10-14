import prisma from '@/lib/prisma'
import { PermissionError, requirePermission } from '@/lib/crm/permissions'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { uploadImage, dropImage, MediaError } from '@/lib/media'
import { resetNumberingCache } from '@/lib/crm/numbering'
import { GROUPS, ALL_FIELDS, fieldsOf, fieldMap } from '@/lib/crm/settings/registry'

const fail = (message, status = 400) => { throw new PermissionError(message, status) }

/* ---- Perfex stores the default taxes as serialized PHP: a:1:{i:0;s:9:"TVA|20.00";} ---- */
export const parseTaxList = (raw) => [...String(raw || '').matchAll(/s:\d+:"([^"]*)"/g)].map((m) => m[1])
export const serializeTaxList = (list) => `a:${list.length}:{${list.map((t, i) => `i:${i};s:${Buffer.byteLength(t)}:"${t}";`).join('')}}`

const TIMEZONES = new Set(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])
const isSecret = (f) => f.type === 'password'

export async function getSettings(group) {
    await requirePermission('settings', 'view')
    const g = GROUPS[group]
    if (!g) fail('Unknown settings group', 404)
    const fields = fieldsOf(group)
    const o = await getOptions(fields.map((x) => x.key))
    const values = {}, secrets = {}
    for (const x of fields) {
        const raw = o(x.key, '')
        if (isSecret(x)) { secrets[x.key] = !!raw; continue }
        if (x.type === 'image') { values[x.key] = /^https?:\/\//i.test(raw) ? raw : ''; continue } // old Perfex file names are not usable addresses
        values[x.key] = x.type === 'taxes' ? parseTaxList(raw) : raw !== '' ? raw : x.default ?? ''
    }
    return { group, values, secrets }
}

function clean(x, v) {
    const t = x.type
    if (t === 'switch') return v === true || v === '1' || v === 1 ? '1' : '0'
    if (t === 'number') {
        if (v === '' || v == null) return ''
        const n = Number(v)
        if (!Number.isFinite(n)) fail(`${x.label}: enter a number`)
        if (x.min != null && n < x.min) fail(`${x.label}: must be at least ${x.min}`)
        if (x.max != null && n > x.max) fail(`${x.label}: must be at most ${x.max}`)
        return String(Math.round(n * 100) / 100)
    }
    if (t === 'select') {
        const val = String(v ?? '')
        if (!x.options.some((o) => String(o.value) === val)) fail(`${x.label}: choose one of the listed values`)
        return val
    }
    if (t === 'timezone') {
        const val = String(v ?? '')
        if (val && TIMEZONES.size && !TIMEZONES.has(val)) fail(`${x.label}: unknown time zone`)
        return val
    }
    if (t === 'color') {
        const val = String(v ?? '').trim()
        if (val && !/^#[0-9a-f]{6}$/i.test(val)) fail(`${x.label}: use a colour like #323a45`)
        return val
    }
    if (t === 'taxes') {
        const list = (Array.isArray(v) ? v : []).map(String).filter((s) => /^[^|]{1,40}\|\d{1,3}(\.\d{1,2})?$/.test(s))
        return serializeTaxList(list)
    }
    const max = x.max && t === 'text' ? x.max : t === 'html' || t === 'textarea' ? 30000 : 500
    const val = String(v ?? '').trim().slice(0, max)
    if (x.url && val && !/^https?:\/\/[^\s]+$/i.test(val)) fail(`${x.label}: must start with http:// or https://`)
    if (x.emails && val && !val.split(/[,;\s]+/).filter(Boolean).every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) fail(`${x.label}: enter valid email addresses`)
    return t === 'html' || t === 'textarea' ? String(v ?? '').slice(0, max) : val
}

export async function saveSettings(group, values = {}) {
    await requirePermission('settings', 'edit')
    const map = fieldMap(group)
    if (!GROUPS[group]) fail('Unknown settings group', 404)
    const out = {}
    for (const [key, v] of Object.entries(values)) {
        const x = map[key]
        if (!x) continue // ignore anything that is not a field of this group
        if (x.type === 'image') continue // images have their own endpoint
        if (isSecret(x)) { if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, 500); continue } // empty = keep
        out[key] = clean(x, v)
    }
    // a few cross-checks
    for (const k of Object.keys(out)) {
        if (/^next_.*_number$/.test(k) && out[k] !== '' && !(Number(out[k]) >= 1)) fail('The next number must be 1 or more')
    }
    await setOptions(out)
    resetNumberingCache()
    return getSettings(group)
}

/* ---- images (logos, favicon, signature) ---- */
async function currentUrl(key) { return (await getOptions([key]))(key) }

export async function setSettingImage(key, { file, mediaId }) {
    await requirePermission('settings', 'edit')
    const x = ALL_FIELDS[key]
    if (!x || x.type !== 'image') fail('Unknown image setting')
    const old = await currentUrl(key)
    let url
    try {
        if (mediaId) {
            const m = await prisma.crmMedia.findUnique({ where: { id: mediaId } })
            if (!m || m.isFolder || m.kind !== 'image' || !m.url) fail('Choose an image from the file manager')
            url = m.url
        } else {
            const up = await uploadImage(file, x.preset || 'logo', 'settings')
            url = up.url
        }
    } catch (e) {
        if (e instanceof MediaError) fail(e.message, e.status)
        throw e
    }
    await setOptions({ [key]: url })
    if (old && old !== url) await dropImage(old).catch(() => {})
    return { url }
}

export async function clearSettingImage(key) {
    await requirePermission('settings', 'edit')
    const x = ALL_FIELDS[key]
    if (!x || x.type !== 'image') fail('Unknown image setting')
    const old = await currentUrl(key)
    await setOptions({ [key]: '' })
    // only delete the object when no other setting points at it and it is not in the file manager index
    if (old) {
        const used = await prisma.crmMedia.findFirst({ where: { url: old } })
        if (!used) await dropImage(old).catch(() => {})
    }
    return { url: null }
}

/* ---- read by the app itself ---- */
/** Public: what the sign-in page and browser tab need. */
export async function getBranding() {
    const o = await getOptions(['platform_name', 'platform_logo', 'platform_logo_dark', 'favicon'])
    const url = (k) => (/^https?:\/\//i.test(o(k)) ? o(k) : '')
    return { name: o('platform_name', 'trtCRM'), logo: url('platform_logo'), logoDark: url('platform_logo_dark'), favicon: url('favicon') }
}

const APP_KEYS = ['dateformat', 'time_format', 'default_timezone', 'active_language', 'decimal_separator', 'thousand_separator', 'remove_decimals_on_zero', 'default_view_calendar', 'calendar_first_day', 'calendar_events_limit', 'show_tasks_on_calendar', 'show_invoices_on_calendar', 'show_estimates_on_calendar', 'show_proposals_on_calendar', 'show_contracts_on_calendar', 'show_projects_on_calendar', 'invoice_due_after', 'predefined_clientnote_invoice', 'predefined_terms_invoice', 'default_tax', 'show_tax_per_item', 'company_is_required', 'media_max_file_size_upload', 'allowed_files', 'estimate_due_after', 'predefined_clientnote_estimate', 'predefined_terms_estimate']
/** Signed-in users: the non-secret settings screens use to behave (formats, defaults, calendar). */
export async function getAppSettings() {
    const { auth } = await import('@/auth')
    const session = await auth()
    if (!session?.user?.id) throw new PermissionError('Unauthorized', 401)
    const o = await getOptions(APP_KEYS)
    const out = {}
    for (const k of APP_KEYS) out[k] = k === 'default_tax' ? parseTaxList(o(k)) : o(k, ALL_FIELDS[k]?.default ?? '')
    return out
}

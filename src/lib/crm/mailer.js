import nodemailer from 'nodemailer'
import prisma from '@/lib/prisma'

/** Option helpers (Perfex stores all settings in the options table). */
export async function getOptions(names) {
    const rows = await prisma.crmOption.findMany({ where: { name: { in: names } } })
    const map = Object.fromEntries(rows.map((r) => [r.name, r.value]))
    return (n, fb = '') => (map[n] != null && map[n] !== '' ? map[n] : fb)
}

export async function setOptions(values) {
    for (const [name, value] of Object.entries(values)) {
        await prisma.crmOption.upsert({ where: { name }, update: { value: String(value ?? '') }, create: { name, value: String(value ?? '') } })
    }
}

export const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_email', 'smtp_password', 'smtp_encryption', 'smtp_from_name', 'companyname']

/** SMTP settings from the options table, falling back to the SMTP_* env variables used by the login emails. */
export async function getSmtp() {
    const o = await getOptions(SMTP_KEYS)
    const host = o('smtp_host', process.env.SMTP_HOST || '')
    const port = Number(o('smtp_port', process.env.SMTP_PORT || '')) || 465
    const rawEnc = o('smtp_encryption', process.env.SMTP_SECURE === 'false' ? 'tls' : 'ssl')
    const encryption = rawEnc === 'none' ? '' : rawEnc // '' is stored as 'none' because empty options count as unset
    const user = o('smtp_username', o('smtp_email', process.env.SMTP_USER || ''))
    return {
        host, port, encryption, user,
        pass: o('smtp_password', process.env.SMTP_PASS || ''),
        email: o('smtp_email', process.env.SMTP_FROM || user),
        fromName: o('smtp_from_name', o('companyname', '')),
    }
}

export const smtpReady = (s) => !!(s.host && s.email)

async function transportFor(s) {
    return nodemailer.createTransport({
        host: s.host,
        port: s.port,
        secure: s.encryption === 'ssl' || (!s.encryption && s.port === 465),
        requireTLS: s.encryption === 'tls',
        auth: s.user ? { user: s.user, pass: s.pass } : undefined,
        connectionTimeout: 15000,
        socketTimeout: 20000,
    })
}

/** Replace {merge_fields}; unknown fields are removed like Perfex does. */
export const mergeFields = (text, data) => String(text ?? '').replace(/\{([a-z0-9_]+)\}/gi, (m, k) => (k in data ? String(data[k] ?? '') : ''))

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
export const stripHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()

/** Perfex layout: header + message + signature + footer. */
export async function buildHtml(message, data) {
    const o = await getOptions(['email_header', 'email_footer', 'email_signature'])
    return mergeFields(`${o('email_header')}${message}${o('email_signature')}${o('email_footer')}`, data)
}

/** Template for a slug in the company language, falling back to English then any language. */
export async function findTemplate(slug, language) {
    for (const lang of [language, 'english']) {
        if (!lang) continue
        const t = await prisma.crmEmailTemplate.findFirst({ where: { slug, language: lang } })
        if (t) return t
    }
    return prisma.crmEmailTemplate.findFirst({ where: { slug } })
}

export async function companyLanguage() {
    const o = await getOptions(['active_language'])
    return o('active_language', 'english')
}

/** Base merge data shared by every template. */
export async function baseData() {
    const o = await getOptions(['companyname', 'main_domain', 'email_signature'])
    const site = (process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3200').replace(/\/$/, '')
    return {
        companyname: o('companyname'),
        crm_url: site,
        main_domain: o('main_domain'),
        email_signature: o('email_signature'),
        logo_url: '',
        logo_image_with_url: '',
        dark_logo_image_with_url: '',
    }
}

/** Sends one message. Returns { sent, error }. Never throws for SMTP problems; callers log the outcome. */
export async function deliver({ to, cc, subject, html, fromName, fromEmail }) {
    const s = await getSmtp()
    if (!smtpReady(s)) return { sent: false, error: 'SMTP is not configured. Add the mail server in Mails → Settings.' }
    try {
        const t = await transportFor(s)
        await t.sendMail({
            from: { name: fromName || s.fromName || '', address: fromEmail || s.email },
            to, cc: cc || undefined, subject, html, text: stripHtml(html),
        })
        return { sent: true }
    } catch (e) {
        return { sent: false, error: e?.message || 'Could not send the email' }
    }
}

export async function testConnection() {
    const s = await getSmtp()
    if (!smtpReady(s)) return { ok: false, error: 'SMTP host and email are required' }
    try { await (await transportFor(s)).verify(); return { ok: true } } catch (e) { return { ok: false, error: e?.message || 'Connection failed' } }
}

export { escapeHtml }

import nodemailer from 'nodemailer'
import prisma from '@/lib/prisma'
import { SIGNATURE_CSS } from '@/lib/crm/mailDesign/signature'
import { notifyChannels, emailAllowed } from '@/lib/crm/channels'
import { companyTokenData, COMPANY_KEYS } from '@/lib/crm/docTokens'
import { buildMessage, DESIGN_LANGUAGES } from '@/lib/crm/mailDesign/build'

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

export const SMTP_KEYS = ['email_protocol', 'bcc_emails', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_email', 'smtp_password', 'smtp_encryption', 'smtp_from_name', 'companyname']

/** SMTP settings from the options table, falling back to the SMTP_* env variables used by the login emails. */
export async function getSmtp() {
    const o = await getOptions(SMTP_KEYS)
    const host = o('smtp_host', process.env.SMTP_HOST || '')
    const port = Number(o('smtp_port', process.env.SMTP_PORT || '')) || 465
    const rawEnc = o('smtp_encryption', process.env.SMTP_SECURE === 'false' ? 'tls' : 'ssl')
    const encryption = rawEnc === 'none' ? '' : rawEnc // '' is stored as 'none' because empty options count as unset
    const user = o('smtp_username', o('smtp_email', process.env.SMTP_USER || ''))
    return {
        protocol: o('email_protocol', 'smtp') === 'sendmail' ? 'sendmail' : 'smtp',
        bcc: o('bcc_emails', ''),
        host, port, encryption, user,
        pass: o('smtp_password', process.env.SMTP_PASS || ''),
        email: o('smtp_email', process.env.SMTP_FROM || user),
        fromName: o('smtp_from_name', o('companyname', '')),
    }
}

/** Extra "send from" mailboxes, each with its own login (some mail servers only accept a sender equal to the login). Stored as JSON in the options. */
export async function getAccounts() {
    try { const raw = (await getOptions(['mail_sender_accounts']))('mail_sender_accounts', '[]'); const list = JSON.parse(raw); return Array.isArray(list) ? list.filter((a) => a?.email) : [] } catch { return [] }
}
/** The server settings to use when sending as this address: its own account when one is set, otherwise the main server. */
export async function smtpFor(fromEmail) {
    const s = await getSmtp()
    const key = String(fromEmail || '').trim().toLowerCase()
    const a = key && (await getAccounts()).find((x) => String(x.email).toLowerCase() === key)
    if (!a) return s
    const own = !!String(a.host || '').trim()
    return { ...s, host: own ? String(a.host).trim() : s.host, port: own ? Number(a.port) || 465 : s.port, encryption: own ? (a.encryption === 'tls' ? 'tls' : a.encryption === 'none' ? '' : 'ssl') : s.encryption, user: String(a.username || a.email).trim(), pass: a.password || '', email: String(a.email).trim(), fromName: a.fromName || s.fromName, protocol: 'smtp' }
}

export const smtpReady = (s) => !!(s.email && (s.host || s.protocol === 'sendmail'))

async function transportFor(s) {
    if (s.protocol === 'sendmail') return nodemailer.createTransport({ sendmail: true, newline: 'unix', path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail' })
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
export const mergeFields = (text, data, fallback) => String(text ?? '').replace(/\{([a-z0-9_]+)\}/gi, (m, k) => (k in data ? String(data[k] ?? '') : fallback ? fallback(k) : ''))

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
export const stripHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()

/** Perfex layout: header + message + signature + footer. */
export async function buildHtml(message, data, fallback, personalSignature = null) {
    const o = await getOptions(['email_header', 'email_footer', 'email_signature'])
    const sig = personalSignature || o('email_signature') // the sender's own signature (Profile) wins over the company one
    // the signature is tidied for phones whatever it contains: a capped logo, stacked on a small screen
    const wrapped = sig ? `<style>${SIGNATURE_CSS}</style><div class="sig">${sig}</div>` : ''
    return mergeFields(`${o('email_header')}${message}${wrapped}${o('email_footer')}`, data, fallback)
}

/** Template for a slug in the company language, falling back to English then any language. */
export async function findTemplate(slug, language) {
    for (const lang of [language, 'english']) {
        if (!lang) continue
        const t = await prisma.crmEmailTemplate.findFirst({ where: { slug, language: lang } })
        if (t) return t
    }
    const any = await prisma.crmEmailTemplate.findFirst({ where: { slug } })
    if (any) return any
    // templates this app added after the Perfex import (for example purchase orders) are created on first use
    for (const lang of [language, 'english'].filter((l) => DESIGN_LANGUAGES.includes(l))) {
        const built = buildMessage(slug, lang)
        if (!built) continue
        return prisma.crmEmailTemplate.create({ data: { type: slug.startsWith('purchase-order') ? 'purchase_order' : 'other', slug, language: lang, name: slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), subject: built.subject, message: built.message, fromName: '{companyname}', plainText: false, active: true, sortOrder: 0 } })
    }
    return null
}

export async function companyLanguage() {
    const o = await getOptions(['active_language'])
    return o('active_language', 'english')
}

/** Base merge data shared by every template. */
export async function baseData() {
    const o = await getOptions([...COMPANY_KEYS, 'email_signature'])
    const site = (process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3200').replace(/\/$/, '')
    return {
        ...companyTokenData(o),
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
export async function deliver({ to, cc, bcc, replyTo, subject, html, fromName, fromEmail, attachments }) {
    const s = await smtpFor(fromEmail)
    if (!smtpReady(s)) return { sent: false, error: 'SMTP is not configured. Add the mail server in Mails → Settings.' }
    try {
        const t = await transportFor(s)
        await t.sendMail({
            from: { name: fromName || s.fromName || '', address: fromEmail || s.email },
            to, cc: cc || undefined, replyTo: replyTo || undefined, bcc: [...(s.bcc ? s.bcc.split(/[,;\s]+/) : []), ...(bcc ? String(bcc).split(/[,;\s]+/) : [])].filter(Boolean).join(', ') || undefined, subject, html, text: stripHtml(html), attachments: attachments?.length ? attachments : undefined,
        })
        return { sent: true }
    } catch (e) {
        return { sent: false, error: e?.message || 'Could not send the email' }
    }
}

export async function testConnection(fromEmail) {
    const s = await smtpFor(fromEmail)
    if (!smtpReady(s)) return { ok: false, error: 'SMTP host and email are required' }
    try { await (await transportFor(s)).verify(); return { ok: true } } catch (e) { return { ok: false, error: e?.message || 'Connection failed' } }
}

export { escapeHtml }

/** Sends an email template to explicit addresses (staff or clients) with merge data. Logged in the sent log. */
export async function sendTemplate({ slug, to, data = {}, relType = null, relId = null }) {
    const t = await findTemplate(slug, await companyLanguage())
    if (!t || t.active === false) return { sent: false, error: `Email template "${slug}" is missing or turned off` }
    const full = { ...(await baseData()), ...data }
    const subject = mergeFields(t.subject, full)
    // the person may have chosen to be notified only on Telegram / WhatsApp (sign-in and password emails always go)
    const res = (await emailAllowed(Array.isArray(to) ? to[0] : to, slug)) ? await deliver({ to, subject, html: await buildHtml(t.message, full) }) : { sent: false, error: 'The recipient chose not to receive email notifications', skipped: true }
    await prisma.crmMailLog.create({ data: { to, subject, template: slug, relType, relId: relId || undefined, status: res.sent ? 'sent' : 'failed', error: res.error || null } }).catch(() => {})
    await notifyChannels({ email: Array.isArray(to) ? to[0] : to, subject, data: full, relType, relId }) // the same message by Telegram / WhatsApp, for people who switched it on
    return res
}

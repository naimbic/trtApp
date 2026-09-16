import nodemailer from 'nodemailer'
import { buildLeadEmail } from './emailTemplate'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_TO, SENT_TO } = process.env

// Recipient of lead notifications. SENT_TO is the primary name across all trt
// sites; SMTP_TO kept for backwards-compat; hello@ is the final fallback.
const MAIL_TO = SENT_TO || SMTP_TO || 'hello@trtmaroc.com'

const isConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS

let transporter = null
if (isConfigured) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
}

/**
 * Send an email (fire-and-forget). Silently skips if SMTP is not configured.
 * @param {string} subject
 * @param {string} html - HTML body
 * @param {string} [to] - defaults to SMTP_TO env var
 */
export async function sendMail(subject, html, to) {
    if (!isConfigured || !transporter) return
    try {
        await transporter.sendMail({
            from: `"TRT Admin" <${SMTP_USER}>`,
            to: to || MAIL_TO,
            subject,
            html,
        })
    } catch (err) {
        console.error('sendMail error:', err.message)
    }
}

/**
 * Build a styled HTML email for a new form submission
 */
export function buildSubmissionEmail(data) {
    const website = data.website || ''
    const websiteLink = /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : ''
    return buildLeadEmail({
        brand: { siteName: 'trtMaroc', siteUrl: 'https://trtmaroc.com' },
        heading: `Nouvelle soumission — ${data.form || 'formulaire'}`,
        badge: [data.form, data.site].filter(Boolean).join(' · '),
        sections: [
            {
                title: 'Coordonnées',
                fields: [
                    { label: 'Nom', value: data.name },
                    { label: 'Email', value: data.email, href: data.email ? `mailto:${data.email}` : undefined },
                    { label: 'Téléphone', value: data.phone, href: data.phone ? `tel:${String(data.phone).replace(/\s+/g, '')}` : undefined },
                    { label: 'Entreprise', value: data.company },
                    { label: 'Site web', value: websiteLink || website, href: websiteLink || undefined },
                ],
            },
            {
                title: 'Projet',
                fields: [
                    { label: 'Services', value: data.needs },
                    { label: 'Budget', value: data.budget || [data.budgetMin, data.budgetMax].filter(Boolean).join(' – ') },
                    { label: 'Délai', value: data.deadline },
                    { label: 'Message', value: data.message, wide: true },
                ],
            },
        ],
        meta: { pageUrl: data.pageUrl || data.page, ip: data.ip, userAgent: data.userAgent },
    })
}

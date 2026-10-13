import nodemailer from 'nodemailer'

/** Mail is optional: configure SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE) to enable it. */
export const isMailConfigured = () => !!process.env.SMTP_HOST

let transporter
const getTransporter = () => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 465
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        })
    }
    return transporter
}

export async function sendMail({ to, subject, text, html }) {
    if (!isMailConfigured()) return { sent: false, reason: 'smtp-not-configured' }
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html })
    return { sent: true }
}

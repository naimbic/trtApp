/**
 * Canonical TRT lead-form API route (Next.js App Router).
 * Copy to `app/api/contact/route.ts` in any spoke site.
 *
 * Behavior (same across every TRT site):
 *   1. validate + cap the payload, drop honeypot hits, rate-limit per IP
 *   2. send a best-effort notification email (this site's SMTP) — timeout-bounded
 *   3. forward the lead to the central hub (app.trtmaroc.com) /api/submissions
 *      with the site's x-api-key → stored + shown in the trtApp dashboard,
 *      tagged with this site (via the key) and the page it came from (pageUrl)
 *
 * Every external step is optional and bounded, so a blocked SMTP port or a
 * hub hiccup can never hang or break the form.
 *
 * Env (set in this site's Coolify):
 *   ADMIN_API_URL=https://app.trtmaroc.com      # the hub
 *   PROXY_API_KEY=trt_<slug>_xxxxxxxx           # this site's key (Sites dashboard)
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  # this site's mailbox
 *   SENT_TO=commercial@trtdigital.ma            # where notifications go
 *   SITE_NAME="TRT Digital"                     # shown in the email subject/body
 */
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const HUB = process.env.ADMIN_API_URL || ''
const API_KEY = process.env.PROXY_API_KEY || ''
const MAIL_TO = process.env.SENT_TO || process.env.CONTACT_TO || 'commercial@trtdigital.ma'
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_USER = process.env.SMTP_USER || 'commercial@trtdigital.ma'
const SITE_NAME = process.env.SITE_NAME || 'TRT'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
    ])
}

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function safeHttpUrl(u: string) {
    try {
        const url = new URL(u)
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
    } catch {
        return ''
    }
}

function sendEmail(fromName: string, fromEmail: string, subject: string, html: string) {
    const port = parseInt(process.env.SMTP_PORT || '465', 10)
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: SMTP_USER, pass: process.env.SMTP_PASS || '' },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
    })
    const cleanName = fromName.replace(/"/g, '')
    return transporter.sendMail({
        from: `"${cleanName} via ${SITE_NAME}" <${SMTP_USER}>`,
        replyTo: `"${cleanName}" <${fromEmail}>`,
        to: MAIL_TO,
        subject,
        html,
    })
}

const hits = new Map<string, { count: number; ts: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function clientIp(req: Request) {
    const fwd = req.headers.get('x-forwarded-for')
    return (fwd ? fwd.split(',')[0] : '').trim() || 'unknown'
}

function allow(ip: string) {
    const now = Date.now()
    const rec = hits.get(ip)
    if (!rec || now - rec.ts > WINDOW_MS) {
        hits.set(ip, { count: 1, ts: now })
        return true
    }
    rec.count += 1
    return rec.count <= MAX_PER_WINDOW
}

const cap = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: Request) {
    const ip = clientIp(request)
    if (!allow(ip)) {
        return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 })
    }

    try {
        const body = await request.json()

        // Honeypot — silently accept so bots think they succeeded.
        if (cap(body?.hp, 100)) return NextResponse.json({ success: true })

        const name = cap(body?.name, 120)
        const email = cap(body?.email, 200)
        if (!name || !email || !EMAIL_RE.test(email)) {
            return NextResponse.json({ error: 'A valid name and email are required.' }, { status: 400 })
        }

        const phone = cap(body?.phone, 40)
        const company = cap(body?.company, 120)
        const website = cap(body?.website, 300)
        const services = Array.isArray(body?.services)
            ? body.services.map((s: unknown) => cap(s, 60)).filter(Boolean).slice(0, 12)
            : []
        const budget = cap(body?.budget, 80)
        const timeline = cap(body?.timeline, 80)
        const message = cap(body?.message, 5000)
        const pageUrl = cap(body?.pageUrl, 300)
        const form = cap(body?.form, 40) || 'contact'

        const needs = services.join(', ')
        // Field names match the hub Submission model. `pageUrl` is stored as `page`.
        const payload = { form, name, email, phone, company, website, needs, budget, deadline: timeline, message, pageUrl }

        const websiteLink = safeHttpUrl(website)
        const row = (label: string, value: string) =>
            value
                ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${label}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(value)}</td></tr>`
                : ''
        const emailHtml = `
      <h2>New request — ${escapeHtml(SITE_NAME)}</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px">
        ${row('Name', name)}
        ${row('Email', email)}
        ${row('Phone', phone)}
        ${row('Company', company)}
        ${websiteLink ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Website</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="${escapeHtml(websiteLink)}">${escapeHtml(websiteLink)}</a></td></tr>` : ''}
        ${row('Services', needs)}
        ${row('Budget', budget)}
        ${row('Timeline', timeline)}
        ${row('Message', message)}
      </table>
      <p style="color:#999;font-size:12px;margin-top:20px">Sent from ${escapeHtml(pageUrl || SITE_NAME)} · IP: ${escapeHtml(ip)}</p>
    `
        const subject = `[${form}] ${name}${company ? ` — ${company}` : ''}`

        const emailTask = SMTP_HOST
            ? withTimeout(sendEmail(name, email, subject, emailHtml), 8000, 'email').then(() => true).catch((e) => {
                  console.error('[Contact] email failed:', (e as Error)?.message)
                  return false
              })
            : Promise.resolve(false)

        // Hub (source of truth) when configured — await it.
        if (HUB && API_KEY) {
            let hubOk = false
            try {
                const r = await withTimeout(
                    fetch(`${HUB}/api/submissions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
                        body: JSON.stringify(payload),
                    }),
                    10000,
                    'hub',
                )
                hubOk = r.ok
                if (!r.ok) console.error('[Contact] hub status', r.status)
            } catch (e) {
                console.error('[Contact] hub failed:', (e as Error)?.message)
            }
            if (hubOk) {
                void emailTask // record saved; let the email finish in the background
                return NextResponse.json({ success: true })
            }
            const emailOk = await emailTask
            return emailOk
                ? NextResponse.json({ success: true })
                : NextResponse.json({ error: 'Could not submit your request.' }, { status: 502 })
        }

        // No hub configured: succeed on the email if SMTP is set, else accept + log.
        if (SMTP_HOST) {
            const emailOk = await emailTask
            if (emailOk) return NextResponse.json({ success: true })
            return NextResponse.json({ error: 'Could not submit your request.' }, { status: 502 })
        }
        console.log('[Contact] lead received:', payload)
        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[Contact] Unexpected error:', (e as Error)?.message)
        return NextResponse.json({ error: 'Server error.' }, { status: 500 })
    }
}

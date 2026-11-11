import crypto from 'node:crypto'

/**
 * Open and click tracking of the mails sent to leads and customers. Pure: nothing here reads the database.
 *  - every tracked mail has a random token; a 1x1 picture at /api/crm/public/mail/open/<token> tells when the mail is opened;
 *  - the links of the text go through /api/crm/public/mail/click/<token>?u=<link>&s=<signature>: the signature (HMAC) makes sure
 *    the address can only forward to links that really were in the mail, never to a link somebody made up (no open redirect).
 */
export const newToken = () => crypto.randomBytes(12).toString('hex')
export const TOKEN_RE = /^[a-f0-9]{24}$/

export const sign = (token, url, secret) => crypto.createHmac('sha256', String(secret || '')).update(`${token}|${url}`).digest('base64url').slice(0, 22)
export const validSign = (token, url, sig, secret) => {
    const a = Buffer.from(sign(token, url, secret)), b = Buffer.from(String(sig || ''))
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}
/** Only web addresses are ever forwarded to. */
export const webUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || ''))

const unesc = (s) => String(s).replace(/&amp;/g, '&')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** The links (http/https) of the text now go through the click address. mailto:, tel:, #anchors and our own tracking links stay as they are. */
export function trackLinks(html, { base, token, secret, only = null }) {
    const own = `${base}/api/crm/public/mail/`
    return String(html || '').replace(/(<a\b[^>]*?\shref=)(["'])(https?:\/\/[^"']+)\2/gi, (m, pre, q, href) => {
        const url = unesc(href)
        if (url.startsWith(own) || !webUrl(url) || (only && !only(url))) return m
        return `${pre}${q}${esc(`${own}click/${token}?u=${encodeURIComponent(url)}&s=${sign(token, url, secret)}`)}${q}`
    })
}

/** The invisible picture added at the very end of the mail. */
export const pixel = ({ base, token }) => `<img src="${base}/api/crm/public/mail/open/${token}" width="1" height="1" alt="" style="border:0;width:1px;height:1px">`

/** The text of the mail, ready to send: its links tracked (the signature is added after, untouched) and the picture at the end. */
export const trackedHtml = ({ body, signature = '', base, token, secret, only = null }) => `${trackLinks(body, { base, token, secret, only })}${signature}${pixel({ base, token })}`

/**
 * A mail "opened" a few seconds after it left is almost always the mail server of the recipient (or a security scanner) fetching
 * the picture, not a person: those hits are not counted. The same for a click.
 */
export const REAL_AFTER_MS = 12000
export const countsAsHuman = (sentAt, now = new Date(), after = REAL_AFTER_MS) => !!sentAt && +now - +new Date(sentAt) >= after

/** What the Mails tab shows of a sent mail (a mail of a lead or customer, or a row of the sent log). */
export const trackInfo = (m) => (m && (m.direction === 'out' || m.direction === undefined) && m.trackToken ? { tracked: true, opens: m.openCount || 0, firstOpenAt: m.firstOpenAt || null, lastOpenAt: m.lastOpenAt || null, clicks: m.clickCount || 0, firstClickAt: m.firstClickAt || null, lastClickAt: m.lastClickAt || null } : { tracked: false })

// A mobile-ready email signature: a small logo on the left and the details on the right on a computer; on a phone the logo sits above the details.
// The logo has a fixed width, so it never takes the room of the text. Plain tables and inline styles, so every mail app displays it the same.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const clean = (s) => String(s ?? '').trim()

/** The CSS that keeps any signature (also an old hand-written one) tidy: a capped logo, stacked on a phone. */
export const SIGNATURE_CSS = `.sig img{max-width:110px;height:auto;border:0}@media only screen and (max-width:520px){.sig td{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}.sig img{max-width:84px!important}.sig-logo{padding:0 0 10px 0!important}}`

/**
 * f = { logo, name, title, company, phone, email, website, address, color }
 * Returns the HTML to store in the signature setting.
 */
export function buildSignature(f = {}) {
    const color = /^#[0-9a-f]{3,8}$/i.test(f.color || '') ? f.color : '#2563eb'
    const logo = clean(f.logo)
    const line = (label, html) => `<div style="margin:0;padding:0;"><span style="display:inline-block;width:16px;font-weight:700;color:${color};">${label}</span>${html}</div>`
    const rows = []
    if (clean(f.phone)) rows.push(line('T', `<a href="tel:${esc(clean(f.phone).replace(/[^\d+]/g, ''))}" style="color:#4b5563;text-decoration:none;">${esc(f.phone)}</a>`))
    if (clean(f.email)) rows.push(line('E', `<a href="mailto:${esc(clean(f.email))}" style="color:#4b5563;text-decoration:none;">${esc(f.email)}</a>`))
    if (clean(f.website)) { const u = clean(f.website); rows.push(line('W', `<a href="${esc(/^https?:\/\//i.test(u) ? u : `https://${u}`)}" style="color:#4b5563;text-decoration:none;">${esc(u.replace(/^https?:\/\//i, ''))}</a>`)) }
    if (clean(f.address)) rows.push(line('A', esc(f.address)))
    const who = [clean(f.title), clean(f.company)].filter(Boolean).map(esc).join(' &middot; ')
    return `<style>${SIGNATURE_CSS}</style>`
        + `<table role="presentation" class="sig" border="0" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #e5e7eb;"><tr>`
        + (logo ? `<td class="sig-logo" valign="top" width="96" style="width:96px;padding:16px 16px 0 0;"><img src="${esc(logo)}" width="80" alt="${esc(f.company || '')}" style="display:block;width:80px;max-width:80px;height:auto;border:0;" /></td>` : '')
        + `<td class="sig-info" valign="top" style="padding:16px 0 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#4b5563;">`
        + (clean(f.name) ? `<div style="font-size:15px;font-weight:700;color:#111827;line-height:1.35;">${esc(f.name)}</div>` : '')
        + (who ? `<div style="margin:0 0 6px;color:#6b7280;">${who}</div>` : '')
        + rows.join('')
        + `</td></tr></table>`
}

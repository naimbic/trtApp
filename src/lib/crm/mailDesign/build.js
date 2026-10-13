import { CATALOG } from './catalog'

const TONES = { info: '#2563eb', success: '#059669', warn: '#d97706', danger: '#dc2626' }
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const GREET = {
    c: { en: 'Hello {contact_firstname} {contact_lastname},', fr: 'Bonjour {contact_firstname} {contact_lastname},' },
    cf: { en: 'Hello {contact_firstname},', fr: 'Bonjour {contact_firstname},' },
    s: { en: 'Hello {staff_firstname},', fr: 'Bonjour {staff_firstname},' },
    st: { en: 'Hello {staff_name},', fr: 'Bonjour {staff_name},' },
    n: null,
}

const p = (t) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:#374151;">${t}</p>`

/** Shared shell: grey page, white rounded card, brand bar, footer. Stored in the email_header / email_footer options. */
export const SHELL = {
    header: `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>{companyname}</title>
<style>
  @media only screen and (max-width:620px){ .card{border-radius:0 !important} .px{padding-left:20px !important;padding-right:20px !important} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-font-smoothing:antialiased;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" class="card" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr><td class="px" style="padding:22px 36px;border-bottom:1px solid #f1f5f9;font-family:${FONT};font-size:17px;font-weight:700;color:#111827;letter-spacing:.2px;">{companyname}</td></tr>
    <tr><td class="px" style="padding:32px 36px 28px 36px;font-family:${FONT};font-size:15px;color:#374151;">
`,
    footer: `
    </td></tr>
  </table>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
    <tr><td align="center" style="padding:18px 12px 0 12px;font-family:${FONT};font-size:12px;line-height:1.6;color:#9ca3af;">{companyname}<br/>{main_domain}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`,
}

/** The message body (a fragment placed inside the shell) for one slug and language ('french' | 'english'). */
export function buildMessage(slug, language) {
    const spec = CATALOG[slug]
    if (!spec) return null
    const fr = language === 'french'
    const [subject, title, body, btnLabel] = fr ? spec.fr : spec.en
    const accent = TONES[spec.tone] || TONES.info
    const greet = GREET[spec.who]?.[fr ? 'fr' : 'en']
    let h = `<div style="width:44px;height:4px;border-radius:2px;background:${accent};margin:0 0 18px;"></div>`
    h += `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:23px;line-height:1.3;font-weight:700;color:#111827;">${title}</h1>`
    if (greet) h += p(greet)
    h += body.split('\n').map(p).join('')

    if (spec.rows.length) {
        h += `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 22px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">`
        h += spec.rows.map(([en, frl, field], i) => `<tr><td style="padding:11px 16px;${i ? 'border-top:1px solid #e5e7eb;' : ''}font-family:${FONT};font-size:13px;color:#6b7280;width:40%;">${fr ? frl : en}</td><td style="padding:11px 16px;${i ? 'border-top:1px solid #e5e7eb;' : ''}font-family:${FONT};font-size:14px;font-weight:600;color:#111827;">{${field}}</td></tr>`).join('')
        h += `</table>`
    }
    if (spec.extras.quote) h += `<div style="margin:6px 0 22px;padding:14px 16px;background-color:#f9fafb;border-left:4px solid ${accent};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.6;color:#374151;">{${spec.extras.quote}}</div>`
    if (spec.extras.code) h += `<div style="margin:6px 0 22px;padding:18px;text-align:center;background-color:#f9fafb;border:1px dashed ${accent};border-radius:10px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;">{${spec.extras.code}}</div>`
    if (spec.link && btnLabel) {
        h += `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:9px;background-color:${accent};"><a href="{${spec.link}}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px;">${btnLabel}</a></td></tr></table>`
        h += `<p style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:#9ca3af;">${fr ? 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :' : 'If the button does not work, copy this link into your browser:'}<br/><a href="{${spec.link}}" style="color:${accent};word-break:break-all;">{${spec.link}}</a></p>`
    }
    h += `<p style="margin:26px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:#374151;">${fr ? 'Cordialement,' : 'Kind regards,'}<br/><strong>{companyname}</strong></p>`
    return { subject, message: h }
}

export const designedSlugs = () => Object.keys(CATALOG)

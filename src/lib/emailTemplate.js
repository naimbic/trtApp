/**
 * Shared, professional HTML email template for all trt* website lead forms.
 * JS port — keep in sync with the TS version used on trtDigital / trtSEA.
 *
 * Portable by design: no imports, self-contained HTML escaping, and only
 * email-client-safe markup (tables + inline styles — no flexbox/grid/external CSS).
 *
 * buildLeadEmail({ brand:{siteName,siteUrl,primary,accent}, heading, badge,
 *   sections:[{title, fields:[{label,value,href,wide}]}], meta:{pageUrl,ip,userAgent,submittedAt} })
 */

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(href) {
  if (!href) return null;
  const t = String(href).trim();
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  return null;
}

function fmtDate(d) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Africa/Casablanca',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function buildLeadEmail({ brand, heading, badge, sections, meta }) {
  const primary = (brand && brand.primary) || '#207DE9';
  const accent = (brand && brand.accent) || '#6ADFD7';
  const siteName = (brand && brand.siteName) || 'trt';
  const submittedAt = (meta && meta.submittedAt) || new Date();

  const cellBase =
    'padding:12px 16px;font-size:14px;line-height:1.5;color:#1f2937;border-bottom:1px solid #eef1f5;vertical-align:top;';
  const labelCell = `${cellBase}font-weight:600;color:#6b7280;width:150px;white-space:nowrap;`;

  const renderField = (f) => {
    if (f.value === undefined || f.value === null || f.value === '') return '';
    const href = safeHref(f.href);
    const valueHtml = href
      ? `<a href="${esc(href)}" style="color:${primary};text-decoration:none;">${esc(f.value)}</a>`
      : esc(f.value);
    if (f.wide) {
      return `
        <tr>
          <td colspan="2" style="${cellBase}">
            <div style="font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">${esc(f.label)}</div>
            <div style="white-space:pre-wrap;color:#1f2937;">${valueHtml}</div>
          </td>
        </tr>`;
    }
    return `
      <tr>
        <td style="${labelCell}">${esc(f.label)}</td>
        <td style="${cellBase}">${valueHtml}</td>
      </tr>`;
  };

  const renderSection = (s) => {
    const rows = (s.fields || []).map(renderField).join('');
    if (!rows.trim()) return '';
    return `
      <tr><td style="padding:22px 24px 8px;">
        <div style="font-size:13px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:.6px;">${esc(s.title)}</div>
      </td></tr>
      <tr><td style="padding:0 24px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #eef1f5;border-radius:10px;overflow:hidden;">
          ${rows}
        </table>
      </td></tr>`;
  };

  const sectionsHtml = (sections || []).map(renderSection).join('');
  const badgeHtml = badge
    ? `<span style="display:inline-block;margin-top:10px;padding:4px 12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);border-radius:999px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:.3px;">${esc(badge)}</span>`
    : '';

  const siteLink = safeHref(brand && brand.siteUrl);
  const metaRows = [];
  if (meta && meta.pageUrl) {
    const p = safeHref(meta.pageUrl);
    metaRows.push(
      `<strong style="color:#6b7280;">Page&nbsp;:</strong> ${p ? `<a href="${esc(p)}" style="color:${primary};text-decoration:none;">${esc(meta.pageUrl)}</a>` : esc(meta.pageUrl)}`,
    );
  }
  if (meta && meta.ip) metaRows.push(`<strong style="color:#6b7280;">IP&nbsp;:</strong> ${esc(meta.ip)}`);
  if (meta && meta.userAgent) metaRows.push(`<strong style="color:#6b7280;">Navigateur&nbsp;:</strong> ${esc(meta.userAgent)}`);
  metaRows.push(`<strong style="color:#6b7280;">Reçu le&nbsp;:</strong> ${esc(fmtDate(submittedAt))}`);

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f6f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(heading)}${badge ? ` — ${esc(badge)}` : ''}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(16,24,40,.06);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:linear-gradient(135deg,${primary} 0%,${accent} 100%);padding:28px 24px;">
          <div style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.9;">${esc(siteName)}</div>
          <div style="color:#ffffff;font-size:22px;font-weight:800;line-height:1.25;margin-top:6px;">${esc(heading)}</div>
          ${badgeHtml}
        </td></tr>
        ${sectionsHtml}
        <tr><td style="padding:18px 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border:1px solid #eef1f5;border-radius:10px;">
            <tr><td style="padding:14px 16px;font-size:12px;line-height:1.9;color:#374151;">
              ${metaRows.join('<br>')}
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 24px 26px;text-align:center;border-top:1px solid #eef1f5;">
          <div style="font-size:12px;color:#9ca3af;">
            Notification automatique du formulaire ${siteLink ? `<a href="${esc(siteLink)}" style="color:${primary};text-decoration:none;">${esc(siteName)}</a>` : esc(siteName)}.<br>
            Répondez directement à cet email pour recontacter le prospect.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

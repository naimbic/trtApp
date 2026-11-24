import prisma from '@/lib/prisma'
import { getOptions } from '@/lib/crm/mailer'
import { companyImageDataUri } from '@/lib/crm/company'
import { companyTokenData, clientTokenData, COMPANY_KEYS } from '@/lib/crm/docTokens'
import { esc, logoDataUri, fmtDate } from '@/lib/crm/invoicePdf'
import { formatMoney } from '@/lib/crm/docStyle'

const TXT = {
    french: { title: 'CONTRAT', between: 'Entre', and: 'Et', value: 'Valeur', type: 'Type', from: 'Du', to: 'au', open: 'Sans date de fin', signedOn: 'Signé le', ip: 'Adresse IP', marked: 'Marqué comme signé', signatures: 'Signatures', forWho: 'Pour', client: 'Le client', approved: 'Lu et approuvé', waiting: 'En attente de signature' },
    english: { title: 'CONTRACT', between: 'Between', and: 'And', value: 'Value', type: 'Type', from: 'From', to: 'to', open: 'No end date', signedOn: 'Signed on', ip: 'IP address', marked: 'Marked as signed', signatures: 'Signatures', forWho: 'For', client: 'The client', approved: 'Read and approved', waiting: 'Awaiting signature' },
}

/** Contract text is written in the editor: drop scripts, styles and event handlers before it is shown to a client. */
export const safeHtml = (h) => String(h || '').replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '').replace(/javascript:/gi, '')

/** Exact moment of a signature in the company time zone (Settings), to the second: "15/10/2026 16:28:40 UTC+1". */
export function signStamp(date, S) {
    if (!date) return ''
    try {
        return new Intl.DateTimeFormat(S.lang === 'french' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: S.timezone || undefined, timeZoneName: 'short' }).format(new Date(date)).replace(', ', ' ')
    } catch { return new Date(date).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' }
}

/** Number shown for a contract: its Perfex id, or a short code of the id for new ones. */
export const contractNumber = (c) => (c.legacyId != null ? `#${c.legacyId}` : `#${String(c.id).slice(-6).toUpperCase()}`)

export async function contractDocumentHtml(c, client, type, S) {
    const T = TXT[S.lang]
    const og = await getOptions([...COMPANY_KEYS, 'company_logo', 'company_info_format'])
    const D = (x) => fmtDate(x, S.dateFormat, S.timezone)
    const logo = await companyImageDataUri('logo', logoDataUri(og('company_logo')), ['contract_logo_url', 'company_logo_url'])
    const signatureImg = S.showSignature && (c.signed || c.markedAsSigned) ? await companyImageDataUri('signature', '') : ''
    const co = companyTokenData(og)
    const ct = await clientTokenData(client, {})
    const cur = await prisma.crmCurrency.findFirst({ where: { isDefault: true } })
    const value = c.contractValue != null ? formatMoney(c.contractValue, cur, S) : ''
    const lines = (a) => a.filter(Boolean).map((x, n) => (n ? esc(x) : x)).join('<br />')
    const org = lines([`<strong>${esc(co.company_name)}</strong>`, co.address, [co.zip_code, co.city].filter(Boolean).join(' '), co.phone, co.email, co.vat_number_with_label, [co.company_ice && `ICE: ${co.company_ice}`, co.company_rc && `RC: ${co.company_rc}`, co.company_if && `IF: ${co.company_if}`].filter(Boolean).join(' · ')])
    const to = lines([`<strong>${esc(ct.company_name)}</strong>`, ct.street, [ct.zip_code, ct.city].filter(Boolean).join(' '), ct.country_name, ct.phone, ct.email, ct.vat_number_with_label])
    const merge = {
        contract_id: esc(contractNumber(c)), contract_subject: esc(c.subject || ''), contract_description: esc(c.description || ''), contract_datestart: D(c.dateStart), contract_dateend: c.dateEnd ? D(c.dateEnd) : '',
        contract_contract_value: value, contract_value: value, contract_type: esc(type?.name || ''), contract_today: D(new Date()),
        ...Object.fromEntries(Object.entries(co).map(([k, v]) => [k, esc(v)])), companyname: esc(co.company_name),
        ...Object.fromEntries(Object.entries(ct).map(([k, v]) => [`client_${k}`, esc(v)])), client_company: esc(ct.company_name), customer_company: esc(ct.company_name),
    }
    const content = safeHtml(c.content).replace(/\{([a-z0-9_]+)\}/gi, (m, k) => (k in merge ? String(merge[k] ?? '') : ''))
    const period = `${T.from} <strong>${D(c.dateStart)}</strong> ${c.dateEnd ? `${T.to} <strong>${D(c.dateEnd)}</strong>` : `· ${T.open}`}`
    const signed = c.signed || c.markedAsSigned
    const drawn = c.signature?.startsWith('data:image/png;base64,') ? c.signature : ''
    const signer = [c.acceptanceFirstname, c.acceptanceLastname].filter(Boolean).join(' ')

    // 1. the letterhead: the logo, and who we are with how to reach us
    const head = `<div class="lh"><div class="lh-logo">${logo ? `<img src="${logo}" style="width:${S.logoWidth * 1.5}px" alt="">` : `<strong style="font-size:18pt">${esc(co.company_name)}</strong>`}</div><div class="lh-co">${lines([`<strong>${esc(co.company_name)}</strong>`, [co.address, [co.zip_code, co.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), [co.phone, co.email].filter(Boolean).join(' · '), co.website])}</div></div>
<div class="ttl"><div class="kick">${T.title} · ${esc(contractNumber(c))}</div><h1>${esc(c.subject || '')}</h1><div class="tmeta"><span>${period}</span>${type ? `<span>${T.type}: <strong>${esc(type.name)}</strong></span>` : ''}${value ? `<span>${T.value}: <strong>${value}</strong></span>` : ''}</div></div>`
    // 2. the body: the two parties, then the text
    const body = `<div class="parties"><div class="party"><div class="lbl">${T.between}</div>${org}</div><div class="party"><div class="lbl">${T.and}</div>${to}</div></div>
<div class="pcontent">${content}</div>`
    // 3. the foot: our signature and the client's, side by side. Ours (the picture set for invoices: signature and stamp) is added once the client has signed, never before
    const when = signed && c.acceptanceDate ? signStamp(c.acceptanceDate, S) : ''
    const ours = `<div class="sign"><div class="lbl">${T.forWho} ${esc(co.company_name)}</div><div class="pad">${signatureImg ? `<img src="${signatureImg}" alt="">` : ''}</div><div class="who">${esc(co.company_name)}</div><div class="sigmeta">${signed ? `${T.signedOn} ${D(c.acceptanceDate || new Date())}` : T.waiting}</div></div>`
    const theirs = `<div class="sign"><div class="lbl">${T.forWho} ${esc(ct.company_name || T.client)}</div><div class="pad">${drawn ? `<img src="${drawn}" alt="">` : signed ? `<span class="ok">${c.signature ? T.approved : T.marked}</span>` : ''}</div><div class="who">${esc(signer || ct.company_name || T.client)}</div><div class="sigmeta">${signed ? [drawn && T.approved, when && `${T.signedOn} ${when}`, c.acceptanceEmail && esc(c.acceptanceEmail), c.acceptanceIp && `${T.ip}: ${esc(String(c.acceptanceIp).replace(/^::ffff:/i, ''))}`].filter(Boolean).join(' · ') : T.waiting}</div></div>`
    return `${head}
${body}
<div class="signs-t lbl">${T.signatures}</div><div class="signs">${ours}${theirs}</div>`
}

export const CONTRACT_CSS = `.lh{display:flex;justify-content:space-between;align-items:center;gap:24px;padding-bottom:16px;border-bottom:2px solid #17191a}.lh-logo{max-width:48%}.lh-logo img{max-width:100%;height:auto;display:block}
.lh-co{text-align:right;font-size:.9em;color:#4a4d49;line-height:1.5}.lh-co strong{color:#17191a;font-size:1.15em}
.ttl{text-align:center;margin:26px 0 22px}.ttl .kick{font-size:.78em;letter-spacing:.18em;text-transform:uppercase;color:#676a66;font-weight:700}.ttl h1{margin:6px 0 8px;font-size:1.9em;letter-spacing:-.01em;color:#17191a;line-height:1.2}
.tmeta{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 20px;color:#676a66;font-size:.95em}.tmeta strong{color:#17191a}
.parties{display:flex;gap:16px;margin-bottom:22px}.party{flex:1;min-width:0;border:1px solid #e3ded4;border-radius:12px;padding:12px 14px;background:#f7f4ec;color:#4a4d49;break-inside:avoid}.party strong{color:#17191a}
.pcontent{line-height:1.65}.pcontent h1,.pcontent h2,.pcontent h3{margin:20px 0 8px;color:#17191a;break-after:avoid}.pcontent h1{font-size:1.35em}.pcontent h2{font-size:1.15em}.pcontent h3{font-size:1.02em}.pcontent p{margin:0 0 9px}.pcontent ul,.pcontent ol{margin:0 0 9px;padding-left:22px}.pcontent li{margin-bottom:3px}.pcontent img{max-width:100%;height:auto}.pcontent table{border-collapse:collapse;margin:8px 0;width:100%}.pcontent td,.pcontent th{border:1px solid #e3ded4;padding:6px 8px;text-align:left;vertical-align:top}.pcontent th{background:#f7f4ec}.pcontent blockquote{margin:0 0 9px;padding:4px 12px;border-left:3px solid #e3ded4;color:#4a4d49}
.signs-t{margin-top:34px;padding-top:14px;border-top:2px solid #17191a;break-after:avoid}.signs{display:flex;gap:16px;margin-top:8px;break-inside:avoid;page-break-inside:avoid}.sign{flex:1;min-width:0;border:1px solid #e3ded4;border-radius:12px;padding:12px 14px}
.sign .pad{height:104px;display:flex;align-items:center;justify-content:center;border-bottom:1px dashed #c9c3b6;margin:6px 0 8px}.sign .pad{overflow:hidden}.sign .pad img{max-height:94px;max-width:92%;width:auto;height:auto;object-fit:contain}.sign .who{font-weight:700;color:#17191a}.sign .ok{color:#2f7d62;font-weight:700;letter-spacing:.04em}.sigmeta{font-size:.85em;color:#6b7280;margin-top:2px;overflow-wrap:anywhere}
@media(max-width:640px){.lh{flex-direction:column;align-items:flex-start}.lh-logo{max-width:100%}.lh-co{text-align:left}.parties,.signs{flex-direction:column}}`

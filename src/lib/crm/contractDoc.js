import prisma from '@/lib/prisma'
import { getOptions } from '@/lib/crm/mailer'
import { companyImageDataUri } from '@/lib/crm/company'
import { companyTokenData, clientTokenData, COMPANY_KEYS } from '@/lib/crm/docTokens'
import { esc, logoDataUri, fmtDate } from '@/lib/crm/invoicePdf'
import { formatMoney } from '@/lib/crm/docStyle'

const TXT = {
    french: { title: 'CONTRAT', between: 'Entre', and: 'et', period: 'Période', value: 'Valeur', type: 'Type', from: 'Du', to: 'au', open: 'Sans date de fin', signedBy: 'Signé par', on: 'le', ip: 'Adresse IP', marked: 'Marqué comme signé' },
    english: { title: 'CONTRACT', between: 'Between', and: 'and', period: 'Period', value: 'Value', type: 'Type', from: 'From', to: 'to', open: 'No end date', signedBy: 'Signed by', on: 'on', ip: 'IP address', marked: 'Marked as signed' },
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
    const org = [`<strong>${esc(co.company_name)}</strong>`, co.address, [co.zip_code, co.city].filter(Boolean).join(' '), co.phone, co.email, co.vat_number_with_label].filter(Boolean).map((x, i) => (i ? esc(x) : x)).join('<br />')
    const to = [`<strong>${esc(ct.company_name)}</strong>`, ct.street, [ct.zip_code, ct.city].filter(Boolean).join(' '), ct.country_name, ct.phone, ct.email, ct.vat_number_with_label].filter(Boolean).map((x, i) => (i ? esc(x) : x)).join('<br />')
    const merge = {
        contract_id: esc(contractNumber(c)), contract_subject: esc(c.subject || ''), contract_description: esc(c.description || ''), contract_datestart: D(c.dateStart), contract_dateend: c.dateEnd ? D(c.dateEnd) : '',
        contract_contract_value: value, contract_value: value, contract_type: esc(type?.name || ''), contract_today: D(new Date()),
        ...Object.fromEntries(Object.entries(co).map(([k, v]) => [k, esc(v)])), companyname: esc(co.company_name),
        ...Object.fromEntries(Object.entries(ct).map(([k, v]) => [`client_${k}`, esc(v)])), client_company: esc(ct.company_name), customer_company: esc(ct.company_name),
    }
    const content = safeHtml(c.content).replace(/\{([a-z0-9_]+)\}/gi, (m, k) => (k in merge ? String(merge[k] ?? '') : ''))
    const period = `${T.from} <strong>${D(c.dateStart)}</strong> ${c.dateEnd ? `${T.to} <strong>${D(c.dateEnd)}</strong>` : `· ${T.open}`}`
    const signed = c.signed || c.markedAsSigned
    return `<div class="top"><div class="logo">${logo ? `<img src="${logo}" style="width:${S.logoWidth * 1.5}px" alt="">` : `<strong style="font-size:18pt">${esc(co.company_name)}</strong>`}</div><div class="title" style="text-align:right"><h1>${T.title}</h1><div class="num">${esc(contractNumber(c))}</div></div></div>
<div class="cols"><div class="info"><div class="lbl">${T.between}</div>${org}</div><div class="info"><div class="lbl">${T.and}</div>${to}</div></div>
<h2 class="psub">${esc(c.subject || '')}</h2>
<div class="meta2"><span>${period}</span>${type ? `<span>${T.type}: <strong>${esc(type.name)}</strong></span>` : ''}${value ? `<span>${T.value}: <strong>${value}</strong></span>` : ''}</div>
<div class="pcontent">${content}</div>
${signed && (c.signature?.startsWith('data:image/png;base64,') || c.acceptanceDate) ? `<div class="sigbox"><div>${c.signature ? T.signedBy : T.marked} <strong>${esc([c.acceptanceFirstname, c.acceptanceLastname].filter(Boolean).join(' '))}</strong>${c.acceptanceDate ? ` ${T.on} ${signStamp(c.acceptanceDate, S)}` : ''}</div>${c.acceptanceIp || c.acceptanceEmail ? `<div class="sigmeta">${[c.acceptanceEmail && esc(c.acceptanceEmail), c.acceptanceIp && `${T.ip}: ${esc(String(c.acceptanceIp).replace(/^::ffff:/i, ''))}`].filter(Boolean).join(' · ')}</div>` : ''}${c.signature?.startsWith('data:image/png;base64,') ? `<img src="${c.signature}" alt="">` : ''}</div>` : ''}
${signatureImg ? `<div class="sig"><img src="${signatureImg}" alt=""></div>` : ''}`
}

export const CONTRACT_CSS = `.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.logo{text-align:left}.top img{max-width:62%;height:auto}.title h1{margin:0;font-size:2.4em;letter-spacing:.5px;color:#111}.title .num{font-weight:700;color:#4e4e4e;font-size:1.2em}
.cols{display:flex;gap:30px;margin-bottom:20px}.cols>.info{flex:1}.lbl{font-weight:700;margin-bottom:2px}.psub{font-size:1.5em;margin:6px 0 10px}.meta2{display:flex;gap:22px;flex-wrap:wrap;color:#4b5563;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb}
.pcontent{line-height:1.6}.pcontent h1,.pcontent h2,.pcontent h3{margin:18px 0 8px}.pcontent img{max-width:100%;height:auto}.pcontent table{border-collapse:collapse;margin:8px 0}.pcontent td,.pcontent th{border:1px solid #e5e7eb;padding:6px 8px}
.sigmeta{font-size:.9em;color:#6b7280;margin-top:2px}.sigbox{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:12px;break-inside:avoid}.sigbox img{max-height:90px;max-width:280px;display:block;margin-top:6px}.sig{margin-top:28px;text-align:right}.sig img{max-height:90px;max-width:260px}`

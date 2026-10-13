import prisma from '@/lib/prisma'
import { calcDocument, round2, formatDocumentNumber } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import { getOptions, buildHtml, mergeFields, deliver, findTemplate, companyLanguage, baseData } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { companyImageDataUri } from '@/lib/crm/company'
import { esc, safeHtml, stripTags, logoDataUri, fmtDate, organizationInfo, customerInfo, LABELS, htmlToPdf } from '@/lib/crm/invoicePdf'
import { pdfSettings, formatMoney } from '@/lib/crm/docStyle'
import { amountInWords } from '@/lib/crm/numberWords'
import { createInvoiceFromEstimate } from '@/lib/crm/sales/convert'

export const ESTIMATE = { DRAFT: 1, SENT: 2, DECLINED: 3, ACCEPTED: 4, EXPIRED: 5 }
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }

const TXT = {
    french: { estimate: 'DEVIS', valid: "Valable jusqu'au", reference: 'Référence', accept: 'Accepter', refuse: 'Refuser', pdf: 'Télécharger le PDF', accepted: 'Devis accepté', declined: 'Devis refusé', expired: 'Ce devis a expiré', acceptedBy: 'Accepté par', on: 'le', declinedOn: 'Refusé le', comments: 'Commentaires', noComments: 'Aucun commentaire pour le moment.', yourName: 'Votre nom', yourComment: 'Écrire un commentaire…', send: 'Envoyer', team: 'Équipe', first: 'Prénom', last: 'Nom', email: 'E-mail', sign: 'Signez ici', clear: 'Effacer', confirmAccept: 'Accepter le devis', confirmRefuse: 'Refuser le devis', reason: 'Raison (facultatif)', cancel: 'Annuler', acceptTitle: 'Accepter ce devis', refuseTitle: 'Refuser ce devis', acceptText: 'Confirmez votre identité et signez pour accepter ce devis.', refuseText: 'Souhaitez-vous vraiment refuser ce devis ?', thanks: 'Merci ! Votre réponse a été enregistrée.', required: 'Merci de remplir tous les champs et de signer.', draft: 'Brouillon' },
    english: { estimate: 'ESTIMATE', valid: 'Valid until', reference: 'Reference', accept: 'Accept', refuse: 'Refuse', pdf: 'Download PDF', accepted: 'Estimate accepted', declined: 'Estimate declined', expired: 'This estimate has expired', acceptedBy: 'Accepted by', on: 'on', declinedOn: 'Declined on', comments: 'Comments', noComments: 'No comments yet.', yourName: 'Your name', yourComment: 'Write a comment…', send: 'Send', team: 'Team', first: 'First name', last: 'Last name', email: 'Email', sign: 'Sign here', clear: 'Clear', confirmAccept: 'Accept estimate', confirmRefuse: 'Refuse estimate', reason: 'Reason (optional)', cancel: 'Cancel', acceptTitle: 'Accept this estimate', refuseTitle: 'Refuse this estimate', acceptText: 'Confirm your identity and sign to accept this estimate.', refuseText: 'Do you really want to refuse this estimate?', thanks: 'Thank you! Your answer has been recorded.', required: 'Please fill in every field and sign.', draft: 'Draft' },
}

/** Effective status: a sent estimate past its expiry date is shown as expired. */
export const effectiveStatus = (e) => (e.status === ESTIMATE.SENT && e.expiryDate && new Date(e.expiryDate) < new Date(new Date().toDateString()) ? ESTIMATE.EXPIRED : e.status)

async function load(id, hash, staff = false) {
    if (!/^[0-9a-f]{24}$/i.test(id || '')) return null
    const estimate = await prisma.crmEstimate.findUnique({ where: { id } })
    if (staff) return estimate // the caller already checked the staff permission
    if (!hash || !estimate || estimate.hash !== hash || estimate.status === ESTIMATE.DRAFT) return null
    return estimate
}

export async function loadEstimateDoc(id, hash, staff = false) {
    const estimate = await load(id, hash, staff)
    if (!estimate) return null
    const [lines, client, currency, comments] = await Promise.all([
        prisma.crmItemable.findMany({ where: { relType: 'estimate', relId: id }, orderBy: { itemOrder: 'asc' }, include: { taxes: true } }),
        estimate.clientId ? prisma.crmClient.findUnique({ where: { id: estimate.clientId } }) : null,
        estimate.currencyId ? prisma.crmCurrency.findUnique({ where: { id: estimate.currencyId } }) : null,
        prisma.crmEstimateComment.findMany({ where: { estimateId: id }, orderBy: { createdAt: 'asc' } }),
    ])
    const items = lines.map((l) => ({ description: l.description, longDescription: l.longDescription || '', qty: l.qty, rate: l.rate, unit: l.unit || '', taxes: l.taxes.map((t) => ({ name: t.taxName, rate: t.taxRate })) }))
    const number = formatDocumentNumber({ prefix: estimate.prefix, number: estimate.number, numberFormat: estimate.numberFormat, date: estimate.date, padding: await numberPadding() })
    return { estimate, items, client, currency, comments, number, status: effectiveStatus(estimate) }
}

const CSS = `
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.logo{text-align:right}.top img{max-width:62%;height:auto}.title{text-align:left}.title h1{margin:0;font-size:2.7em;letter-spacing:.5px;color:#111}.title .num{font-weight:700;color:#4e4e4e;font-size:1.2em}
.cols{display:flex;gap:30px;margin-bottom:20px}.cols>.info{flex:1}.lbl{font-weight:700;margin-bottom:2px}.org{color:#424242}.dates{margin-top:12px}
table{width:100%;border-collapse:collapse}.items th{text-align:left;padding:8px;font-size:.95em}.items td{padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
.n{width:28px;color:#6b7280}.r{text-align:right;white-space:nowrap}.items th.r{text-align:right}.long{color:#6b7280;font-size:.9em;margin-top:2px}.words{margin:14px 0 0}.sig{margin-top:28px;text-align:right}.sig img{max-height:90px;max-width:260px}
.tot{width:52%;margin:14px 0 0 auto}.tot td{padding:6px 8px;text-align:right}.tot td:first-child{font-weight:700}.tot tr.grand td{background:#e5e7eb;font-weight:700;font-size:1.1em}
h4{margin:20px 0 6px;font-size:1.05em}.block{white-space:pre-line}tr{page-break-inside:avoid}`

/** The estimate document itself (shared by the PDF and the public page). */
async function documentHtml(d, lang, S) {
    const og = await getOptions(['company_info_format', 'company_logo', 'companyname'])
    const L = LABELS[lang], T = TXT[lang]
    const M = (n) => formatMoney(n, d.currency, S), Mi = (n) => formatMoney(n, d.currency, S, { noSymbol: S.itemsNoSymbol }), D = (x) => fmtDate(x, S.dateFormat, S.timezone)
    const e = d.estimate
    const totals = calcDocument({ items: d.items, discountPercent: e.discountPercent, discountFixed: e.discountPercent > 0 ? 0 : e.discountTotal, discountType: e.discountType || 'before_tax', adjustment: e.adjustment })
    const logo = await companyImageDataUri('logo', logoDataUri(og('company_logo')), S.logoKeys)
    const signature = S.showSignature ? await companyImageDataUri('signature', '') : ''
    const bill = await customerInfo(d.client, e, L)
    const info = `<div class="info"><div class="lbl">${L.billTo}</div>${bill}<div class="dates"><div>${L.date}: <strong>${D(e.date)}</strong></div>${e.expiryDate ? `<div>${T.valid}: <strong>${D(e.expiryDate)}</strong></div>` : ''}${e.referenceNo ? `<div>${T.reference}: <strong>${esc(e.referenceNo)}</strong></div>` : ''}</div></div>`
    const org = `<div class="info org">${await organizationInfo(og)}</div>`
    const rows = d.items.map((it, i) => `<tr><td class="n">${i + 1}</td><td><strong>${stripTags(it.description)}</strong>${it.longDescription ? `<div class="long">${safeHtml(it.longDescription)}</div>` : ''}</td><td class="r">${it.qty}${it.unit ? ` ${esc(it.unit)}` : ''}</td><td class="r">${Mi(it.rate)}</td>${S.perItemTax ? `<td class="r">${(it.taxes || []).map((t) => (S.hideTaxName ? `${t.rate}%` : `${esc(t.name)} ${t.rate}%`)).join('<br />') || '—'}</td>` : ''}<td class="r">${Mi(round2((it.qty || 0) * (it.rate || 0)))}</td></tr>`).join('')
    const tr = [`<tr><td>${L.subtotal}</td><td>${M(e.subtotal)}</td></tr>`]
    if (e.discountTotal > 0) tr.push(`<tr><td>${L.discount}${e.discountPercent > 0 ? ` (${e.discountPercent}%)` : ''}</td><td>-${M(e.discountTotal)}</td></tr>`)
    for (const t of totals.taxes) tr.push(`<tr><td>${esc(t.name)} (${t.rate}%)</td><td>${M(t.total)}</td></tr>`)
    if (Number(e.adjustment)) tr.push(`<tr><td>${L.adjustment}</td><td>${M(e.adjustment)}</td></tr>`)
    tr.push(`<tr class="grand"><td>${L.total}</td><td>${M(e.total)}</td></tr>`)
    const words = S.words.on ? `<p class="words"><strong>${lang === 'french' ? 'Arrêté le présent devis à la somme de' : 'Total in words'} :</strong> ${esc(amountInWords(e.total, { lang, currency: d.currency?.name, lowercase: S.words.lower }))}</p>` : ''
    return `<div class="top"><div class="title"><h1>${T.estimate}</h1><div class="num"># ${esc(d.number)}</div></div><div class="logo">${logo ? `<img src="${logo}" style="width:${S.logoWidth * 1.5}px" alt="">` : `<strong style="font-size:18pt">${esc(og('companyname'))}</strong>`}</div></div>
<div class="cols">${S.swap ? info + org : org + info}</div>
<table class="items"><thead><tr style="background:${S.head};color:${S.headText}"><th class="n" style="color:${S.headText}">#</th><th>${L.item}</th><th class="r">${L.qty}</th><th class="r">${L.rate}</th>${S.perItemTax ? `<th class="r">${L.tax}</th>` : ''}<th class="r">${L.amount}</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot">${tr.join('')}</table>
${words}${e.clientNote ? `<h4>${L.note}</h4><div class="block">${esc(e.clientNote)}</div>` : ''}${e.terms ? `<h4>${L.terms}</h4><div class="block">${safeHtml(e.terms)}</div>` : ''}${signature ? `<div class="sig"><img src="${signature}" alt=""></div>` : ''}`
}

const langOf = async () => ((await getOptions(['active_language']))('active_language') === 'french' ? 'french' : 'english')

export async function estimatePdf(id, hash, staff = false) {
    const d = await loadEstimateDoc(id, hash, staff)
    if (!d) return null
    const S = await pdfSettings('estimate')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title><style>${S.pageCss()}${S.baseCss()}${CSS}</style></head><body>${await documentHtml(d, S.lang, S)}</body></html>`
    return { pdf: await htmlToPdf(html), name: `${d.number.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.pdf` }
}

const initials = (n) => String(n || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()

/** The public estimate page: document + Accept / Refuse + comments. */
export async function estimatePage(id, hash) {
    const d = await loadEstimateDoc(id, hash)
    if (!d) return null
    const S = await pdfSettings('estimate')
    const lang = S.lang
    const T = TXT[lang], e = d.estimate
    const o = await getOptions(['estimate_accept_identity_confirmation', 'companyname', 'dateformat', 'e_sign_legal_text'])
    const acting = d.status === ESTIMATE.SENT
    const contact = d.client ? await prisma.crmContact.findFirst({ where: { clientId: d.client.id, active: true }, orderBy: { isPrimary: 'desc' } }) : null
    const banner = d.status === ESTIMATE.ACCEPTED
        ? `<div class="banner ok"><strong>${T.accepted}</strong><div>${esc(T.acceptedBy)} ${esc([e.acceptanceFirstname, e.acceptanceLastname].filter(Boolean).join(' '))}${e.acceptanceDate ? ` ${T.on} ${fmtDate(e.acceptanceDate, S.dateFormat, S.timezone)}` : ''}</div>${e.signature?.startsWith('data:image/png;base64,') ? `<img class="sig" src="${e.signature}" alt="">` : ''}</div>`
        : d.status === ESTIMATE.DECLINED ? `<div class="banner no"><strong>${T.declined}</strong></div>`
        : d.status === ESTIMATE.EXPIRED ? `<div class="banner exp"><strong>${T.expired}</strong></div>` : ''
    const comments = d.comments.length ? d.comments.map((c) => `<div class="cm"><div class="av ${c.staffId ? 'st' : ''}">${esc(initials(c.authorName))}</div><div><div class="meta"><strong>${esc(c.authorName || (c.staffId ? T.team : ''))}</strong>${c.staffId ? `<span class="tag">${T.team}</span>` : ''}<span>${new Date(c.createdAt).toLocaleString(lang === 'french' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><div class="txt">${esc(c.content)}</div></div></div>`).join('') : `<p class="muted">${T.noComments}</p>`
    const base = `/api/crm/public/estimate/${id}/${hash}`
    const identity = o('estimate_accept_identity_confirmation', '1') === '1'
    return `<!doctype html><html lang="${lang === 'french' ? 'fr' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(d.number)} – ${esc(o('companyname'))}</title><style>
${CSS}
body{background:#f3f4f6;font-size:14px}.wrap{max-width:920px;margin:0 auto;padding:20px 14px 60px}
.bar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 14px}.bar .in{max-width:920px;margin:0 auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bar .sp{flex:1}.bar b{font-size:15px}
.btn{border:0;border-radius:9px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}.ok-b{background:#059669;color:#fff}.no-b{background:#fff;color:#dc2626;border:1px solid #fca5a5}.gr-b{background:#fff;color:#374151;border:1px solid #d1d5db}.pr-b{background:#2563eb;color:#fff}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:34px;margin-top:16px}.banner{border-radius:12px;padding:14px 18px;margin-top:16px}.banner.ok{background:#ecfdf5;color:#065f46}.banner.no{background:#fef2f2;color:#991b1b}.banner.exp{background:#f3f4f6;color:#4b5563}.sig{display:block;max-height:70px;margin-top:8px}
h3{margin:0 0 14px;font-size:17px}.cm{display:flex;gap:12px;padding:12px 0;border-top:1px solid #f1f5f9}.cm:first-of-type{border-top:0}.av{flex:0 0 36px;height:36px;border-radius:50%;background:#e0e7ff;color:#3730a3;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px}.av.st{background:#dcfce7;color:#166534}.meta{font-size:12.5px;color:#6b7280;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.meta strong{color:#111827;font-size:13.5px}.tag{background:#dcfce7;color:#166534;border-radius:5px;padding:0 6px;font-size:11px}.txt{white-space:pre-line;margin-top:2px;font-size:14px}.muted{color:#9ca3af}
input,textarea{width:100%;border:1px solid #d1d5db;border-radius:9px;padding:10px 12px;font:inherit;margin-top:6px}label{font-size:13px;font-weight:600;color:#374151;display:block;margin-top:12px}
.fm{display:grid;gap:10px}.fm .row{display:flex;gap:10px}.fm .row>*{flex:1}
dialog{border:0;border-radius:16px;padding:26px;max-width:480px;width:calc(100% - 28px);box-shadow:0 20px 60px rgba(0,0,0,.25)}dialog::backdrop{background:rgba(17,24,39,.5)}dialog h3{margin-bottom:6px}.pad{border:1px dashed #9ca3af;border-radius:10px;background:#fafafa;touch-action:none;width:100%;height:150px;display:block;margin-top:6px}.err{color:#dc2626;font-size:13px;margin-top:8px;min-height:18px}.acts{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
@media(max-width:640px){.card{padding:18px}.cols{flex-direction:column;gap:14px}.tot{width:100%}.items th:nth-child(1),.items td:nth-child(1){display:none}}
@media print{.bar,.no-print{display:none}body{background:#fff}.card{border:0;padding:0}}
</style></head><body>
<div class="bar"><div class="in"><b>${esc(o('companyname'))}</b><span class="sp"></span><a class="btn gr-b" href="${base}/pdf">${T.pdf}</a>${acting ? `<button class="btn no-b" onclick="document.getElementById('refuse').showModal()">${T.refuse}</button><button class="btn ok-b" onclick="document.getElementById('accept').showModal()">${T.accept}</button>` : ''}</div></div>
<div class="wrap">${banner}<div class="card">${await documentHtml(d, lang, S)}</div>
<div class="card no-print"><h3>${T.comments} (${d.comments.length})</h3>${comments}
<form id="cf" class="fm" style="margin-top:14px"><input name="name" placeholder="${T.yourName}" maxlength="80" value="${esc([contact?.firstName, contact?.lastName].filter(Boolean).join(' '))}"><textarea name="content" rows="3" placeholder="${T.yourComment}" maxlength="2000" required></textarea><div style="text-align:right"><button class="btn pr-b" type="submit">${T.send}</button></div><div class="err" id="ce"></div></form></div></div>
<dialog id="accept"><h3>${T.acceptTitle}</h3><p class="muted" style="margin:0 0 4px">${T.acceptText}</p><div class="fm"><div class="row"><div><label>${T.first}</label><input id="fn" value="${esc(contact?.firstName || '')}"></div><div><label>${T.last}</label><input id="ln" value="${esc(contact?.lastName || '')}"></div></div><div><label>${T.email}</label><input id="em" type="email" value="${esc(contact?.email || '')}"></div>${identity ? `<div><label>${T.sign} <a href="#" id="clr" style="font-weight:400;float:right">${T.clear}</a></label><canvas class="pad" id="pad"></canvas></div>` : ''}</div>${o('e_sign_legal_text') ? `<p class="muted" style="font-size:12px;margin:10px 0 0">${esc(o('e_sign_legal_text'))}</p>` : ''}<div class="err" id="ae"></div><div class="acts"><button class="btn gr-b" onclick="document.getElementById('accept').close()">${T.cancel}</button><button class="btn ok-b" id="aok">${T.confirmAccept}</button></div></dialog>
<dialog id="refuse"><h3>${T.refuseTitle}</h3><p class="muted" style="margin:0">${T.refuseText}</p><label>${T.reason}</label><textarea id="rr" rows="3" maxlength="500"></textarea><div class="err" id="re"></div><div class="acts"><button class="btn gr-b" onclick="document.getElementById('refuse').close()">${T.cancel}</button><button class="btn no-b" id="rok">${T.confirmRefuse}</button></div></dialog>
<script>
const base=${JSON.stringify(base)},identity=${identity},reqMsg=${JSON.stringify(T.required)};
const post=async(p,b)=>{const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Error');return j};
document.getElementById('cf').onsubmit=async(e)=>{e.preventDefault();const f=e.target;try{await post('/comments',{name:f.name.value,content:f.content.value});location.reload()}catch(x){document.getElementById('ce').textContent=x.message}};
let drawn=false;const cv=document.getElementById('pad');
if(cv){const ctx=cv.getContext('2d');const fit=()=>{const r=cv.getBoundingClientRect();cv.width=r.width*2;cv.height=r.height*2;ctx.scale(2,2);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.strokeStyle='#111'};
document.getElementById('accept').addEventListener('toggle',fit);let down=false;const pos=(e)=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
cv.onpointerdown=(e)=>{down=true;drawn=true;const[p,q]=pos(e);ctx.beginPath();ctx.moveTo(p,q);cv.setPointerCapture(e.pointerId)};cv.onpointermove=(e)=>{if(!down)return;const[p,q]=pos(e);ctx.lineTo(p,q);ctx.stroke()};cv.onpointerup=()=>{down=false};
document.getElementById('clr').onclick=(e)=>{e.preventDefault();ctx.clearRect(0,0,cv.width,cv.height);drawn=false}}
document.getElementById('aok').onclick=async()=>{const b={firstName:fn.value.trim(),lastName:ln.value.trim(),email:em.value.trim()};if(identity){if(!drawn){ae.textContent=reqMsg;return}b.signature=cv.toDataURL('image/png')}if(!b.firstName||!b.lastName||!b.email){ae.textContent=reqMsg;return}try{await post('/accept',b);location.reload()}catch(x){ae.textContent=x.message}};
document.getElementById('rok').onclick=async()=>{try{await post('/decline',{reason:rr.value});location.reload()}catch(x){re.textContent=x.message}};
</script></body></html>`
}

/* ---------------- actions ---------------- */
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '')

async function staffTarget(estimate) {
    const id = estimate.saleAgentId || estimate.addedFrom
    return id ? prisma.crmStaff.findUnique({ where: { id }, select: { email: true, firstName: true } }).catch(() => null) : null
}

/** Best-effort emails: a missing mail server must never block the client's answer. */
async function notify(slug, to, estimate, d, extra = {}) {
    try {
        if (!to) return
        const lang = await companyLanguage()
        const t = await findTemplate(slug, lang)
        if (!t || t.active === false) return
        const data = { ...(await baseData()), estimate_number: d.number, estimate_link: `${publicBase()}/crm/estimates/${estimate.id}`, client_company: d.client?.company || '', ...extra }
        await deliver({ to, subject: mergeFields(t.subject, data), html: await buildHtml(t.message, data) })
    } catch { /* ignore */ }
}

const ip = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
const log = (estimateId, description) => prisma.crmSalesActivity.create({ data: { relType: 'estimate', relId: estimateId, description, fullName: 'Client', date: new Date() } }).catch(() => {})

/** Settings → Estimates: "create the invoice automatically when the client accepts". */
async function maybeConvertToInvoice(d) {
    try {
        if ((await getOptions(['estimate_auto_convert_to_invoice_on_client_accept']))('estimate_auto_convert_to_invoice_on_client_accept') !== '1' || d.estimate.invoiceId) return
        await createInvoiceFromEstimate(d.estimate, { estimateNumber: d.number, actor: 'System' })
    } catch (err) { console.error('[estimate] auto-convert failed', err) }
}

export async function acceptEstimate(id, hash, body, request) {
    const d = await loadEstimateDoc(id, hash)
    if (!d) fail('Estimate not found', 404)
    if (d.status !== ESTIMATE.SENT) fail(d.status === ESTIMATE.ACCEPTED ? 'This estimate was already accepted' : d.status === ESTIMATE.EXPIRED ? 'This estimate has expired' : 'This estimate can no longer be accepted')
    const firstName = String(body.firstName || '').trim().slice(0, 60), lastName = String(body.lastName || '').trim().slice(0, 60), email = String(body.email || '').trim()
    if (!firstName || !lastName) fail('Please enter your first and last name')
    if (!validEmail(email)) fail('Please enter a valid email address')
    const identity = (await getOptions(['estimate_accept_identity_confirmation']))('estimate_accept_identity_confirmation', '1') === '1'
    const sig = String(body.signature || '')
    if (identity && !(sig.startsWith('data:image/png;base64,') && sig.length > 400 && sig.length < 400000)) fail('Please sign to accept this estimate')
    // atomic: only one answer wins
    const res = await prisma.crmEstimate.updateMany({ where: { id, status: ESTIMATE.SENT }, data: { status: ESTIMATE.ACCEPTED, acceptanceFirstname: firstName, acceptanceLastname: lastName, acceptanceEmail: email, acceptanceDate: new Date(), acceptanceIp: ip(request), signature: identity ? sig : null } })
    if (!res.count) fail('This estimate was already answered')
    await log(id, `Estimate accepted by ${firstName} ${lastName}`)
    await maybeConvertToInvoice(d)
    const staff = await staffTarget(d.estimate)
    await notify('estimate-accepted-to-staff', staff?.email, d.estimate, d, { staff_firstname: staff?.firstName || '' })
    await notify('estimate-thank-you-to-customer', email, d.estimate, d, { contact_firstname: firstName, contact_lastname: lastName })
    return { success: true }
}

export async function declineEstimate(id, hash, body) {
    const d = await loadEstimateDoc(id, hash)
    if (!d) fail('Estimate not found', 404)
    if (d.status !== ESTIMATE.SENT) fail('This estimate can no longer be refused')
    const res = await prisma.crmEstimate.updateMany({ where: { id, status: ESTIMATE.SENT }, data: { status: ESTIMATE.DECLINED } })
    if (!res.count) fail('This estimate was already answered')
    const reason = String(body.reason || '').trim().slice(0, 500)
    if (reason) await prisma.crmEstimateComment.create({ data: { estimateId: id, content: reason, authorName: d.client?.company || null } })
    await log(id, `Estimate declined by the client${reason ? `: ${reason}` : ''}`)
    const staff = await staffTarget(d.estimate)
    await notify('estimate-declined-to-staff', staff?.email, d.estimate, d, { staff_firstname: staff?.firstName || '' })
    return { success: true }
}

export async function commentEstimate(id, hash, body) {
    const d = await loadEstimateDoc(id, hash)
    if (!d) fail('Estimate not found', 404)
    const content = String(body.content || '').trim().slice(0, 2000)
    if (!content) fail('Write your comment first')
    const recent = await prisma.crmEstimateComment.count({ where: { estimateId: id, staffId: null, createdAt: { gte: new Date(Date.now() - 60000) } } })
    if (recent >= 5) fail('Too many comments, please wait a minute', 429)
    const name = String(body.name || '').trim().slice(0, 80) || d.client?.company || null
    await prisma.crmEstimateComment.create({ data: { estimateId: id, content, authorName: name } })
    await log(id, `New comment from ${name || 'the client'}`)
    const staff = await staffTarget(d.estimate)
    if (staff?.email) {
        const data = { ...(await baseData()), estimate_number: d.number }
        const html = await buildHtml(`<h2 style="font-family:Arial,sans-serif;color:#111827">New comment on estimate ${esc(d.number)}</h2><p style="font-family:Arial,sans-serif"><strong>${esc(name || '')}</strong> wrote:</p><blockquote style="border-left:4px solid #2563eb;margin:0;padding:8px 14px;background:#f9fafb;font-family:Arial,sans-serif;white-space:pre-line">${esc(content)}</blockquote><p><a href="${publicBase()}/crm/estimates/${id}">Open the estimate</a></p>`, data)
        deliver({ to: staff.email, subject: `New comment on estimate ${d.number}`, html }).catch(() => {})
    }
    return { success: true }
}

import prisma from '@/lib/prisma'
import { getOptions, sendTemplate } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { pdfSettings, paperCss } from '@/lib/crm/docStyle'
import { esc, htmlToPdf, fmtDate } from '@/lib/crm/invoicePdf'
import { TXT as BASE_TXT, renderPublicPage, initials } from '@/lib/crm/estimatePublic'
import { contractDocumentHtml, contractNumber, CONTRACT_CSS, signStamp } from '@/lib/crm/contractDoc'

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const TXT = {
    french: { ...BASE_TXT.french, ip: 'Adresse IP', accept: 'Signer le contrat', accepted: 'Contrat signé', acceptTitle: 'Signer ce contrat', acceptText: 'Confirmez votre identité et signez pour valider ce contrat.', confirmAccept: 'Signer le contrat', expired: 'Ce contrat est terminé' },
    english: { ...BASE_TXT.english, ip: 'IP address', accept: 'Sign contract', accepted: 'Contract signed', acceptTitle: 'Sign this contract', acceptText: 'Confirm your identity and sign to validate this contract.', confirmAccept: 'Sign contract', expired: 'This contract has ended' },
}

async function load(id, hash, staff) {
    if (!/^[0-9a-f]{24}$/i.test(id || '')) return null
    const c = await prisma.crmContract.findUnique({ where: { id } })
    if (!c) return null
    if (staff) return c
    if (!hash || c.hash !== hash || c.trash || c.notVisibleToClient) return null
    return c
}

export async function loadContractDoc(id, hash, staff = false) {
    const c = await load(id, hash, staff)
    if (!c) return null
    const [client, type, comments] = await Promise.all([
        c.clientId ? prisma.crmClient.findUnique({ where: { id: c.clientId } }) : null,
        c.contractTypeId ? prisma.crmContractType.findUnique({ where: { id: c.contractTypeId } }) : null,
        prisma.crmContractComment.findMany({ where: { contractId: id }, orderBy: { createdAt: 'asc' } }),
    ])
    return { contract: c, client, type, comments, number: contractNumber(c) }
}

export async function contractHtml(d, S) { return contractDocumentHtml(d.contract, d.client, d.type, S) }

export async function contractPdf(id, hash, staff = false) {
    const d = await loadContractDoc(id, hash, staff)
    if (!d) return null
    const S = await pdfSettings('contract')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title><style>${S.pageCss()}${S.baseCss()}${CONTRACT_CSS}${paperCss()}</style></head><body>${await contractHtml(d, S)}</body></html>`
    return { pdf: await htmlToPdf(html), name: `contract-${(d.contract.subject || d.number).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}.pdf` }
}

export async function contractPage(id, hash) {
    const d = await loadContractDoc(id, hash)
    if (!d) return null
    const S = await pdfSettings('contract')
    const lang = S.lang, T = TXT[lang], c = d.contract
    const o = await getOptions(['companyname', 'e_sign_legal_text'])
    const signed = c.signed || c.markedAsSigned
    const ended = c.dateEnd && new Date(c.dateEnd) < new Date(new Date().toDateString())
    const acting = !signed && !ended
    const primary = d.client ? await prisma.crmContact.findFirst({ where: { clientId: d.client.id, active: true }, orderBy: { isPrimary: 'desc' } }) : null
    const contact = primary ? { firstName: primary.firstName || '', lastName: primary.lastName || '', email: primary.email || '' } : null
    const banner = signed
        ? `<div class="banner ok"><strong>${T.accepted}</strong><div>${esc(T.acceptedBy)} ${esc([c.acceptanceFirstname, c.acceptanceLastname].filter(Boolean).join(' ') || '—')}${c.acceptanceDate ? ` ${T.on} ${signStamp(c.acceptanceDate, S)}` : ''}</div>${c.acceptanceIp ? `<div style="opacity:.8;font-size:.92em">${esc(TXT[lang].ip || 'IP')}: ${esc(String(c.acceptanceIp).replace(/^::ffff:/i, ''))}</div>` : ''}</div>`
        : ended ? `<div class="banner exp"><strong>${T.expired}</strong></div>` : ''
    const commentsHtml = d.comments.length ? d.comments.map((m) => `<div class="cm"><div class="av ${m.staffId ? 'st' : ''}">${esc(initials(m.authorName || ''))}</div><div><div class="meta"><strong>${esc(m.authorName || (m.staffId ? T.team : ''))}</strong>${m.staffId ? `<span class="tag">${T.team}</span>` : ''}<span>${new Date(m.createdAt).toLocaleString(lang === 'french' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><div class="txt">${esc(m.content || '')}</div></div></div>`).join('') : `<p class="muted">${T.noComments}</p>`
    const base = `/api/crm/public/contract/${id}/${hash}`
    const page = renderPublicPage({ lang, T, number: `${c.subject || ''} ${d.number}`.trim(), companyName: o('companyname'), banner, commentsHtml, commentsCount: d.comments.length, docHtml: await contractHtml(d, S), base, acting, noRefuse: true, identity: true, legalText: o('e_sign_legal_text'), contact })
    return page.replace('</style>', `${CONTRACT_CSS}${paperCss()}</style>`)
}

const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '')
const ip = (request) => ((request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || '').replace(/^::ffff:/i, '') || null
const staffOf = (c) => (c.addedFrom ? prisma.crmStaff.findUnique({ where: { id: c.addedFrom }, select: { email: true, firstName: true } }).catch(() => null) : null)

async function notify(slug, to, d, extra = {}) {
    try {
        if (!to) return
        const c = d.contract
        await sendTemplate({ slug, to, relType: 'contract', relId: c.id, data: { contract_subject: c.subject || '', contract_link: `${publicBase()}/crm/contracts/${c.id}`, ...extra } })
    } catch { /* a failed notification must not undo the signature */ }
}

export async function signContract(id, hash, body, request) {
    const d = await loadContractDoc(id, hash)
    if (!d) fail('Contract not found', 404)
    const c = d.contract
    if (c.signed || c.markedAsSigned) fail('This contract is already signed')
    if (c.dateEnd && new Date(c.dateEnd) < new Date(new Date().toDateString())) fail('This contract has ended')
    const firstName = String(body.firstName || '').trim().slice(0, 60), lastName = String(body.lastName || '').trim().slice(0, 60), email = String(body.email || '').trim()
    if (!firstName || !lastName) fail('Please enter your first and last name')
    if (!validEmail(email)) fail('Please enter a valid email address')
    const sig = String(body.signature || '')
    if (!(sig.startsWith('data:image/png;base64,') && sig.length > 400 && sig.length < 400000)) fail('Please sign to validate this contract')
    const res = await prisma.crmContract.updateMany({ where: { id, signed: false, markedAsSigned: false }, data: { signed: true, signature: sig, acceptanceFirstname: firstName, acceptanceLastname: lastName, acceptanceEmail: email, acceptanceDate: new Date(), acceptanceIp: ip(request) } })
    if (!res.count) fail('This contract was already signed')
    const staff = await staffOf(c)
    await notify('contract-signed-to-staff', staff?.email, d, { staff_firstname: staff?.firstName || '', contact_firstname: firstName, contact_lastname: lastName })
    return { success: true }
}

export async function commentContract(id, hash, body) {
    const d = await loadContractDoc(id, hash)
    if (!d) fail('Contract not found', 404)
    const content = String(body.content || '').trim().slice(0, 2000)
    if (!content) fail('Write your comment first')
    const recent = await prisma.crmContractComment.count({ where: { contractId: id, staffId: null, createdAt: { gte: new Date(Date.now() - 60000) } } })
    if (recent >= 5) fail('Too many comments, please wait a minute', 429)
    const name = String(body.name || '').trim().slice(0, 80) || d.client?.company || null
    await prisma.crmContractComment.create({ data: { contractId: id, content, authorName: name } })
    const staff = await staffOf(d.contract)
    await notify('contract-comment-to-admin', staff?.email, d, { staff_firstname: staff?.firstName || '' })
    return { success: true }
}

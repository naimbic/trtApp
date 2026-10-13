import prisma from '@/lib/prisma'
import { getOptions, buildHtml, mergeFields, deliver, findTemplate, companyLanguage, baseData, sendTemplate } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { pdfSettings } from '@/lib/crm/docStyle'
import { esc, htmlToPdf, fmtDate } from '@/lib/crm/invoicePdf'
import { CSS, TXT as BASE_TXT, renderPublicPage, initials } from '@/lib/crm/estimatePublic'
import { createInvoiceFromDocument } from '@/lib/crm/sales/convert'
import { PROPOSAL, EXPIRED, effectiveStatus, displayNumber, loadItems, proposalDocumentHtml, PROPOSAL_CSS } from '@/lib/crm/proposalDoc'
import { formatMoney } from '@/lib/crm/docStyle'

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const TXT = {
    french: { ...BASE_TXT.french, accept: 'Accepter', accepted: 'Offre acceptée', declined: 'Offre refusée', expired: 'Cette offre a expiré', acceptTitle: 'Accepter cette offre', refuseTitle: 'Refuser cette offre', acceptText: 'Confirmez votre identité et signez pour accepter cette offre.', refuseText: 'Souhaitez-vous vraiment refuser cette offre ?', confirmAccept: 'Accepter l’offre', confirmRefuse: 'Refuser l’offre', draft: 'Brouillon' },
    english: { ...BASE_TXT.english, accepted: 'Proposal accepted', declined: 'Proposal declined', expired: 'This proposal has expired', acceptTitle: 'Accept this proposal', refuseTitle: 'Refuse this proposal', acceptText: 'Confirm your identity and sign to accept this proposal.', refuseText: 'Do you really want to refuse this proposal?', confirmAccept: 'Accept proposal', confirmRefuse: 'Refuse proposal' },
}

async function load(id, hash, staff) {
    if (!/^[0-9a-f]{24}$/i.test(id || '')) return null
    const p = await prisma.crmProposal.findUnique({ where: { id } })
    if (!p) return null
    if (staff) return p
    if (!hash || p.hash !== hash || p.status === PROPOSAL.DRAFT) return null
    return p
}

export async function loadProposalDoc(id, hash, staff = false) {
    const p = await load(id, hash, staff)
    if (!p) return null
    const [items, currency, comments] = await Promise.all([
        loadItems(id),
        p.currencyId ? prisma.crmCurrency.findUnique({ where: { id: p.currencyId } }) : null,
        prisma.crmProposalComment.findMany({ where: { proposalId: id }, orderBy: { createdAt: 'asc' } }),
    ])
    return { proposal: p, items, currency, comments, number: await displayNumber(p), status: effectiveStatus(p) }
}

export async function proposalHtmlDoc(d, S) {
    return proposalDocumentHtml(d.proposal, d.items, d.currency, S, d.number)
}

export async function proposalPdf(id, hash, staff = false) {
    const d = await loadProposalDoc(id, hash, staff)
    if (!d) return null
    const S = await pdfSettings('proposal')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title><style>${S.pageCss()}${S.baseCss()}${PROPOSAL_CSS}</style></head><body>${await proposalHtmlDoc(d, S)}</body></html>`
    return { pdf: await htmlToPdf(html), name: `${d.number.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.pdf` }
}

export async function proposalPage(id, hash) {
    const d = await loadProposalDoc(id, hash)
    if (!d) return null
    const S = await pdfSettings('proposal')
    const lang = S.lang, T = TXT[lang], p = d.proposal
    const o = await getOptions(['proposal_accept_identity_confirmation', 'companyname', 'e_sign_legal_text'])
    const acting = [PROPOSAL.OPEN, PROPOSAL.SENT, PROPOSAL.REVISED].includes(d.status)
    const contact = p.proposalTo ? { firstName: String(p.proposalTo).split(' ')[0], lastName: String(p.proposalTo).split(' ').slice(1).join(' '), email: p.email || '' } : null
    const banner = d.status === PROPOSAL.ACCEPTED
        ? `<div class="banner ok"><strong>${T.accepted}</strong><div>${esc(T.acceptedBy)} ${esc([p.acceptanceFirstname, p.acceptanceLastname].filter(Boolean).join(' '))}${p.acceptanceDate ? ` ${T.on} ${fmtDate(p.acceptanceDate, S.dateFormat, S.timezone)}` : ''}</div>${p.signature?.startsWith('data:image/png;base64,') ? `<img class="sig" src="${p.signature}" alt="">` : ''}</div>`
        : d.status === PROPOSAL.DECLINED ? `<div class="banner no"><strong>${T.declined}</strong></div>`
        : d.status === EXPIRED ? `<div class="banner exp"><strong>${T.expired}</strong></div>` : ''
    const commentsHtml = d.comments.length ? d.comments.map((c) => `<div class="cm"><div class="av ${c.staffId ? 'st' : ''}">${esc(initials(c.authorName))}</div><div><div class="meta"><strong>${esc(c.authorName || (c.staffId ? T.team : ''))}</strong>${c.staffId ? `<span class="tag">${T.team}</span>` : ''}<span>${new Date(c.createdAt).toLocaleString(lang === 'french' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><div class="txt">${esc(c.content)}</div></div></div>`).join('') : `<p class="muted">${T.noComments}</p>`
    const base = `/api/crm/public/proposal/${id}/${hash}`
    const page = renderPublicPage({ lang, T, number: d.number, companyName: o('companyname'), banner, commentsHtml: p.allowComments ? commentsHtml : '', commentsCount: d.comments.length, docHtml: await proposalHtmlDoc(d, S), base, acting, identity: o('proposal_accept_identity_confirmation', '1') === '1', legalText: o('e_sign_legal_text'), contact })
    // the shared page uses the estimate CSS; proposals add their own block styles and may hide the comment box
    return page.replace('</style>', `${PROPOSAL_CSS}${p.allowComments ? '' : '.no-print form,.no-print h3{display:none}'}</style>`)
}

/* ---------------- client answers ---------------- */
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '')
const staffTarget = (p) => { const id = p.assignedId || p.addedFrom; return id ? prisma.crmStaff.findUnique({ where: { id }, select: { email: true, firstName: true } }).catch(() => null) : null }
const ip = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
const log = (id, description) => prisma.crmSalesActivity.create({ data: { relType: 'proposal', relId: id, description, fullName: 'Client', date: new Date() } }).catch(() => {})

async function notify(slug, to, d, extra = {}) {
    try {
        if (!to) return
        const p = d.proposal
        await sendTemplate({ slug, to, relType: 'proposal', relId: p.id, data: { proposal_number: d.number, proposal_subject: p.subject || '', proposal_proposal_to: p.proposalTo || '', proposal_total: formatMoney(p.total, d.currency, { sep: { decimal: ',', thousand: ' ' }, trimZero: false }), proposal_link: `${publicBase()}/crm/proposals/${p.id}`, ...extra } })
    } catch { /* ignore */ }
}

export async function acceptProposal(id, hash, body, request) {
    const d = await loadProposalDoc(id, hash)
    if (!d) fail('Proposal not found', 404)
    if (![PROPOSAL.OPEN, PROPOSAL.SENT, PROPOSAL.REVISED].includes(d.status)) fail(d.status === PROPOSAL.ACCEPTED ? 'This proposal was already accepted' : d.status === EXPIRED ? 'This proposal has expired' : 'This proposal can no longer be accepted')
    const firstName = String(body.firstName || '').trim().slice(0, 60), lastName = String(body.lastName || '').trim().slice(0, 60), email = String(body.email || '').trim()
    if (!firstName || !lastName) fail('Please enter your first and last name')
    if (!validEmail(email)) fail('Please enter a valid email address')
    const identity = (await getOptions(['proposal_accept_identity_confirmation']))('proposal_accept_identity_confirmation', '1') === '1'
    const sig = String(body.signature || '')
    if (identity && !(sig.startsWith('data:image/png;base64,') && sig.length > 400 && sig.length < 400000)) fail('Please sign to accept this proposal')
    const res = await prisma.crmProposal.updateMany({ where: { id, status: { in: [PROPOSAL.OPEN, PROPOSAL.SENT, PROPOSAL.REVISED] } }, data: { status: PROPOSAL.ACCEPTED, acceptanceFirstname: firstName, acceptanceLastname: lastName, acceptanceEmail: email, acceptanceDate: new Date(), acceptanceIp: ip(request), signature: identity ? sig : null } })
    if (!res.count) fail('This proposal was already answered')
    await log(id, `Proposal accepted by ${firstName} ${lastName}`)
    const staff = await staffTarget(d.proposal)
    await notify('proposal-client-accepted', staff?.email, d, { staff_firstname: staff?.firstName || '' })
    await notify('proposal-client-thank-you', email, d, { contact_firstname: firstName, contact_lastname: lastName })
    try {
        if (d.proposal.relType === 'customer' && !d.proposal.invoiceId && (await getOptions(['proposal_auto_convert_to_invoice_on_client_accept']))('proposal_auto_convert_to_invoice_on_client_accept') === '1') {
            await createInvoiceFromDocument('proposal', d.proposal, { label: d.number, actor: 'System' })
        }
    } catch (err) { console.error('[proposal] auto-convert failed', err) }
    return { success: true }
}

export async function declineProposal(id, hash, body) {
    const d = await loadProposalDoc(id, hash)
    if (!d) fail('Proposal not found', 404)
    if (![PROPOSAL.OPEN, PROPOSAL.SENT, PROPOSAL.REVISED].includes(d.status)) fail('This proposal can no longer be refused')
    const res = await prisma.crmProposal.updateMany({ where: { id, status: { in: [PROPOSAL.OPEN, PROPOSAL.SENT, PROPOSAL.REVISED] } }, data: { status: PROPOSAL.DECLINED } })
    if (!res.count) fail('This proposal was already answered')
    const reason = String(body.reason || '').trim().slice(0, 500)
    if (reason) await prisma.crmProposalComment.create({ data: { proposalId: id, content: reason, authorName: d.proposal.proposalTo || null } })
    await log(id, `Proposal declined by the client${reason ? `: ${reason}` : ''}`)
    const staff = await staffTarget(d.proposal)
    await notify('proposal-client-declined', staff?.email, d, { staff_firstname: staff?.firstName || '' })
    return { success: true }
}

export async function commentProposal(id, hash, body) {
    const d = await loadProposalDoc(id, hash)
    if (!d) fail('Proposal not found', 404)
    if (!d.proposal.allowComments) fail('Comments are turned off for this proposal')
    const content = String(body.content || '').trim().slice(0, 2000)
    if (!content) fail('Write your comment first')
    const recent = await prisma.crmProposalComment.count({ where: { proposalId: id, staffId: null, createdAt: { gte: new Date(Date.now() - 60000) } } })
    if (recent >= 5) fail('Too many comments, please wait a minute', 429)
    const name = String(body.name || '').trim().slice(0, 80) || d.proposal.proposalTo || null
    await prisma.crmProposalComment.create({ data: { proposalId: id, content, authorName: name } })
    await log(id, `New comment from ${name || 'the client'}`)
    const staff = await staffTarget(d.proposal)
    if (staff?.email) {
        const data = await baseData()
        const html = await buildHtml(`<h2 style="font-family:Arial,sans-serif;color:#111827">New comment on proposal ${esc(d.number)}</h2><p style="font-family:Arial,sans-serif"><strong>${esc(name || '')}</strong> wrote:</p><blockquote style="border-left:4px solid #2563eb;margin:0;padding:8px 14px;background:#f9fafb;font-family:Arial,sans-serif;white-space:pre-line">${esc(content)}</blockquote><p><a href="${publicBase()}/crm/proposals/${id}">Open the proposal</a></p>`, data)
        deliver({ to: staff.email, subject: `New comment on proposal ${d.number}`, html }).catch(() => {})
    }
    return { success: true }
}

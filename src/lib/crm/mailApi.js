import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, PermissionError } from '@/lib/crm/permissions'
import { formatDocumentNumber, INVOICE_STATUS } from '@/lib/crm/sales/calc'
import { numberPadding } from '@/lib/crm/numbering'
import fs from 'node:fs'
import path from 'node:path'
import { buildMessage, SHELL } from '@/lib/crm/mailDesign/build'
import { shortLink } from '@/lib/crm/shortLinks'
import { baseData, buildHtml, companyLanguage, deliver, findTemplate, getOptions, getSmtp, setOptions, smtpReady, testConnection, mergeFields, escapeHtml } from '@/lib/crm/mailer'

const plain = (v) => JSON.parse(JSON.stringify(v))
const fail = (message) => { throw new PermissionError(message, 400) }

/** Which templates may be used for each kind of document, and what each one is for. */
export const KINDS = {
    invoice: {
        feature: 'invoices', contactFlag: 'invoiceEmails',
        templates: [
            { slug: 'invoice-send-to-client', label: 'Send invoice' },
            { slug: 'invoice-due-notice', label: 'Due soon reminder' },
            { slug: 'invoice-overdue-notice', label: 'Overdue reminder' },
            { slug: 'invoice-payment-recorded', label: 'Payment received' },
            { slug: 'invoice-already-send', label: 'Invoice already sent' },
        ],
    },
    estimate: {
        feature: 'estimates', contactFlag: 'estimateEmails',
        templates: [
            { slug: 'estimate-send-to-client', label: 'Send estimate' },
            { slug: 'estimate-already-send', label: 'Estimate already sent' },
            { slug: 'estimate-expiry-reminder', label: 'Expiry reminder' },
            { slug: 'estimate-thank-you-to-customer', label: 'Thank you' },
        ],
    },
    proposal: {
        feature: 'proposals', contactFlag: null,
        templates: [
            { slug: 'proposal-send-to-customer', label: 'Send proposal' },
            { slug: 'proposal-expiry-reminder', label: 'Expiry reminder' },
            { slug: 'proposal-client-thank-you', label: 'Thank you' },
        ],
    },
    contract: {
        feature: 'contracts', contactFlag: 'contractEmails',
        templates: [
            { slug: 'send-contract', label: 'Send contract' },
            { slug: 'contract-expiration', label: 'Expiration notice' },
        ],
    },
}

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const money = (n, cur) => {
    const v = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, cur?.thousandSeparator ?? ' ').replace(/\.(\d\d)$/, `${cur?.decimalSeparator ?? '.'}$1`)
    const sym = cur?.symbol || cur?.name || ''
    return cur?.placement === 'before' ? `${sym}${v}` : `${v} ${sym}`.trim()
}
const INVOICE_LABEL = { 1: 'Unpaid', 2: 'Paid', 3: 'Partially paid', 4: 'Overdue', 5: 'Cancelled', 6: 'Draft' }
const ESTIMATE_LABEL = { 1: 'Draft', 2: 'Sent', 3: 'Declined', 4: 'Accepted', 5: 'Expired' }
const PROPOSAL_LABEL = { 1: 'Open', 2: 'Declined', 3: 'Accepted', 4: 'Sent', 5: 'Revised', 6: 'Draft' }

/** Documents imported without a secret hash get one the first time a link is made. */
async function ensureHash(model, doc) {
    if (doc.hash) return doc.hash
    const hash = (await import('node:crypto')).randomUUID().replace(/-/g, '')
    await prisma[model].update({ where: { id: doc.id }, data: { hash } })
    doc.hash = hash
    return hash
}

/** Loads the document, its client and the merge fields for a kind + id. */
async function loadContext(kind, id) {
    const base = await baseData()
    const padding = await numberPadding()
    let doc, clientId, data = {}, emailFallback = null
    if (kind === 'invoice') {
        doc = await prisma.crmInvoice.findUnique({ where: { id } })
        if (!doc) fail('Invoice not found')
        clientId = doc.clientId
        const cur = doc.currencyId ? await prisma.crmCurrency.findUnique({ where: { id: doc.currencyId } }) : null
        const paid = (await prisma.crmPayment.findMany({ where: { invoiceId: id } })).reduce((s, p) => s + (p.amount || 0), 0)
        const last = await prisma.crmPayment.findFirst({ where: { invoiceId: id }, orderBy: { paymentDate: 'desc' } })
        const invoiceNumber = formatDocumentNumber({ prefix: doc.prefix, number: doc.number, numberFormat: doc.numberFormat, date: doc.date, padding, draft: doc.status === INVOICE_STATUS.DRAFT })
        data = {
            invoice_number: invoiceNumber,
            invoice_link: await shortLink({ prefix: 'inv', relType: 'invoice', relId: id, label: invoiceNumber, target: `/api/crm/public/invoice/${id}/${await ensureHash('crmInvoice', doc)}` }),
            invoice_date: fmtDate(doc.date), invoice_duedate: fmtDate(doc.dueDate),
            invoice_status: INVOICE_LABEL[doc.status] || '',
            invoice_total: money(doc.total, cur), invoice_subtotal: money(doc.subtotal, cur),
            invoice_amount_due: money(doc.total - paid, cur),
            payment_total: money(last?.amount ?? paid, cur), payment_date: fmtDate(last?.paymentDate),
        }
    } else if (kind === 'estimate') {
        doc = await prisma.crmEstimate.findUnique({ where: { id } })
        if (!doc) fail('Estimate not found')
        clientId = doc.clientId
        const cur = doc.currencyId ? await prisma.crmCurrency.findUnique({ where: { id: doc.currencyId } }) : null
        const estimateNumber = formatDocumentNumber({ prefix: doc.prefix, number: doc.number, numberFormat: doc.numberFormat, date: doc.date, padding })
        data = {
            estimate_number: estimateNumber,
            estimate_link: await shortLink({ prefix: 'est', relType: 'estimate', relId: id, label: estimateNumber, target: `/api/crm/public/estimate/${id}/${await ensureHash('crmEstimate', doc)}` }),
            estimate_date: fmtDate(doc.date), estimate_expirydate: fmtDate(doc.expiryDate),
            estimate_status: ESTIMATE_LABEL[doc.status] || '', estimate_reference_no: doc.referenceNo || '',
            estimate_total: money(doc.total, cur), estimate_subtotal: money(doc.subtotal, cur),
        }
    } else if (kind === 'proposal') {
        doc = await prisma.crmProposal.findUnique({ where: { id } })
        if (!doc) fail('Proposal not found')
        clientId = doc.relType === 'customer' ? doc.relId : null
        emailFallback = doc.email
        const cur = doc.currencyId ? await prisma.crmCurrency.findUnique({ where: { id: doc.currencyId } }) : null
        const pre = (await getOptions(['proposal_number_prefix']))('proposal_number_prefix', 'PRO-')
        data = {
            proposal_number: `${pre}${String(doc.legacyId ?? '').padStart(padding, '0')}`,
            proposal_id: doc.legacyId ?? '', proposal_subject: doc.subject || '', proposal_proposal_to: doc.proposalTo || '',
            proposal_link: await shortLink({ prefix: 'prop', relType: 'proposal', relId: id, label: doc.subject || 'proposal', target: `/proposal/${id}/${await ensureHash('crmProposal', doc)}` }), proposal_open_till: fmtDate(doc.openTill),
            proposal_status: PROPOSAL_LABEL[doc.status] || '', proposal_total: money(doc.total, cur), proposal_subtotal: money(doc.subtotal, cur),
            proposal_assigned: '',
        }
    } else if (kind === 'contract') {
        doc = await prisma.crmContract.findUnique({ where: { id }, include: { contractType: true } })
        if (!doc) fail('Contract not found')
        clientId = doc.clientId
        data = {
            contract_subject: doc.subject || '', contract_description: doc.description || '',
            contract_datestart: fmtDate(doc.dateStart), contract_dateend: fmtDate(doc.dateEnd),
            contract_contract_value: doc.contractValue != null ? Number(doc.contractValue).toFixed(2) : '',
            contract_link: await shortLink({ prefix: 'ctr', relType: 'contract', relId: id, label: doc.subject || 'contract', target: `/contract/${id}/${await ensureHash('crmContract', doc)}` }), contract_type: doc.contractType?.name || '',
        }
    } else fail('Unknown document type')

    const client = clientId ? await prisma.crmClient.findUnique({ where: { id: clientId } }) : null
    const contacts = clientId ? await prisma.crmContact.findMany({ where: { clientId, active: true }, orderBy: { isPrimary: 'desc' } }) : []
    const flag = KINDS[kind].contactFlag
    const recipients = contacts.filter((c) => c.email).map((c) => ({
        email: c.email, name: [c.firstName, c.lastName].filter(Boolean).join(' '), primary: c.isPrimary, checked: flag ? c[flag] !== false && (c[flag] || c.isPrimary) : c.isPrimary,
    }))
    if (!recipients.length && emailFallback) recipients.push({ email: emailFallback, name: doc.proposalTo || '', primary: true, checked: true })
    if (recipients.length && !recipients.some((r) => r.checked)) recipients[0].checked = true
    const lead = recipients.find((r) => r.checked) || recipients[0]
    const [first = '', ...rest] = (lead?.name || '').split(' ')
    Object.assign(data, base, {
        client_company: client?.company || doc.proposalTo || '', client_phonenumber: client?.phoneNumber || '', client_vat_number: client?.vat || '',
        contact_firstname: first, contact_lastname: rest.join(' '), contact_email: lead?.email || '',
    })
    return { doc, client, recipients, data }
}

async function compose(kind, id, slug) {
    const spec = KINDS[kind]
    const ctx = await loadContext(kind, id)
    const language = await companyLanguage()
    const chosen = spec.templates.find((t) => t.slug === slug) || spec.templates[0]
    const template = await findTemplate(chosen.slug, language)
    if (!template) fail(`No email template "${chosen.slug}" found. Create it in Mails → Templates.`)
    return { ctx, template, chosen, language }
}

/** Everything the "Send email" dialog needs: templates, recipients and the rendered preview. */
export async function composeMail(kind, id, slug) {
    const spec = KINDS[kind]
    if (!spec) fail('Unknown document type')
    await requirePermission(spec.feature, 'view')
    const { ctx, template, chosen } = await compose(kind, id, slug)
    const smtp = await getSmtp()
    return plain({
        templates: spec.templates,
        template: chosen.slug,
        templateActive: template.active !== false,
        recipients: ctx.recipients,
        subject: mergeFields(template.subject, ctx.data),
        html: await buildHtml(template.message, ctx.data),
        smtpReady: smtpReady(smtp),
        from: smtp.email,
    })
}

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const toList = (v) => (Array.isArray(v) ? v : String(v || '').split(/[,;\s]+/)).map((s) => s.trim()).filter(Boolean)

export async function sendMail({ kind, id, template: slug, to, cc, subject, attachPdf }) {
    const spec = KINDS[kind]
    if (!spec) fail('Unknown document type')
    const session = await requirePermission(spec.feature, 'edit')
    const staffId = await getStaffId(session)
    if (!toList(to).length) fail('Choose at least one recipient')
    return sendMailCore({ kind, id, template: slug, to, cc, subject, attachPdf, staffId })
}

/**
 * Sends one document email with no permission check (used by the signed-in dialog and by the cron job).
 * Without `to`, it goes to the client contacts that are set to receive this kind of email.
 */
export async function sendMailCore({ kind, id, template: slug, to, cc, subject, attachPdf, staffId = null }) {
    const { ctx, template } = await compose(kind, id, slug)
    const toAll = toList(to).length ? toList(to) : ctx.recipients.filter((r) => r.checked).map((r) => r.email)
    const ccAll = toList(cc)
    if (!toAll.length) fail('This client has no contact with an email address')
    const badOne = [...toAll, ...ccAll].find((e) => !validEmail(e))
    if (badOne) fail(`"${badOne}" is not a valid email address`)

    const finalSubject = String(subject || '').trim() || mergeFields(template.subject, ctx.data)
    const html = await buildHtml(template.message, ctx.data)
    if (kind === 'invoice' && attachPdf === undefined && slug === 'invoice-payment-recorded') attachPdf = (await getOptions(['attach_invoice_to_payment_receipt_email']))('attach_invoice_to_payment_receipt_email') === '1'
    let attachments
    if (kind === 'invoice' && attachPdf) {
        const { renderInvoicePdf, pdfFileName } = await import('@/lib/crm/invoicePdf')
        try { attachments = [{ filename: pdfFileName(ctx.data.invoice_number), content: await renderInvoicePdf(id), contentType: 'application/pdf' }] } catch (e) { fail(`Could not create the PDF: ${e.message}`) }
    }
    const res = await deliver({ attachments, to: toAll.join(', '), cc: ccAll.join(', '), subject: finalSubject, html, fromName: template.fromName && !/^\{/.test(template.fromName) ? template.fromName : mergeFields(template.fromName, ctx.data), fromEmail: undefined })

    await prisma.crmMailLog.create({ data: { to: toAll.join(', '), cc: ccAll.join(', ') || null, subject: finalSubject, template: template.slug, relType: kind, relId: id, status: res.sent ? 'sent' : 'failed', error: res.error || null, staffId: staffId || undefined } })
    if (!res.sent) fail(res.error)

    const now = new Date()
    if (kind === 'invoice') {
        const patch = { sent: true, dateSend: now }
        if (slug === 'invoice-overdue-notice') patch.lastOverdueReminder = now
        if (slug === 'invoice-due-notice') patch.lastDueNotice = now
        await prisma.crmInvoice.update({ where: { id }, data: patch })
    } else if (kind === 'estimate') await prisma.crmEstimate.update({ where: { id }, data: { sent: true, dateSend: now, ...(ctx.doc.status === 1 ? { status: 2 } : {}) } })
    const staff = staffId ? await prisma.user.findUnique({ where: { id: staffId }, select: { name: true } }).catch(() => null) : null
    await prisma.crmSalesActivity.create({ data: { relType: kind, relId: id, description: `Email "${template.name || template.slug}" sent to ${toAll.join(', ')}`, staffId: staffId || undefined, fullName: staff?.name || (staffId ? null : 'Automatic'), date: now } }).catch(() => {})
    return { success: true, to: toAll }
}

/* ---------- settings, test, log ---------- */
const requireAdminish = () => requirePermission('email_templates', 'view')

export async function getMailSettings() {
    await requireAdminish()
    const s = await getSmtp()
    return { host: s.host, port: s.port, encryption: s.encryption, username: s.user, email: s.email, fromName: s.fromName, hasPassword: !!s.pass, ready: smtpReady(s) }
}

export async function saveMailSettings(b) {
    await requirePermission('email_templates', 'edit')
    const port = Number(b.port)
    if (!b.host?.trim()) fail('SMTP host is required')
    if (!(port > 0 && port < 65536)) fail('Port must be a number between 1 and 65535')
    if (!validEmail(b.email || '')) fail('A valid sender email is required')
    const values = { smtp_host: b.host.trim(), smtp_port: port, smtp_encryption: b.encryption === 'tls' ? 'tls' : b.encryption === 'ssl' ? 'ssl' : 'none', smtp_username: (b.username || '').trim(), smtp_email: b.email.trim(), smtp_from_name: (b.fromName || '').trim(), email_protocol: 'smtp' }
    if (b.password) values.smtp_password = b.password
    await setOptions(values)
    return { success: true }
}

export async function testMailSettings({ to }) {
    await requirePermission('email_templates', 'edit')
    const conn = await testConnection()
    if (!conn.ok) fail(conn.error)
    if (to) {
        if (!validEmail(to)) fail('Enter a valid test address')
        const base = await baseData()
        const res = await deliver({ to, subject: `Test email from ${base.companyname || 'your CRM'}`, html: `<p>This is a test email. Your mail settings work.</p>` })
        if (!res.sent) fail(res.error)
    }
    return { success: true }
}

/** Renders any template with sample data (used by the editor preview and the "send test" button). */
export async function previewTemplate({ subject, message }) {
    await requireAdminish()
    const sample = {
        ...(await baseData()), contact_firstname: 'Sara', contact_lastname: 'Benali', contact_email: 'sara@example.com', client_company: 'Atlas Studio', client_phonenumber: '+212 600 000 000',
        invoice_number: 'FA -012/10/2026', invoice_link: '#', invoice_date: '2026-10-01', invoice_duedate: '2026-10-16', invoice_status: 'Unpaid', invoice_total: '1 200,00 MAD', invoice_subtotal: '1 000,00 MAD', invoice_amount_due: '1 200,00 MAD', payment_total: '500,00 MAD', payment_date: '2026-10-05',
        estimate_number: 'DE -004/10/2026', estimate_link: '#', estimate_date: '2026-10-01', estimate_expirydate: '2026-10-31', estimate_total: '3 000,00 MAD', estimate_status: 'Sent', estimate_reference_no: 'REF-1',
        proposal_number: 'PRO-0007', proposal_subject: 'Website redesign', proposal_proposal_to: 'Atlas Studio', proposal_link: '#', proposal_open_till: '2026-10-31', proposal_total: '9 000,00 MAD',
        contract_subject: 'Website maintenance', contract_link: '#', contract_datestart: '2026-10-01', contract_dateend: '2027-10-01', contract_contract_value: '12000.00', contract_type: 'Maintenance', contract_description: '',
        staff_firstname: 'Karim', staff_lastname: 'Alaoui',
    }
    // Fields without sample data show as [field] so the preview never looks broken
    const unknown = (k) => `<span style="background:#fef3c7;color:#92400e;padding:0 3px;border-radius:3px">[${k}]</span>`
    return { subject: mergeFields(subject, sample, (k) => `[${k}]`), html: await buildHtml(message || '', sample, unknown) }
}

export async function sendTemplateTest({ subject, message, to }) {
    await requirePermission('email_templates', 'edit')
    if (!validEmail(to || '')) fail('Enter a valid test address')
    const p = await previewTemplate({ subject, message })
    const res = await deliver({ to, subject: `[Test] ${p.subject}`, html: p.html })
    await prisma.crmMailLog.create({ data: { to, subject: `[Test] ${p.subject}`, template: 'template-test', status: res.sent ? 'sent' : 'failed', error: res.error || null } })
    if (!res.sent) fail(res.error)
    return { success: true }
}

export async function listMailLog({ pageIndex = 1, pageSize = 20, status } = {}) {
    await requireAdminish()
    const where = status ? { status } : {}
    const [list, total] = await Promise.all([
        prisma.crmMailLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (pageIndex - 1) * pageSize, take: pageSize }),
        prisma.crmMailLog.count({ where }),
    ])
    return plain({ list, total })
}

/** Template catalog for the Templates screen. */
export async function listTemplates({ type, language, query } = {}) {
    await requireAdminish()
    const lang = language || (await companyLanguage())
    const rows = await prisma.crmEmailTemplate.findMany({ where: { language: lang }, orderBy: [{ type: 'asc' }, { name: 'asc' }] })
    const q = (query || '').toLowerCase()
    const list = rows.filter((r) => (!type || r.type === type) && (!q || `${r.name} ${r.subject} ${r.slug}`.toLowerCase().includes(q)))
    const languages = (await prisma.crmEmailTemplate.findMany({ distinct: ['language'], select: { language: true } })).map((l) => l.language).filter(Boolean).sort()
    const types = [...new Set(rows.map((r) => r.type).filter(Boolean))].sort()
    return plain({ list: list.map(({ message, ...r }) => r), language: lang, languages, types })
}
export { escapeHtml }

/** Writes a JSON backup of what is about to be overwritten, so a design can always be rolled back. */
function backup(name, payload) {
    const dir = path.join(process.cwd(), 'data-backups')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    fs.writeFileSync(file, JSON.stringify(payload, null, 2))
    return path.relative(process.cwd(), file)
}

/** Replaces templates by the ready-made designs (French / English). One slug, or every template of the language. */
export async function applyDesigns({ language, slug, shell } = {}) {
    await requirePermission('email_templates', 'edit')
    if (!['french', 'english'].includes(language)) fail('Ready-made designs exist for French and English')
    const rows = await prisma.crmEmailTemplate.findMany({ where: { language, ...(slug ? { slug } : {}) } })
    if (slug && !rows.length) fail('Template not found')
    const file = backup('email-templates', rows.map(({ id, slug: sl, language: l, subject, message }) => ({ id, slug: sl, language: l, subject, message })))
    let updated = 0
    const skipped = []
    for (const r of rows) {
        const built = buildMessage(r.slug, language)
        if (!built) { skipped.push(r.slug); continue }
        await prisma.crmEmailTemplate.update({ where: { id: r.id }, data: { subject: built.subject, message: built.message, plainText: false } })
        updated++
    }
    let shellApplied = false
    if (shell && !slug) {
        const o = await getOptions(['email_header', 'email_footer'])
        backup('email-shell', { email_header: o('email_header'), email_footer: o('email_footer') })
        await setOptions({ email_header: SHELL.header, email_footer: SHELL.footer })
        shellApplied = true
    }
    return { success: true, updated, skipped, shellApplied, backup: file }
}

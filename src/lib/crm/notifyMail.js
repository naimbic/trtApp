import prisma from '@/lib/prisma'
import { buildHtml, deliver, getOptions } from '@/lib/crm/mailer'
import { emailAllowed } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'
import { T, textsFor, when, nameOf, strip, money, richMessage, formatNotice, levelOf, recordFromLink } from './notifyMailCalc.js'
import { notifyStaffChannels } from '@/lib/crm/channels'

export { textsFor, when }
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { taskStatusNames } from '@/lib/crm/taskStatuses'

/**
 * The emails the CRM sends to its own team (reminders, deadlines...): one design for all of them, with what the person needs to understand
 * at a glance (what it is, when, who, the status, a short extract) and a button to open it. Texts in the language of the person.
 */
/**
 * What a record is, for an email: { kind, title, rows: [[label, value]], excerpt, link }. Empty values are left out.
 * relType: task | lead | customer | client | ticket | project | invoice | estimate | proposal | contract | expense.
 */
export async function recordCard(relType, relId, { language = 'english', tz = 'UTC' } = {}) {
    const L = textsFor(language)
    const d = (x, time) => when(x, { time, language, tz })
    const rows = []
    const add = (label, value) => { if (value !== undefined && value !== null && String(value).trim() !== '') rows.push([label, String(value)]) }
    let title = '', excerpt = '', link = '', priority = 0
    const kind = relType === 'client' ? 'customer' : relType
    if (!relId || !/^[a-f0-9]{24}$/i.test(String(relId))) return null
    const staffNames = async (ids) => ((ids || []).length ? (await prisma.crmStaff.findMany({ where: { id: { in: ids } }, select: { firstName: true, lastName: true, email: true } })).map(nameOf).join(', ') : '')
    const clientName = async (id) => (id ? (await prisma.crmClient.findUnique({ where: { id }, select: { company: true } }))?.company || '' : '')
    const currencyName = async (id) => (id ? (await prisma.crmCurrency.findUnique({ where: { id }, select: { name: true } }))?.name || '' : '')
    if (kind === 'task') {
        const t = await prisma.crmTask.findUnique({ where: { id: relId }, include: { assignees: true, checklistItems: true } })
        if (!t) return null
        const names = await taskStatusNames().catch(() => ({}))
        title = t.name; excerpt = strip(t.description); link = `/crm/tasks/${t.id}`; priority = t.priority || 0
        add(L.status, names[t.status] || '')
        add(L.priority, L.priorities[t.priority] || '')
        add(L.start, d(t.startDate, false)); add(L.due, d(t.dueDate, false))
        add(L.assigned, await staffNames(t.assignees.map((a) => a.staffId)))
        add(L.createdBy, await staffNames(t.addedFrom ? [t.addedFrom] : []))
        if (t.checklistItems.length) add(L.progress, `${t.checklistItems.filter((c) => c.finished).length}/${t.checklistItems.length}`)
        if (t.relType && t.relId) { const c = await recordCard(t.relType, t.relId, { language, tz }).catch(() => null); if (c && !['task'].includes(t.relType)) add(L.linked, `${L.kinds[c.kind] || ''} · ${c.title}`) }
    } else if (kind === 'lead') {
        const l = await prisma.crmLead.findUnique({ where: { id: relId } })
        if (!l) return null
        const [st, so] = await Promise.all([l.statusId ? prisma.crmLeadStatus.findUnique({ where: { id: l.statusId }, select: { name: true } }) : null, l.sourceId ? prisma.crmLeadSource.findUnique({ where: { id: l.sourceId }, select: { name: true } }) : null])
        title = l.company ? `${l.company} (${l.name || ''})` : l.name || ''; excerpt = strip(l.description); link = `/crm/leads/${l.id}`
        add(L.company, l.company); add(L.contact, l.name); add(L.email, l.email); add(L.phone, l.phoneNumber)
        add(L.status, st?.name); add(L.source, so?.name); add(L.language, l.defaultLanguage ? l.defaultLanguage[0].toUpperCase() + l.defaultLanguage.slice(1) : '')
        add(L.assigned, await staffNames(l.assignedIds?.length ? l.assignedIds : l.assigned ? [l.assigned] : []))
        add(L.lastContact, d(l.lastContact, false))
    } else if (kind === 'customer') {
        const c = await prisma.crmClient.findUnique({ where: { id: relId }, include: { contacts: { orderBy: { isPrimary: 'desc' }, take: 1 } } })
        if (!c) return null
        title = c.company || ''; link = `/crm/clients/${c.id}`
        const p = c.contacts[0]
        add(L.contact, [p?.firstName, p?.lastName].filter(Boolean).join(' ')); add(L.email, p?.email); add(L.phone, c.phoneNumber || p?.phoneNumber); add(L.city, c.city)
    } else if (kind === 'ticket') {
        const t = await prisma.crmTicket.findUnique({ where: { id: relId }, include: { status: true, priority: true } })
        if (!t) return null
        title = `#${t.legacyId ?? String(t.id).slice(-5).toUpperCase()} ${t.subject || ''}`.trim(); link = `/crm/tickets/${t.id}`; priority = levelOf(t.priority?.name)
        const dep = t.departmentId ? await prisma.crmDepartment.findUnique({ where: { id: t.departmentId }, select: { name: true } }) : null
        add(L.client, await clientName(t.clientId)); add(L.status, t.status?.name); add(L.priority, t.priority?.name); add(L.department, dep?.name); add(L.assigned, await staffNames(t.assignedId ? [t.assignedId] : []))
    } else if (kind === 'project') {
        const p = await prisma.crmProject.findUnique({ where: { id: relId } })
        if (!p) return null
        title = p.name; excerpt = strip(p.description); link = `/crm/projects/${p.id}`
        add(L.client, await clientName(p.clientId)); add(L.status, L.projectStatus[p.status] || ''); add(L.start, d(p.startDate, false)); add(L.deadlineDate, d(p.deadline, false))
    } else if (kind === 'invoice' || kind === 'estimate') {
        const doc = await (kind === 'invoice' ? prisma.crmInvoice : prisma.crmEstimate).findUnique({ where: { id: relId } })
        if (!doc) return null
        title = docNumberOf(doc, await numberPadding(), kind === 'invoice' ? 6 : 1); link = `/crm/${kind === 'invoice' ? 'invoices' : 'estimates'}/${doc.id}`
        add(L.client, await clientName(doc.clientId)); add(L.total, money(doc.total, await currencyName(doc.currencyId))); add(L.date, d(doc.date, false))
        add(kind === 'invoice' ? L.dueDate : L.validUntil, d(kind === 'invoice' ? doc.dueDate : doc.expiryDate, false))
    } else if (kind === 'proposal') {
        const p = await prisma.crmProposal.findUnique({ where: { id: relId } })
        if (!p) return null
        title = p.subject || ''; link = `/crm/proposals/${p.id}`
        add(L.contact, p.proposalTo); add(L.email, p.email); add(L.total, money(p.total, await currencyName(p.currencyId))); add(L.date, d(p.date, false)); add(L.openUntil, d(p.openTill, false))
    } else if (kind === 'contract') {
        const c = await prisma.crmContract.findUnique({ where: { id: relId } })
        if (!c) return null
        title = c.subject || ''; excerpt = strip(c.description); link = `/crm/contracts/${c.id}`
        add(L.client, await clientName(c.clientId)); add(L.start, d(c.dateStart, false)); add(L.ends, d(c.dateEnd, false)); add(L.amount, money(c.contractValue, ''))
    } else if (kind === 'expense') {
        const e = await prisma.crmExpense.findUnique({ where: { id: relId }, include: { category: true } })
        if (!e) return null
        title = e.expenseName || e.category?.name || ''; link = `/crm/expenses/${e.id}`
        add(L.category, e.category?.name); add(L.amount, money(e.amount, await currencyName(e.currencyId))); add(L.date, d(e.date, false)); add(L.client, await clientName(e.clientId))
    } else return null
    return { kind, title, rows, excerpt, link, priority }
}

/** Who a staff member is for an email: their name, language (their own, else the company's) and address. */
export async function staffMailContext(staffId) {
    const [s, o] = await Promise.all([staffId ? prisma.crmStaff.findUnique({ where: { id: staffId }, select: { firstName: true, lastName: true, email: true, defaultLanguage: true, active: true } }) : null, getOptions(['active_language', 'default_timezone'])])
    const language = T[s?.defaultLanguage] ? s.defaultLanguage : T[o('active_language', 'english')] ? o('active_language', 'english') : 'english'
    return { staff: s, name: s ? nameOf(s) : '', first: s?.firstName || '', language, tz: o('default_timezone') || 'UTC' }
}

/** Sends one designed email to a staff member (their own switch for email is respected) and logs it. Returns { sent, error }. */
export async function sendStaffMail({ staffId, headingKey = 'reminder', introKey = 'reminderIntro', relType, relId, title, link = '', note, noteLabel, tone = 'info', subject, slug = 'notification' }) {
    const ctx = await staffMailContext(staffId)
    const to = ctx.staff?.email
    if (!to) return { sent: false, error: 'No email address' }
    if (!(await emailAllowed(to, slug))) return { sent: false, error: 'The recipient chose not to receive email notifications' }
    const L = textsFor(ctx.language)
    const card = relType ? await recordCard(relType, relId, { language: ctx.language, tz: ctx.tz }).catch(() => null) : null
    const shown = card || (title ? { kind: relType === 'note' ? 'note' : null, title, rows: [], excerpt: '', link: '' } : null)
    const msg = richMessage({ baseUrl: publicBase(), L, name: ctx.first || ctx.name, tone, heading: L[headingKey] || L.reminder, intro: L[introKey] || '', card: shown, quote: note, quoteLabel: noteLabel ? L[noteLabel] || noteLabel : '', link: card?.link || link })
    const html = await buildHtml(msg, { companyname: (await getOptions(['companyname']))('companyname') })
    const res = await deliver({ to, subject, html })
    await prisma.crmMailLog.create({ data: { to, subject: String(subject).slice(0, 200), template: slug, relType: relType || null, relId: relId || undefined, status: res.sent ? 'sent' : 'failed', error: res.error || null } }).catch(() => {})
    return res
}

/**
 * The text of a notice for Telegram / WhatsApp, in the language of the person: the category first ("TASK · Urgent"), what happened,
 * the title, the facts (what, when, who...), a short extract and the link; the dot follows the level of a task or a ticket.
 * spec: { kind, relType, relId, headlineKey, vars, note, link, title, rows }  (relType + relId add the facts of the record; a link of the CRM finds its record).
 */
export async function noticeFor(staffId, spec = {}) {
    const ctx = await staffMailContext(staffId)
    const L = textsFor(ctx.language)
    const rec = spec.relType ? { relType: spec.relType, relId: spec.relId } : recordFromLink(spec.link)
    const card = rec?.relId ? await recordCard(rec.relType, rec.relId, { language: ctx.language, tz: ctx.tz }).catch(() => null) : null
    const vars = spec.vars || {}
    // the category is the record when there is one (TASK, LEAD...); what happened to it opens the notice (⏰ Reminder, Imane mentioned you...)
    const headline = spec.headlineKey ? String(L[spec.headlineKey] || spec.headlineKey).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : card && spec.kind && spec.kind !== card.kind ? `${spec.kind === 'reminder' ? '⏰ ' : ''}${L.kinds[spec.kind] || ''}` : ''
    const link = (card?.link || spec.link || '')
    return formatNotice({ L, kind: card?.kind || spec.kind || 'notification', title: card?.title || spec.title || '', headline, rows: [...(card?.rows || []), ...(spec.rows || [])], note: spec.note, link: link && !/^https?:/i.test(link) ? `${publicBase()}${link}` : link, priority: card?.priority })
}

/** Sends a notice to the Telegram / WhatsApp of a team member (when they switched it on). Never throws: a notice must not break what it reports. */
export async function notifyNotice(staffId, spec) {
    try { await notifyStaffChannels(staffId, await noticeFor(staffId, spec)) } catch (e) { console.error('[notice]', e.message) }
}

/**
 * A designed email to somebody outside the team (a lead or a client), in their language: a heading, what it is about, a quoted message
 * (plain text) and a button. { to, language, headingKey, introKey, vars, title, rows, note, link, subject }
 */
export async function sendPartyMail({ to, language = 'english', headingKey, vars = {}, title, rows = [], note, link, subject, tone = 'info', slug = 'notification', relType, relId }) {
    if (!to) return { sent: false, error: 'No email address' }
    if (!(await emailAllowed(to, slug))) return { sent: false, error: 'The recipient chose not to receive email notifications' }
    const L = textsFor(T[language] ? language : 'english')
    const heading = String(L[headingKey] || headingKey || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
    const msg = richMessage({ baseUrl: publicBase(), L, tone, heading, card: { kind: null, title, rows, excerpt: '' }, quote: note, quoteLabel: '', link, buttonLabel: L.openOnline })
    const html = await buildHtml(msg, { companyname: (await getOptions(['companyname']))('companyname') })
    const res = await deliver({ to, subject, html })
    await prisma.crmMailLog.create({ data: { to, subject: String(subject).slice(0, 200), template: slug, relType: relType || null, relId: relId || undefined, status: res.sent ? 'sent' : 'failed', error: res.error || null } }).catch(() => {})
    return res
}


// The lead email integration: reads a mailbox (IMAP), keeps only the emails that are website contact forms, and turns each into a lead
// with the sender's details, the message, the chosen source / status / owner, an activity entry and a follow-up task. Already known
// people are not duplicated: the new enquiry is added to their lead (or raises a task for their account manager when they are a customer).
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import prisma from '@/lib/prisma'
import { requireAnyPermission } from '@/lib/crm/permissions'
import { seal, unseal } from '@/lib/crm/twoFactor'
import { emailText, parseForm, judge, buildLead, customLabels, digits } from '@/lib/crm/leadMailCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
const MAX_PER_RUN = 40
const running = new Set()

/* ---------------- settings ---------------- */

const PUBLIC = (r) => ({
    id: r.id, active: r.active, email: r.email || '', imapServer: r.imapServer || '', imapPort: r.imapPort || null, imapUser: r.imapUser || '', encryption: r.encryption || 'ssl',
    folder: r.folder || 'INBOX', checkEvery: r.checkEvery || 5, hasPassword: !!(r.passwordEnc || r.password),
    leadSourceId: r.leadSourceId, leadStatusId: r.leadStatusId, responsible: r.responsible, markPublic: !!r.markPublic,
    startFrom: r.startFrom, fromFilter: r.fromFilter || '', subjectFilter: r.subjectFilter || '', bodyFilter: r.bodyFilter || '', requireForm: r.requireForm !== false,
    fieldMap: r.fieldMap || '', createTaskIfCustomer: r.createTaskIfCustomer !== false, followUpTask: r.followUpTask !== false, followUpHours: r.followUpHours ?? 24,
    markSeen: r.markSeen !== false, deleteAfterImport: !!r.deleteAfterImport, onlyUnseen: !!r.onlyLoopOnUnseenEmails,
    lastRunAt: r.lastRunAt, lastResult: r.lastResult, lastError: r.lastError, importedCount: r.importedCount || 0,
})

/** Mailbox settings belong to administrators (they hold a mail password). */
async function admin() { return requireAnyPermission([['lead_mail', 'edit'], ['settings', 'edit']]) }
const viewer = () => requireAnyPermission([['lead_mail', 'view'], ['settings', 'view']])

export async function listMailboxes() {
    await viewer()
    const rows = await prisma.crmLeadEmailIntegration.findMany({ orderBy: { createdAt: 'asc' } })
    const [sources, statuses, staff] = await Promise.all([
        prisma.crmLeadSource.findMany({ orderBy: [{ sourceOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, isActive: true } }),
        prisma.crmLeadStatus.findMany({ orderBy: { statusOrder: 'asc' }, select: { id: true, name: true } }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true } }),
    ])
    return {
        list: rows.map(PUBLIC),
        sources: sources.filter((s) => s.isActive !== false).map((s) => ({ value: s.id, label: s.name })),
        statuses: statuses.map((s) => ({ value: s.id, label: s.name })),
        staff: staff.map((s) => ({ value: s.id, label: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email })),
    }
}

export async function saveMailbox(b, id) {
    await admin()
    const email = nz(b.email)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Type the mailbox email address')
    const data = {
        email, active: !!b.active, imapServer: nz(b.imapServer), imapPort: b.imapPort ? Number(b.imapPort) || null : null, imapUser: nz(b.imapUser),
        encryption: ['ssl', 'tls', 'no'].includes(b.encryption) ? b.encryption : 'ssl', folder: nz(b.folder) || 'INBOX', checkEvery: Math.min(Math.max(Number(b.checkEvery) || 5, 1), 1440),
        leadSourceId: oid(b.leadSourceId), leadStatusId: oid(b.leadStatusId), responsible: oid(b.responsible), markPublic: !!b.markPublic,
        startFrom: b.startFrom ? new Date(b.startFrom) : undefined,
        fromFilter: nz(b.fromFilter), subjectFilter: nz(b.subjectFilter), bodyFilter: nz(b.bodyFilter), requireForm: b.requireForm !== false, fieldMap: nz(b.fieldMap),
        createTaskIfCustomer: b.createTaskIfCustomer !== false, followUpTask: b.followUpTask !== false, followUpHours: Math.min(Math.max(Number(b.followUpHours ?? 24) || 0, 0), 24 * 30),
        markSeen: b.markSeen !== false, deleteAfterImport: !!b.deleteAfterImport, onlyLoopOnUnseenEmails: !!b.onlyUnseen,
    }
    if (nz(b.password)) data.passwordEnc = seal(String(b.password))
    if (id) {
        const prev = await prisma.crmLeadEmailIntegration.findUnique({ where: { id } })
        if (!prev) throw fail('Mailbox not found', 404)
        if (data.startFrom === undefined) delete data.startFrom
        // a different mailbox / folder starts reading from the beginning again
        if (prev.email !== email || prev.folder !== data.folder || prev.imapServer !== data.imapServer) { data.lastUid = null; data.uidValidity = null }
        await prisma.crmLeadEmailIntegration.update({ where: { id }, data })
        return { success: true, id }
    }
    const row = await prisma.crmLeadEmailIntegration.create({ data: { ...data, startFrom: data.startFrom || new Date() } })
    return { success: true, id: row.id }
}

export async function deleteMailbox(id) {
    await admin()
    await prisma.crmLeadEmailImport.deleteMany({ where: { integrationId: id } })
    await prisma.crmLeadEmailIntegration.delete({ where: { id } })
    return { success: true }
}

export async function importLog(id) {
    await viewer()
    const rows = await prisma.crmLeadEmailImport.findMany({ where: { integrationId: id }, orderBy: { createdAt: 'desc' }, take: 60 })
    return rows.map((r) => ({ id: r.id, date: r.receivedAt || r.createdAt, subject: r.subject, from: r.fromAddress, result: r.result, reason: r.reason, leadId: r.leadId }))
}

/* ---------------- the mailbox ---------------- */

function connection(cfg, passOverride) {
    const pass = passOverride || (cfg.passwordEnc ? unseal(cfg.passwordEnc) : null)
    if (!cfg.imapServer || !cfg.email || !pass) throw fail('Fill in the IMAP server, the email address and the password first')
    let host = cfg.imapServer.trim(), port = cfg.imapPort
    const m = /^(.*):(\d{2,5})$/.exec(host)
    if (m) { host = m[1]; port = port || Number(m[2]) }
    const enc = cfg.encryption || 'ssl'
    return new ImapFlow({
        host, port: port || (enc === 'ssl' ? 993 : 143), secure: enc === 'ssl', doSTARTTLS: enc === 'tls' ? true : enc === 'no' ? false : undefined,
        auth: { user: cfg.imapUser || cfg.email, pass }, logger: false, socketTimeout: 60000,
    })
}

/** A short, safe text for a failure (never the password). */
const why = (e) => {
    const t = String(e?.response || e?.message || e || '')
    if (/auth|login|credential|password/i.test(t)) return 'The mail server refused the login: check the email address, the password and (for Gmail) use an app password'
    if (/ENOTFOUND|EAI_AGAIN/.test(t) || e?.code === 'ENOTFOUND') return 'The IMAP server name was not found'
    if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(t)) return 'Could not reach the mail server: check the server name, the port and the encryption'
    if (/mailbox|folder|NONEXISTENT/i.test(t)) return 'That folder does not exist in the mailbox'
    return t.slice(0, 200) || 'Mail error'
}

export async function testMailbox(b) {
    await admin()
    const stored = b.id ? await prisma.crmLeadEmailIntegration.findUnique({ where: { id: b.id } }) : null
    const cfg = { ...(stored || {}), ...b, passwordEnc: stored?.passwordEnc }
    const client = connection(cfg, nz(b.password))
    try {
        await client.connect()
        const lock = await client.getMailboxLock(cfg.folder || 'INBOX')
        try {
            const total = client.mailbox.exists
            const unseen = (await client.search({ seen: false }, { uid: true }))?.length || 0
            return { ok: true, message: `Connected. ${total} email${total === 1 ? '' : 's'} in ${cfg.folder || 'INBOX'}, ${unseen} unread.` }
        } finally { lock.release() }
    } catch (e) { throw fail(why(e)) } finally { await client.logout().catch(() => {}) }
}

/** Reads one email into { msg, parsed } (the judgement is made by the caller). */
async function readOne(client, uid, cfg, custom) {
    const m = await client.fetchOne(uid, { source: true, internalDate: true }, { uid: true })
    if (!m?.source) return null
    const p = await simpleParser(m.source)
    const text = emailText(p.text, p.html)
    const msg = {
        uid, messageId: p.messageId || null, fromAddress: p.from?.value?.[0]?.address || '', fromName: p.from?.value?.[0]?.name || '',
        replyTo: p.replyTo?.value?.[0]?.address || '', replyName: p.replyTo?.value?.[0]?.name || '', subject: p.subject || '', text,
        date: p.date || m.internalDate || new Date(),
    }
    const parsed = parseForm(text, custom)
    return { msg, parsed, verdict: judge(msg, cfg, parsed) }
}

/** What the reader would decide for the latest emails, without saving anything: to tune the filters. */
export async function previewMailbox(id, n = 15) {
    await admin()
    const cfg = await prisma.crmLeadEmailIntegration.findUnique({ where: { id } })
    if (!cfg) throw fail('Mailbox not found', 404)
    const custom = customLabels(cfg.fieldMap)
    const client = connection(cfg)
    try {
        await client.connect()
        const lock = await client.getMailboxLock(cfg.folder || 'INBOX')
        try {
            const uids = ((await client.search({ all: true }, { uid: true })) || []).slice(-n).reverse()
            const out = []
            for (const uid of uids) {
                const r = await readOne(client, uid, cfg, custom)
                if (!r) continue
                out.push({ uid, date: r.msg.date, from: r.msg.fromAddress, subject: r.msg.subject, lead: r.verdict.ok, reason: r.verdict.reason || null, found: r.verdict.ok ? buildLead(r.msg, r.parsed) : null, extras: r.verdict.ok ? r.parsed.extras : [] })
            }
            return { list: out }
        } finally { lock.release() }
    } catch (e) { throw fail(why(e)) } finally { await client.logout().catch(() => {}) }
}

/* ---------------- importing ---------------- */

async function defaults(cfg) {
    const status = cfg.leadStatusId || (await prisma.crmLeadStatus.findFirst({ where: { isDefault: true } }))?.id || (await prisma.crmLeadStatus.findFirst({ orderBy: { statusOrder: 'asc' } }))?.id || null
    const source = cfg.leadSourceId || (await prisma.crmLeadSource.findFirst({ where: { isDefault: true } }))?.id || null
    return { status, source }
}

const activity = (leadId, description) => prisma.crmLeadActivityLog.create({ data: { leadId, description, fullName: 'Email integration', customActivity: true } })

async function followUp(cfg, lead, title, text) {
    if (cfg.followUpTask === false) return null
    const hours = cfg.followUpHours ?? 24
    const task = await prisma.crmTask.create({ data: { name: title, description: text, priority: 3, startDate: new Date(), dueDate: new Date(Date.now() + hours * 3600000), relType: 'lead', relId: lead.id, status: 1, addedFrom: null } })
    if (cfg.responsible) await prisma.crmTaskAssigned.create({ data: { taskId: task.id, staffId: cfg.responsible } })
    return task
}

/** Who is already in the CRM: a lead with the same address or phone, a customer (contact) with the same address. */
async function known(lead) {
    const or = [lead.email ? { email: { equals: lead.email, mode: 'insensitive' } } : null].filter(Boolean)
    const d = digits(lead.phone)
    let existing = or.length ? await prisma.crmLead.findFirst({ where: { OR: or, junk: false }, orderBy: { createdAt: 'desc' } }) : null
    if (!existing && d.length >= 8) {
        const withPhone = await prisma.crmLead.findMany({ where: { phoneNumber: { not: null }, junk: false }, select: { id: true, phoneNumber: true }, take: 3000 })
        const hit = withPhone.find((l) => digits(l.phoneNumber) === d)
        existing = hit ? await prisma.crmLead.findUnique({ where: { id: hit.id } }) : null
    }
    const contact = lead.email ? await prisma.crmContact.findFirst({ where: { email: { equals: lead.email, mode: 'insensitive' } }, select: { clientId: true, firstName: true } }) : null
    return { existing, contact }
}

async function importOne(cfg, r, dry) {
    const { msg, parsed } = r
    const lead = buildLead(msg, parsed)
    const { existing, contact } = await known(lead)
    if (dry) return { result: existing ? 'duplicate' : contact ? 'duplicate' : 'imported', lead }
    const body = `${msg.subject ? `${msg.subject}\n\n` : ''}${msg.text}`.slice(0, 20000)
    if (contact && cfg.createTaskIfCustomer !== false) {
        const client = await prisma.crmClient.findUnique({ where: { id: contact.clientId }, select: { id: true, company: true } })
        const task = await prisma.crmTask.create({ data: { name: `Existing customer wrote: ${client?.company || lead.name}`, description: lead.description || msg.subject || '', priority: 3, startDate: new Date(), dueDate: new Date(Date.now() + (cfg.followUpHours ?? 24) * 3600000), relType: 'customer', relId: contact.clientId, status: 1 } })
        if (cfg.responsible) await prisma.crmTaskAssigned.create({ data: { taskId: task.id, staffId: cfg.responsible } })
        return { result: 'duplicate', reason: `Already a customer (${client?.company || 'client'}): a task was created`, leadId: null, lead }
    }
    if (existing) {
        await prisma.crmNote.create({ data: { relType: 'lead', relId: existing.id, description: `New enquiry by email${msg.subject ? ` — ${msg.subject}` : ''}\n\n${lead.description || ''}`.slice(0, 5000), dateContacted: msg.date, addedFrom: null } })
        await prisma.crmLead.update({ where: { id: existing.id }, data: { lastContact: msg.date } })
        await activity(existing.id, 'Wrote again by email (added as a note)')
        if (!existing.clientId) await followUp(cfg, existing, `Follow up: ${existing.name} wrote again`, lead.description || '')
        return { result: 'duplicate', reason: 'Already a lead: the message was added to it as a note', leadId: existing.id, lead }
    }
    const { status, source } = await defaults(cfg)
    const created = await prisma.crmLead.create({
        data: {
            name: lead.name, title: lead.title, company: lead.company, email: lead.email, phoneNumber: lead.phone, website: lead.website, city: lead.city, description: lead.description,
            statusId: status, sourceId: source, assigned: cfg.responsible || null, assignedIds: cfg.responsible ? [cfg.responsible] : [], dateAssigned: cfg.responsible ? new Date() : null,
            lastStatusChange: new Date(), lastContact: msg.date, isPublic: !!cfg.markPublic, leadOrder: 0, lost: false, junk: false, isImportedFromEmailIntegration: true, emailIntegrationUid: String(msg.uid),
        },
    })
    await prisma.crmLeadIntegrationEmail.create({ data: { leadId: created.id, subject: msg.subject, body } })
    await activity(created.id, `Lead imported from the mailbox ${cfg.email}`)
    await followUp(cfg, created, `Follow up: ${created.name}`, [lead.email, lead.phone, lead.company].filter(Boolean).join(' · ') + (lead.description ? `\n\n${lead.description}` : ''))
    return { result: 'imported', leadId: created.id, lead }
}

/** Reads the new emails of one mailbox. `dry` shows what would happen and saves nothing. */
export async function runMailbox(id, { dry = false, force = false } = {}) {
    const cfg = await prisma.crmLeadEmailIntegration.findUnique({ where: { id } })
    if (!cfg) throw fail('Mailbox not found', 404)
    if (running.has(id)) return { ok: true, imported: 0, duplicates: 0, skipped: 0, message: 'Already checking this mailbox' }
    running.add(id)
    const stat = { imported: 0, duplicates: 0, skipped: 0, looked: 0 }
    const custom = customLabels(cfg.fieldMap)
    const client = connection(cfg)
    let lastUid = cfg.lastUid ?? 0, error = null
    try {
        await client.connect()
        const lock = await client.getMailboxLock(cfg.folder || 'INBOX')
        try {
            const validity = String(client.mailbox.uidValidity)
            if (cfg.uidValidity && cfg.uidValidity !== validity) lastUid = 0
            const q = { since: cfg.startFrom || cfg.createdAt, ...(cfg.onlyLoopOnUnseenEmails ? { seen: false } : {}) }
            const found = ((await client.search(q, { uid: true })) || []).filter((u) => u > lastUid).sort((a, b) => a - b).slice(0, MAX_PER_RUN)
            for (const uid of found) {
                stat.looked++
                let r = null
                try { r = await readOne(client, uid, cfg, custom) } catch { /* unreadable email: skipped below */ }
                lastUid = uid
                if (!r) { stat.skipped++; continue }
                const messageId = r.msg.messageId || `uid-${validity}-${uid}`
                if (await prisma.crmLeadEmailImport.findUnique({ where: { integrationId_messageId: { integrationId: id, messageId } } })) continue
                const log = { integrationId: id, messageId, uid, subject: (r.msg.subject || '').slice(0, 300), fromAddress: r.msg.fromAddress, receivedAt: r.msg.date }
                const before = cfg.startFrom || cfg.createdAt
                if (r.msg.date && new Date(r.msg.date) < new Date(before)) { stat.skipped++; if (!dry) await prisma.crmLeadEmailImport.create({ data: { ...log, result: 'skipped', reason: 'Received before the start date' } }); continue }
                if (!r.verdict.ok) { stat.skipped++; if (!dry) await prisma.crmLeadEmailImport.create({ data: { ...log, result: 'skipped', reason: r.verdict.reason } }); continue }
                try {
                    const out = await importOne(cfg, r, dry)
                    out.result === 'imported' ? stat.imported++ : stat.duplicates++
                    if (!dry) {
                        await prisma.crmLeadEmailImport.create({ data: { ...log, result: out.result, reason: out.reason || null, leadId: out.leadId || null, fields: JSON.stringify(out.lead).slice(0, 4000) } })
                        if (cfg.markSeen !== false) await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }).catch(() => {})
                        if (cfg.deleteAfterImport) await client.messageDelete(uid, { uid: true }).catch(() => {})
                    }
                } catch (e) { stat.skipped++; console.error('[lead-mail]', e); if (!dry) await prisma.crmLeadEmailImport.create({ data: { ...log, result: 'skipped', reason: `Could not save: ${String(e.message).slice(0, 150)}` } }).catch(() => {}) }
            }
            if (!dry) await prisma.crmLeadEmailIntegration.update({ where: { id }, data: { uidValidity: validity, lastUid: lastUid || cfg.lastUid || null } })
        } finally { lock.release() }
    } catch (e) { error = why(e) } finally { await client.logout().catch(() => {}); running.delete(id) }
    const message = error || `${stat.imported} new lead${stat.imported === 1 ? '' : 's'}, ${stat.duplicates} already known, ${stat.skipped} not a lead (${stat.looked} email${stat.looked === 1 ? '' : 's'} read)`
    if (!dry) await prisma.crmLeadEmailIntegration.update({ where: { id }, data: { lastRunAt: new Date(), lastResult: error ? null : message, lastError: error, importedCount: (cfg.importedCount || 0) + stat.imported } })
    void force
    return { ok: !error, ...stat, message }
}

/** Manual "check now" from the screen. */
export async function checkNow(id) { await admin(); return runMailbox(id) }

/** The cron job: every active mailbox whose "check every N minutes" has passed. */
export async function leadMailJob({ lines, dry }) {
    const boxes = await prisma.crmLeadEmailIntegration.findMany({ where: { active: true } })
    for (const b of boxes) {
        const due = !b.lastRunAt || Date.now() - +new Date(b.lastRunAt) >= (b.checkEvery || 5) * 60000 - 20000
        if (!due) continue
        try {
            const r = await runMailbox(b.id, { dry })
            lines.push(`${dry ? '[preview] ' : ''}${b.email}: ${r.message}`)
        } catch (e) { lines.push(`! ${b.email}: ${e.message}`) }
    }
}

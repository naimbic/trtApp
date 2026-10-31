import { realPicture } from '@/lib/crm/pictures'
import { notifyComment, notifyNewMentions } from '@/lib/crm/mentionsApi'
import { storeRich } from '@/lib/crm/richText'
import { cleanEvent } from '@/lib/crm/calendar'
import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { readSettings } from '@/lib/crm/appSettings'
import { convertLeadToClient } from '@/server/actions/crm/crm/convertLead'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())

async function access(session) {
    const authority = session.user.authority || []
    return { authority, scope: viewScope(authority, 'leads'), staffId: await getStaffId(session), admin: isCrmAdmin(authority), session, can: (cap) => hasCap(authority, 'leads', cap) }
}
// "view own" staff always see leads assigned to or added by them; Perfex also lets any staff add and edit their own
const visible = (a) => (a.scope === 'all' ? {} : a.staffId ? { OR: [{ assigned: a.staffId }, { assignedIds: { has: a.staffId } }, { followerIds: { has: a.staffId } }, { addedFrom: a.staffId }, { isPublic: true }] } : { id: NONE })
const isOwn = (a, lead) => !!a.staffId && (lead.assigned === a.staffId || (lead.assignedIds || []).includes(a.staffId) || lead.addedFrom === a.staffId)
// a follower sees the lead and is told what happens on it, but only the team (and people who see all leads) change it
/** Items (notes, mails, meetings) added by someone else can be changed only with the matching permission; the author always can. */
const mayChangeItem = (a, by, kind) => (!!a.staffId && by === a.staffId) || a.can(`edit_others_${kind}`)
const mayDropItem = (a, by) => (!!a.staffId && by === a.staffId) || a.can('delete')
const mayEdit = (a, lead) => isOwn(a, lead) || (a.can('edit') && !((lead.followerIds || []).includes(a.staffId) && a.scope !== 'all'))

/** Everyone a lead is assigned to: the team list, or the single old owner. */
const teamOf = (l) => (l.assignedIds?.length ? l.assignedIds : l.assigned ? [l.assigned] : [])
const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
async function staffMap(ids) {
    const list = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(ids.filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    return Object.fromEntries(list.map((s) => [s.id, { id: s.id, name: staffName(s), image: realPicture(s.profileImage) }]))
}

const card = (l, people, status, source) => ({
    id: l.id, name: l.name, company: l.company, email: l.email, phone: l.phoneNumber, title: l.title, doText: l.doText || '', notes: l._notes || 0,
    statusId: l.statusId, status: status?.name || null, statusColor: status?.color || null, sourceId: l.sourceId, source: source?.name || null, sourceColor: source?.color || null,
    assigned: people[teamOf(l)[0]] || null, assignees: teamOf(l).map((i) => people[i]).filter(Boolean), lastContact: l.lastContact, createdAt: l.createdAt, lost: l.lost, junk: l.junk, converted: !!l.clientId, clientId: l.clientId,
})

/** Adds the number of notes to each lead (the small comment count on the cards). */
async function attachNotes(rows) {
    const ids = rows.map((r) => r.id)
    if (!ids.length) return rows
    const g = await prisma.crmNote.groupBy({ by: ['relId'], where: { relType: 'lead', relId: { in: ids } }, _count: { _all: true } }).catch(() => [])
    const m = Object.fromEntries(g.map((x) => [x.relId, x._count._all]))
    for (const r of rows) r._notes = m[r.id] || 0
    return rows
}

const readable = (d) => String(d || '').replace(/^not_lead_activity_/, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

async function logActivity(leadId, a, description, additional) {
    await prisma.crmLeadActivityLog.create({ data: { leadId, description, additionalData: additional || null, staffId: a.staffId || undefined, fullName: a.session.user.name || null, customActivity: true } })
}

export async function listLeads(p = {}) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const opt = await readSettings(['leads_kanban_limit', 'default_leads_kanban_sort', 'default_leads_kanban_sort_type'])
    const limit = Math.min(Math.max(parseInt(p.limit, 10) || parseInt(opt.get('leads_kanban_limit'), 10) || 50, 5), 500)
    const sort = opt.get('default_leads_kanban_sort') || 'leadorder'
    const dir = opt.get('default_leads_kanban_sort_type') === 'asc' ? 'asc' : opt.get('default_leads_kanban_sort_type') === 'desc' ? 'desc' : null // Settings → Leads: order direction
    const orderBy = sort === 'dateadded' ? [{ createdAt: dir || 'desc' }] : sort === 'lastcontact' ? [{ lastContact: dir || 'desc' }] : [{ leadOrder: dir || 'asc' }, { createdAt: 'desc' }]
    const and = [visible(a)]
    const show = p.show || ''
    if (show === 'lost') and.push({ lost: true }); else if (show === 'junk') and.push({ junk: true }); else if (show === 'converted') and.push({ clientId: { not: null } }); else and.push({ lost: false, junk: false })
    if (oid(p.assigned)) and.push({ OR: [{ assigned: p.assigned }, { assignedIds: { has: p.assigned } }] })
    if (oid(p.sourceId)) and.push({ sourceId: p.sourceId })
    if (p.mine === '1' && a.staffId) and.push({ OR: [{ assigned: a.staffId }, { assignedIds: { has: a.staffId } }] })
    if (p.from || p.to) and.push({ createdAt: { ...(p.from ? { gte: new Date(p.from) } : {}), ...(p.to ? { lte: new Date(`${p.to}T23:59:59.999`) } : {}) } })
    if (p.query) { const c = { contains: p.query, mode: 'insensitive' }; and.push({ OR: [{ name: c }, { company: c }, { email: c }, { phoneNumber: c }] }) }
    const where = { AND: and }
    const [statuses, sources] = await Promise.all([prisma.crmLeadStatus.findMany({ orderBy: { statusOrder: 'asc' } }), prisma.crmLeadSource.findMany({ orderBy: [{ sourceOrder: 'asc' }, { name: 'asc' }] })])
    const sMap = Object.fromEntries(statuses.map((s) => [s.id, s])), srcMap = Object.fromEntries(sources.map((s) => [s.id, s]))
    const can = { create: true, edit: a.can('edit'), delete: a.can('delete'), convert: hasCap(a.authority, 'customers', 'create') }
    if (p.view === 'list') {
        const rows = await prisma.crmLead.findMany({ where, orderBy: [{ createdAt: 'desc' }], take: 300 })
        await attachNotes(rows)
        const people = await staffMap(rows.flatMap(teamOf))
        return { list: rows.map((l) => card(l, people, sMap[l.statusId], srcMap[l.sourceId])), total: await prisma.crmLead.count({ where }), can, statuses: statuses.map((s) => ({ id: s.id, name: s.name, color: s.color })), sources: sources.map((s) => ({ id: s.id, name: s.name, color: s.color || null })) }
    }
    // "load more" for one column
    if (oid(p.statusId) && p.offset) {
        const rows = await prisma.crmLead.findMany({ where: { AND: [...and, { statusId: p.statusId }] }, orderBy, skip: parseInt(p.offset, 10) || 0, take: limit })
        await attachNotes(rows)
        const people = await staffMap(rows.flatMap(teamOf))
        return { leads: rows.map((l) => card(l, people, sMap[l.statusId], srcMap[l.sourceId])) }
    }
    const cols = []
    for (const s of statuses) {
        const w = { AND: [...and, { statusId: s.id }] }
        const [rows, count] = await Promise.all([prisma.crmLead.findMany({ where: w, orderBy, take: limit }), prisma.crmLead.count({ where: w })])
        if (s.isActive === false && !count) continue // a status turned off has no column until a lead sits in it
        cols.push({ id: s.id, name: s.name, color: s.color || '#64748b', count, rows })
    }
    const orphan = { AND: [...and, { OR: [{ statusId: null }, { statusId: { notIn: statuses.map((s) => s.id) } }] }] }
    const orphans = await prisma.crmLead.findMany({ where: orphan, take: limit, orderBy })
    await attachNotes([...cols.flatMap((c) => c.rows), ...orphans])
    const people = await staffMap([...cols.flatMap((c) => c.rows), ...orphans].flatMap(teamOf))
    const out = cols.map((c) => ({ id: c.id, name: c.name, color: c.color, count: c.count, leads: c.rows.map((l) => card(l, people, sMap[l.statusId], srcMap[l.sourceId])) }))
    if (orphans.length) out.unshift({ id: 'none', name: 'No status', color: '#94a3b8', count: orphans.length, leads: orphans.map((l) => card(l, people, null, srcMap[l.sourceId])) })
    const totals = { lost: await prisma.crmLead.count({ where: { AND: [visible(a), { lost: true }] } }), junk: await prisma.crmLead.count({ where: { AND: [visible(a), { junk: true }] } }) }
    return { statuses: out, limit, totals, can, sources: sources.map((s) => ({ id: s.id, name: s.name })) }
}

async function loadOne(id, a) {
    if (!oid(id)) throw fail('Lead not found', 404)
    const l = await prisma.crmLead.findFirst({ where: { AND: [{ id }, visible(a)] } })
    if (!l) throw fail('Lead not found', 404)
    return l
}

export async function getLead(id) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const l = await loadOne(id, a)
    const [status, source, notes, activity, tasks, proposals, client, mails, meetings] = await Promise.all([
        l.statusId ? prisma.crmLeadStatus.findUnique({ where: { id: l.statusId } }) : null,
        l.sourceId ? prisma.crmLeadSource.findUnique({ where: { id: l.sourceId } }) : null,
        prisma.crmNote.findMany({ where: { relType: 'lead', relId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmLeadActivityLog.findMany({ where: { leadId: id }, orderBy: { createdAt: 'desc' }, take: 60 }),
        prisma.crmTask.findMany({ where: { relType: 'lead', relId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, status: true, dueDate: true } }),
        prisma.crmProposal.findMany({ where: { relType: 'lead', relId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, number: true, legacyId: true, subject: true, status: true, total: true } }),
        l.clientId ? prisma.crmClient.findUnique({ where: { id: l.clientId }, select: { id: true, company: true } }) : null,
        prisma.crmLeadMail.findMany({ where: { leadId: id }, orderBy: { date: 'desc' }, take: 200 }),
        prisma.crmEvent.findMany({ where: { leadId: id }, orderBy: { start: 'desc' }, take: 200 }),
    ])
    const senders = await senderOptions(a)
    const people = await staffMap([...teamOf(l), ...(l.followerIds || []), l.addedFrom, ...notes.map((n) => n.addedFrom), ...mails.map((m) => m.addedFrom), ...meetings.flatMap((e) => [e.userId, ...(e.attendeeIds || [])])])
    return {
        lead: { ...card(l, people, status, source), description: l.description || '', website: l.website, address: l.address, city: l.city, state: l.state, zip: l.zip, defaultLanguage: l.defaultLanguage, isPublic: l.isPublic, assignedId: l.assigned, assignedIds: teamOf(l), followerIds: l.followerIds || [], addedBy: people[l.addedFrom] || null, dateConverted: l.dateConverted, lastStatusChange: l.lastStatusChange, client },
        notes: notes.map((n) => ({ id: n.id, content: n.description || '', by: people[n.addedFrom] || null, date: n.dateContacted || n.createdAt, mine: !!a.staffId && n.addedFrom === a.staffId, canEdit: mayChangeItem(a, n.addedFrom, 'notes'), canDelete: mayDropItem(a, n.addedFrom), edited: +new Date(n.updatedAt) - +new Date(n.createdAt) > 2000 })),
        activity: activity.map((x) => ({ id: x.id, text: x.customActivity ? x.description : readable(x.description), by: x.fullName || '', date: x.createdAt })),
        tasks, proposals: proposals.map((p) => ({ ...p, number: p.number ?? p.legacyId })),
        followers: (l.followerIds || []).map((i) => people[i]).filter(Boolean), followerIds: l.followerIds || [],
        mails: mails.map((m) => ({ id: m.id, direction: m.direction, subject: m.subject || '', from: m.direction === 'draft' ? draftFrom(m.fromAddress, senders) : m.fromAddress || '', to: m.direction === 'draft' ? m.toAddress || l.email || '' : m.toAddress || '', cc: m.ccAddress || '', bcc: m.bccAddress || '', replyTo: m.replyTo || '', note: m.note || '', checks: Array.isArray(m.checks) ? m.checks : [], body: m.body || '', date: m.date, by: people[m.addedFrom] || null, source: m.source, mine: !!a.staffId && m.addedFrom === a.staffId, canEdit: mayChangeItem(a, m.addedFrom, 'mails'), canDelete: mayDropItem(a, m.addedFrom) })),
        meetings: meetings.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end, allDay: e.allDay, link: e.meetingUrl || '', location: e.location || '', report: e.report || '', reminderBefore: e.reminderBefore, reminderBeforeType: e.reminderBeforeType || 'minutes', attendeeIds: e.attendeeIds || [], attendees: (e.attendeeIds || []).map((i) => people[i]).filter(Boolean), by: people[e.userId] || null, mine: !!a.staffId && e.userId === a.staffId, canEdit: mayChangeItem(a, e.userId, 'meetings'), canDelete: mayDropItem(a, e.userId) })),
        senders,
        can: { edit: mayEdit(a, l), delete: a.can('delete'), convert: hasCap(a.authority, 'customers', 'create') && !l.clientId },
    }
}

export async function saveLead(body, id) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const name = nz(body.name)
    if (!name) throw fail('Give the lead a name')
    const email = nz(body.email)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('That email address does not look right')
    const data = { ...(body.doText !== undefined ? { doText: nz(body.doText) } : {}), name, title: nz(body.title), company: nz(body.company), email, phoneNumber: nz(body.phone), website: nz(body.website), description: storeRich(body.description), address: nz(body.address), city: nz(body.city), state: nz(body.state), zip: nz(body.zip), sourceId: oid(body.sourceId), isPublic: !!body.isPublic, lastContact: body.lastContact ? new Date(body.lastContact) : null }
    if (id) {
        const prev = await loadOne(id, a)
        if (!mayEdit(a, prev)) throw fail('You can only edit your own leads', 403)
        if (prev.clientId && (await readSettings(['lead_lock_after_convert_to_customer'])).on('lead_lock_after_convert_to_customer') && !a.admin) throw fail('This lead is locked because it became a client')
        const team = body.assignedIds !== undefined ? [...new Set((body.assignedIds || []).map(oid).filter(Boolean))] : body.assignedId !== undefined ? [oid(body.assignedId)].filter(Boolean) : null
        if (team && JSON.stringify(team) !== JSON.stringify(teamOf(prev))) { data.assignedIds = team; data.assigned = team[0] || null; data.dateAssigned = team.length ? new Date() : null }
        if (body.followerIds !== undefined) data.followerIds = [...new Set((body.followerIds || []).map(oid).filter(Boolean))]
        const st = oid(body.statusId)
        if (st && st !== prev.statusId) { data.statusId = st; data.lastStatusChange = new Date() }
        await prisma.crmLead.update({ where: { id }, data })
        if (data.description !== undefined) await notifyNewMentions({ by: { staffId: a.staffId, name: session.user.name }, text: data.description, prev: prev.description, link: `/crm/leads/${id}`, subject: data.name })
        if (st && st !== prev.statusId) await logStatus(id, a, prev.statusId, st)
        return { success: true, id }
    }
    const def = await prisma.crmLeadStatus.findFirst({ where: { isDefault: true } }) || (await prisma.crmLeadStatus.findFirst({ orderBy: { statusOrder: 'asc' } }))
    const statusId = oid(body.statusId) || def?.id || null
    if (!data.sourceId) data.sourceId = (await prisma.crmLeadSource.findFirst({ where: { isDefault: true } }))?.id || null // the default source
    const team0 = body.assignedIds !== undefined ? [...new Set((body.assignedIds || []).map(oid).filter(Boolean))] : [oid(body.assignedId)].filter(Boolean)
    const team = team0.length ? team0 : a.staffId ? [a.staffId] : []
    const assigned = team[0] || null
    const followers = body.followerIds !== undefined ? [...new Set((body.followerIds || []).map(oid).filter(Boolean))] : []
    const lead = await prisma.crmLead.create({ data: { ...data, statusId, assigned, assignedIds: team, followerIds: followers, dateAssigned: assigned ? new Date() : null, addedFrom: a.staffId, leadOrder: 0, lost: false, junk: false, lastStatusChange: new Date() } })
    await logActivity(lead.id, a, 'Lead created')
    if (data.description) await notifyNewMentions({ by: { staffId: a.staffId, name: session.user.name }, text: data.description, prev: '', link: `/crm/leads/${lead.id}`, subject: data.name })
    return { success: true, id: lead.id }
}

async function logStatus(id, a, from, to) {
    const rows = await prisma.crmLeadStatus.findMany({ where: { id: { in: [from, to].filter(Boolean) } }, select: { id: true, name: true } })
    const n = (x) => rows.find((r) => r.id === x)?.name || 'none'
    await logActivity(id, a, `Status changed from ${n(from)} to ${n(to)}`)
}

/** Persist a column after a drop: ids in display order, moving any card from another column here. */
export async function reorderLeads(statusId, ids) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    if (!oid(statusId) || !Array.isArray(ids)) throw fail('Bad request')
    for (const [i, id] of ids.filter(oid).entries()) {
        const l = await prisma.crmLead.findFirst({ where: { AND: [{ id }, visible(a)] } })
        if (!l) continue
        const moved = l.statusId !== statusId
        if (moved && !mayEdit(a, l)) continue
        await prisma.crmLead.update({ where: { id }, data: { leadOrder: i, ...(moved ? { statusId, lastStatusChange: new Date() } : {}) } })
        if (moved) await logStatus(id, a, l.statusId, statusId)
    }
    return { success: true }
}

export async function flagLead(id, action) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const l = await loadOne(id, a)
    if (!mayEdit(a, l)) throw fail('Forbidden', 403)
    if (action === 'lost') await prisma.crmLead.update({ where: { id }, data: { lost: true, junk: false, lastLeadStatusId: l.statusId } })
    else if (action === 'junk') await prisma.crmLead.update({ where: { id }, data: { junk: true, lost: false, lastLeadStatusId: l.statusId } })
    else if (action === 'restore') await prisma.crmLead.update({ where: { id }, data: { junk: false, lost: false, ...(l.lastLeadStatusId ? { statusId: l.lastLeadStatusId } : {}) } })
    else throw fail('Unknown action')
    await logActivity(id, a, action === 'restore' ? 'Lead restored' : `Marked as ${action}`)
    return { success: true }
}

export async function convertLead(id, opts = {}) {
    const session = await requirePermission('customers', 'create')
    const a = await access(session)
    const l = await loadOne(id, a)
    if (!mayEdit(a, l)) throw fail('Forbidden', 403)
    const r = await convertLeadToClient(id, { includeLeadNotes: !!opts.includeNotes })
    if (!r.success) throw fail(r.message || 'Could not convert the lead')
    // Settings → Leads: the person who owned the lead becomes the administrator of the new client
    if (l.assigned && (await readSettings(['auto_assign_customer_admin_after_lead_convert'])).on('auto_assign_customer_admin_after_lead_convert') && r.clientId) {
        const has = await prisma.crmCustomerAdmin.findFirst({ where: { clientId: r.clientId, staffId: l.assigned }, select: { id: true } })
        if (!has) await prisma.crmCustomerAdmin.create({ data: { clientId: r.clientId, staffId: l.assigned, dateAssigned: new Date() } })
    }
    return r
}

export async function addNote(id, { content, date }) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const lead = await loadOne(id, a)
    const text = storeRich(content)
    if (!text) throw fail('Write the note first')
    await prisma.crmNote.create({ data: { relType: 'lead', relId: id, description: text, dateContacted: date ? new Date(date) : new Date(), addedFrom: a.staffId } })
    await prisma.crmLead.update({ where: { id }, data: { lastContact: date ? new Date(date) : new Date() } })
    try { await notifyComment({ by: { staffId: a.staffId, name: session.user.name }, text, link: `/crm/leads/${id}`, subject: lead.name, recipients: [...teamOf(lead), ...(lead.followerIds || []), lead.addedFrom] }) } catch (e) { console.error('[note notify]', e.message) }
    return { success: true }
}

export async function editNote(id, noteId, content) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const n = oid(noteId) && (await prisma.crmNote.findFirst({ where: { id: noteId, relType: 'lead', relId: id } }))
    if (!n) throw fail('Note not found', 404)
    if (!mayChangeItem(a, n.addedFrom, 'notes')) throw fail('You can only edit your own notes', 403)
    const text = storeRich(content)
    if (!text) throw fail('Write the note first')
    await prisma.crmNote.update({ where: { id: noteId }, data: { description: text } })
    return { success: true }
}

export async function deleteNote(id, noteId) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const n = oid(noteId) && (await prisma.crmNote.findFirst({ where: { id: noteId, relType: 'lead', relId: id } }))
    if (!n) throw fail('Note not found', 404)
    if (n.addedFrom !== a.staffId && !a.can('delete')) throw fail('You can only delete your own notes', 403)
    await prisma.crmNote.delete({ where: { id: noteId } })
    return { success: true }
}

/* ------------------------------------------------ mails logged on a lead ------------------------------------------------ */
const mailData = (b) => {
    const subject = nz(b.subject)
    const body = storeRich(b.body)
    if (!subject && !body) throw fail('Give the mail a subject or write its text')
    const date = b.date ? new Date(b.date) : new Date()
    if (Number.isNaN(+date)) throw fail('The date of the mail is not valid')
    return { direction: b.direction === 'out' ? 'out' : b.direction === 'draft' ? 'draft' : 'in', subject, fromAddress: nz(b.from), toAddress: nz(b.to), ccAddress: nz(b.cc), bccAddress: nz(b.bcc), replyTo: nz(b.replyTo), note: nz(b.note) ? String(b.note).trim().slice(0, 1000) : null, checks: (Array.isArray(b.checks) ? b.checks : []).map((c) => ({ text: String(c?.text || '').trim().slice(0, 200), done: !!c?.done })).filter((c) => c.text).slice(0, 10), body: body || null, date }
}

/** Logs an email sent to / received from the lead (written in the editor): date and time, from, to, subject, text. */
export async function saveMail(id, body, mailId) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const lead = await loadOne(id, a)
    if (!mayEdit(a, lead) && !(mailId && a.can('edit_others_mails'))) throw fail('You can only edit your own leads', 403)
    const data = mailData(body)
    if (mailId) {
        const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, leadId: id } }))
        if (!m) throw fail('Mail not found', 404)
        if (!mayChangeItem(a, m.addedFrom, 'mails')) throw fail('You can only edit the mails you logged', 403)
        if (data.direction === 'draft' && m.direction !== 'draft') throw fail('A mail that is already sent or received cannot go back to a draft')
        // changing what will be sent cancels the confirmations: the checks must be confirmed again on the new text
        if (m.direction === 'draft' && ['subject', 'fromAddress', 'toAddress', 'ccAddress', 'bccAddress', 'replyTo', 'body'].some((k) => (m[k] || null) !== (data[k] || null))) data.checks = data.checks.map((c) => ({ ...c, done: false }))
        await prisma.crmLeadMail.update({ where: { id: mailId }, data })
        return { success: true, id: mailId }
    }
    const m = await prisma.crmLeadMail.create({ data: { ...data, leadId: id, addedFrom: a.staffId, source: 'manual' } })
    if (data.direction === 'draft') return { success: true, id: m.id } // nothing happened with the lead yet: it is only a draft
    await prisma.crmLead.update({ where: { id }, data: { lastContact: data.date > new Date() ? new Date() : data.date } })
    await logActivity(id, a, `${data.direction === 'out' ? 'Mail sent' : 'Mail received'} logged${data.subject ? `: ${data.subject}` : ''}`)
    try { await notifyComment({ by: { staffId: a.staffId, name: session.user.name }, text: `✉ ${data.subject || ''}`, link: `/crm/leads/${id}`, subject: lead.name, recipients: [...teamOf(lead), ...(lead.followerIds || [])] }) } catch (e) { console.error('[mail notify]', e.message) }
    return { success: true, id: m.id }
}

const MAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/
const addrList = (v) => String(v || '').split(/[,;\s]+/).filter(Boolean)
const MAX_ATTACH_MB = 20
const DEFAULT_SENDER = 'hello@trtmaroc.com' // the first and default "send from" address until Settings → Email says otherwise

/** A draft goes out from an allowed address: its own when that is still allowed, otherwise the default one. */
const draftFrom = (from, senders) => { const f = String(from || '').trim(); return senders.find((e) => e.toLowerCase() === f.toLowerCase()) || senders[0] || f }

/** The addresses a lead mail may be sent from: hello@trtmaroc.com always first (the default), the extra ones set in Settings → Email, and the staff member's own email. The mail server's own address is never offered unless it is added to that list. */
async function senderOptions(a) {
    const { getAccounts } = await import('@/lib/crm/mailer')
    const [opt, me, accounts] = await Promise.all([prisma.crmOption.findUnique({ where: { name: 'lead_mail_senders' } }), a.staffId ? prisma.crmStaff.findUnique({ where: { id: a.staffId }, select: { email: true } }) : null, getAccounts()])
    const seen = new Set(), out = []
    for (const e of [DEFAULT_SENDER, ...addrList(opt?.value), ...accounts.map((x) => x.email), me?.email]) { const k = String(e || '').trim().toLowerCase(); if (k && MAIL_RE.test(k) && !seen.has(k)) { seen.add(k); out.push(String(e).trim()) } }
    return out
}

/** Confirms (or un-confirms) one check of a draft. */
export async function checkDraftMail(id, mailId, index, done) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const lead = await loadOne(id, a)
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, leadId: id } }))
    if (!m) throw fail('Mail not found', 404)
    if (m.direction !== 'draft') throw fail('This mail is not a draft')
    if (!mayEdit(a, lead) && !a.can('edit_others_mails')) throw fail('You can only edit your own leads', 403)
    const checks = Array.isArray(m.checks) ? m.checks.map((c) => ({ ...c })) : []
    if (!checks[index]) throw fail('Check not found', 404)
    checks[index].done = !!done
    await prisma.crmLeadMail.update({ where: { id: mailId }, data: { checks } })
    return { success: true }
}

/** Removes the files attached to mails (the rows and the stored objects). */
async function dropMailFiles(mailIds) {
    if (!mailIds.length) return
    const rows = await prisma.crmMedia.findMany({ where: { relType: 'leadmail', relId: { in: mailIds } } })
    if (!rows.length) return
    await prisma.crmMedia.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } })
    const keys = rows.map((r) => r.key).filter(Boolean)
    const shared = new Set((await prisma.crmMedia.findMany({ where: { key: { in: keys } }, select: { key: true } })).map((r) => r.key))
    try { const { deleteMedia } = await import('@/lib/media'); await deleteMedia(keys.filter((k) => !shared.has(k)), { allowAny: true }) } catch (e) { console.error('[mail files]', e.message) }
}

/** Sends a draft through the CRM mail server (from the chosen address, with the staff signature and the attached files), then turns it into a sent mail dated now. A failed send leaves the draft as it was. */
export async function sendDraftMail(id, mailId) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const lead = await loadOne(id, a)
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, leadId: id } }))
    if (!m) throw fail('Mail not found', 404)
    if (m.direction !== 'draft') throw fail('This mail is not a draft')
    if (!mayEdit(a, lead) && !a.can('edit_others_mails')) throw fail('You can only edit your own leads', 403)
    if (!mayChangeItem(a, m.addedFrom, 'mails')) throw fail('You can only send the drafts you wrote', 403)
    const to = addrList(m.toAddress || lead.email), cc = addrList(m.ccAddress), bcc = addrList(m.bccAddress), reply = addrList(m.replyTo)
    if (!to.length) throw fail('Add the email address to send to')
    const bad = [...to, ...cc, ...bcc, ...reply].find((e) => !MAIL_RE.test(e))
    if (bad) throw fail(`"${bad}" is not a valid email address`)
    if (!m.subject) throw fail('Write a subject before sending')
    const pending = (Array.isArray(m.checks) ? m.checks : []).filter((c) => !c.done).length
    if (pending) throw fail('Confirm every check before sending')
    const senders = await senderOptions(a)
    const from = draftFrom(m.fromAddress, senders)
    if (!from) throw fail('Choose the address to send from in the list')
    const files = await prisma.crmMedia.findMany({ where: { relType: 'leadmail', relId: mailId, isFolder: false } })
    if (files.reduce((n, f) => n + (f.size || 0), 0) > MAX_ATTACH_MB * 1024 * 1024) throw fail(`The attached files are larger than ${MAX_ATTACH_MB} MB together`)
    const { deliver, escapeHtml } = await import('@/lib/crm/mailer')
    const me = a.staffId ? await prisma.crmStaff.findUnique({ where: { id: a.staffId }, select: { firstName: true, lastName: true, email: true, emailSignature: true } }) : null
    const html = `${m.body || `<p>${escapeHtml(m.subject)}</p>`}${me?.emailSignature ? `<br>${me.emailSignature}` : ''}`
    const own = !!me?.email && me.email.toLowerCase() === from.toLowerCase()
    const res = await deliver({
        to: to.join(', '), cc: cc.join(', '), bcc: bcc.join(', '), replyTo: reply.join(', '), subject: m.subject, html,
        fromEmail: from, fromName: own && me ? staffName(me) : undefined,
        attachments: files.filter((f) => f.url).map((f) => ({ filename: f.name, path: f.url })),
    })
    if (!res.sent) throw fail(res.error || 'The email could not be sent')
    const now = new Date()
    await prisma.crmLeadMail.update({ where: { id: mailId }, data: { direction: 'out', date: now, fromAddress: from } })
    await prisma.crmLead.update({ where: { id }, data: { lastContact: now } })
    await logActivity(id, a, `Mail sent: ${m.subject}`)
    try { await notifyComment({ by: { staffId: a.staffId, name: session.user.name }, text: `✉ ${m.subject}`, link: `/crm/leads/${id}`, subject: lead.name, recipients: [...teamOf(lead), ...(lead.followerIds || [])] }) } catch (e) { console.error('[mail notify]', e.message) }
    return { success: true, id: mailId }
}

export async function deleteMail(id, mailId) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const m = oid(mailId) && (await prisma.crmLeadMail.findFirst({ where: { id: mailId, leadId: id } }))
    if (!m) throw fail('Mail not found', 404)
    if (m.addedFrom !== a.staffId && !a.can('delete')) throw fail('You can only delete the mails you logged', 403)
    await prisma.crmLeadMail.delete({ where: { id: mailId } })
    await dropMailFiles([mailId])
    return { success: true }
}

/* ------------------------------------- meetings of a lead = calendar events with the lead ------------------------------------- */
/** A meeting is a calendar event about this lead (title, date and time, link, reminder, guests) plus its report, so it shows in the Calendar. */
export async function saveMeeting(id, body, eventId) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    const lead = await loadOne(id, a)
    if (!mayEdit(a, lead) && !(eventId && a.can('edit_others_meetings'))) throw fail('You can only edit your own leads', 403)
    const report = body.report !== undefined ? storeRich(body.report) : undefined
    if (eventId) {
        const ev = oid(eventId) && (await prisma.crmEvent.findFirst({ where: { id: eventId, leadId: id } }))
        if (!ev) throw fail('Meeting not found', 404)
        if (ev.userId && !mayChangeItem(a, ev.userId, 'meetings')) throw fail('You can only edit the meetings you added', 403)
        const data = cleanEvent({ title: ev.title, start: ev.start, end: ev.end, color: ev.color, isPublic: ev.isPublic, description: ev.description, allDay: ev.allDay, location: ev.location, meetingUrl: ev.meetingUrl, category: ev.category, projectId: ev.projectId, clientId: null, attendeeIds: ev.attendeeIds, attendeeEmails: ev.attendeeEmails, reminderBefore: ev.reminderBefore, reminderBeforeType: ev.reminderBeforeType, report: ev.report, ...body, leadId: id })
        if (report !== undefined) data.report = report || null
        await prisma.crmEvent.update({ where: { id: eventId }, data: { ...data, isStartNotified: false } })
        return { success: true, id: eventId }
    }
    const data = cleanEvent({ category: 'meeting', ...body, leadId: id, attendeeIds: (body.attendeeIds || []).length ? body.attendeeIds : a.staffId ? [a.staffId] : [] })
    if (report !== undefined) data.report = report || null
    const ev = await prisma.crmEvent.create({ data: { ...data, userId: a.staffId || undefined } })
    await prisma.crmLead.update({ where: { id }, data: { lastContact: new Date() } })
    await logActivity(id, a, `Meeting added: ${data.title}`)
    try { await notifyComment({ by: { staffId: a.staffId, name: session.user.name }, text: `📅 ${data.title}`, link: `/crm/leads/${id}`, subject: lead.name, recipients: [...teamOf(lead), ...(lead.followerIds || []), ...(data.attendeeIds || [])] }) } catch (e) { console.error('[meeting notify]', e.message) }
    return { success: true, id: ev.id }
}

export async function deleteMeeting(id, eventId) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const ev = oid(eventId) && (await prisma.crmEvent.findFirst({ where: { id: eventId, leadId: id } }))
    if (!ev) throw fail('Meeting not found', 404)
    if (ev.userId !== a.staffId && !a.can('delete')) throw fail('You can only delete the meetings you added', 403)
    await prisma.crmEvent.delete({ where: { id: eventId } })
    return { success: true }
}

export async function deleteLead(id) {
    const session = await requirePermission('leads', 'delete')
    const a = await access(session)
    const l = await loadOne(id, a)
    if (l.clientId) throw fail('This lead was converted to a client and cannot be deleted')
    await prisma.crmLeadActivityLog.deleteMany({ where: { leadId: id } })
    await prisma.crmNote.deleteMany({ where: { relType: 'lead', relId: id } })
    await dropMailFiles((await prisma.crmLeadMail.findMany({ where: { leadId: id }, select: { id: true } })).map((x) => x.id))
    await prisma.crmLeadMail.deleteMany({ where: { leadId: id } })
    await prisma.crmEvent.deleteMany({ where: { leadId: id } })
    await prisma.crmLead.delete({ where: { id } })
    return { success: true }
}

export async function leadLookups() {
    await requirePermission('leads', 'view')
    const [staff, statuses, sources] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmLeadStatus.findMany({ orderBy: { statusOrder: 'asc' }, select: { id: true, name: true, color: true, isActive: true } }),
        prisma.crmLeadSource.findMany({ orderBy: [{ sourceOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, color: true, isActive: true } }),
    ])
    return { staff: staff.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) })).sort((x, y) => x.name.localeCompare(y.name)), statuses, sources }
}

import { realPicture } from '@/lib/crm/pictures'
import { notifyComment } from '@/lib/crm/mentionsApi'
import { storeRich } from '@/lib/crm/richText'
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
const visible = (a) => (a.scope === 'all' ? {} : a.staffId ? { OR: [{ assigned: a.staffId }, { assignedIds: { has: a.staffId } }, { addedFrom: a.staffId }, { isPublic: true }] } : { id: NONE })
const mayEdit = (a, lead) => a.can('edit') || (!!a.staffId && (lead.assigned === a.staffId || (lead.assignedIds || []).includes(a.staffId) || lead.addedFrom === a.staffId))

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
    const [status, source, notes, activity, tasks, proposals, client] = await Promise.all([
        l.statusId ? prisma.crmLeadStatus.findUnique({ where: { id: l.statusId } }) : null,
        l.sourceId ? prisma.crmLeadSource.findUnique({ where: { id: l.sourceId } }) : null,
        prisma.crmNote.findMany({ where: { relType: 'lead', relId: id }, orderBy: { createdAt: 'desc' } }),
        prisma.crmLeadActivityLog.findMany({ where: { leadId: id }, orderBy: { createdAt: 'desc' }, take: 60 }),
        prisma.crmTask.findMany({ where: { relType: 'lead', relId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, status: true, dueDate: true } }),
        prisma.crmProposal.findMany({ where: { relType: 'lead', relId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, number: true, legacyId: true, subject: true, status: true, total: true } }),
        l.clientId ? prisma.crmClient.findUnique({ where: { id: l.clientId }, select: { id: true, company: true } }) : null,
    ])
    const people = await staffMap([...teamOf(l), l.addedFrom, ...notes.map((n) => n.addedFrom)])
    return {
        lead: { ...card(l, people, status, source), description: l.description || '', website: l.website, address: l.address, city: l.city, state: l.state, zip: l.zip, defaultLanguage: l.defaultLanguage, isPublic: l.isPublic, assignedId: l.assigned, assignedIds: teamOf(l), addedBy: people[l.addedFrom] || null, dateConverted: l.dateConverted, lastStatusChange: l.lastStatusChange, client },
        notes: notes.map((n) => ({ id: n.id, content: n.description || '', by: people[n.addedFrom] || null, date: n.dateContacted || n.createdAt, mine: !!a.staffId && n.addedFrom === a.staffId, canDelete: (!!a.staffId && n.addedFrom === a.staffId) || a.can('delete'), edited: +new Date(n.updatedAt) - +new Date(n.createdAt) > 2000 })),
        activity: activity.map((x) => ({ id: x.id, text: x.customActivity ? x.description : readable(x.description), by: x.fullName || '', date: x.createdAt })),
        tasks, proposals: proposals.map((p) => ({ ...p, number: p.number ?? p.legacyId })),
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
        const st = oid(body.statusId)
        if (st && st !== prev.statusId) { data.statusId = st; data.lastStatusChange = new Date() }
        await prisma.crmLead.update({ where: { id }, data })
        if (st && st !== prev.statusId) await logStatus(id, a, prev.statusId, st)
        return { success: true, id }
    }
    const def = await prisma.crmLeadStatus.findFirst({ where: { isDefault: true } }) || (await prisma.crmLeadStatus.findFirst({ orderBy: { statusOrder: 'asc' } }))
    const statusId = oid(body.statusId) || def?.id || null
    if (!data.sourceId) data.sourceId = (await prisma.crmLeadSource.findFirst({ where: { isDefault: true } }))?.id || null // the default source
    const team0 = body.assignedIds !== undefined ? [...new Set((body.assignedIds || []).map(oid).filter(Boolean))] : [oid(body.assignedId)].filter(Boolean)
    const team = team0.length ? team0 : a.staffId ? [a.staffId] : []
    const assigned = team[0] || null
    const lead = await prisma.crmLead.create({ data: { ...data, statusId, assigned, assignedIds: team, dateAssigned: assigned ? new Date() : null, addedFrom: a.staffId, leadOrder: 0, lost: false, junk: false, lastStatusChange: new Date() } })
    await logActivity(lead.id, a, 'Lead created')
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
    try { await notifyComment({ by: { staffId: a.staffId, name: session.user.name }, text, link: `/crm/leads/${id}`, subject: lead.name, recipients: [...teamOf(lead), lead.addedFrom] }) } catch (e) { console.error('[note notify]', e.message) }
    return { success: true }
}

export async function editNote(id, noteId, content) {
    const session = await requirePermission('leads', 'view')
    const a = await access(session)
    await loadOne(id, a)
    const n = oid(noteId) && (await prisma.crmNote.findFirst({ where: { id: noteId, relType: 'lead', relId: id } }))
    if (!n) throw fail('Note not found', 404)
    if (!a.staffId || n.addedFrom !== a.staffId) throw fail('You can only edit your own notes', 403)
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

export async function deleteLead(id) {
    const session = await requirePermission('leads', 'delete')
    const a = await access(session)
    const l = await loadOne(id, a)
    if (l.clientId) throw fail('This lead was converted to a client and cannot be deleted')
    await prisma.crmLeadActivityLog.deleteMany({ where: { leadId: id } })
    await prisma.crmNote.deleteMany({ where: { relType: 'lead', relId: id } })
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

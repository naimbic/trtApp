// The "Reports & Strategies" tab of a client: reports the team sends to the client and strategies it proposes (like Requests, staff side for now).
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap } from '@/lib/crm/permissions'
import { scope as clientScope } from '@/lib/crm/clientsApi'
import { storeRich } from '@/lib/crm/richText'
import { deliver, escapeHtml } from '@/lib/crm/mailer'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const KINDS = ['report', 'strategy']
export const STATUSES = ['draft', 'sent', 'approved', 'declined']

async function gate(cap) {
    const session = await requirePermission('client_reports', cap)
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), name: session.user.name || session.user.email }
}
async function clientOf(g, clientId) {
    if (!oid(clientId)) throw fail('Client not found', 404)
    const c = await prisma.crmClient.findFirst({ where: { id: clientId, ...(await clientScope(g.session)) } })
    if (!c) throw fail('Client not found', 404)
    return c
}
const out = (r, names = {}) => ({ id: r.id, clientId: r.clientId, kind: r.kind, title: r.title, body: r.body || '', status: r.status, period: r.period || '', sentAt: r.sentAt, sentTo: r.sentTo || [], by: names[r.createdBy] || '', createdAt: r.createdAt, updatedAt: r.updatedAt })

export async function listReports(clientId) {
    const g = await gate('view')
    await clientOf(g, clientId)
    const rows = await prisma.crmClientReport.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 300 })
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.createdBy).filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true } })
    const names = Object.fromEntries(staff.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(' ')]))
    const contacts = await prisma.crmContact.findMany({ where: { clientId, active: true }, select: { id: true, firstName: true, lastName: true, email: true, isPrimary: true }, orderBy: { isPrimary: 'desc' } })
    return {
        list: rows.map((r) => out(r, names)),
        contacts: contacts.filter((c) => c.email).map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email, email: c.email, primary: !!c.isPrimary })),
        can: { create: hasCap(g.authority, 'client_reports', 'create'), edit: hasCap(g.authority, 'client_reports', 'edit'), delete: hasCap(g.authority, 'client_reports', 'delete') },
    }
}

export async function saveReport(clientId, body = {}, id = null) {
    const g = await gate(id ? 'edit' : 'create')
    await clientOf(g, clientId)
    const cur = id ? (oid(id) && (await prisma.crmClientReport.findFirst({ where: { id, clientId } }))) : null
    if (id && !cur) throw fail('Not found', 404)
    const data = {}
    if (!cur || body.title !== undefined) { const t = String(body.title || '').trim().slice(0, 200); if (!t) throw fail('Give it a title'); data.title = t }
    if (!cur || body.kind !== undefined) { if (!KINDS.includes(body.kind || 'report')) throw fail('Unknown kind'); data.kind = body.kind || 'report' }
    if (body.body !== undefined) data.body = storeRich(String(body.body || ''), 40000) || null
    if (body.period !== undefined) data.period = String(body.period || '').trim().slice(0, 80) || null
    if (body.status !== undefined) { if (!STATUSES.includes(body.status)) throw fail('Unknown status'); data.status = body.status }
    const row = cur ? await prisma.crmClientReport.update({ where: { id }, data }) : await prisma.crmClientReport.create({ data: { ...data, clientId, createdBy: g.staffId || undefined } })
    return { success: true, id: row.id }
}

export async function deleteReport(clientId, id) {
    const g = await gate('delete')
    await clientOf(g, clientId)
    const cur = oid(id) && (await prisma.crmClientReport.findFirst({ where: { id, clientId } }))
    if (!cur) throw fail('Not found', 404)
    await prisma.crmClientReport.delete({ where: { id } })
    return { success: true }
}

/** Emails the report or the strategy to the chosen contacts of the client, and marks it as sent. */
export async function sendReport(clientId, id, { contactIds = [], message = '' } = {}) {
    const g = await gate('edit')
    const client = await clientOf(g, clientId)
    const cur = oid(id) && (await prisma.crmClientReport.findFirst({ where: { id, clientId } }))
    if (!cur) throw fail('Not found', 404)
    const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(oid).filter(Boolean))]
    if (!ids.length) throw fail('Choose at least one contact')
    const contacts = (await prisma.crmContact.findMany({ where: { clientId, active: true, id: { in: ids } }, select: { firstName: true, lastName: true, email: true } })).filter((c) => EMAIL.test(String(c.email || '').trim()))
    if (!contacts.length) throw fail('None of these contacts has an email address')
    const label = cur.kind === 'strategy' ? 'Strategy' : 'Report'
    const note = String(message || '').trim().slice(0, 1000)
    const sent = []
    for (const c of contacts) {
        const to = String(c.email).trim().toLowerCase()
        const html = `<p>Hello ${escapeHtml(c.firstName || '')},</p>${note ? `<p>${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}<h2 style="margin:16px 0 4px">${escapeHtml(cur.title)}</h2>${cur.period ? `<p style="color:#64748b;margin:0 0 12px">${escapeHtml(cur.period)}</p>` : ''}<div>${cur.body || ''}</div><p style="margin-top:20px;color:#64748b">${escapeHtml(g.name)}</p>`
        const r = await deliver({ to, subject: `${label}: ${cur.title}${client.company ? ` · ${client.company}` : ''}`, html }).catch(() => ({ sent: false }))
        if (r?.sent) sent.push(to)
    }
    if (!sent.length) throw fail('The email could not be sent: check the mail settings')
    await prisma.crmClientReport.update({ where: { id }, data: { status: cur.status === 'draft' ? 'sent' : cur.status, sentAt: new Date(), sentTo: [...new Set([...(cur.sentTo || []), ...sent])] } })
    return { success: true, sent }
}

import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { seal, unseal } from '@/lib/crm/twoFactor'
import { plainText } from '@/lib/crm/richText'
import { CDN_URL } from '@/lib/spaces'
import { PREFIX } from '@/lib/media'
import { saveTask } from '@/lib/crm/tasksApi'
import { saveNote } from '@/lib/crm/notesApi'
import { rateLimit } from '@/lib/rateLimit'

/* "My space" of the chat: a private place for each person to keep anything for later (memos, notes, links, passwords, files) with a reminder and
   conversion into a task or a note. Only its owner opens it for writing. The Super Admin, and people given "See other people's My space" (Roles), can
   look at somebody else's, read only. Texts marked secret (passwords) are stored encrypted and shown only when asked. */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nameOf = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const KINDS = ['note', 'link', 'password']
const UPLOAD_PREFIX = `${CDN_URL}/${PREFIX}/chat/`

async function gate() {
    const session = await requirePermission('chat', 'view')
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Your account has no staff profile', 403)
    return { session, authority, staffId, name: session.user.name || session.user.email || '', canViewOthers: isCrmAdmin(authority) || hasCap(authority, 'my_space', 'view_others') }
}

const cleanUrl = (v) => {
    let raw = String(v ?? '').trim()
    if (!raw) return null
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`
    try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.') ? u.toString().slice(0, 2000) : null } catch { return null }
}
const cleanFiles = (list) => (Array.isArray(list) ? list : []).filter((a) => a && String(a.url || '').startsWith(UPLOAD_PREFIX)).slice(0, 10).map((a) => ({ url: String(a.url), name: String(a.name || 'file').slice(0, 120), mime: String(a.mime || '').slice(0, 80), size: Number(a.size) || 0, kind: ['image', 'audio', 'video', 'pdf', 'document', 'file'].includes(a.kind) ? a.kind : 'file' }))

/** One item as the screen gets it. A secret text is never in the list: it is asked for with `reveal`. */
const out = (r) => ({
    id: r.id, kind: r.kind || 'note', title: r.title || '', body: r.secret ? '' : r.body || '', secret: !!r.secret, hasBody: !!r.body, url: r.url || '', attachments: Array.isArray(r.attachments) ? r.attachments : [],
    pinned: !!r.pinned, done: !!r.done, remindAt: r.remindAt || null, convertedTo: r.convertedTo || null, createdAt: r.createdAt, updatedAt: r.updatedAt,
})

/** The items of my space (or, read only, of somebody else's), and the people whose space I may look at. */
export async function listSpace({ owner = '', q = '' } = {}) {
    const g = await gate()
    const other = oid(owner) && owner !== g.staffId ? owner : null
    if (other && !g.canViewOthers) throw fail('You can only open your own My space', 403)
    const target = other || g.staffId
    const text = String(q || '').trim().toLowerCase().slice(0, 80)
    const rows = await prisma.crmMySpaceItem.findMany({ where: { staffId: target }, orderBy: [{ createdAt: 'desc' }], take: 500 })
    // the search looks in titles, notes and links, never inside a secret
    const items = rows.filter((r) => !text || [r.title, r.secret ? '' : r.body, r.url].some((x) => String(x || '').toLowerCase().includes(text))).map(out)
    items.sort((a, b) => Number(b.pinned) - Number(a.pinned))
    let owners = []
    if (g.canViewOthers) {
        const counts = await prisma.crmMySpaceItem.groupBy({ by: ['staffId'], _count: { _all: true } })
        // every active person (even with an empty space), and anybody else who still has items
        const staff = await prisma.crmStaff.findMany({ where: { id: { not: g.staffId }, OR: [{ active: true }, { id: { in: counts.map((c) => c.staffId) } }] }, select: { id: true, firstName: true, lastName: true, email: true } })
        owners = staff.map((s) => ({ id: s.id, name: nameOf(s), count: counts.find((c) => c.staffId === s.id)?._count._all || 0 })).sort((a, b) => a.name.localeCompare(b.name))
    }
    return { items, readOnly: !!other, owner: target, owners, canViewOthers: g.canViewOthers }
}

/** The text of a secret item, on request (the owner, or somebody allowed to look at that space). */
export async function revealItem(id, owner = '') {
    const g = await gate()
    const r = oid(id) && (await prisma.crmMySpaceItem.findUnique({ where: { id } }))
    if (!r) throw fail('Item not found', 404)
    if (r.staffId !== g.staffId && !g.canViewOthers) throw fail('Item not found', 404)
    let body = ''
    try { body = r.secret && r.body ? unseal(r.body) : r.body || '' } catch { throw fail('This text could not be read', 500) }
    return { body }
}

const reminderText = (title) => String(title || 'My space').replace(/\s+/g, ' ').trim().slice(0, 120) || 'My space'

/** Sets, moves or removes the reminder of an item (it rings like any reminder: the bell, an email). */
async function syncReminder(item, staffId, remindAt) {
    if (item.reminderId) await prisma.crmReminder.deleteMany({ where: { id: item.reminderId } })
    if (!remindAt || item.done) return prisma.crmMySpaceItem.update({ where: { id: item.id }, data: { reminderId: null, remindAt: item.done ? item.remindAt : null } })
    const row = await prisma.crmReminder.create({ data: { relType: 'my_space', relId: item.id, staffId, creatorId: staffId, date: remindAt, description: reminderText(item.title), notifyByEmail: true } })
    return prisma.crmMySpaceItem.update({ where: { id: item.id }, data: { reminderId: row.id, remindAt } })
}

/** Adds an item (or changes one of mine). Fields given are changed, the others are kept. */
export async function saveItem(body = {}, id = null) {
    const g = await gate()
    rateLimit(`myspace:${g.staffId}`, 120, 60000)
    const cur = id ? (oid(id) && (await prisma.crmMySpaceItem.findFirst({ where: { id, staffId: g.staffId } }))) : null
    if (id && !cur) throw fail('Item not found', 404)
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k)
    const data = {}
    if (has('kind')) data.kind = KINDS.includes(body.kind) ? body.kind : 'note'
    if (has('title')) data.title = String(body.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null
    if (has('url')) { const u = cleanUrl(body.url); if (String(body.url || '').trim() && !u) throw fail('Enter a valid web address'); data.url = u }
    if (has('attachments')) data.attachments = cleanFiles(body.attachments)
    for (const k of ['pinned', 'done']) if (has(k)) data[k] = !!body[k]
    const kind = data.kind || cur?.kind || 'note'
    const secret = kind === 'password' ? (has('secret') ? !!body.secret : cur ? !!cur.secret : true) : false // a password is secret unless said otherwise; other kinds never are
    data.secret = secret
    if (has('body')) {
        const text = String(body.body ?? '').slice(0, 20000)
        data.body = text.trim() ? (secret ? seal(text) : text) : null
    } else if (cur && cur.secret !== secret && cur.body) { // the kind changed: keep the text, stored the way the new kind needs
        const plain = cur.secret ? unseal(cur.body) : cur.body
        data.body = secret ? seal(plain) : plain
    }
    if (!id && !String(data.title || '').trim() && !String(body.body ?? '').trim() && !data.url && !(data.attachments || []).length) throw fail('Write something first')
    const row = id ? await prisma.crmMySpaceItem.update({ where: { id }, data }) : await prisma.crmMySpaceItem.create({ data: { staffId: g.staffId, ...data } })
    if (has('remindAt') || (has('done') && row.reminderId)) {
        let when = row.remindAt
        if (has('remindAt')) { when = body.remindAt ? new Date(body.remindAt) : null; if (when && Number.isNaN(+when)) throw fail('Choose a valid date and time') }
        return { item: out(await syncReminder(row, g.staffId, when)) }
    }
    return { item: out(row) }
}

export async function deleteItem(id) {
    const g = await gate()
    const r = oid(id) && (await prisma.crmMySpaceItem.findFirst({ where: { id, staffId: g.staffId } }))
    if (!r) throw fail('Item not found', 404)
    if (r.reminderId) await prisma.crmReminder.deleteMany({ where: { id: r.reminderId } })
    await prisma.crmMySpaceItem.delete({ where: { id } })
    return { success: true }
}

/** Turns an item into a task or a note (the item stays, marked as converted). A secret is never copied anywhere. */
export async function convertItem(id, to) {
    const g = await gate()
    const r = oid(id) && (await prisma.crmMySpaceItem.findFirst({ where: { id, staffId: g.staffId } }))
    if (!r) throw fail('Item not found', 404)
    if (r.secret) throw fail('A secret text cannot be turned into a task or a note: copy what you need by hand')
    const text = r.body || ''
    const name = (r.title || plainText(text).split('\n')[0] || r.url || 'From My space').slice(0, 150)
    const html = text ? `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>` : ''
    let ref
    if (to === 'task') {
        const links = r.url ? `<p><a href="${r.url}">${r.url}</a></p>` : ''
        const res = await saveTask({ name, description: `${html}${links}` || null, dueDate: r.remindAt || null, assigneeIds: [g.staffId] })
        ref = `task:${res.id}`
    } else if (to === 'note') {
        const res = await saveNote({ title: name, description: html || null, links: r.url ? [{ url: r.url, title: '' }] : [], attachments: [] })
        ref = `note:${res.note?.id || res.id}`
    } else throw fail('Choose a task or a note')
    await prisma.crmMySpaceItem.update({ where: { id }, data: { convertedTo: ref } })
    return { success: true, convertedTo: ref }
}

import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { storeRich, plainText } from '@/lib/crm/richText'
import { processUpload, putMedia, deleteMedia, keyFromUrl, MediaError, PREFIX } from '@/lib/media'
import { CDN_URL } from '@/lib/spaces'
import { notifyComment } from '@/lib/crm/mentionsApi'
import { mentionedIds } from '@/lib/crm/mentionsCalc'
import { rateLimit } from '@/lib/rateLimit'
import { COLORS, KINDS, cleanColor, cleanChecklist, cleanLabels, cleanLinks, cleanAttachments, sortNotes, isEmptyNote } from '@/lib/crm/notesCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nameOf = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''
const UPLOAD_PREFIX = `${CDN_URL}/${PREFIX}/notes/`

async function gate(cap = 'view') {
    const session = await requirePermission('notes', cap)
    const authority = session.user.authority || []
    const staffId = await getStaffId(session)
    const admin = isCrmAdmin(authority)
    if (!staffId && !admin) throw fail('Your account has no staff profile', 403)
    return { session, authority, staffId, admin, name: session.user.name || session.user.email || '', canShare: admin || hasCap(authority, 'notes', 'share') }
}

/** The notes this person sees: their own and the ones shared with them. Administrators see every note (as they always did). */
const visible = (staffId, admin = false) => (admin ? {} : { OR: [{ addedFrom: staffId }, { sharedWith: { has: staffId } }] })
/** A note this person may change: their own, or any for an administrator. */
const changeable = (g) => (g.admin ? {} : { addedFrom: g.staffId })

async function peopleOf(ids) {
    const rows = ids.length ? await prisma.crmStaff.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
    return Object.fromEntries(rows.map((s) => [s.id, nameOf(s)]))
}

const noteOut = (n, g, who, counts) => ({
    id: n.id, title: n.title || '', description: n.description || '', kind: n.kind || 'note', color: n.color || null,
    pinned: !!n.pinned, important: !!n.important, archived: !!n.archived,
    checklist: Array.isArray(n.checklist) ? n.checklist : [], labels: n.labels || [],
    attachments: Array.isArray(n.attachments) ? n.attachments : [], links: Array.isArray(n.links) ? n.links : [],
    sharedWith: (n.sharedWith || []).map((id) => ({ id, name: who[id] || '' })),
    remindAt: n.remindAt, remindShared: !!n.remindShared,
    own: n.addedFrom === g.staffId, mine: n.addedFrom === g.staffId || g.admin, owner: n.addedFrom ? who[n.addedFrom] || '' : '',
    comments: counts?.[n.id] || 0, createdAt: n.createdAt, updatedAt: n.updatedAt,
})

/** My notes and the ones shared with me: pinned first, then important. `board` = the few cards for the Tasks page. */
export async function listNotes({ q = '', archived = false, label = '', board = false, limit = 500 } = {}) {
    const g = await gate()
    // archived is filtered here: a filter like { archived: { not: true } } would hide the old notes that lack the field
    let rows = (await prisma.crmQuickNote.findMany({ where: visible(g.staffId, g.admin && !board), orderBy: { updatedAt: 'desc' }, take: 1000 })).filter((n) => (board || !archived ? !n.archived : !!n.archived))
    const needle = String(q || '').trim().toLowerCase()
    if (needle) rows = rows.filter((n) => `${n.title} ${plainText(n.description || '')} ${(n.labels || []).join(' ')} ${(Array.isArray(n.checklist) ? n.checklist : []).map((c) => c.text).join(' ')}`.toLowerCase().includes(needle))
    if (label) rows = rows.filter((n) => (n.labels || []).some((l) => l.toLowerCase() === String(label).toLowerCase()))
    rows = sortNotes(rows)
    if (board) rows = [...rows.filter((n) => n.important || n.pinned), ...rows.filter((n) => !(n.important || n.pinned))]
    rows = rows.slice(0, Math.min(500, Math.max(1, +limit || 500)))
    const ids = rows.map((n) => n.id)
    const [who, comments, all] = await Promise.all([
        peopleOf([...new Set(rows.flatMap((n) => [n.addedFrom, ...(n.sharedWith || [])]).filter(Boolean))]),
        ids.length ? prisma.crmQuickNoteComment.groupBy({ by: ['noteId'], where: { noteId: { in: ids } }, _count: { _all: true } }) : [],
        prisma.crmQuickNote.findMany({ where: visible(g.staffId, g.admin), select: { labels: true } }),
    ])
    const counts = Object.fromEntries(comments.map((c) => [c.noteId, c._count._all]))
    const labels = [...new Set(all.flatMap((n) => n.labels || []))].sort((a, b) => a.localeCompare(b))
    return { list: rows.map((n) => noteOut(n, g, who, counts)), labels, can: { share: g.canShare }, colors: COLORS }
}

export async function getNote(id) {
    const g = await gate()
    const n = oid(id) && (await prisma.crmQuickNote.findFirst({ where: { id, ...visible(g.staffId, g.admin) } }))
    if (!n) throw fail('Note not found', 404)
    const who = await peopleOf([...new Set([n.addedFrom, ...(n.sharedWith || [])].filter(Boolean))])
    return { note: noteOut(n, g, who, { [n.id]: await prisma.crmQuickNoteComment.count({ where: { noteId: n.id } }) }) }
}

/** Colleagues the note can be shared with (the mention list). */
async function staffList() {
    return (await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true } })).map((s) => ({ id: s.id, name: nameOf(s) }))
}

async function tellShared(g, note, ids) {
    for (const to of ids) {
        const text = `${note.title || plainText(note.description || '').slice(0, 80) || 'A note'}`
        await prisma.crmNotification.create({ data: { toUserId: to, fromUserId: g.staffId, fromFullName: g.name || null, description: `shared a note with you: ${text}`.slice(0, 200), link: `/crm/notes?note=${note.id}`, additionalData: 'note-shared', isRead: false } }).catch(() => {})
    }
}

/** Create (id = null) or change a note. Only its owner changes it; the people it is shared with only read and comment. */
export async function saveNote(body = {}, id = null) {
    const g = await gate()
    const cur = id ? (oid(id) && (await prisma.crmQuickNote.findFirst({ where: { id, ...changeable(g) } }))) : null
    if (id && !cur) {
        const other = oid(id) && (await prisma.crmQuickNote.findFirst({ where: { id, sharedWith: { has: g.staffId } }, select: { id: true } }))
        throw fail(other ? 'Only the owner can change this note' : 'Note not found', other ? 403 : 404)
    }
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k)
    const data = {}
    if (has('title')) data.title = String(body.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
    if (has('description')) data.description = storeRich(String(body.description ?? ''), 20000)
    if (has('kind')) data.kind = KINDS.includes(body.kind) ? body.kind : 'note'
    if (has('color')) data.color = cleanColor(body.color)
    for (const k of ['pinned', 'important', 'archived', 'remindShared']) if (has(k)) data[k] = !!body[k]
    if (has('checklist')) data.checklist = cleanChecklist(body.checklist)
    if (has('labels')) data.labels = cleanLabels(body.labels)
    if (has('links')) data.links = cleanLinks(body.links)
    if (has('attachments')) data.attachments = cleanAttachments(body.attachments, UPLOAD_PREFIX)
    if (has('remindAt')) { const d = body.remindAt ? new Date(body.remindAt) : null; if (d && Number.isNaN(+d)) throw fail('The reminder date is not valid'); data.remindAt = d }
    // sharing: the people chosen, plus the colleagues named with @ in the text
    let shared = cur?.sharedWith || []
    if (g.canShare && (has('sharedWith') || has('description'))) {
        const staff = await staffList()
        const chosen = has('sharedWith') ? (Array.isArray(body.sharedWith) ? body.sharedWith.map(oid).filter(Boolean) : []) : shared
        const named = has('description') ? mentionedIds(plainText(data.description || ''), staff) : []
        const ok = new Set(staff.map((s) => s.id))
        shared = [...new Set([...chosen, ...named])].filter((x) => ok.has(x) && x !== g.staffId).slice(0, 30)
        data.sharedWith = shared
    }
    const merged = { title: data.title ?? cur?.title, text: plainText((data.description ?? cur?.description) || ''), checklist: data.checklist ?? cur?.checklist, attachments: data.attachments ?? cur?.attachments, links: data.links ?? cur?.links }
    if (isEmptyNote(merged)) throw fail('Write something first: a title, a text, a list, a picture or a link')
    let row
    if (cur) row = await prisma.crmQuickNote.update({ where: { id: cur.id }, data })
    else {
        const last = g.staffId ? await prisma.crmQuickNote.findFirst({ where: { addedFrom: g.staffId }, orderBy: { position: 'desc' }, select: { position: true } }) : null // an admin without a staff profile has no notes of their own yet
        row = await prisma.crmQuickNote.create({ data: { title: '', kind: 'note', ...data, addedFrom: g.staffId || undefined, position: (last?.position || 0) + 1 } })
    }
    const fresh = (row.sharedWith || []).filter((x) => !(cur?.sharedWith || []).includes(x))
    if (fresh.length) await tellShared(g, row, fresh)
    const who = await peopleOf([...new Set([row.addedFrom, ...(row.sharedWith || [])].filter(Boolean))])
    return { note: noteOut(row, g, who, { [row.id]: await prisma.crmQuickNoteComment.count({ where: { noteId: row.id } }) }) }
}

export async function deleteNote(id) {
    const g = await gate()
    const n = oid(id) && (await prisma.crmQuickNote.findFirst({ where: { id, ...changeable(g) } }))
    if (!n) {
        const other = oid(id) && (await prisma.crmQuickNote.findFirst({ where: { id, sharedWith: { has: g.staffId } }, select: { id: true } }))
        throw fail(other ? 'Only the owner can delete this note' : 'Note not found', other ? 403 : 404)
    }
    await prisma.crmQuickNoteComment.deleteMany({ where: { noteId: n.id } })
    await prisma.crmQuickNote.delete({ where: { id: n.id } })
    const keys = (Array.isArray(n.attachments) ? n.attachments : []).map((a) => keyFromUrl(a.url)).filter(Boolean)
    if (keys.length) await deleteMedia(keys).catch(() => {})
    return { success: true }
}

/** One picture, voice note or file for a note, stored in the Space. */
export async function uploadNoteFile(file, voice = false) {
    const g = await gate()
    rateLimit(`note-upload:${g.staffId}`, 40, 60000)
    try {
        const p = await processUpload(file, { purpose: 'attachment', skipAllowed: !!voice })
        if (voice) { p.kind = 'audio'; if (p.ext === 'webm') p.contentType = 'audio/webm'; if (p.ext === 'mp4') p.contentType = 'audio/mp4' }
        const { url } = await putMedia(p, 'notes')
        return { url, name: p.name, mime: p.contentType, size: p.size, kind: p.kind }
    } catch (e) {
        if (e instanceof MediaError) throw fail(e.message, e.status)
        throw e
    }
}

/* ---------- comments ---------- */
const commentOut = (c, all, g, ownerId) => {
    const r = c.replyToId ? all.find((x) => x.id === c.replyToId) : null
    const mine = !!c.authorId && c.authorId === g.staffId
    return { id: c.id, authorName: c.authorName || '', body: c.body, createdAt: c.createdAt, edited: !!c.editedAt, mine, canDelete: mine || ownerId === g.staffId || g.admin, replyTo: r ? { id: r.id, name: r.authorName || '', text: plainText(r.body).replace(/\s+/g, ' ').slice(0, 120) } : null }
}
async function noteFor(g, id) {
    const n = oid(id) && (await prisma.crmQuickNote.findFirst({ where: { id, ...visible(g.staffId, g.admin) } }))
    if (!n) throw fail('Note not found', 404)
    return n
}

export async function listNoteComments(id) {
    const g = await gate()
    const n = await noteFor(g, id)
    const rows = await prisma.crmQuickNoteComment.findMany({ where: { noteId: n.id }, orderBy: { createdAt: 'asc' }, take: 300 })
    return { list: rows.map((c) => commentOut(c, rows, g, n.addedFrom)) }
}

export async function addNoteComment(id, body = {}) {
    const g = await gate()
    const n = await noteFor(g, id)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    const reply = oid(body.replyToId) && (await prisma.crmQuickNoteComment.findFirst({ where: { id: body.replyToId, noteId: n.id } }))
    const row = await prisma.crmQuickNoteComment.create({ data: { noteId: n.id, authorId: g.staffId, authorName: g.name, body: text, replyToId: reply ? reply.id : null } })
    try { await notifyComment({ by: { staffId: g.staffId, name: g.name }, text, link: `/crm/notes?note=${n.id}`, subject: n.title || plainText(n.description || '').slice(0, 60) || 'a note', recipients: [n.addedFrom, ...(n.sharedWith || []), reply?.authorId] }) } catch (e) { console.error('[note notify]', e.message) }
    const all = await prisma.crmQuickNoteComment.findMany({ where: { noteId: n.id } })
    return { comment: commentOut(row, all, g, n.addedFrom) }
}

export async function editNoteComment(id, body = {}) {
    const g = await gate()
    const n = await noteFor(g, id)
    const c = oid(body.commentId) && (await prisma.crmQuickNoteComment.findFirst({ where: { id: body.commentId, noteId: n.id } }))
    if (!c) throw fail('Message not found', 404)
    if (c.authorId !== g.staffId) throw fail('You can only edit your own messages', 403)
    const text = storeRich(String(body.body || ''), 12000)
    if (!text) throw fail('Write a message first')
    await prisma.crmQuickNoteComment.update({ where: { id: c.id }, data: { body: text, editedAt: new Date() } })
    return { success: true }
}

export async function deleteNoteComment(id, commentId) {
    const g = await gate()
    const n = await noteFor(g, id)
    const c = oid(commentId) && (await prisma.crmQuickNoteComment.findFirst({ where: { id: commentId, noteId: n.id } }))
    if (!c) throw fail('Message not found', 404)
    if (c.authorId !== g.staffId && n.addedFrom !== g.staffId && !g.admin) throw fail('You can only delete your own messages', 403)
    await prisma.crmQuickNoteComment.updateMany({ where: { replyToId: c.id }, data: { replyToId: null } })
    await prisma.crmQuickNoteComment.delete({ where: { id: c.id } })
    return { success: true }
}

/** The old To-dos (one line each) become one checklist note of their owner, then they are removed: To-dos now live in the notes. */
const importing = new Map() // one import at a time per person: two calls at once (a page that opens twice) must not make two notes
export async function importTodos() {
    const g = await gate()
    if (!g.staffId) return { imported: 0 }
    if (importing.has(g.staffId)) return importing.get(g.staffId)
    const run = doImport(g).finally(() => importing.delete(g.staffId))
    importing.set(g.staffId, run)
    return run
}

async function doImport(g) {
    const old = await prisma.crmTodo.findMany({ where: { staffId: g.staffId }, orderBy: [{ finished: 'asc' }, { itemOrder: 'asc' }, { createdAt: 'asc' }], take: 200 })
    if (!old.length) return { imported: 0 }
    const checklist = cleanChecklist(old.map((t) => ({ text: plainText(t.description || ''), done: !!t.finished })))
    if (checklist.length) {
        const last = await prisma.crmQuickNote.findFirst({ where: { addedFrom: g.staffId }, orderBy: { position: 'desc' }, select: { position: true } })
        await prisma.crmQuickNote.create({ data: { title: 'My to-dos', kind: 'list', checklist, labels: [], addedFrom: g.staffId, position: (last?.position || 0) + 1 } })
    }
    await prisma.crmTodo.deleteMany({ where: { id: { in: old.map((t) => t.id) } } })
    return { imported: checklist.length }
}

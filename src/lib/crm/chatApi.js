import { realPicture } from '@/lib/crm/pictures'
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, isCrmAdmin } from '@/lib/crm/permissions'
import { processUpload, putMedia, MediaError, PREFIX } from '@/lib/media'
import { CDN_URL } from '@/lib/spaces'
import { getOptions, setOptions } from '@/lib/crm/mailer'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
export const ONLINE_MS = 45000
export const online = (p) => !!p && Date.now() - +new Date(p.lastSeen) < ONLINE_MS
const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
export const cleanBody = (b, allowEmpty = false) => {
    const t = String(b || '').replace(/\r\n/g, '\n').trim()
    if (!t && !allowEmpty) throw fail('Write a message first')
    return t.slice(0, 2000)
}

/* ---------- attachments (files, pictures, voice messages) ---------- */
/** Uploads one chat file to the Space. Voice notes are recorded by the browser (webm/mp4 audio) and are always accepted. */
export async function uploadChatFile(file, voice = false) {
    try {
        const p = await processUpload(file, { purpose: 'attachment', skipAllowed: !!voice })
        if (voice) { p.kind = 'audio'; if (p.ext === 'webm') p.contentType = 'audio/webm'; if (p.ext === 'mp4') p.contentType = 'audio/mp4' }
        const { url } = await putMedia(p, 'chat')
        return { url, name: p.name, mime: p.contentType, size: p.size, kind: p.kind }
    } catch (e) {
        if (e instanceof MediaError) throw fail(e.message, e.status)
        throw e
    }
}

/** Only files uploaded through the chat upload can be attached to a message. */
export function cleanAttachment(a) {
    if (!a || !a.url) return null
    if (!String(a.url).startsWith(`${CDN_URL}/${PREFIX}/chat/`)) throw fail('Invalid attachment')
    return { attUrl: String(a.url), attName: String(a.name || 'file').slice(0, 120), attMime: String(a.mime || '').slice(0, 80) || null, attSize: Number(a.size) || null, attKind: ['image', 'audio', 'video', 'pdf', 'doc', 'sheet', 'slides', 'archive', 'text'].includes(a.kind) ? a.kind : 'file' }
}
/** The message a new message answers: it must be in the same room; we keep who wrote it and the start of its text. */
export async function replySnapshot(roomId, replyToId) {
    if (!/^[a-f0-9]{24}$/i.test(String(replyToId || ''))) return {}
    const o = await prisma.crmChatMessage.findFirst({ where: { id: String(replyToId), roomId } })
    if (!o || o.senderType === 'system') return {}
    return { replyToId: o.id, replyName: o.senderName, replyText: previewOf(o.body, o.attUrl ? { attKind: o.attKind, attName: o.attName } : null).slice(0, 140) }
}
export const replyOf = (m) => (m.replyToId ? { id: m.replyToId, name: m.replyName || '', text: m.replyText || '' } : null)
export const attachmentOf = (m) => (m.attUrl ? { url: m.attUrl, name: m.attName, mime: m.attMime, size: m.attSize, kind: m.attKind } : null)
export const previewOf = (text, att) => (text ? text.slice(0, 120) : att?.attKind === 'audio' ? '🎤 Voice message' : att?.attKind === 'image' ? '🖼 Picture' : att ? `📎 ${att.attName}` : '')

/* ---------- calls (WebRTC, signalled by polling) ---------- */
export async function callsEnabled() { return (await getOptions(['chat_calls_enabled']))('chat_calls_enabled') === '1' }
export function iceServers() {
    const list = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
    if (process.env.TURN_URL) list.push({ urls: process.env.TURN_URL.split(',').map((x) => x.trim()), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' })
    return list
}
export async function setCallsEnabled(on) {
    const session = await requirePermission(null)
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only an administrator can change this', 403)
    await setOptions({ chat_calls_enabled: on ? '1' : '0' })
    return { calls: !!on }
}

/** Hands a signalling message to the other side. `sender` = { key, name }; `room` was already checked against the sender. */
export async function relaySignal(sender, room, { callId, type, payload, to }) {
    if (!(await callsEnabled())) throw fail('Calls are not activated', 403)
    if (!/^[a-zA-Z0-9-]{6,64}$/.test(String(callId || ''))) throw fail('Invalid call')
    if (!['offer', 'answer', 'ice', 'hangup', 'decline'].includes(type)) throw fail('Invalid signal')
    if (room.kind === 'team' || room.kind === 'group') throw fail('Calls are for private conversations', 400)
    let targets = []
    if (room.kind === 'direct') targets = room.staffIds.map((i) => `staff:${i}`).filter((k) => k !== sender.key)
    else if (sender.key.startsWith('staff:')) targets = [`contact:${room.contactId}`]
    else if (type === 'offer') targets = (await onlineStaff()).map((p) => `staff:${p.id}`)
    else if (typeof to === 'string' && /^staff:[a-f0-9]{24}$/.test(to)) targets = [to]
    else if (type === 'hangup') targets = [...new Set((await prisma.crmChatSignal.findMany({ where: { callId, type: 'offer' }, select: { toKey: true } })).map((o) => o.toKey))]
    if (!targets.length) return { delivered: 0 }
    const text = payload === undefined || payload === null ? null : typeof payload === 'string' ? payload : JSON.stringify(payload)
    if (text && text.length > 20000) throw fail('Signal too large')
    await prisma.crmChatSignal.createMany({ data: targets.map((toKey) => ({ callId, roomId: room.id, toKey, fromKey: sender.key, fromName: sender.name, type, payload: text })) })
    // the first one to pick up wins: tell the others that stopped ringing
    if (type === 'answer') {
        const others = await prisma.crmChatSignal.findMany({ where: { callId, type: 'offer', NOT: { toKey: sender.key } }, select: { toKey: true } })
        const except = new Set([sender.key, ...targets])
        const rest = [...new Set(others.map((o) => o.toKey))].filter((k) => !except.has(k))
        if (rest.length) await prisma.crmChatSignal.createMany({ data: rest.map((toKey) => ({ callId, roomId: room.id, toKey, fromKey: sender.key, fromName: sender.name, type: 'hangup', payload: 'taken' })) })
    }
    return { delivered: targets.length }
}

/** Signals waiting for `key`. They are marked delivered when read. */
export async function takeSignals(key) {
    const rows = await prisma.crmChatSignal.findMany({ where: { toKey: key, delivered: false }, orderBy: { createdAt: 'asc' }, take: 100 })
    if (rows.length) await prisma.crmChatSignal.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { delivered: true } })
    if (Math.random() < 0.05) await prisma.crmChatSignal.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 10 * 60000) } } }).catch(() => {})
    return rows.map((r) => ({ id: r.id, callId: r.callId, roomId: r.roomId, from: { key: r.fromKey, name: r.fromName }, type: r.type, payload: r.payload, at: r.createdAt }))
}

const STATES = ['online', 'idle', 'away']
/** Presence of a member: online | idle | away, or offline when not seen for 45 seconds. */
export const statusOf = (p) => (online(p) ? p.state || 'online' : 'offline')

/** Heartbeat. Without `state` only the "last seen" time moves, so polling never overrides idle/away. */
export async function touch(memberKey, state) {
    const ok = STATES.includes(state) ? state : null
    await prisma.crmChatPresence.upsert({ where: { memberKey }, update: { lastSeen: new Date(), ...(ok ? { state: ok } : {}) }, create: { memberKey, lastSeen: new Date(), state: ok || 'online' } }).catch(() => {})
}

export async function setPresence(state) {
    const c = await ctx()
    await touch(c.key, state)
    return { ok: true }
}

/** Staff members that were seen in the last 45 seconds (optionally excluding one). */
export async function onlineStaff(exceptId = null) {
    const since = new Date(Date.now() - ONLINE_MS)
    const pres = await prisma.crmChatPresence.findMany({ where: { memberKey: { startsWith: 'staff:' }, lastSeen: { gt: since }, state: { in: ['online', 'idle'] } } })
    const ids = pres.map((p) => p.memberKey.slice(6)).filter((i) => oid(i) && i !== exceptId)
    if (!ids.length) return []
    const rows = await prisma.crmStaff.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    return rows.map((s) => ({ id: s.id, name: staffName(s), image: realPicture(s.profileImage) }))
}

async function ctx() {
    const session = await requirePermission('chat', 'view')
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Chat needs a staff profile linked to your login', 403)
    const me = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    return { staffId, key: `staff:${staffId}`, name: staffName(me || {}), image: realPicture(me?.profileImage), admin: isCrmAdmin(session.user.authority || []) }
}

async function teamRoom() {
    return (await prisma.crmChatRoom.findFirst({ where: { kind: 'team' } })) || prisma.crmChatRoom.create({ data: { kind: 'team' } })
}

async function roomFor(c, id) {
    const room = oid(id) && (await prisma.crmChatRoom.findUnique({ where: { id } }))
    if (!room) throw fail('Conversation not found', 404)
    if ((room.kind === 'direct' || room.kind === 'group') && !room.staffIds.includes(c.staffId)) throw fail('Conversation not found', 404)
    return room
}

const shape = (m, c) => ({ id: m.id, body: m.body, attachment: attachmentOf(m), replyTo: replyOf(m), at: m.createdAt, senderType: m.senderType, senderId: m.senderId, senderName: m.senderName, mine: m.senderType === 'staff' && m.senderId === c.staffId, system: m.senderType === 'system' })

export async function listRooms() {
    const c = await ctx()
    await touch(c.key)
    const team = await teamRoom()
    const [direct, groups, clients, staff, reads, pres] = await Promise.all([
        prisma.crmChatRoom.findMany({ where: { kind: 'direct', staffIds: { has: c.staffId } } }),
        prisma.crmChatRoom.findMany({ where: { kind: 'group', staffIds: { has: c.staffId } } }),
        prisma.crmChatRoom.findMany({ where: { kind: 'client' }, orderBy: { lastMessageAt: 'desc' }, take: 60 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmChatRead.findMany({ where: { memberKey: c.key } }),
        prisma.crmChatPresence.findMany({ where: { lastSeen: { gt: new Date(Date.now() - ONLINE_MS) } } }),
    ])
    const readAt = Object.fromEntries(reads.map((r) => [r.roomId, r.readAt]))
    const live = Object.fromEntries(pres.map((p) => [p.memberKey, p.state || 'online']))
    const st = (k) => live[k] || 'offline'
    const rooms = [team, ...direct, ...groups, ...clients]
    // unread = messages by somebody else after the last time this person opened the room
    const unread = Object.fromEntries(await Promise.all(rooms.map(async (r) => [r.id, await prisma.crmChatMessage.count({ where: { roomId: r.id, createdAt: { gt: readAt[r.id] || new Date(0) }, NOT: [{ senderType: 'staff', senderId: c.staffId }, { senderType: 'system' }] } })])))
    const contacts = clients.length ? await prisma.crmContact.findMany({ where: { id: { in: clients.map((r) => r.contactId).filter(Boolean) } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    const clientRows = clients.length ? await prisma.crmClient.findMany({ where: { id: { in: clients.map((r) => r.clientId).filter(Boolean) } }, select: { id: true, company: true } }) : []
    const cMap = Object.fromEntries(contacts.map((x) => [x.id, x])), coMap = Object.fromEntries(clientRows.map((x) => [x.id, x.company]))
    const sMap = Object.fromEntries(staff.map((s) => [s.id, { id: s.id, name: staffName(s), image: realPicture(s.profileImage), status: st(`staff:${s.id}`) }]))
    const out = [
        { id: team.id, kind: 'team', title: 'Team', subtitle: `${staff.filter((s) => st(`staff:${s.id}`) === 'online').length} online`, lastMessage: team.lastMessage, lastAt: team.lastMessageAt, unread: unread[team.id] },
        ...direct.map((r) => { const other = sMap[r.staffIds.find((i) => i !== c.staffId)] || { name: 'Former colleague' }; return { id: r.id, kind: 'direct', title: other.name, image: other.image, status: other.status || 'offline', lastMessage: r.lastMessage, lastAt: r.lastMessageAt, unread: unread[r.id] } }),
        ...groups.map((r) => ({ id: r.id, kind: 'group', title: r.name || 'Group', subtitle: `${r.staffIds.length} members`, members: r.staffIds, createdBy: r.createdBy, lastMessage: r.lastMessage, lastAt: r.lastMessageAt, unread: unread[r.id] })),
        ...clients.map((r) => { const p = cMap[r.contactId]; return { id: r.id, kind: 'client', title: p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email : 'Client', subtitle: coMap[r.clientId] || '', image: realPicture(p?.profileImage), status: st(`contact:${r.contactId}`), lastMessage: r.lastMessage, lastAt: r.lastMessageAt, unread: unread[r.id] } }),
    ]
    const people = Object.values(sMap).filter((s) => s.id !== c.staffId).sort((a, b) => (b.status === 'online') - (a.status === 'online') || (b.status === 'idle') - (a.status === 'idle') || a.name.localeCompare(b.name))
    return { me: { id: c.staffId, name: c.name, image: c.image, admin: c.admin }, rooms: out, people, directory: Object.values(sMap), unread: out.reduce((n, r) => n + r.unread, 0), calls: await callsEnabled(), iceServers: iceServers() }
}

export async function openDirect(otherId) {
    const c = await ctx()
    if (!oid(otherId) || otherId === c.staffId) throw fail('Choose a colleague')
    const other = await prisma.crmStaff.findFirst({ where: { id: otherId, active: true }, select: { id: true } })
    if (!other) throw fail('Colleague not found', 404)
    const found = await prisma.crmChatRoom.findFirst({ where: { kind: 'direct', AND: [{ staffIds: { has: c.staffId } }, { staffIds: { has: otherId } }] } })
    return { id: (found || (await prisma.crmChatRoom.create({ data: { kind: 'direct', staffIds: [c.staffId, otherId] } }))).id }
}

export async function roomMessages(id, after) {
    const c = await ctx()
    await touch(c.key)
    const room = await roomFor(c, id)
    const since = after && !isNaN(new Date(after)) ? new Date(after) : null
    const rows = since
        ? await prisma.crmChatMessage.findMany({ where: { roomId: room.id, createdAt: { gt: since } }, orderBy: { createdAt: 'asc' }, take: 200 })
        : (await prisma.crmChatMessage.findMany({ where: { roomId: room.id }, orderBy: { createdAt: 'desc' }, take: 80 })).reverse()
    await prisma.crmChatRead.upsert({ where: { roomId_memberKey: { roomId: room.id, memberKey: c.key } }, update: { readAt: new Date() }, create: { roomId: room.id, memberKey: c.key } }).catch(() => {})
    let status = null
    if (room.kind === 'client' && room.contactId) status = statusOf(await prisma.crmChatPresence.findUnique({ where: { memberKey: `contact:${room.contactId}` } }))
    if (room.kind === 'direct') {
        const other = room.staffIds.find((i) => i !== c.staffId)
        status = statusOf(await prisma.crmChatPresence.findUnique({ where: { memberKey: `staff:${other}` } }))
    }
    return { messages: rows.map((m) => shape(m, c)), status }
}

export async function sendMessage(id, body, attachment, replyTo) {
    const c = await ctx()
    const room = await roomFor(c, id)
    const att = cleanAttachment(attachment)
    const text = cleanBody(body, !!att)
    if (!text && !att) throw fail('Write a message first')
    const m = await prisma.crmChatMessage.create({ data: { roomId: room.id, senderType: 'staff', senderId: c.staffId, senderName: c.name, body: text, ...(att || {}), ...(await replySnapshot(room.id, replyTo)) } })
    await prisma.crmChatRoom.update({ where: { id: room.id }, data: { lastMessageAt: m.createdAt, lastMessage: previewOf(text, att) } })
    await prisma.crmChatRead.upsert({ where: { roomId_memberKey: { roomId: room.id, memberKey: c.key } }, update: { readAt: m.createdAt }, create: { roomId: room.id, memberKey: c.key, readAt: m.createdAt } }).catch(() => {})
    return shape(m, c)
}

export async function staffUpload(file, voice) {
    await ctx()
    return uploadChatFile(file, voice)
}

export async function staffSignals(since) {
    const c = await ctx()
    await touch(c.key)
    return { signals: await takeSignals(c.key), calls: await callsEnabled() }
}

export async function staffSendSignal(body) {
    const c = await ctx()
    const room = await roomFor(c, body.roomId)
    return relaySignal({ key: c.key, name: c.name }, room, body)
}

/* ---------- group chats ---------- */
const sys = (roomId, c, text) => prisma.crmChatMessage.create({ data: { roomId, senderType: 'system', senderId: c.staffId, senderName: c.name, body: text } })
const cleanName = (n) => {
    const v = String(n || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!v) throw fail('Give the group a name')
    return v
}
async function activeStaff(ids) {
    const list = [...new Set((ids || []).filter(oid))]
    return list.length ? prisma.crmStaff.findMany({ where: { id: { in: list }, active: true }, select: { id: true, firstName: true, lastName: true, email: true } }) : []
}

export async function createGroup(name, staffIds) {
    const c = await ctx()
    const title = cleanName(name)
    const members = (await activeStaff(staffIds)).filter((s) => s.id !== c.staffId)
    if (!members.length) throw fail('Choose at least one colleague')
    const room = await prisma.crmChatRoom.create({ data: { kind: 'group', name: title, createdBy: c.staffId, staffIds: [c.staffId, ...members.map((s) => s.id)] } })
    const m = await sys(room.id, c, `${c.name} created the group`)
    await prisma.crmChatRoom.update({ where: { id: room.id }, data: { lastMessageAt: m.createdAt, lastMessage: m.body } })
    return { id: room.id }
}

/** Rename, add or remove members, leave. Anyone in the group can rename and add; the creator and administrators can remove others. */
export async function updateGroup(id, { name, add, remove, leave } = {}) {
    const c = await ctx()
    const room = await roomFor(c, id)
    if (room.kind !== 'group') throw fail('Only groups can be changed')
    const owner = room.createdBy === c.staffId || c.admin
    const data = {}
    let staffIds = [...room.staffIds]
    const say = []
    const nameOf = async (ids) => (await prisma.crmStaff.findMany({ where: { id: { in: ids } }, select: { firstName: true, lastName: true, email: true } })).map(staffName).join(', ')
    if (name !== undefined && cleanName(name) !== room.name) { data.name = cleanName(name); say.push(`${c.name} renamed the group to “${data.name}”`) }
    if (Array.isArray(add) && add.length) {
        const fresh = (await activeStaff(add)).filter((s) => !staffIds.includes(s.id))
        if (fresh.length) { staffIds.push(...fresh.map((s) => s.id)); say.push(`${c.name} added ${fresh.map(staffName).join(', ')}`) }
    }
    if (Array.isArray(remove) && remove.length) {
        const gone = remove.filter((i) => oid(i) && i !== c.staffId && staffIds.includes(i))
        if (gone.length && !owner) throw fail('Only the creator or an administrator can remove people', 403)
        if (gone.length) { say.push(`${c.name} removed ${await nameOf(gone)}`); staffIds = staffIds.filter((i) => !gone.includes(i)) }
    }
    if (leave) {
        staffIds = staffIds.filter((i) => i !== c.staffId)
        if (!staffIds.length) { await removeRoom(room.id); return { deleted: true } }
        say.push(`${c.name} left`)
        if (room.createdBy === c.staffId) data.createdBy = staffIds[0]
    }
    if (staffIds.length !== room.staffIds.length) data.staffIds = staffIds
    let last
    for (const text of say) last = await sys(room.id, c, text)
    if (last) { data.lastMessageAt = last.createdAt; data.lastMessage = last.body }
    if (Object.keys(data).length) await prisma.crmChatRoom.update({ where: { id: room.id }, data })
    return { ok: true, left: !!leave }
}

async function removeRoom(id) {
    await prisma.crmChatMessage.deleteMany({ where: { roomId: id } })
    await prisma.crmChatRead.deleteMany({ where: { roomId: id } })
    await prisma.crmChatRoom.delete({ where: { id } })
}

export async function deleteGroup(id) {
    const c = await ctx()
    const room = await roomFor(c, id)
    if (room.kind !== 'group') throw fail('Only groups can be deleted')
    if (room.createdBy !== c.staffId && !c.admin) throw fail('Only the creator or an administrator can delete the group', 403)
    await removeRoom(room.id)
    return { deleted: true }
}

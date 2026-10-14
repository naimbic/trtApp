import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
export const ONLINE_MS = 45000
export const online = (p) => !!p && Date.now() - +new Date(p.lastSeen) < ONLINE_MS
const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
export const cleanBody = (b) => {
    const t = String(b || '').replace(/\r\n/g, '\n').trim()
    if (!t) throw fail('Write a message first')
    return t.slice(0, 2000)
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
    return rows.map((s) => ({ id: s.id, name: staffName(s), image: s.profileImage || null }))
}

async function ctx() {
    const session = await requirePermission(null)
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Chat needs a staff profile linked to your login', 403)
    const me = await prisma.crmStaff.findUnique({ where: { id: staffId }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    return { staffId, key: `staff:${staffId}`, name: staffName(me || {}), image: me?.profileImage || null }
}

async function teamRoom() {
    return (await prisma.crmChatRoom.findFirst({ where: { kind: 'team' } })) || prisma.crmChatRoom.create({ data: { kind: 'team' } })
}

async function roomFor(c, id) {
    const room = oid(id) && (await prisma.crmChatRoom.findUnique({ where: { id } }))
    if (!room) throw fail('Conversation not found', 404)
    if (room.kind === 'direct' && !room.staffIds.includes(c.staffId)) throw fail('Conversation not found', 404)
    return room
}

const shape = (m, c) => ({ id: m.id, body: m.body, at: m.createdAt, senderType: m.senderType, senderId: m.senderId, senderName: m.senderName, mine: m.senderType === 'staff' && m.senderId === c.staffId })

export async function listRooms() {
    const c = await ctx()
    await touch(c.key)
    const team = await teamRoom()
    const [direct, clients, staff, reads, pres] = await Promise.all([
        prisma.crmChatRoom.findMany({ where: { kind: 'direct', staffIds: { has: c.staffId } } }),
        prisma.crmChatRoom.findMany({ where: { kind: 'client' }, orderBy: { lastMessageAt: 'desc' }, take: 60 }),
        prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }),
        prisma.crmChatRead.findMany({ where: { memberKey: c.key } }),
        prisma.crmChatPresence.findMany({ where: { lastSeen: { gt: new Date(Date.now() - ONLINE_MS) } } }),
    ])
    const readAt = Object.fromEntries(reads.map((r) => [r.roomId, r.readAt]))
    const live = Object.fromEntries(pres.map((p) => [p.memberKey, p.state || 'online']))
    const st = (k) => live[k] || 'offline'
    const rooms = [team, ...direct, ...clients]
    // unread = messages by somebody else after the last time this person opened the room
    const unread = Object.fromEntries(await Promise.all(rooms.map(async (r) => [r.id, await prisma.crmChatMessage.count({ where: { roomId: r.id, createdAt: { gt: readAt[r.id] || new Date(0) }, NOT: { senderType: 'staff', senderId: c.staffId } } })])))
    const contacts = clients.length ? await prisma.crmContact.findMany({ where: { id: { in: clients.map((r) => r.contactId).filter(Boolean) } }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } }) : []
    const clientRows = clients.length ? await prisma.crmClient.findMany({ where: { id: { in: clients.map((r) => r.clientId).filter(Boolean) } }, select: { id: true, company: true } }) : []
    const cMap = Object.fromEntries(contacts.map((x) => [x.id, x])), coMap = Object.fromEntries(clientRows.map((x) => [x.id, x.company]))
    const sMap = Object.fromEntries(staff.map((s) => [s.id, { id: s.id, name: staffName(s), image: s.profileImage || null, status: st(`staff:${s.id}`) }]))
    const out = [
        { id: team.id, kind: 'team', title: 'Team', subtitle: `${staff.filter((s) => st(`staff:${s.id}`) === 'online').length} online`, lastMessage: team.lastMessage, lastAt: team.lastMessageAt, unread: unread[team.id] },
        ...direct.map((r) => { const other = sMap[r.staffIds.find((i) => i !== c.staffId)] || { name: 'Former colleague' }; return { id: r.id, kind: 'direct', title: other.name, image: other.image, status: other.status || 'offline', lastMessage: r.lastMessage, lastAt: r.lastMessageAt, unread: unread[r.id] } }),
        ...clients.map((r) => { const p = cMap[r.contactId]; return { id: r.id, kind: 'client', title: p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email : 'Client', subtitle: coMap[r.clientId] || '', image: p?.profileImage || null, status: st(`contact:${r.contactId}`), lastMessage: r.lastMessage, lastAt: r.lastMessageAt, unread: unread[r.id] } }),
    ]
    const people = Object.values(sMap).filter((s) => s.id !== c.staffId).sort((a, b) => (b.status === 'online') - (a.status === 'online') || (b.status === 'idle') - (a.status === 'idle') || a.name.localeCompare(b.name))
    return { me: { id: c.staffId, name: c.name, image: c.image }, rooms: out, people, unread: out.reduce((n, r) => n + r.unread, 0) }
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

export async function sendMessage(id, body) {
    const c = await ctx()
    const room = await roomFor(c, id)
    const text = cleanBody(body)
    const m = await prisma.crmChatMessage.create({ data: { roomId: room.id, senderType: 'staff', senderId: c.staffId, senderName: c.name, body: text } })
    await prisma.crmChatRoom.update({ where: { id: room.id }, data: { lastMessageAt: m.createdAt, lastMessage: text.slice(0, 120) } })
    await prisma.crmChatRead.upsert({ where: { roomId_memberKey: { roomId: room.id, memberKey: c.key } }, update: { readAt: m.createdAt }, create: { roomId: room.id, memberKey: c.key, readAt: m.createdAt } }).catch(() => {})
    return shape(m, c)
}

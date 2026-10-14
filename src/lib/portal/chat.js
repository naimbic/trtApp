import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { touch, onlineStaff, cleanBody } from '@/lib/crm/chatApi'

const nameOf = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email

async function room(s) {
    const found = await prisma.crmChatRoom.findFirst({ where: { kind: 'client', contactId: s.contact.id } })
    return found || prisma.crmChatRoom.create({ data: { kind: 'client', clientId: s.client.id, contactId: s.contact.id } })
}

const shape = (m, s) => ({ id: m.id, body: m.body, at: m.createdAt, senderType: m.senderType, senderName: m.senderName, mine: m.senderType === 'contact' && m.senderId === s.contact.id })

/** Messages of the signed-in contact, who in the team is available, and the unread count (for the badge). */
export async function portalChat(after) {
    const s = await requirePortal()
    const key = `contact:${s.contact.id}`
    await touch(key)
    const r = await room(s)
    const since = after && !isNaN(new Date(after)) ? new Date(after) : null
    const rows = since
        ? await prisma.crmChatMessage.findMany({ where: { roomId: r.id, createdAt: { gt: since } }, orderBy: { createdAt: 'asc' }, take: 200 })
        : (await prisma.crmChatMessage.findMany({ where: { roomId: r.id }, orderBy: { createdAt: 'desc' }, take: 80 })).reverse()
    const read = await prisma.crmChatRead.findUnique({ where: { roomId_memberKey: { roomId: r.id, memberKey: key } } })
    const unread = await prisma.crmChatMessage.count({ where: { roomId: r.id, senderType: 'staff', createdAt: { gt: read?.readAt || new Date(0) } } })
    const team = (await onlineStaff()).slice(0, 5).map((p) => ({ name: p.name.split(' ')[0], image: p.image }))
    return { messages: rows.map((m) => shape(m, s)), team, unread }
}

export async function portalRead() {
    const s = await requirePortal()
    const r = await room(s)
    await prisma.crmChatRead.upsert({ where: { roomId_memberKey: { roomId: r.id, memberKey: `contact:${s.contact.id}` } }, update: { readAt: new Date() }, create: { roomId: r.id, memberKey: `contact:${s.contact.id}` } })
    return { ok: true }
}

export async function portalSend(body) {
    const s = await requirePortal()
    const text = cleanBody(body)
    const r = await room(s)
    const m = await prisma.crmChatMessage.create({ data: { roomId: r.id, senderType: 'contact', senderId: s.contact.id, senderName: nameOf(s.contact), body: text } })
    await prisma.crmChatRoom.update({ where: { id: r.id }, data: { lastMessageAt: m.createdAt, lastMessage: text.slice(0, 120) } })
    await touch(`contact:${s.contact.id}`)
    return shape(m, s)
}

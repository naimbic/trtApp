import prisma from '@/lib/prisma'
import { requirePortal } from '@/lib/portal/session'
import { touch, onlineStaff, cleanBody, cleanAttachment, attachmentOf, replyOf, replySnapshot, previewOf, uploadChatFile, callsEnabled, iceServers, takeSignals, relaySignal } from '@/lib/crm/chatApi'

const nameOf = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email

async function room(s) {
    const found = await prisma.crmChatRoom.findFirst({ where: { kind: 'client', contactId: s.contact.id } })
    return found || prisma.crmChatRoom.create({ data: { kind: 'client', clientId: s.client.id, contactId: s.contact.id } })
}

const shape = (m, s) => ({ id: m.id, body: m.body, attachment: attachmentOf(m), replyTo: replyOf(m), at: m.createdAt, senderType: m.senderType, senderName: m.senderName, mine: m.senderType === 'contact' && m.senderId === s.contact.id })

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
    return { roomId: r.id, messages: rows.map((m) => shape(m, s)), team, unread, calls: await callsEnabled(), iceServers: iceServers() }
}

export async function portalPresence(state) {
    const s = await requirePortal()
    await touch(`contact:${s.contact.id}`, state)
    return { ok: true }
}

export async function portalRead() {
    const s = await requirePortal()
    const r = await room(s)
    await prisma.crmChatRead.upsert({ where: { roomId_memberKey: { roomId: r.id, memberKey: `contact:${s.contact.id}` } }, update: { readAt: new Date() }, create: { roomId: r.id, memberKey: `contact:${s.contact.id}` } })
    return { ok: true }
}

export async function portalSend(body, attachment, replyTo) {
    const s = await requirePortal()
    const att = cleanAttachment(attachment)
    const text = cleanBody(body, !!att)
    if (!text && !att) throw Object.assign(new Error('Write a message first'), { status: 400 })
    const r = await room(s)
    const m = await prisma.crmChatMessage.create({ data: { roomId: r.id, senderType: 'contact', senderId: s.contact.id, senderName: nameOf(s.contact), body: text, ...(att || {}), ...(await replySnapshot(r.id, replyTo)) } })
    await prisma.crmChatRoom.update({ where: { id: r.id }, data: { lastMessageAt: m.createdAt, lastMessage: previewOf(text, att) } })
    await touch(`contact:${s.contact.id}`)
    return shape(m, s)
}

export async function portalUpload(file, voice) {
    await requirePortal()
    return uploadChatFile(file, voice)
}

export async function portalSignals() {
    const s = await requirePortal()
    await touch(`contact:${s.contact.id}`)
    return { signals: await takeSignals(`contact:${s.contact.id}`), calls: await callsEnabled() }
}

export async function portalSendSignal(body) {
    const s = await requirePortal()
    return relaySignal({ key: `contact:${s.contact.id}`, name: nameOf(s.contact) }, await room(s), body)
}

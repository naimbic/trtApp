import crypto from 'node:crypto'
import prisma from '@/lib/prisma'

// Short-lived server-side records (the pending login, the one-time sign-in ticket), kept in the options table.
const KEEP_MS = 20 * 60 * 1000

function recordStore(prefix) {
    return {
        async put(key, data) {
            await prisma.crmOption.upsert({ where: { name: `${prefix}${key}` }, update: { value: JSON.stringify(data), autoload: false }, create: { name: `${prefix}${key}`, value: JSON.stringify(data), autoload: false } })
            // forget the ones nobody came back for
            prisma.crmOption.deleteMany({ where: { name: { startsWith: prefix }, createdAt: { lt: new Date(Date.now() - KEEP_MS) } } }).catch(() => {})
        },
        /** Reads and deletes in one step: a record can be used once. */
        async take(key) {
            const name = `${prefix}${key}`
            const row = await prisma.crmOption.findUnique({ where: { name } })
            if (!row) return null
            const gone = await prisma.crmOption.deleteMany({ where: { id: row.id } })
            if (!gone.count) return null // somebody else took it first
            try { return JSON.parse(row.value || 'null') } catch { return null }
        },
    }
}

export const loginStore = recordStore('oidc_login_')
const tickets = recordStore('oidc_ticket_')

/** A one-time ticket (valid for a minute) that lets the sign-in step create the normal session for a user. */
export async function issueTicket(userId, extra = {}) {
    const id = crypto.randomBytes(32).toString('base64url')
    await tickets.put(id, { userId, at: Date.now(), ...extra })
    return id
}
/** { userId, ...extra } of a valid ticket (used once, within a minute), or null. */
export async function redeemTicketFull(id) {
    const t = await tickets.take(String(id || ''))
    return t && Date.now() - t.at < 60 * 1000 ? t : null
}
export async function redeemTicket(id) {
    return (await redeemTicketFull(id))?.userId || null
}

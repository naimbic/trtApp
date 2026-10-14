import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export const COOKIE = 'trtportal'
const TTL = 14 * 24 * 3600 * 1000
const PREVIEW_TTL = 2 * 3600 * 1000 // a staff preview of the client area
const secret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
const sig = (body) => crypto.createHmac('sha256', secret()).update(`portal.${body}`).digest('base64url')
export const SECTIONS = ['invoices', 'estimates', 'proposals', 'contracts', 'projects', 'support']

const httpError = (m, status = 400) => Object.assign(new Error(m), { status })

/** Signed cookie value for a contact. `pv` ties it to the current password, so changing the password signs everyone out. */
export function sign(contact, { preview = false } = {}) {
    const body = Buffer.from(JSON.stringify({ c: contact.id, k: contact.clientId, pv: +new Date(contact.lastPasswordChange || 0), exp: Date.now() + (preview ? PREVIEW_TTL : TTL), ...(preview ? { imp: 1 } : {}) })).toString('base64url')
    return `${body}.${sig(body)}`
}

export function cookieOptions(request) {
    const secure = (request?.headers.get('x-forwarded-proto') || request?.nextUrl?.protocol || '').replace(':', '') === 'https'
    return { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: TTL / 1000 }
}

const parse = (raw) => {
    const [body, mac] = String(raw || '').split('.')
    if (!body || !mac) return null
    const a = Buffer.from(mac), b = Buffer.from(sig(body))
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null } catch { return null }
}

/** Sections the contact may use (Perfex contact permissions; a contact with none set gets everything). */
export async function allowedSections(contactId) {
    const rows = await prisma.crmContactPermission.findMany({ where: { contactId }, select: { permissionId: true } })
    if (!rows.length) return [...SECTIONS]
    const perms = await prisma.crmPermission.findMany({ where: { id: { in: rows.map((r) => r.permissionId).filter(Boolean) } }, select: { shortName: true } })
    const names = perms.map((p) => p.shortName)
    return SECTIONS.filter((s) => names.includes(s))
}

/** { contact, client, can } for the signed-in portal contact, or null. */
export async function getPortalSession() {
    const jar = await cookies()
    const p = parse(jar.get(COOKIE)?.value)
    if (!p) return null
    const contact = await prisma.crmContact.findUnique({ where: { id: p.c } })
    if (!contact || !contact.active || contact.clientId !== p.k || +new Date(contact.lastPasswordChange || 0) !== p.pv) return null
    const client = await prisma.crmClient.findUnique({ where: { id: contact.clientId } })
    if (!client || (!client.active && !p.imp)) return null
    const can = await allowedSections(contact.id)
    return { contact, client, can, preview: !!p.imp }
}

export async function requirePortal(section) {
    const s = await getPortalSession()
    if (!s) throw httpError('Please sign in', 401)
    if (section && !s.can.includes(section)) throw httpError('You do not have access to this section', 403)
    return s
}

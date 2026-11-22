import { createHash } from 'crypto'
import prisma from '@/lib/prisma'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const DAY = 86400000
export const SECURITY_KINDS = ['cross_site', 'flood', 'login_failed', 'login_locked']
const cut = (v, n) => (v === null || v === undefined || v === '' ? null : String(v).slice(0, n))

/** The key the request shield signs its notes with (derived from the server secret, never sent to a browser). */
export const shieldKey = () => createHash('sha256').update(`${process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''}:shield`).digest('hex')

/** Keeps one suspicious event. Never throws: a full log must not break a sign-in or a request. */
export async function recordSecurity({ kind, ip, method, path, detail }) {
    if (!SECURITY_KINDS.includes(kind)) return
    try {
        await prisma.crmSecurityEvent.create({ data: { kind, ip: cut(ip, 60), method: cut(method, 10), path: cut(path, 300), detail: cut(detail, 300) } })
    } catch { /* the log is a help, not a need */ }
}

/** The security log, newest first (administrators only): { list, total, counts, addresses }. */
export async function listSecurity({ days, kind, page }) {
    const { requirePermission, isCrmAdmin } = await import('@/lib/crm/permissions') // loaded here: the sign-in code uses this file too
    const session = await requirePermission(null)
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Forbidden', 403)
    const span = [1, 7, 30].includes(Number(days)) ? Number(days) : 7
    const since = { createdAt: { gte: new Date(Date.now() - span * DAY) } }
    const where = { ...since, ...(SECURITY_KINDS.includes(kind) ? { kind } : {}) }
    const size = 40
    const at = Math.max(1, Number(page) || 1)
    const [list, total, byKind, byIp] = await Promise.all([
        prisma.crmSecurityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (at - 1) * size, take: size }),
        prisma.crmSecurityEvent.count({ where }),
        prisma.crmSecurityEvent.groupBy({ by: ['kind'], where: since, _count: { _all: true } }),
        prisma.crmSecurityEvent.groupBy({ by: ['ip'], where: since, _count: { _all: true } }),
    ])
    return { list, total, pageSize: size, counts: Object.fromEntries(byKind.map((r) => [r.kind, r._count._all])), addresses: byIp.filter((r) => r.ip).length }
}

import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { sendTemplate } from '@/lib/crm/mailer'
import { notifyStaffChannels } from '@/lib/crm/channels'
import { publicBase } from '@/lib/crm/shortLinks'
import { signupOutcome, splitName } from '@/lib/crm/signupCalc'
import { rateLimit } from '@/lib/rateLimit'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Settings → Sign-in & API: "Let people request an account with Google or GitHub" (on unless switched off). */
export async function requestsEnabled() {
    const o = await prisma.crmOption.findUnique({ where: { name: 'social_signup_requests' } })
    return o?.value !== '0'
}

/** The administrators and the members allowed to add team members: who is told, who decides. */
async function deciders() {
    const [admins, perm] = await Promise.all([
        prisma.crmStaff.findMany({ where: { active: true, admin: true }, select: { id: true, email: true, firstName: true } }),
        prisma.crmStaffPermission.findMany({ where: { feature: 'staff', capability: 'create' }, select: { staffId: true } }),
    ])
    const extra = perm.length ? await prisma.crmStaff.findMany({ where: { active: true, id: { in: perm.map((p) => p.staffId) } }, select: { id: true, email: true, firstName: true } }) : []
    return [...new Map([...admins, ...extra].map((s) => [s.id, s])).values()]
}

/**
 * Called by the sign-in when a Google / GitHub login has no account. Writes (or finds) the request, tells the administrators once,
 * and returns the code the sign-in page explains. The person gets no access: nothing here creates an account.
 */
export async function requestFromSocial({ account, profile, user }) {
    const email = String(profile?.email || user?.email || '').trim().toLowerCase()
    if (!EMAIL.test(email)) return 'no_account'
    const enabled = await requestsEnabled()
    const existing = await prisma.crmSignupRequest.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } })
    const out = signupOutcome({ enabled, existing })
    if (!out.create) {
        if (existing) await prisma.crmSignupRequest.update({ where: { id: existing.id }, data: { tries: { increment: 1 } } }).catch(() => {})
        return out.code
    }
    try { rateLimit(`signup-request:${email}`, 3, 3600000) } catch { return 'request_pending' }
    const name = String(profile?.name || user?.name || '').trim().slice(0, 120) || null
    const picture = /^https:\/\//.test(profile?.picture || profile?.avatar_url || user?.image || '') ? String(profile?.picture || profile?.avatar_url || user?.image).slice(0, 500) : null
    const row = await prisma.crmSignupRequest.create({ data: { email, name, picture, provider: account.provider === 'github' ? 'github' : 'google' } })
    await tellDeciders(row).catch(() => {})
    return out.code
}

async function tellDeciders(row) {
    const link = `${publicBase()}/crm/team?requests=1`
    const label = row.provider === 'github' ? 'GitHub' : 'Google'
    for (const s of await deciders()) {
        await prisma.crmNotification.create({ data: { toUserId: s.id, fromFullName: label, description: `${row.name || row.email} asked for an account (${label})`.slice(0, 200), link: '/crm/team?requests=1', additionalData: 'signup-request', isRead: false } }).catch(() => {})
        await notifyStaffChannels(s.id, `${row.name || row.email} (${row.email}) asked for an account with ${label}.\n${link}`).catch(() => {})
        if (s.email) await sendTemplate({ slug: 'signup-request-to-admin', to: s.email, relType: 'signup_request', relId: row.id, data: { staff_firstname: s.firstName || '', request_name: row.name || '', request_email: row.email, request_provider: label, request_link: link } }).catch(() => {})
    }
}

async function gate() {
    const session = await requirePermission('staff', 'create')
    return { session, staffId: await getStaffId(session) }
}

/** The requests waiting (and the last decided ones), for the Team page. */
export async function listRequests({ all = false } = {}) {
    await gate()
    const rows = await prisma.crmSignupRequest.findMany({ where: all ? {} : { status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { list: rows.map((r) => ({ id: r.id, email: r.email, name: r.name || '', picture: r.picture || '', provider: r.provider, status: r.status, tries: r.tries, note: r.note || '', createdAt: r.createdAt, decidedAt: r.decidedAt })), pending: rows.filter((r) => r.status === 'pending').length, enabled: await requestsEnabled() }
}

export async function pendingCount() {
    try { await gate() } catch { return 0 }
    return prisma.crmSignupRequest.count({ where: { status: 'pending' } })
}

/** Approve: the account is created with the chosen role (no password: the person signs in with Google / GitHub, or asks for a reset), and told by email. */
export async function approveRequest(id, body = {}, request) {
    const g = await gate()
    const row = oid(id) && (await prisma.crmSignupRequest.findUnique({ where: { id } }))
    if (!row) throw fail('Request not found', 404)
    if (row.status !== 'pending') throw fail('This request was already answered', 409)
    const names = splitName(body.firstName || row.name, row.email)
    const firstName = String(body.firstName || names.firstName).trim()
    const lastName = String(body.lastName ?? names.lastName).trim()
    const roleId = oid(body.roleId)
    if (roleId && !(await prisma.crmRole.findUnique({ where: { id: roleId }, select: { id: true } }))) throw fail('Role not found', 404)
    const { createMember } = await import('@/lib/crm/team')
    const made = await createMember({ email: row.email, firstName, lastName, roleId, admin: false, password: crypto.randomBytes(18).toString('base64url') }, request)
    if (row.picture) await prisma.user.updateMany({ where: { email: row.email }, data: { image: row.picture } }).catch(() => {})
    await prisma.crmSignupRequest.update({ where: { id }, data: { status: 'approved', decidedBy: g.staffId || undefined, decidedAt: new Date() } })
    await sendTemplate({ slug: 'signup-request-approved', to: row.email, relType: 'signup_request', relId: id, data: { contact_firstname: firstName, contact_lastname: lastName, login_link: `${publicBase()}/sign-in` } }).catch(() => {})
    return { success: true, member: made.member }
}

export async function rejectRequest(id, body = {}) {
    const g = await gate()
    const row = oid(id) && (await prisma.crmSignupRequest.findUnique({ where: { id } }))
    if (!row) throw fail('Request not found', 404)
    if (row.status !== 'pending') throw fail('This request was already answered', 409)
    await prisma.crmSignupRequest.update({ where: { id }, data: { status: 'rejected', note: String(body.note || '').trim().slice(0, 300) || null, decidedBy: g.staffId || undefined, decidedAt: new Date() } })
    return { success: true }
}

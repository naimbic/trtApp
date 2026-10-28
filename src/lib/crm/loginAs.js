import prisma from '@/lib/prisma'
import { auth, signIn } from '@/auth'
import { requirePermission, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { buildUserAuthority } from '@/lib/crm/authBuild'
import { issueTicket } from '@/lib/crm/trtagency/store'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nameOf = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || ''

const audit = async (staffId, description) => {
    try { await prisma.crmActivityLog.create({ data: { description: description.slice(0, 1500), staffId } }) } catch { /* auditing must never break the switch */ }
}

const enter = async (ticket) => {
    try { await signIn('credentials', { loginAsTicket: ticket, redirect: false }) } catch { throw httpError('The account could not be opened', 500) }
}

/** Opens the CRM as another team member: needs Team members → "Log in as", never from inside another "login as", and only a Super Admin may enter a Super Admin. */
export async function startLoginAs(staffId) {
    const session = await requirePermission('staff', 'login_as')
    if (session.user.imp) throw httpError('You are already logged in as someone else. Go back to your own account first.', 400)
    const id = oid(staffId)
    const staff = id && (await prisma.crmStaff.findUnique({ where: { id } }))
    if (!staff) throw httpError('Member not found', 404)
    if (!staff.userId) throw httpError('This member has no sign-in account')
    if (staff.userId === session.user.id) throw httpError('This is your own account')
    if (!staff.active) throw httpError('This member is inactive')
    const user = await prisma.user.findUnique({ where: { id: staff.userId } })
    if (!user) throw httpError('This member has no sign-in account')
    const { authority, blocked } = await buildUserAuthority(user)
    if (blocked) throw httpError('This member is inactive')
    if (isCrmAdmin(authority) && !isCrmAdmin(session.user.authority || [])) throw httpError('Only a Super Admin can log in as a Super Admin', 403)
    const me = await getStaffId(session)
    await audit(me, `Logged in as ${nameOf(staff)} (login as)`)
    const ticket = await issueTicket(user.id, { loginAs: true, imp: { id: session.user.id, name: session.user.name || session.user.email || '' } })
    await enter(ticket)
    return { success: true, name: nameOf(staff) }
}

/** Goes back to the person who really signed in. */
export async function stopLoginAs() {
    const session = await auth()
    if (!session?.user?.id) throw httpError('Unauthorized', 401)
    const real = session.user.imp?.id
    if (!real) throw httpError('You are not logged in as someone else')
    const me = await prisma.crmStaff.findFirst({ where: { userId: session.user.id }, select: { firstName: true, lastName: true, email: true } })
    const back = await prisma.crmStaff.findFirst({ where: { userId: real }, select: { id: true } })
    await audit(back?.id || null, `Went back to their own account after logging in as ${nameOf(me)} (login as)`)
    const ticket = await issueTicket(real, { loginAs: true })
    await enter(ticket)
    return { success: true }
}

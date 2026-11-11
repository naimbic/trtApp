import prisma from '@/lib/prisma'
import { authorityFromStaff } from '@/lib/crm/authority'
import { hasCap, viewScope } from '@/lib/crm/permissions'

/* A check on a draft mail can ask a colleague to confirm it: { text, done, staffId }. Only a colleague who may send mails (Lead mails / Client mails: Send)
   and who can see the lead or the client can be asked; only that colleague confirms the check (the others confirm the plain checks). */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nameOf = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
const FEATURE = { lead: 'lead_mails', client: 'client_mails' }

/** The team members who can be asked: active, allowed to send mails of this kind, and able to open the record. `record` is the lead row, or { clientId } for a client. */
export async function mentionable(kind, record) {
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, include: { permissions: true }, orderBy: { firstName: 'asc' }, take: 500 })
    const admins = kind === 'client' ? new Set((await prisma.crmCustomerAdmin.findMany({ where: { clientId: record.clientId }, select: { staffId: true } })).map((x) => x.staffId)) : null
    return staff.filter((s) => {
        const auth = authorityFromStaff(s)
        if (!s.admin && !hasCap(auth, FEATURE[kind], 'send')) return false
        if (s.admin) return true
        if (kind === 'lead') {
            const sc = viewScope(auth, 'leads')
            return sc === 'all' || (sc !== null && (record.assigned === s.id || (record.assignedIds || []).includes(s.id) || (record.followerIds || []).includes(s.id) || record.addedFrom === s.id || !!record.isPublic))
        }
        const sc = viewScope(auth, 'customers')
        return sc === 'all' || (sc !== null && admins.has(s.id))
    }).map((s) => ({ id: s.id, name: nameOf(s) }))
}

/** The checks to save: a colleague on a check must be one who can be asked, and the colleague's confirmation is never taken from what the editor sends. */
export async function resolveChecks(kind, record, checks, prev = []) {
    const asked = (checks || []).filter((c) => c.staffId)
    if (!asked.length) return checks
    const ok = new Map((await mentionable(kind, record)).map((p) => [p.id, p.name]))
    return checks.map((c) => {
        if (!c.staffId) return { text: c.text, done: c.done }
        if (!ok.has(c.staffId)) throw fail('You can only ask a colleague who may send mails and can open this record')
        const before = (prev || []).find((x) => x.staffId === c.staffId && x.text === c.text)
        return { text: c.text, done: !!before?.done, staffId: c.staffId }
    })
}

/** Tells the colleagues who were just asked (a new check, or one that must be confirmed again). Never fails the save. */
export async function tellAsked(prev, now, { text, url }) {
    try {
        const fresh = (now || []).filter((c) => c.staffId && !c.done && !(prev || []).some((x) => x.staffId === c.staffId && x.text === c.text && !x.done) )
        const ids = [...new Set(fresh.map((c) => c.staffId))]
        if (!ids.length) return
        const { notifyMentions } = await import('@/lib/crm/mentionsApi')
        await notifyMentions({ staffIds: ids, text, url })
    } catch (e) { console.error('[mail check notify]', e.message) }
}

/** What each check shows: the colleague's name, and whether the person looking may confirm it. */
export function decorate(checks, people, { me, canSend, canEdit }) {
    return (Array.isArray(checks) ? checks : []).map((c) => ({ ...c, person: c.staffId ? people[c.staffId]?.name || '' : '', canToggle: c.staffId ? !!me && c.staffId === me && canSend : canEdit }))
}

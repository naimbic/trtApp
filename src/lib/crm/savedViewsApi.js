// Saved views of the list pages (Leads, Tasks, tables): a name + the filters of the page. Mine, and the ones the team shared.
import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, isCrmAdmin } from '@/lib/crm/permissions'
import { cleanState } from '@/lib/crm/savedViewsCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const PAGE_RE = /^[a-z0-9-]{1,40}$/
const MAX_PER_PAGE = 30

async function me() {
    const session = await requirePermission(null)
    const staffId = await getStaffId(session)
    if (!staffId) throw fail('Only a team member can save views', 403)
    return { staffId, admin: isCrmAdmin(session.user.authority || []) }
}

export async function listViews(page) {
    const { staffId } = await me()
    if (!PAGE_RE.test(String(page || ''))) throw fail('Unknown page')
    const rows = await prisma.crmSavedView.findMany({ where: { page, OR: [{ ownerId: staffId }, { shared: true }] }, orderBy: { createdAt: 'asc' }, take: 100 })
    const owners = await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.ownerId))] } }, select: { id: true, firstName: true, lastName: true } })
    const on = Object.fromEntries(owners.map((o) => [o.id, [o.firstName, o.lastName].filter(Boolean).join(' ')]))
    return { list: rows.map((r) => ({ id: r.id, name: r.name, state: r.state, shared: r.shared, mine: r.ownerId === staffId, owner: on[r.ownerId] || '' })).sort((a, b) => Number(b.mine) - Number(a.mine)) }
}

export async function addView(body = {}) {
    const { staffId } = await me()
    const page = String(body.page || '')
    if (!PAGE_RE.test(page)) throw fail('Unknown page')
    const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!name) throw fail('Give the view a name')
    if ((await prisma.crmSavedView.count({ where: { page, ownerId: staffId } })) >= MAX_PER_PAGE) throw fail(`At most ${MAX_PER_PAGE} views per page: delete one first`)
    const row = await prisma.crmSavedView.create({ data: { page, name, state: cleanState(body.state), ownerId: staffId, shared: !!body.shared } })
    return { id: row.id }
}

async function mine(id, { staffId, admin }, { allowAdmin = false } = {}) {
    const v = oid(id) && (await prisma.crmSavedView.findUnique({ where: { id } }))
    if (!v) throw fail('View not found', 404)
    if (v.ownerId !== staffId && !(allowAdmin && admin)) throw fail('Only the person who saved a view changes it', 403)
    return v
}

export async function updateView(id, body = {}) {
    const who = await me()
    await mine(id, who)
    const data = {}
    if (body.name !== undefined) { const n = String(body.name).replace(/\s+/g, ' ').trim().slice(0, 60); if (!n) throw fail('Give the view a name'); data.name = n }
    if (body.shared !== undefined) data.shared = !!body.shared
    if (body.state !== undefined) data.state = cleanState(body.state)
    if (Object.keys(data).length) await prisma.crmSavedView.update({ where: { id }, data })
    return { id }
}

export async function deleteView(id) {
    const who = await me()
    await mine(id, who, { allowAdmin: true })
    await prisma.crmSavedView.delete({ where: { id } })
    return { ok: true }
}

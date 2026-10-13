import prisma from '@/lib/prisma'
import { requirePermission, getStaffId, hasCap, isCrmAdmin } from '@/lib/crm/permissions'
import { seal, unseal, b32decode, totpNow } from '@/lib/crm/twoFactor'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
const ids = (a) => [...new Set((Array.isArray(a) ? a : []).map(oid).filter(Boolean))]
const ACCESS = ['private', 'team', 'selected']
const reqIp = (r) => (r?.headers?.get('x-forwarded-for') || '').split(',')[0].trim() || null

async function ctx() {
    const session = await requirePermission('passwords', 'view')
    const authority = session.user.authority || []
    return { session, authority, admin: isCrmAdmin(authority), staffId: await getStaffId(session), can: (cap) => hasCap(authority, 'passwords', cap), name: session.user.name || '' }
}

/** what a staff member may do with an entry: see it, change it, change who shares it */
function rights(c, e) {
    const mine = !!c.staffId && e.createdBy === c.staffId
    const shared = e.access === 'team' || (e.access === 'selected' && (e.viewerIds.includes(c.staffId) || e.editorIds.includes(c.staffId)))
    const editor = e.access !== 'private' && e.editorIds.includes(c.staffId)
    return { see: c.admin || mine || shared || editor, edit: c.admin || mine || editor, manage: c.admin || mine, mine }
}

const staffName = (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'
async function staffList() {
    const rows = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } })
    return rows.map((s) => ({ id: s.id, name: staffName(s), image: s.profileImage || null })).sort((a, b) => a.name.localeCompare(b.name))
}

async function log(entryId, c, action, detail, request) {
    await prisma.crmPasswordLog.create({ data: { entryId, staffId: c.staffId || undefined, action, detail: detail || null, ip: reqIp(request) } }).catch(() => {})
}

export async function listEntries(q = {}) {
    const c = await ctx()
    const [entries, cats, staff] = await Promise.all([prisma.crmPasswordEntry.findMany({ orderBy: { title: 'asc' } }), prisma.crmPasswordCategory.findMany({ orderBy: { name: 'asc' } }), staffList()])
    const visible = entries.filter((e) => rights(c, e).see)
    const clients = await prisma.crmClient.findMany({ where: { id: { in: [...new Set(visible.map((e) => e.clientId).filter(Boolean))] } }, select: { id: true, company: true } })
    const cName = Object.fromEntries(clients.map((x) => [x.id, x.company])), catMap = Object.fromEntries(cats.map((x) => [x.id, x]))
    const sName = Object.fromEntries(staff.map((s) => [s.id, s.name]))
    const count = (f) => visible.filter(f).length
    const term = String(q.query || '').trim().toLowerCase()
    let list = visible
    if (q.scope === 'mine') list = list.filter((e) => rights(c, e).mine)
    else if (q.scope === 'shared') list = list.filter((e) => !rights(c, e).mine)
    else if (q.scope === 'private') list = list.filter((e) => e.access === 'private')
    else if (q.scope === 'client') list = list.filter((e) => e.clientId)
    if (oid(q.categoryId)) list = list.filter((e) => e.categoryId === q.categoryId)
    if (q.categoryId === 'none') list = list.filter((e) => !e.categoryId)
    if (oid(q.clientId)) list = list.filter((e) => e.clientId === q.clientId)
    if (term) list = list.filter((e) => [e.title, e.username, e.url, e.notes, (e.tags || []).join(' '), cName[e.clientId], catMap[e.categoryId]?.name].filter(Boolean).join(' ').toLowerCase().includes(term))
    return {
        list: list.map((e) => {
            const r = rights(c, e)
            return { id: e.id, title: e.title, category: catMap[e.categoryId] ? { id: e.categoryId, name: catMap[e.categoryId].name, color: catMap[e.categoryId].color } : null, client: e.clientId ? { id: e.clientId, name: cName[e.clientId] || '' } : null, url: e.url, username: e.username, hasPassword: !!e.passwordEnc, hasTotp: !!e.totpEnc, tags: e.tags || [], access: e.access, sharedWith: e.access === 'selected' ? new Set([...e.viewerIds, ...e.editorIds]).size : null, owner: sName[e.createdBy] || '', mine: r.mine, canEdit: r.edit, updatedAt: e.changedAt || e.updatedAt, expiresAt: e.expiresAt, expired: !!e.expiresAt && new Date(e.expiresAt) < new Date() }
        }),
        categories: cats.map((x) => ({ id: x.id, name: x.name, color: x.color, count: visible.filter((e) => e.categoryId === x.id).length })),
        counts: { all: visible.length, mine: count((e) => rights(c, e).mine), shared: count((e) => !rights(c, e).mine), private: count((e) => e.access === 'private'), client: count((e) => e.clientId), none: count((e) => !e.categoryId) },
        staff, can: { create: c.can('create'), admin: c.admin },
    }
}

async function loadOne(id, c) {
    if (!oid(id)) throw fail('Entry not found', 404)
    const e = await prisma.crmPasswordEntry.findUnique({ where: { id } })
    if (!e || !rights(c, e).see) throw fail('Entry not found', 404)
    return e
}

export async function getEntry(id) {
    const c = await ctx()
    const e = await loadOne(id, c)
    const r = rights(c, e)
    const [client, logs, staff] = await Promise.all([e.clientId ? prisma.crmClient.findUnique({ where: { id: e.clientId }, select: { id: true, company: true } }) : null, r.edit ? prisma.crmPasswordLog.findMany({ where: { entryId: id }, orderBy: { createdAt: 'desc' }, take: 60 }) : [], staffList()])
    const sName = Object.fromEntries(staff.map((s) => [s.id, s.name]))
    return {
        entry: { id: e.id, title: e.title, categoryId: e.categoryId, clientId: e.clientId, client, url: e.url || '', username: e.username || '', hasPassword: !!e.passwordEnc, hasTotp: !!e.totpEnc, notes: e.notes || '', tags: e.tags || [], access: e.access, viewerIds: e.viewerIds, editorIds: e.editorIds, expiresAt: e.expiresAt, owner: sName[e.createdBy] || '', ownerId: e.createdBy, createdAt: e.createdAt, changedAt: e.changedAt, changedBy: sName[e.changedBy] || '' },
        history: logs.map((l) => ({ id: l.id, who: sName[l.staffId] || 'System', action: l.action, detail: l.detail || '', ip: l.ip, date: l.createdAt })),
        can: { edit: r.edit, manage: r.manage, delete: r.manage, history: r.edit }, staff,
    }
}

const clean = (body) => {
    const title = nz(body.title)
    if (!title) throw fail('Give the entry a name')
    const access = ACCESS.includes(body.access) ? body.access : 'private'
    let totp = nz(body.totpSecret)
    if (totp) { totp = totp.replace(/\s+/g, '').toUpperCase(); if (!/^[A-Z2-7]{8,}=*$/.test(totp) || !b32decode(totp).length) throw fail('The 2FA secret must be the base32 text shown when you set up 2FA (letters A–Z and digits 2–7)') }
    let url = nz(body.url)
    if (url && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`
    if (url && !/^https?:\/\//i.test(url)) throw fail('The address must start with http:// or https://')
    return { title: title.slice(0, 160), categoryId: oid(body.categoryId), clientId: oid(body.clientId), url, username: nz(body.username)?.slice(0, 200) || null, notes: nz(body.notes)?.slice(0, 5000) || null, tags: [...new Set(String(Array.isArray(body.tags) ? body.tags.join(',') : body.tags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12), access, viewerIds: access === 'selected' ? ids(body.viewerIds) : [], editorIds: access === 'selected' ? ids(body.editorIds) : [], expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, totp }
}

export async function saveEntry(body, id, request) {
    const c = await ctx()
    if (!id && !c.can('create')) throw fail('You are not allowed to add entries', 403)
    const d = clean(body)
    const { totp, ...data } = d
    if (id) {
        const e = await loadOne(id, c)
        const r = rights(c, e)
        if (!r.edit) throw fail('You can only change entries you own or were given edit rights on', 403)
        const patch = { ...data, changedAt: new Date(), changedBy: c.staffId }
        if (!r.manage) { patch.access = e.access; patch.viewerIds = e.viewerIds; patch.editorIds = e.editorIds } // sharing belongs to the owner
        const pw = typeof body.password === 'string' && body.password.length ? body.password : null
        if (pw) patch.passwordEnc = seal(pw)
        if (body.clearPassword) patch.passwordEnc = null
        if (totp) patch.totpEnc = seal(totp)
        if (body.clearTotp) patch.totpEnc = null
        await prisma.crmPasswordEntry.update({ where: { id }, data: patch })
        const changes = [pw && 'password changed', totp && '2FA secret changed', patch.access !== e.access && `access set to ${patch.access}`, r.manage && JSON.stringify([...patch.viewerIds].sort()) !== JSON.stringify([...e.viewerIds].sort()) && 'viewers changed', r.manage && JSON.stringify([...patch.editorIds].sort()) !== JSON.stringify([...e.editorIds].sort()) && 'editors changed'].filter(Boolean)
        await log(id, c, 'update', changes.join(', ') || 'details edited', request)
        return { success: true, id }
    }
    const pw = typeof body.password === 'string' && body.password.length ? body.password : null
    const e = await prisma.crmPasswordEntry.create({ data: { ...data, passwordEnc: pw ? seal(pw) : null, totpEnc: totp ? seal(totp) : null, createdBy: c.staffId, changedAt: new Date(), changedBy: c.staffId } })
    await log(e.id, c, 'create', `shared: ${data.access}`, request)
    return { success: true, id: e.id }
}

export async function revealEntry(id, request) {
    const c = await ctx()
    const e = await loadOne(id, c)
    let totp = null
    if (e.totpEnc) { try { totp = totpNow(unseal(e.totpEnc)) } catch { totp = null } }
    let password = null
    if (e.passwordEnc) { try { password = unseal(e.passwordEnc) } catch { throw fail('This password cannot be decrypted (the application key changed)', 500) } }
    await prisma.crmPasswordEntry.update({ where: { id }, data: { lastRevealedAt: new Date() } })
    await log(id, c, 'view', c.admin && !rights(c, e).mine && e.access === 'private' ? 'viewed by an administrator' : '', request)
    return { password, username: e.username, totp }
}

export async function totpCode(id) {
    const c = await ctx()
    const e = await loadOne(id, c)
    if (!e.totpEnc) throw fail('This entry has no 2FA secret')
    return totpNow(unseal(e.totpEnc))
}

export async function logAction(id, action, request) {
    const c = await ctx()
    const e = await loadOne(id, c)
    if (!['copy_password', 'copy_username', 'copy_totp', 'open_url'].includes(action)) throw fail('Unknown action')
    await log(e.id, c, action, '', request)
    return { success: true }
}

export async function deleteEntry(id, request) {
    const c = await ctx()
    const e = await loadOne(id, c)
    if (!rights(c, e).manage) throw fail('Only the owner or an administrator can delete this entry', 403)
    await prisma.crmPasswordEntry.delete({ where: { id } })
    await prisma.crmPasswordLog.deleteMany({ where: { entryId: id } })
    void request
    return { success: true }
}

export async function saveCategory(body, id) {
    const c = await ctx()
    if (!c.can('create') && !c.admin) throw fail('You are not allowed to manage categories', 403)
    const name = nz(body.name)?.slice(0, 60)
    if (!name) throw fail('Name the category')
    const dup = await prisma.crmPasswordCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(id ? { NOT: { id } } : {}) } })
    if (dup) throw fail('That category already exists')
    const color = /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : null
    const r = id ? await prisma.crmPasswordCategory.update({ where: { id }, data: { name, color } }) : await prisma.crmPasswordCategory.create({ data: { name, color } })
    return { success: true, id: r.id, name: r.name }
}

export async function deleteCategory(id) {
    const c = await ctx()
    if (!c.admin && !c.can('delete')) throw fail('You are not allowed to delete categories', 403)
    if (!oid(id)) throw fail('Category not found', 404)
    await prisma.crmPasswordEntry.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
    await prisma.crmPasswordCategory.delete({ where: { id } })
    return { success: true }
}

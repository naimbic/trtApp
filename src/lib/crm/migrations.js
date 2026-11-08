import prisma from '@/lib/prisma'
import { ROLES } from '@/lib/crm/standardRoles'
import { cleanPermissions } from '@/lib/crm/permissionCatalog'
import { parseRolePermissions, toPermissionRows } from '@/lib/crm/rolePermissions'

const TABS = ['report_sales', 'report_profit', 'report_leads', 'report_support', 'report_work']
const MARK = 'perm_migration_reports_v1'

/**
 * One-time data fix when reports got one permission per report: everybody (and every role) that could already open
 * Reports keeps all reports. "See money amounts" is deliberately NOT granted: switch it on per role or person.
 * Safe to run on every start: it stops once the marker setting exists.
 */
export async function migratePermissions() {
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const rows = await prisma.crmStaffPermission.findMany({ where: { feature: 'reports', capability: 'view' }, select: { staffId: true } })
    for (const { staffId } of rows) {
        const have = new Set((await prisma.crmStaffPermission.findMany({ where: { staffId, feature: 'reports' }, select: { capability: true } })).map((r) => r.capability))
        const add = TABS.filter((t) => !have.has(t))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add.map((capability) => ({ staffId, feature: 'reports', capability })) })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!Array.isArray(perms.reports) || !perms.reports.includes('view')) continue
        perms.reports = [...new Set([...perms.reports, ...TABS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

const TOOLS = ['calendar', 'chat', 'file_manager']

/**
 * Calendar, Team chat and File manager became permissions: everybody (and every role) keeps them, so nobody loses a page
 * they use today; switch them off per role or person afterwards. Runs once, marker-guarded.
 */
export async function migrateToolPermissions() {
    const MARK3 = 'perm_migration_tools_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK3 } })) return
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const have = new Set((await prisma.crmStaffPermission.findMany({ where: { staffId: s.id, capability: 'view', feature: { in: TOOLS } }, select: { feature: true } })).map((r) => r.feature))
        const add = TOOLS.filter((f) => !have.has(f))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add.map((feature) => ({ staffId: s.id, feature, capability: 'view' })) })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms)) continue
        for (const f of TOOLS) if (!perms[f]) perms[f] = ['view']
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK3, value: new Date().toISOString() } })
}

/**
 * The chat got finer switches (files, groups, calls, client conversations) and a Chat messages row (stamps, bookmarks, pins, edit, delete):
 * whoever had the chat keeps everything they could do, and gets the new message tools except "delete other people's messages". Once, marker-guarded.
 */
const CHAT_CAPS = ['send_files', 'create_groups', 'call', 'client_chats']
const MESSAGE_CAPS = ['react', 'bookmark', 'pin', 'edit_own', 'delete_own']
export async function migrateChatPermissions() {
    const MARK = 'perm_migration_chat_v2'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id, feature: { in: ['chat', 'chat_messages'] } }, select: { feature: true, capability: true } })
        if (!rows.some((r) => r.feature === 'chat' && r.capability === 'view')) continue
        const have = new Set(rows.map((r) => `${r.feature}.${r.capability}`))
        const add = [...CHAT_CAPS.map((capability) => ({ feature: 'chat', capability })), ...MESSAGE_CAPS.map((capability) => ({ feature: 'chat_messages', capability }))].filter((x) => !have.has(`${x.feature}.${x.capability}`))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add.map((x) => ({ staffId: s.id, ...x })) })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !(perms.chat || []).includes('view')) continue
        perms.chat = [...new Set([...perms.chat, ...CHAT_CAPS])]
        perms.chat_messages = [...new Set([...(perms.chat_messages || []), ...MESSAGE_CAPS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** "My growth" is a tool everybody has at first, like the calendar and the chat. Runs once, marker-guarded. */
export async function migrateGrowthPermission() {
    const MARK = 'perm_migration_growth_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        if (!(await prisma.crmStaffPermission.findFirst({ where: { staffId: s.id, feature: 'growth', capability: 'view' }, select: { id: true } }))) await prisma.crmStaffPermission.create({ data: { staffId: s.id, feature: 'growth', capability: 'view' } })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms)) continue
        if (!perms.growth) { perms.growth = ['view']; await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } }) }
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** Notes (Keep-style) became a permission: everybody keeps them, with sharing. Runs once, marker-guarded. */
export async function migrateNotesPermission() {
    const MARK = 'perm_migration_notes_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const CAPS = ['view', 'share']
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const have = new Set((await prisma.crmStaffPermission.findMany({ where: { staffId: s.id, feature: 'notes' }, select: { capability: true } })).map((r) => r.capability))
        const add = CAPS.filter((c) => !have.has(c))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add.map((capability) => ({ staffId: s.id, feature: 'notes', capability })) })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms)) continue
        if (!perms.notes) { perms.notes = CAPS; await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } }) }
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/**
 * A function that used to hide under another permission gets its own row in Roles: whoever could do something with the old
 * feature keeps the same power over the new one ({ oldCapability: [newCapabilities] }). Runs once per split, marker-guarded.
 */
const SPLITS = [
    { mark: 'perm_migration_departments_v1', from: 'settings', to: 'departments', map: { view: ['view'], edit: ['create', 'edit', 'delete'] } },
    { mark: 'perm_migration_announcements_v1', from: 'settings', to: 'announcements', map: { view: ['view'], edit: ['create', 'edit', 'delete'] } },
    { mark: 'perm_migration_activity_log_v1', from: 'settings', to: 'activity_log', map: { view: ['view'] } },
    { mark: 'perm_migration_client_requests_v1', from: 'customers', to: 'client_requests', map: { view: ['view'], view_own: ['view'], edit: ['create', 'edit'], delete: ['delete'] } },
    { mark: 'perm_migration_client_reports_v1', from: 'client_requests', to: 'client_reports', map: { view: ['view'], create: ['create'], edit: ['edit'], delete: ['delete'] } },
    { mark: 'perm_migration_leave_v1', from: 'tasks', to: 'leave', map: { view: ['view'], view_own: ['view_own'], create: ['create'], edit: ['edit'], delete: ['delete'] } },
]
export async function splitPermissions() {
    for (const { mark, from, to, map } of SPLITS) {
        if (await prisma.crmOption.findFirst({ where: { name: mark } })) continue
        for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
            const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id, feature: { in: [from, to] } }, select: { feature: true, capability: true } })
            const has = new Set(rows.filter((r) => r.feature === to).map((r) => r.capability))
            const add = [...new Set(rows.filter((r) => r.feature === from).flatMap((r) => map[r.capability] || []))].filter((c) => !has.has(c))
            if (add.length) await prisma.crmStaffPermission.createMany({ data: add.map((capability) => ({ staffId: s.id, feature: to, capability })) })
        }
        for (const role of await prisma.crmRole.findMany()) {
            let perms
            try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
            if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !Array.isArray(perms[from])) continue
            const add = perms[from].flatMap((c) => map[c] || [])
            if (!add.length) continue
            perms[to] = [...new Set([...(perms[to] || []), ...add])]
            await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
        }
        await prisma.crmOption.create({ data: { name: mark, value: new Date().toISOString() } })
    }
}

/**
 * The company's single bank (Bank / RIB / SWIFT in Settings → Company) becomes the first, default bank account, so the printed
 * documents do not change; more accounts can then be added and chosen per client or per document. Runs once, marker-guarded.
 */
export async function seedBankAccount() {
    const MARK5 = 'bank_accounts_seed_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK5 } })) return
    if (!(await prisma.crmBankAccount.count())) {
        const rows = await prisma.crmOption.findMany({ where: { name: { in: ['company_bank', 'company_rib', 'company_swift'] } } })
        const o = Object.fromEntries(rows.map((r) => [r.name, r.value]))
        if (o.company_bank || o.company_rib) await prisma.crmBankAccount.create({ data: { name: String(o.company_bank || 'Main account').slice(0, 80), bank: o.company_bank || null, rib: o.company_rib || null, swift: o.company_swift || null, isDefault: true, active: true } })
    }
    await prisma.crmOption.create({ data: { name: MARK5, value: new Date().toISOString() } })
}

/**
 * The Bank accounts page is merged into Payment methods: every bank account becomes a payment method with the SAME id, so the
 * accounts chosen on clients, invoices, estimates and purchase orders keep pointing at the right account without touching them.
 * The currency is guessed from the name ("BMCE EUR" -> EUR) when it names one; nothing is deleted (the old rows stay as a backup).
 * Runs once, marker-guarded; an account that already exists as a payment method (same id) is left as it is.
 */
export async function mergeBankAccounts() {
    const MARK6 = 'bank_into_payment_methods_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK6 } })) return
    const [banks, currencies, last] = await Promise.all([
        prisma.crmBankAccount.findMany({ orderBy: { createdAt: 'asc' } }), prisma.crmCurrency.findMany({ select: { id: true, name: true } }),
        prisma.crmPaymentMode.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } }),
    ])
    let order = last?.sortOrder || 0
    for (const b of banks) {
        if (await prisma.crmPaymentMode.findUnique({ where: { id: b.id } })) continue
        const words = String(b.name || '').toUpperCase().split(/[^A-Z0-9]+/)
        const cur = currencies.find((c) => words.includes(String(c.name || '').toUpperCase()))
        order += 1
        await prisma.crmPaymentMode.create({ data: { id: b.id, name: b.name, bank: b.bank, holder: b.holder, rib: b.rib, swift: b.swift, isDefault: !!b.isDefault, active: b.active !== false, currencyId: cur?.id || null, sortOrder: order, showOnPdf: false, invoicesOnly: false, expensesOnly: false, selectedByDefault: false } })
    }
    await prisma.crmOption.create({ data: { name: MARK6, value: new Date().toISOString() } })
}

/** Creates the standard roles that do not exist yet (never changes an existing role). Runs once, marker-guarded. */
export async function ensureStandardRoles() {
    const MARK2 = 'standard_roles_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK2 } })) return
    for (const [name, perms] of Object.entries(ROLES)) {
        if (await prisma.crmRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) continue
        await prisma.crmRole.create({ data: { name, permissionsRaw: JSON.stringify(cleanPermissions(perms)) } })
    }
    await prisma.crmOption.create({ data: { name: MARK2, value: new Date().toISOString() } })
}

const SUPER_EMAIL = 'ask@trtdigital.ma'

/**
 * Super Admin and Admin are separate: only ask@trtdigital.ma keeps the full-access flag. Every other administrator
 * imported from Perfex becomes an Admin (a normal role whose permissions can be edited). Runs once, marker-guarded,
 * and only when the Super Admin account exists, so nobody can be locked out.
 */
export async function splitAdmins() {
    const MARK3 = 'admins_split_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK3 } })) return
    const sup = await prisma.crmStaff.findFirst({ where: { email: { equals: SUPER_EMAIL, mode: 'insensitive' }, admin: true, active: true } })
    if (!sup) return // nothing to protect yet: try again at the next start
    const role = await prisma.crmRole.findFirst({ where: { name: { equals: 'Admin', mode: 'insensitive' } } })
    if (!role) return
    const rows = toPermissionRows(parseRolePermissions(role.permissionsRaw))
    for (const s of await prisma.crmStaff.findMany({ where: { admin: true, NOT: { id: sup.id } } })) {
        await prisma.crmStaffPermission.deleteMany({ where: { staffId: s.id } })
        if (rows.length) await prisma.crmStaffPermission.createMany({ data: rows.map((r) => ({ ...r, staffId: s.id })) })
        await prisma.crmStaff.update({ where: { id: s.id }, data: { admin: false, roleId: role.id } })
        if (s.userId) {
            const u = await prisma.user.findUnique({ where: { id: s.userId }, select: { role: true, authority: true } })
            if (u) await prisma.user.update({ where: { id: s.userId }, data: { role: u.role === 'admin' ? 'user' : u.role, authority: (u.authority || []).filter((a) => a !== 'admin' && a !== 'crm.admin') } })
        }
    }
    await prisma.crmOption.create({ data: { name: MARK3, value: new Date().toISOString() } })
}

/** The five task statuses that come with the app, created once so the list in Settings is never empty. Safe to run on every start. */
export async function seedTaskStatuses() {
    await (await import('@/lib/crm/taskStatuses')).ensureTaskStatuses()
}

/** Once: new tasks are assigned to the person who creates them by default (the switch had been saved as off without anyone choosing it). It can still be turned off in Settings → Tasks. */
export async function taskAssignCreatorDefault() {
    const MARK = 'migrated_task_assign_creator_default'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    await prisma.crmOption.updateMany({ where: { name: 'new_task_auto_assign_current_member', value: { not: '1' } }, data: { value: '1' } })
    await prisma.crmOption.create({ data: { name: MARK, value: '1', autoload: false } })
}

/**
 * The web address of leads received before it was cleaned could carry text from the form after it ("https://site.fr/ Projet…").
 * Keeps only the address. Runs once, marker-guarded.
 */
export async function cleanLeadWebsites() {
    const MARK4 = 'migration_lead_websites_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK4 } })) return
    const { cleanWebsite } = await import('@/lib/crm/leadMailCalc')
    const leads = await prisma.crmLead.findMany({ where: { NOT: { website: null } }, select: { id: true, website: true } })
    let n = 0
    for (const l of leads) {
        const c = cleanWebsite(l.website) || null
        if (c !== l.website && c) { await prisma.crmLead.update({ where: { id: l.id }, data: { website: c } }); n++ }
    }
    await prisma.crmOption.create({ data: { name: MARK4, value: `${new Date().toISOString()} · ${n} cleaned` } })
}

/** Closed days used to be their own list: they are days off now (one per day), so the Calendar and the Days off menu show the same days. Safe to run at every start. */
export async function mergeClosedDaysIntoDaysOff() {
    const rows = await prisma.crmClosedDay.findMany({ take: 500 })
    const day = (str) => new Date(`${str}T00:00:00Z`)
    for (const r of rows) {
        const have = new Set((await prisma.crmDayOff.findMany({ where: { offDate: { gte: day(r.fromDay), lte: day(r.toDay) } }, select: { offDate: true } })).map((x) => x.offDate.toISOString().slice(0, 10)))
        const data = []
        for (let t = +day(r.fromDay), n = 0; t <= +day(r.toDay) && n < 400; t += 86400000, n++) { const d = new Date(t); if (!have.has(d.toISOString().slice(0, 10))) data.push({ offDate: d, reason: r.label || null }) }
        if (data.length) await prisma.crmDayOff.createMany({ data })
        await prisma.crmClosedDay.delete({ where: { id: r.id } })
    }
}

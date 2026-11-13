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
    // Leads got a real Edit right (it used to be given to every staff member): whoever could see all leads keeps editing them
    { mark: 'perm_migration_leads_edit_v1', from: 'leads', to: 'leads', map: { view: ['edit'] } },
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
 * Mails got their own rights (Roles > Lead mails and Client mails: Create / Edit / Send / Delete). Until now everybody who worked
 * with leads and clients could write, send and delete mails, so every member who has permissions today (and every role) is given
 * all four, and nothing changes until somebody unticks one. Runs once, marker-guarded.
 */
export async function grantMailRights() {
    const MARK = 'perm_migration_mail_rights_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const CAPS = ['create', 'edit', 'send', 'delete']
    const FEATURES_ = ['lead_mails', 'client_mails']
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id }, select: { feature: true, capability: true } })
        if (!rows.length) continue
        const have = new Set(rows.map((r) => `${r.feature}:${r.capability}`))
        const add = FEATURES_.flatMap((feature) => CAPS.filter((capability) => !have.has(`${feature}:${capability}`)).map((capability) => ({ staffId: s.id, feature, capability })))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !Object.keys(perms).length) continue
        for (const f of FEATURES_) perms[f] = [...new Set([...(perms[f] || []), ...CAPS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** The tabs of a customer get their own rights: everyone who already has permissions, and every role, keeps seeing all of them. Runs once. */
export async function grantClientTabs() {
    const MARK = 'perm_migration_client_tabs_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const CAPS = ['tab_profile', 'tab_mails', 'tab_notes', 'tab_files', 'tab_activity']
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id }, select: { feature: true, capability: true } })
        if (!rows.length) continue // people without any right keep every tab through the sign-in rule
        const have = new Set(rows.map((r) => `${r.feature}:${r.capability}`))
        const add = CAPS.filter((capability) => !have.has(`client_tabs:${capability}`)).map((capability) => ({ staffId: s.id, feature: 'client_tabs', capability }))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !Object.keys(perms).length) continue
        perms.client_tabs = [...new Set([...(perms.client_tabs || []), ...CAPS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** Customers get a Meetings tab: everyone who already sees the Mails tab of a customer (staff rights and roles) sees Meetings too. Runs once. */
export async function grantClientMeetingsTab() {
    const MARK = 'perm_migration_client_meetings_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id, feature: 'client_tabs' }, select: { capability: true } })
        const have = new Set(rows.map((r) => r.capability))
        if (have.has('tab_mails') && !have.has('tab_meetings')) await prisma.crmStaffPermission.create({ data: { staffId: s.id, feature: 'client_tabs', capability: 'tab_meetings' } })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !(perms.client_tabs || []).includes('tab_mails')) continue
        perms.client_tabs = [...new Set([...perms.client_tabs, 'tab_meetings'])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** Mails and meetings that were filed under a lead although the person is already a customer (a lead that became a customer, or a duplicate lead with the same address as
 *  a customer contact) move to the customer. Only what came in by itself (mails caught from the mailbox, meetings booked by email or from Meet). Runs once. */
export async function moveAutoItemsToCustomers() {
    const MARK = 'auto_items_to_customers_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const leads = await prisma.crmLead.findMany({ where: { email: { not: null } }, select: { id: true, email: true, clientId: true } })
    const contacts = await prisma.crmContact.findMany({ where: { email: { not: null } }, select: { email: true, clientId: true } })
    const byEmail = new Map(contacts.filter((c) => c.clientId).map((c) => [String(c.email).trim().toLowerCase(), c.clientId]))
    let moved = 0
    for (const l of leads) {
        const clientId = l.clientId || byEmail.get(String(l.email).trim().toLowerCase())
        if (!clientId) continue
        const m = await prisma.crmLeadMail.updateMany({ where: { leadId: l.id, source: 'mailbox' }, data: { leadId: null, clientId } })
        const e = await prisma.crmEvent.updateMany({ where: { leadId: l.id, OR: [{ source: { not: null } }, { description: { startsWith: 'Booked by email' } }] }, data: { leadId: null, clientId } })
        moved += m.count + e.count
    }
    console.log(`[migrate] moveAutoItemsToCustomers: ${moved} item(s) moved to their customer`)
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** The tabs of the lead popup get their own rights: everyone who already has permissions, and every role, keeps seeing all of them. Runs once. */
export async function grantLeadTabs() {
    const MARK = 'perm_migration_lead_tabs_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const CAPS = ['tab_profile', 'tab_mails', 'tab_meetings', 'tab_offers', 'tab_activity']
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id }, select: { feature: true, capability: true } })
        if (!rows.length) continue // people without any right keep every tab through the sign-in rule
        const have = new Set(rows.map((r) => `${r.feature}:${r.capability}`))
        const add = CAPS.filter((capability) => !have.has(`lead_tabs:${capability}`)).map((capability) => ({ staffId: s.id, feature: 'lead_tabs', capability }))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !Object.keys(perms).length) continue
        perms.lead_tabs = [...new Set([...(perms.lead_tabs || []), ...CAPS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** The task checklist gets its own rights (view, create, edit, delete): everyone who already has permissions, and every role, keeps working as before. Runs once. */
export async function grantReportFileRights() {
    const MARK = 'perm_migration_report_files_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const CAPS = ['view', 'create', 'edit', 'delete']
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id }, select: { feature: true, capability: true } })
        if (!rows.some((r) => r.feature === 'client_reports')) continue
        const have = new Set(rows.map((r) => `${r.feature}:${r.capability}`))
        const add = CAPS.filter((capability) => !have.has(`client_report_files:${capability}`)).map((capability) => ({ staffId: s.id, feature: 'client_report_files', capability }))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !perms.client_reports) continue
        perms.client_report_files = [...new Set([...(perms.client_report_files || []), ...CAPS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
}

/** The task checklist gets its own rights (view, create, edit, delete): everyone who already has permissions, and every role, keeps working as before. Runs once. */
export async function grantChecklistRights() {
    const MARK = 'perm_migration_task_checklist_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK } })) return
    const CAPS = ['view', 'create', 'edit', 'delete']
    for (const s of await prisma.crmStaff.findMany({ where: { admin: false }, select: { id: true } })) {
        const rows = await prisma.crmStaffPermission.findMany({ where: { staffId: s.id }, select: { feature: true, capability: true } })
        if (!rows.length) continue
        const have = new Set(rows.map((r) => `${r.feature}:${r.capability}`))
        const add = CAPS.filter((capability) => !have.has(`task_checklist:${capability}`)).map((capability) => ({ staffId: s.id, feature: 'task_checklist', capability }))
        if (add.length) await prisma.crmStaffPermission.createMany({ data: add })
    }
    for (const role of await prisma.crmRole.findMany()) {
        let perms
        try { perms = JSON.parse(role.permissionsRaw || '{}') } catch { continue }
        if (!perms || typeof perms !== 'object' || Array.isArray(perms) || !Object.keys(perms).length) continue
        perms.task_checklist = [...new Set([...(perms.task_checklist || []), ...CAPS])]
        await prisma.crmRole.update({ where: { id: role.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    }
    await prisma.crmOption.create({ data: { name: MARK, value: new Date().toISOString() } })
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

/** Days off (one date each) became closed periods again: days in a row are one period. Safe to run at every start (it only moves what is left). */
export async function mergeDaysOffIntoClosedDays() {
    const rows = await prisma.crmDayOff.findMany({ where: { offDate: { not: null } }, orderBy: { offDate: 'asc' }, take: 5000 })
    if (!rows.length) return
    const str = (d) => new Date(d).toISOString().slice(0, 10)
    const have = new Set()
    for (const c of await prisma.crmClosedDay.findMany({ select: { fromDay: true, toDay: true } })) for (let t = +new Date(`${c.fromDay}T00:00:00Z`), n = 0; t <= +new Date(`${c.toDay}T00:00:00Z`) && n < 400; t += 86400000, n++) have.add(str(t))
    const periods = []
    for (const r of rows) {
        const d = str(r.offDate)
        if (have.has(d)) continue
        const last = periods[periods.length - 1]
        const lab = (r.reason || '').trim()
        if (last && last.label === (lab || null) && str(+new Date(`${last.toDay}T00:00:00Z`) + 86400000) === d && (+new Date(`${d}T00:00:00Z`) - +new Date(`${last.fromDay}T00:00:00Z`)) / 86400000 < 365) last.toDay = d
        else periods.push({ fromDay: d, toDay: d, label: lab || null })
    }
    if (periods.length) await prisma.crmClosedDay.createMany({ data: periods })
    await prisma.crmDayOff.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } })
}

/**
 * One-time: the logins kept on a customer in the old system (the "Vault" of the imported data) become entries of the Password vault, linked to that customer,
 * so they show in the customer's Passwords tab. Their passwords were encrypted with the old system's key and cannot be read here: they come over without one
 * (the note says so). Visibility: "creator only" stays private to the creator, the others are shared with the team. Safe to run again (marker).
 */
export async function moveOldVaultToPasswords() {
    const MARK_V = 'old_vault_to_passwords_v1'
    if (await prisma.crmOption.findFirst({ where: { name: MARK_V } })) return
    const old = await prisma.crmVaultEntry.findMany().catch(() => [])
    for (const o of old) {
        const title = [o.serverAddress, o.description].filter(Boolean)[0] || 'Customer login'
        const notes = [o.description && o.description !== title ? o.description : '', o.port ? `Port: ${o.port}` : '', o.password ? 'The password was kept by the old system in a form that cannot be read here: enter it again.' : ''].filter(Boolean).join('\n')
        const exists = await prisma.crmPasswordEntry.findFirst({ where: { clientId: o.clientId, title: String(title).slice(0, 160), username: o.username || null } })
        if (exists) continue
        await prisma.crmPasswordEntry.create({ data: { title: String(title).slice(0, 160), clientId: o.clientId, url: o.serverAddress && /^https?:\/\//i.test(o.serverAddress) ? o.serverAddress : null, username: o.username || null, notes: notes || null, tags: ['old system'], access: o.visibility === 1 ? 'private' : 'team', createdBy: o.creator || null, changedAt: new Date() } })
    }
    await prisma.crmOption.create({ data: { name: MARK_V, value: new Date().toISOString() } })
}

import prisma from '@/lib/prisma'

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

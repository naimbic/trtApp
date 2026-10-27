// Warm the Prisma/Mongo connection at boot so the first user request is not the one that pays for it.
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return
    const { default: prisma } = await import('@/lib/prisma')
    const t = Date.now()
    try {
        await Promise.all([prisma.user.count(), prisma.crmStaff.count(), prisma.crmOption.count()])
        console.log(`[warmup] database ready in ${Date.now() - t}ms`)
    } catch (e) {
        console.warn('[warmup] database not reachable yet:', e.message?.slice(0, 120))
    }
    try { await (async (m) => { await m.migratePermissions(); await m.migrateToolPermissions(); await m.splitPermissions(); await m.seedBankAccount(); await m.mergeBankAccounts(); await m.ensureStandardRoles(); await m.splitAdmins(); await m.seedTaskStatuses() })(await import('@/lib/crm/migrations')) } catch (e) { console.warn('[migrate] permissions:', e.message?.slice(0, 120)) }
    try { (await import('@/lib/crm/cronScheduler')).startCronScheduler() } catch (e) { console.warn('[cron-scheduler] not started:', e.message?.slice(0, 120)) }
    // Idle Mongo connections go cold (slow reconnect through Docker/Colima); a light ping keeps them warm.
    const keepAlive = setInterval(() => prisma.crmOption.count().catch(() => {}), 20000)
    keepAlive.unref?.()
}

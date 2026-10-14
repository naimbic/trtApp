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
    try { await (await import('@/lib/crm/migrations')).migratePermissions() } catch (e) { console.warn('[migrate] permissions:', e.message?.slice(0, 120)) }
    // Idle Mongo connections go cold (slow reconnect through Docker/Colima); a light ping keeps them warm.
    const keepAlive = setInterval(() => prisma.crmOption.count().catch(() => {}), 20000)
    keepAlive.unref?.()
}

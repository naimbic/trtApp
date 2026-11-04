import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

/** One pool for the whole server: enough connections for the busy hours, idle ones closed, and a wait limit instead of hanging (unless the address already sets them). */
const withPool = (url) => {
    if (!url || /[?&]maxPoolSize=/.test(url)) return url
    return `${url}${url.includes('?') ? '&' : '?'}maxPoolSize=${process.env.DB_POOL_SIZE || 30}&maxIdleTimeMS=60000&waitQueueTimeoutMS=15000`
}

/** Every bell notification is also pushed to the phones and computers the person registered (never breaks the notification itself). */
const pushNotification = (row) => {
    if (!row?.toUserId) return
    import('@/lib/crm/push').then((m) => m.pushToStaff(row.toUserId, { title: row.fromFullName || 'trtCRM', body: row.description || '', url: row.link || '/', tag: row.additionalData || '' })).catch(() => {})
}
const SLOW_MS = Number(process.env.SLOW_QUERY_MS || 800)
const withPush = (client) => client.$extends({
    query: {
        // every database call that takes longer than SLOW_QUERY_MS (default 800) is written to the log with its model and action, to find what to optimise
        async $allOperations({ model, operation, args, query }) {
            const t0 = Date.now()
            try { return await query(args) } finally {
                const ms = Date.now() - t0
                if (ms >= SLOW_MS) console.warn(`[slow-query] ${model || 'raw'}.${operation} ${ms} ms`)
            }
        },
        crmNotification: {
            async create({ args, query }) { const row = await query(args); pushNotification(row); return row },
            async createMany({ args, query }) { const res = await query(args); for (const d of Array.isArray(args.data) ? args.data : [args.data]) pushNotification(d); return res },
        },
    },
})

const prisma = globalForPrisma.prisma ?? withPush(new PrismaClient({ datasourceUrl: withPool(process.env.DATABASE_URL) }))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

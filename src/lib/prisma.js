import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

/** Every bell notification is also pushed to the phones and computers the person registered (never breaks the notification itself). */
const pushNotification = (row) => {
    if (!row?.toUserId) return
    import('@/lib/crm/push').then((m) => m.pushToStaff(row.toUserId, { title: row.fromFullName || 'trtCRM', body: row.description || '', url: row.link || '/', tag: row.additionalData || '' })).catch(() => {})
}
const withPush = (client) => client.$extends({
    query: {
        crmNotification: {
            async create({ args, query }) { const row = await query(args); pushNotification(row); return row },
            async createMany({ args, query }) { const res = await query(args); for (const d of Array.isArray(args.data) ? args.data : [args.data]) pushNotification(d); return res },
        },
    },
})

const prisma = globalForPrisma.prisma ?? withPush(new PrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

import { PrismaClient } from '@prisma/client'
import { cleanup, localEnv } from './env.mjs'

export default async function teardown() {
    localEnv()
    const p = new PrismaClient()
    try { await cleanup(p) } finally { await p.$disconnect() }
}

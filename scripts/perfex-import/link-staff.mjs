#!/usr/bin/env node
/**
 * After the import: create/link a trtApp `User` for every Perfex staff member so they can sign in.
 *   node scripts/perfex-import/link-staff.mjs [--keep-passwords]
 * - Default: users get a random unusable password -> must use "Forgot password" (safest).
 * - --keep-passwords: reuse the Perfex bcrypt hash (only works if the import ran with --keep-passwords).
 * Inactive staff are linked too but can never sign in (see src/lib/crm/authority.js).
 */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const keep = process.argv.includes('--keep-passwords')
const prisma = new PrismaClient()
let created = 0, linked = 0, skipped = 0

// filter in JS: Prisma's `userId: null` does not match MongoDB documents where the field was never stored
for (const s of (await prisma.crmStaff.findMany({ where: { isNotStaff: false } })).filter((x) => !x.userId)) {
    if (!s.email) { skipped++; continue }
    const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email
    let user = await prisma.user.findUnique({ where: { email: s.email } })
    if (!user) {
        const usable = keep && s.passwordHash?.startsWith('$2')
        const password = usable ? s.passwordHash : await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
        user = await prisma.user.create({
            data: {
                name, email: s.email, password,
                firstName: s.firstName, lastName: s.lastName, phone: s.phoneNumber,
                image: null, role: 'user', authority: ['user'], status: s.active ? 'active' : 'blocked',
            },
        })
        created++
    } else linked++
    await prisma.crmStaff.update({ where: { id: s.id }, data: { userId: user.id } })
}
console.log(`staff linked: ${created} users created, ${linked} existing users linked, ${skipped} skipped (no email)`)
await prisma.$disconnect()

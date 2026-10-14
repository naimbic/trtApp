#!/usr/bin/env node
/**
 * Create the first admin login, or reset its password, in the database DATABASE_URL points to.
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' node scripts/admin-user.mjs
 * It also prints what the database holds (users / staff) so a restore can be checked. Passwords are never printed.
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''

const [users, staff, clients] = await Promise.all([prisma.user.count(), prisma.crmStaff.count(), prisma.crmClient.count()])
console.log(`database holds: ${users} users, ${staff} staff, ${clients} clients`)

if (!email || password.length < 8) {
    console.log('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) to create or reset the admin login.')
    await prisma.$disconnect()
    process.exit(0)
}

const hash = await bcrypt.hash(password, 10)
let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
if (user) {
    user = await prisma.user.update({ where: { id: user.id }, data: { password: hash, status: 'active', authority: [...new Set([...(user.authority || []), 'admin', 'user'])] } })
    console.log(`admin login reset for ${user.email}`)
} else {
    user = await prisma.user.create({ data: { name: process.env.ADMIN_NAME || 'Admin', email, password: hash, role: 'admin', authority: ['admin', 'user'], status: 'active' } })
    console.log(`admin login created for ${user.email}`)
}

const row = (await prisma.crmStaff.findMany({ where: { email: { equals: email, mode: 'insensitive' } } }))[0]
if (row) {
    await prisma.crmStaff.update({ where: { id: row.id }, data: { userId: user.id, active: true } })
    console.log('linked to the staff member with this email')
} else console.log('no staff member with this email (the login works, but chat and "my" filters need a staff profile)')
await prisma.$disconnect()

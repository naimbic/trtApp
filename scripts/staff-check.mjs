#!/usr/bin/env node
/**
 * Why can a team member not sign in?   node scripts/staff-check.mjs name@email [--unlock] [--password 'new password']
 * Shows the login account, the staff profile, the role and permission count, and any "too many attempts" lock.
 * --unlock clears the lock, --password sets a new password (8+ characters). Passwords are never printed.
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
const pwIdx = args.indexOf('--password')
const email = (args.find((a, i) => !a.startsWith('--') && (pwIdx < 0 || i !== pwIdx + 1)) || '').trim().toLowerCase()
if (!email) { console.log('Usage: node scripts/staff-check.mjs name@email [--unlock] [--password "new password"]'); process.exit(0) }
const prisma = new PrismaClient()
const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
const staff = await prisma.crmStaff.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, include: { role: true, permissions: true } })
console.log(user ? `login account: found, status ${user.status}, ${user.password ? 'has a password' : 'NO password'}, authority [${(user.authority || []).join(', ')}]` : 'login account: NOT FOUND (the person cannot sign in)')
console.log(staff ? `staff profile: active ${staff.active}, super admin ${staff.admin}, role ${staff.role?.name || 'none'}, ${staff.permissions.length} permissions, linked to login ${staff.userId && user && staff.userId === user.id ? 'yes' : 'NO'}` : 'staff profile: NOT FOUND')
if (staff && !staff.active) console.log('BLOCKED: the staff member is inactive (Team -> Members -> Active)')
if (staff && user && staff.userId !== user.id) console.log('PROBLEM: the staff profile is not linked to this login account')
if (staff && !staff.admin && !staff.permissions.length) console.log('NOTE: no permissions at all; give the person a role (Team -> Members -> Role) or edit their permissions')
const lock = await prisma.loginAttempt.findUnique({ where: { key: email } })
console.log(lock?.lockedUntil && lock.lockedUntil > new Date() ? `LOCKED until ${lock.lockedUntil.toISOString()} (${lock.count} failed attempts)` : `no lock (${lock?.count || 0} recent failed attempts)`)
if (args.includes('--unlock')) { await prisma.loginAttempt.deleteMany({ where: { key: email } }); console.log('lock cleared') }
const pw = pwIdx >= 0 ? args[pwIdx + 1] : null
if (pw) {
    if (!user) console.log('cannot set a password: no login account')
    else if (pw.length < 8) console.log('password not changed: 8+ characters needed')
    else { await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(pw, 10) } }); console.log('password set') }
}
await prisma.$disconnect()

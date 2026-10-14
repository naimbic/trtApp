#!/usr/bin/env node
/**
 * Why can a client not sign in to /portal?   node scripts/portal-check.mjs client@example.com [--unlock] [--password 'new-password']
 * Lists the contacts with that email and what blocks the sign-in. --unlock clears a "too many attempts" lock.
 * --password sets a new client-area password for every active contact with that email (8+ characters).
 * Passwords are never printed.
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
const email = (args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--password') || '').trim().toLowerCase()
const pwIdx = args.indexOf('--password')
const newPw = pwIdx >= 0 ? args[pwIdx + 1] : null
if (!email) { console.log('Usage: node scripts/portal-check.mjs client@example.com [--unlock] [--password "new password"]'); process.exit(0) }

const prisma = new PrismaClient()
const contacts = await prisma.crmContact.findMany({ where: { email: { equals: email, mode: 'insensitive' } } })
console.log(`${contacts.length} contact(s) with email ${email}`)
for (const c of contacts) {
    const client = await prisma.crmClient.findUnique({ where: { id: c.clientId }, select: { company: true, active: true } })
    const problems = []
    if (!c.active) problems.push('contact is INACTIVE')
    if (!client) problems.push('client not found')
    else if (!client.active) problems.push('client is INACTIVE')
    if (!c.passwordHash) problems.push('no password set yet')
    console.log(`- ${c.firstName || ''} ${c.lastName || ''} | client: ${client?.company || '?'} | contact active: ${c.active} | client active: ${client?.active} | has password: ${!!c.passwordHash} | password changed: ${c.lastPasswordChange ? c.lastPasswordChange.toISOString() : 'never'} | last login: ${c.lastLogin ? c.lastLogin.toISOString() : 'never'}`)
    console.log(`  ${problems.length ? 'BLOCKED: ' + problems.join(', ') : 'nothing blocks the sign-in for this contact'}`)
}
const lock = await prisma.loginAttempt.findUnique({ where: { key: `portal:${email}` } })
console.log(lock?.lockedUntil && lock.lockedUntil > new Date() ? `LOCKED until ${lock.lockedUntil.toISOString()} (${lock.count} failed attempts)` : `no lock (${lock?.count || 0} recent failed attempts)`)
if (args.includes('--unlock')) { await prisma.loginAttempt.deleteMany({ where: { key: `portal:${email}` } }); console.log('lock cleared') }
if (newPw) {
    if (newPw.length < 8) console.log('password not changed: use 8+ characters')
    else {
        const hash = await bcrypt.hash(newPw, 10)
        const r = await prisma.crmContact.updateMany({ where: { email: { equals: email, mode: 'insensitive' }, active: true }, data: { passwordHash: hash, lastPasswordChange: new Date(), newPassKey: null } })
        console.log(`password set on ${r.count} active contact(s)`)
    }
}
await prisma.$disconnect()

#!/usr/bin/env node
/**
 * Why can a client contact not sign in to the client area (/portal)?
 *   node scripts/portal-check.mjs                       overview: every client and contact problem found
 *   node scripts/portal-check.mjs name@email            the exact reason this email cannot sign in
 *   node scripts/portal-check.mjs name@email --unlock   also clears a "too many attempts" lock
 *   node scripts/portal-check.mjs name@email --password 'new password'   also sets a new client-area password (8+ characters)
 * Reads the same rules as the real sign-in (src/lib/portal/auth.js). Passwords are never printed. Nothing is changed without a flag.
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
const pwIdx = args.indexOf('--password')
const email = (args.find((a, i) => !a.startsWith('--') && (pwIdx < 0 || i !== pwIdx + 1)) || '').trim().toLowerCase()
const prisma = new PrismaClient()
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '')
const name = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)'

const clients = await prisma.crmClient.findMany({ select: { id: true, company: true, active: true } })
const byId = Object.fromEntries(clients.map((c) => [c.id, c]))
const contacts = await prisma.crmContact.findMany({ select: { id: true, clientId: true, firstName: true, lastName: true, email: true, active: true, isPrimary: true, passwordHash: true, lastLogin: true, lastPasswordChange: true } })

/** Why this contact could not sign in right now (the same checks as the sign-in), or [] when it can. */
const reasons = (c) => {
    const r = []
    const cl = byId[c.clientId]
    if (!cl) r.push('the contact belongs to a client that does not exist (orphan)')
    else if (cl.active !== true) r.push(`the CLIENT "${cl.company}" is not active (Clients -> the client -> Active): the client area refuses everyone of an inactive client`)
    if (c.active !== true) r.push('the CONTACT is not active')
    if (!emailOk(c.email)) r.push('the contact has no valid email address')
    if (!c.passwordHash) r.push('the contact has no client-area password yet (use "Set password" or "Send the link" on the client page)')
    return r
}

if (!email) {
    let bad = 0
    const seen = {}
    for (const c of contacts) if (emailOk(c.email)) (seen[c.email.trim().toLowerCase()] ||= []).push(c)
    console.log(`${clients.length} clients, ${contacts.length} contacts, ${contacts.filter((c) => c.passwordHash).length} with a client-area password\n`)
    for (const c of contacts) {
        const r = reasons(c).filter((x) => !/no client-area password/.test(x))
        if (r.length) { bad++; console.log(`- ${name(c)} <${c.email || 'no email'}> @ ${byId[c.clientId]?.company || '?'}: ${r.join('; ')}`) }
    }
    for (const [e, list] of Object.entries(seen)) if (list.length > 1) console.log(`- the email ${e} is used by ${list.length} contacts (${list.map((c) => byId[c.clientId]?.company || '?').join(', ')}): sign-in works with any whose password matches, but a reset link opens only the first one`)
    for (const cl of clients) if (!contacts.some((c) => c.clientId === cl.id)) console.log(`- the client "${cl.company}" has no contact at all, so nobody can sign in for it`)
    console.log(bad ? `\n${bad} contact(s) cannot sign in.` : '\nNo contact is blocked by its own data (a contact without a password simply has not been invited yet).')
    await prisma.$disconnect()
    process.exit(0)
}

const mine = contacts.filter((c) => (c.email || '').trim().toLowerCase() === email)
if (!mine.length) console.log(`NOT FOUND: no contact has the email ${email}. Check the spelling, or the email on the contact (Clients -> the client -> Contacts).`)
for (const c of mine) {
    const cl = byId[c.clientId]
    console.log(`contact: ${name(c)} @ ${cl?.company || '?'} | active ${c.active} | client active ${cl?.active} | primary ${c.isPrimary} | ${c.passwordHash ? 'has a password' : 'NO password'} | last password change ${c.lastPasswordChange ? c.lastPasswordChange.toISOString() : 'never'} | last login ${c.lastLogin ? c.lastLogin.toISOString() : 'never'}`)
    const r = reasons(c)
    console.log(r.length ? `BLOCKED: ${r.join('; ')}` : 'data is fine: this contact can sign in with its password')
}
if (mine.length > 1) console.log(`NOTE: ${mine.length} contacts share this email; sign-in works with whichever password matches.`)
const lock = await prisma.loginAttempt.findUnique({ where: { key: `portal:${email}` } })
console.log(lock?.lockedUntil && lock.lockedUntil > new Date() ? `LOCKED until ${lock.lockedUntil.toISOString()} (${lock.count} failed attempts): wait, or run again with --unlock` : `no lock (${lock?.count || 0} recent failed attempts)`)
if (args.includes('--unlock')) { await prisma.loginAttempt.deleteMany({ where: { key: `portal:${email}` } }); console.log('lock cleared') }
const pw = pwIdx >= 0 ? args[pwIdx + 1] : null
if (pw) {
    if (pw.length < 8) console.log('password not changed: 8+ characters needed')
    else if (!mine.length) console.log('password not changed: no such contact')
    else {
        for (const c of mine) await prisma.crmContact.update({ where: { id: c.id }, data: { passwordHash: await bcrypt.hash(pw, 10), lastPasswordChange: new Date(), newPassKey: null, newPassKeyRequested: null } })
        console.log(`password set on ${mine.length} contact(s)`)
    }
}
await prisma.$disconnect()

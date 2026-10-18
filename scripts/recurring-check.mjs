#!/usr/bin/env node
/**
 * Recurring invoices already in the database (for example imported from Perfex):   node scripts/recurring-check.mjs [--link]
 * Read-only by default. Lists every recurring invoice (repeat rule, last/next date, copies linked to it) and flags:
 *   - copies whose link points to an invoice that no longer exists,
 *   - invoices with no link that look like copies (same client, same total, created after a recurring invoice of that client).
 * --link attaches the second kind to the recurring invoice they match, so they show "Recurring invoice of …" and count as its copies.
 * Nothing is ever deleted or changed except that link.
 */
import { PrismaClient } from '@prisma/client'

const link = process.argv.includes('--link')
const prisma = new PrismaClient()
const label = (i) => `${i.prefix || ''}${i.number}`
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—')
const UNIT = { day: 'day', week: 'week', month: 'month', year: 'year' }
const next = (p) => { const d = new Date(p.lastRecurringDate || p.date || p.createdAt); const n = p.recurring; const u = p.customRecurring ? UNIT[p.recurringType] || 'month' : 'month'; if (u === 'day') d.setDate(d.getDate() + n); else if (u === 'week') d.setDate(d.getDate() + 7 * n); else if (u === 'month') d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n); return d }

const all = await prisma.crmInvoice.findMany({ select: { id: true, number: true, prefix: true, clientId: true, total: true, date: true, createdAt: true, status: true, recurring: true, recurringType: true, customRecurring: true, cycles: true, totalCycles: true, lastRecurringDate: true, isRecurringFrom: true } })
const byId = Object.fromEntries(all.map((i) => [i.id, i]))
const parents = all.filter((i) => i.recurring > 0 && !i.isRecurringFrom)
console.log(`${all.length} invoices, ${parents.length} recurring.\n`)
for (const p of parents) {
    const kids = all.filter((i) => i.isRecurringFrom === p.id)
    const unit = p.customRecurring ? p.recurringType || 'month' : 'month'
    console.log(`${label(p)}  every ${p.recurring} ${unit}(s)  cycles ${p.totalCycles}/${p.cycles || '∞'}  last ${day(p.lastRecurringDate)}  next ${day(next(p))}  copies linked: ${kids.length}${[5, 6].includes(p.status) ? '  (cancelled/draft: the job skips it)' : ''}`)
}
const dead = all.filter((i) => i.isRecurringFrom && !byId[i.isRecurringFrom])
if (dead.length) console.log(`\nCopies pointing to a missing invoice: ${dead.map(label).join(', ')}`)

const guesses = []
for (const i of all) {
    if (i.isRecurringFrom || i.recurring > 0) continue
    const p = parents.filter((x) => x.clientId === i.clientId && x.total === i.total && new Date(i.createdAt) > new Date(x.createdAt)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    if (p) guesses.push({ i, p })
}
console.log(`\nUnlinked invoices that look like copies (same client and total as a recurring invoice): ${guesses.length}`)
for (const { i, p } of guesses) console.log(`  ${label(i)} (${day(i.date)}) -> ${label(p)}`)
if (link && guesses.length) {
    for (const { i, p } of guesses) await prisma.crmInvoice.update({ where: { id: i.id }, data: { isRecurringFrom: p.id } })
    console.log(`\nLinked ${guesses.length}.`)
} else if (guesses.length) console.log('\nRun again with --link to attach them.')
await prisma.$disconnect()

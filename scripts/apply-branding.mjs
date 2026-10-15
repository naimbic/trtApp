#!/usr/bin/env node
/**
 * Sets the logo, favicon and document-logo settings (public Space URLs from scripts/branding-options.json) when they are empty.
 *   node scripts/apply-branding.mjs          fills only the missing ones
 *   node scripts/apply-branding.mjs --force  overwrites them
 */
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const force = process.argv.includes('--force')
const prisma = new PrismaClient()
const wanted = JSON.parse(fs.readFileSync(new URL('./branding-options.json', import.meta.url), 'utf8'))
let set = 0
for (const [name, value] of Object.entries(wanted)) {
    const row = await prisma.crmOption.findFirst({ where: { name } })
    if (row && /^https?:\/\//.test(row.value || '') && !force) continue
    if (row) await prisma.crmOption.update({ where: { id: row.id }, data: { value } })
    else await prisma.crmOption.create({ data: { name, value } })
    set++
    console.log(`set ${name}`)
}
console.log(set ? `${set} setting(s) updated` : 'branding settings already in place')
await prisma.$disconnect()

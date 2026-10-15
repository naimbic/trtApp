#!/usr/bin/env node
/**
 * Creates (or updates) the standard roles and the Super Admin login.
 *   node scripts/setup-roles.mjs                         roles + super admin user without a usable password
 *   SUPER_ADMIN_PASSWORD='long password' node scripts/setup-roles.mjs     also sets the password
 * Existing roles with other names (Employee, Stagier...) and their members are not touched. Safe to run again.
 * Passwords are never printed. To set or reset a password later: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/admin-user.mjs
 */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { ROLES } from '../src/lib/crm/standardRoles.js'
import { cleanPermissions } from '../src/lib/crm/permissionCatalog.js'

const EMAIL = 'ask@trtdigital.ma'
const prisma = new PrismaClient()

const roleIds = {}
for (const [name, perms] of Object.entries(ROLES)) {
    const permissionsRaw = JSON.stringify(cleanPermissions(perms))
    const found = await prisma.crmRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    const row = found ? await prisma.crmRole.update({ where: { id: found.id }, data: { permissionsRaw } }) : await prisma.crmRole.create({ data: { name, permissionsRaw } })
    roleIds[name] = row.id
    console.log(`${found ? 'updated' : 'created'} role ${name} (${Object.values(JSON.parse(permissionsRaw)).reduce((n, c) => n + c.length, 0)} permissions)`)
}

// Super Admin login + staff profile
const pw = process.env.SUPER_ADMIN_PASSWORD
if (pw && pw.length < 8) { console.log('SUPER_ADMIN_PASSWORD needs 8+ characters'); process.exit(1) }
const hash = await bcrypt.hash(pw || crypto.randomBytes(24).toString('hex'), 10)
let user = await prisma.user.findFirst({ where: { email: { equals: EMAIL, mode: 'insensitive' } } })
const authority = [...new Set([...(user?.authority || []), 'admin', 'user'])]
user = user
    ? await prisma.user.update({ where: { id: user.id }, data: { status: 'active', authority, role: 'admin', ...(pw ? { password: hash } : {}) } })
    : await prisma.user.create({ data: { name: 'Super Admin', email: EMAIL, password: hash, firstName: 'Super', lastName: 'Admin', role: 'admin', authority, status: 'active' } })
const staffData = { admin: true, active: true, isNotStaff: false, roleId: roleIds['Super Admin'], userId: user.id }
const staff = await prisma.crmStaff.findFirst({ where: { email: { equals: EMAIL, mode: 'insensitive' } } })
if (staff) await prisma.crmStaff.update({ where: { id: staff.id }, data: staffData })
else await prisma.crmStaff.create({ data: { ...staffData, email: EMAIL, firstName: 'Super', lastName: 'Admin' } })
console.log(`${EMAIL}: Super Admin ${staff ? 'updated' : 'created'}${pw ? ', password set' : ', no password set yet (use admin-user.mjs or SUPER_ADMIN_PASSWORD)'}`)
await prisma.$disconnect()

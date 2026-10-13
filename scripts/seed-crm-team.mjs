// Demo departments + roles and a staff profile for the seeded admin login. Safe to re-run.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const departments = ['Sales', 'Support', 'Development', 'Finance']
for (const name of departments) if (!(await prisma.crmDepartment.findFirst({ where: { name } }))) await prisma.crmDepartment.create({ data: { name } })

const VIEW = ['view'], CRUD = ['view', 'create', 'edit', 'delete'], RW = ['view', 'create', 'edit']
const roles = {
    'Sales manager': { customers: CRUD, leads: CRUD, estimates: CRUD, proposals: CRUD, invoices: RW, payments: ['view'], items: VIEW, projects: VIEW, tasks: RW },
    'Project manager': { customers: VIEW, projects: CRUD, tasks: CRUD, checklist_templates: CRUD, tickets: RW, timesheets: RW },
    'Support agent': { customers: VIEW, tickets: CRUD, knowledge_base: RW, tasks: RW },
    Accountant: { customers: VIEW, invoices: CRUD, payments: CRUD, expenses: CRUD, credit_notes: CRUD, estimates: VIEW, items: RW },
}
for (const [name, perms] of Object.entries(roles)) {
    const existing = await prisma.crmRole.findFirst({ where: { name } })
    if (existing) await prisma.crmRole.update({ where: { id: existing.id }, data: { permissionsRaw: JSON.stringify(perms) } })
    else await prisma.crmRole.create({ data: { name, permissionsRaw: JSON.stringify(perms) } })
}

const admin = await prisma.user.findFirst({ where: { authority: { has: 'admin' } }, orderBy: { createdAt: 'asc' } })
if (admin && !(await prisma.crmStaff.findFirst({ where: { userId: admin.id } }))) {
    await prisma.crmStaff.create({ data: { userId: admin.id, email: admin.email, firstName: admin.name || 'Admin', admin: true, active: true } })
    console.log('Staff profile created for', admin.email)
}
console.log('Team demo data ready.')
await prisma.$disconnect()

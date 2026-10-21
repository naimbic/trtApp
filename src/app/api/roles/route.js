import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

/** Roles and users are managed by administrators only */
async function requireAdmin() {
    const session = await auth()
    const a = session?.user?.authority || []
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!a.includes('admin') && !a.includes('crm.admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return null
}

const DEFAULT_ROLES = [
    {
        roleId: 'admin',
        name: 'Admin',
        description: 'Full access to all functionalities and settings. Can manage users, roles, and configurations.',
        accessRight: { users: ['write', 'read', 'delete'], customers: ['write', 'read', 'delete'], products: ['write', 'read', 'delete'], invoices: ['write', 'read', 'delete'], chat: ['write', 'read', 'delete'], mail: ['write', 'read', 'delete'], configurations: ['write', 'read', 'delete'], files: ['write', 'read', 'delete'], reports: ['write', 'read', 'delete'] },
        order: 0,
    },
    {
        roleId: 'supervisor',
        name: 'Supervisor',
        description: 'Oversees operations and users. Can view reports and has limited configuration access.',
        accessRight: { users: ['write', 'read'], customers: ['write', 'read'], products: ['write', 'read'], invoices: ['write', 'read'], chat: ['write', 'read', 'delete'], mail: ['write', 'read', 'delete'], configurations: ['write', 'read'], files: ['write', 'read'], reports: ['read'] },
        order: 1,
    },
    {
        roleId: 'support',
        name: 'Support',
        description: 'Provides technical assistance. Can access user accounts and system reports for diagnostics.',
        accessRight: { users: ['read'], customers: ['read'], products: ['write', 'read'], invoices: ['read'], chat: ['write', 'read', 'delete'], mail: ['write', 'read', 'delete'], configurations: ['read'], files: ['write', 'read'], reports: ['read'] },
        order: 2,
    },
    {
        roleId: 'user',
        name: 'User',
        description: 'Access to basic features necessary for tasks. Limited administrative privileges.',
        accessRight: { users: [], customers: ['read'], products: ['read'], invoices: [], chat: ['write', 'read'], mail: ['write', 'read'], configurations: [], files: ['write', 'read'], reports: [] },
        order: 3,
    },
    {
        roleId: 'auditor',
        name: 'Auditor',
        description: 'Reviews system activities. Can access reports, but cannot make changes.',
        accessRight: { users: ['read'], customers: ['read'], products: ['read'], invoices: ['read'], chat: ['read'], mail: ['read'], configurations: [], files: ['read'], reports: ['read'] },
        order: 4,
    },
    {
        roleId: 'guest',
        name: 'Guest',
        description: 'Temporary access to limited features. Ideal for visitors or temporary users.',
        accessRight: { users: [], customers: [], products: ['read'], invoices: [], chat: [], mail: [], configurations: [], files: [], reports: [] },
        order: 5,
    },
]

export async function GET() {
    const denied = await requireAdmin()
    if (denied) return denied
    try {
        let roles = await prisma.role.findMany({ orderBy: { order: 'asc' } })

        if (roles.length === 0) {
            await prisma.role.createMany({ data: DEFAULT_ROLES })
            roles = await prisma.role.findMany({ orderBy: { order: 'asc' } })
        }

        // Attach users to each role
        const users = await prisma.user.findMany({
            select: { id: true, name: true, image: true, role: true },
        })

        const result = roles.map((r) => ({
            id: r.roleId,
            name: r.name,
            description: r.description,
            accessRight: r.accessRight,
            users: users
                .filter((u) => u.role === r.roleId)
                .map((u) => ({ id: u.id, name: u.name, img: u.image })),
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error('GET /api/roles error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request) {
    try {
        const denied = await requireAdmin()
        if (denied) return denied

        const body = await request.json()
        const { action } = body

        if (action === 'create') {
            const role = await prisma.role.create({
                data: {
                    roleId: body.roleId,
                    name: body.name,
                    description: body.description || '',
                    accessRight: body.accessRight || {},
                    order: body.order || 99,
                },
            })
            return NextResponse.json({ success: true, data: { id: role.roleId } })
        }

        if (action === 'update') {
            await prisma.role.update({
                where: { roleId: body.roleId },
                data: {
                    name: body.name,
                    description: body.description,
                    accessRight: body.accessRight,
                },
            })
            return NextResponse.json({ success: true })
        }

        if (action === 'delete') {
            await prisma.role.delete({ where: { roleId: body.roleId } })
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('PUT /api/roles error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

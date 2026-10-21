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

export async function GET(request) {
    const denied = await requireAdmin()
    if (denied) return denied
    try {
        const { searchParams } = new URL(request.url)
        const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '10')
        const query = searchParams.get('query') || ''
        const role = searchParams.get('role') || ''
        const status = searchParams.get('status') || ''
        const sortKey = searchParams.get('sortKey') || ''
        const order = searchParams.get('order') || 'asc'

        const where = {}
        if (role) where.role = role
        if (status) where.status = status
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
            ]
        }

        const total = await prisma.user.count({ where })

        const orderBy = sortKey
            ? { [sortKey === 'lastOnline' ? 'lastOnline' : sortKey]: order === 'desc' ? 'desc' : 'asc' }
            : { createdAt: 'desc' }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                status: true,
                lastOnline: true,
                phone: true,
                title: true,
            },
            orderBy,
            skip: (pageIndex - 1) * pageSize,
            take: pageSize,
        })

        const list = users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            img: u.image,
            role: u.role || 'user',
            status: u.status || 'active',
            lastOnline: u.lastOnline || Math.floor(Date.now() / 1000),
            phone: u.phone || '',
            title: u.title || '',
        }))

        return NextResponse.json({ list, total })
    } catch (error) {
        console.error('GET /api/roles/users error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request) {
    try {
        const denied = await requireAdmin()
        if (denied) return denied

        const body = await request.json()
        const { action } = body

        if (action === 'updateRole') {
            await prisma.user.update({
                where: { id: body.userId },
                data: { role: body.role },
            })
            return NextResponse.json({ success: true })
        }

        if (action === 'updateStatus') {
            await prisma.user.update({
                where: { id: body.userId },
                data: { status: body.status },
            })
            return NextResponse.json({ success: true })
        }

        if (action === 'deleteUsers') {
            await prisma.user.deleteMany({
                where: { id: { in: body.userIds } },
            })
            return NextResponse.json({ success: true })
        }

        if (action === 'addUser') {
            const hashedPassword = body.password
                ? (await import('bcryptjs')).default.hash(body.password, 10)
                : null
            const user = await prisma.user.create({
                data: {
                    name: body.name,
                    email: body.email,
                    password: await hashedPassword,
                    role: body.role || 'user',
                    status: body.status || 'active',
                    authority: [body.role || 'user'],
                    lastOnline: Math.floor(Date.now() / 1000),
                    phone: body.phone || null,
                    title: body.title || null,
                },
            })
            return NextResponse.json({
                success: true,
                data: { id: user.id },
            })
        }

        if (action === 'editUser') {
            const updateData = {}
            if (body.name) updateData.name = body.name
            if (body.email) updateData.email = body.email
            if (body.phone !== undefined) updateData.phone = body.phone || null
            if (body.title !== undefined) updateData.title = body.title || null
            if (body.role) {
                updateData.role = body.role
                updateData.authority = [body.role]
            }
            if (body.status) updateData.status = body.status
            if (body.password) {
                const bcrypt = await import('bcryptjs')
                updateData.password = await bcrypt.default.hash(body.password, 10)
            }
            await prisma.user.update({
                where: { id: body.userId },
                data: updateData,
            })
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('PUT /api/roles/users error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

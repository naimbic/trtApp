import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request, { params }) {
    const denied = await needSession()
    if (denied) return denied
    try {
        const { id } = await params
        const customer = await prisma.customer.findUnique({ where: { id } })
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }
        return NextResponse.json(customer)
    } catch (error) {
        console.error('GET /api/customers/[id] error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        const data = {
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phoneNumber || null,
            dialCode: body.dialCode || null,
            image: body.img || null,
            country: body.country || null,
            address: body.address || null,
            city: body.city || null,
            postcode: body.postcode || null,
            location: body.location || null,
            birthday: body.birthday ? new Date(body.birthday) : null,
            gender: body.gender || null,
            facebook: body.facebook || null,
            twitter: body.twitter || null,
            linkedIn: body.linkedIn || null,
            pinterest: body.pinterest || null,
            deliveryAddress: body.deliveryAddress || null,
            deliveryCity: body.deliveryCity || null,
            deliveryCountry: body.deliveryCountry || null,
            deliveryPostcode: body.deliveryPostcode || null,
        }
        if (body.password) {
            const bcrypt = await import('bcryptjs')
            data.password = await bcrypt.default.hash(body.password, 10)
        }

        await prisma.customer.update({ where: { id }, data })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('PUT /api/customers/[id] error:', error)
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Delete related records first
        await prisma.paymentMethod.deleteMany({ where: { customerId: id } })
        await prisma.subscription.deleteMany({ where: { customerId: id } })
        await prisma.orderItem.deleteMany({ where: { order: { customerId: id } } })
        await prisma.orderTimeline.deleteMany({ where: { order: { customerId: id } } })
        await prisma.order.deleteMany({ where: { customerId: id } })
        await prisma.customer.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('DELETE /api/customers/[id] error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

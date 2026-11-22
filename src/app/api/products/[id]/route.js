import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request, { params }) {
    const denied = await needSession()
    if (denied) return denied
    try {
        const { id } = await params
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
        return NextResponse.json(product)
    } catch (error) {
        console.error('GET /api/products/[id] error:', error)
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

        // imgList comes as [{id, name, img}] from the form — flatten to URL strings
        const images = Array.isArray(body.imgList)
            ? body.imgList.map((item) => (typeof item === 'string' ? item : item.img)).filter(Boolean)
            : []

        await prisma.product.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description || null,
                sku: body.productCode,
                price: parseFloat(body.price) || 0,
                taxRate: parseFloat(body.taxRate) || 0,
                category: body.category || null,
                brand: body.brand || null,
                images,
                tags: Array.isArray(body.tags)
                    ? body.tags.map((t) => (typeof t === 'string' ? t : t.value))
                    : [],
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('PUT /api/products/[id] error:', error)
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
        await prisma.orderItem.deleteMany({ where: { productId: id } })
        await prisma.product.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('DELETE /api/products/[id] error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

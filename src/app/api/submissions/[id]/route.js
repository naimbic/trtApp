import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

const EDITABLE_FIELDS = ['name', 'email', 'phone', 'company', 'website', 'needs', 'budget', 'deadline', 'message', 'form']

function requireAuth(session) {
    if (!session?.user) {
        return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }
    return null
}

// PATCH /api/submissions/:id — mark as read (admin auth required)
export async function PATCH(request, { params }) {
    try {
        const session = await auth()
        const authError = requireAuth(session)
        if (authError) return authError

        const { id } = await params
        const body = await request.json()

        const submission = await prisma.submission.update({
            where: { id },
            data: { read: body.read === true },
        })

        return NextResponse.json({ data: submission, error: null })
    } catch (error) {
        console.error('PATCH /api/submissions/[id] error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/submissions/:id — edit submission fields (admin auth required)
export async function PUT(request, { params }) {
    try {
        const session = await auth()
        const authError = requireAuth(session)
        if (authError) return authError

        const { id } = await params
        const body = await request.json()

        const data = {}
        for (const field of EDITABLE_FIELDS) {
            if (body[field] !== undefined) {
                data[field] = body[field] || null
            }
        }

        const submission = await prisma.submission.update({
            where: { id },
            data,
        })

        return NextResponse.json({ data: submission, error: null })
    } catch (error) {
        console.error('PUT /api/submissions/[id] error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/submissions/:id — delete submission (admin auth required)
export async function DELETE(request, { params }) {
    try {
        const session = await auth()
        const authError = requireAuth(session)
        if (authError) return authError

        const { id } = await params

        await prisma.submission.delete({ where: { id } })

        return NextResponse.json({ data: { success: true }, error: null })
    } catch (error) {
        console.error('DELETE /api/submissions/[id] error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}

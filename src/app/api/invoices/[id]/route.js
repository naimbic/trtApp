import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notify'

export async function GET(request, { params }) {
    const denied = await needSession()
    if (denied) return denied
    try {
        const { id } = await params
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true },
        })
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        let customer = null
        if (invoice.customerId) {
            customer = await prisma.customer.findUnique({
                where: { id: invoice.customerId },
                select: { id: true, firstName: true, lastName: true, email: true, phone: true, address: true, city: true, country: true, postcode: true },
            })
        }

        return NextResponse.json({ ...invoice, customer })
    } catch (error) {
        console.error('GET /api/invoices/[id] error:', error)
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

        const items = Array.isArray(body.items) ? body.items : []
        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1), 0)
        const taxRate = parseFloat(body.taxRate) || 20
        const taxAmount = subtotal * (taxRate / 100)
        const total = subtotal + taxAmount

        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })

        // Get current invoice to check status change
        const current = await prisma.invoice.findUnique({ where: { id }, select: { status: true, recurring: true, recurringPeriod: true, recurringCycles: true, customerId: true, type: true, currency: true, notes: true, taxRate: true, dueDate: true } })

        const invoice = await prisma.invoice.update({
            where: { id },
            data: {
                customerId: body.customerId || null,
                status: body.status || 'draft',
                type: body.type || 'invoice',
                subtotal,
                taxRate,
                taxAmount,
                total,
                currency: body.currency || 'MAD',
                notes: body.notes || null,
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                paidDate: body.paidDate ? new Date(body.paidDate) : null,
                paymentMethod: body.paymentMethod || null,
                paymentAmount: body.paymentAmount != null ? parseFloat(body.paymentAmount) : null,
                paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
                recurring: body.recurring || false,
                recurringPeriod: body.recurringPeriod || null,
                recurringCycles: body.recurringCycles != null ? parseInt(body.recurringCycles) : null,
                items: {
                    create: items.map(item => ({
                        description: item.description || '',
                        quantity: parseInt(item.quantity) || 1,
                        unit: item.unit || 'Unité',
                        unitPrice: parseFloat(item.unitPrice) || 0,
                        total: (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1),
                    })),
                },
            },
            include: { items: true },
        })

        // Notify on invoice status change (sent or paid)
        const newStatus = body.status || 'draft'
        if (current && current.status !== newStatus && (newStatus === 'sent' || newStatus === 'paid')) {
            // Notify all admin users
            const admins = await prisma.user.findMany({
                where: { role: 'admin' },
                select: { id: true },
            })
            const statusLabel = newStatus === 'sent' ? 'sent' : 'marked as paid'
            for (const admin of admins) {
                if (admin.id !== session.user.id) {
                    await createNotification(
                        admin.id,
                        `Invoice ${invoice.id}`,
                        `Invoice has been ${statusLabel}`,
                        newStatus === 'paid' ? 'success' : 'info',
                        `/concepts/invoices/invoice-detail/${id}`
                    )
                }
            }
        }

        // Auto-create next recurring invoice when status changes to paid
        let nextInvoiceId = null
        const isRecurring = body.recurring ?? current?.recurring
        if (current && current.status !== 'paid' && newStatus === 'paid' && isRecurring) {
            const period = body.recurringPeriod || current.recurringPeriod
            const cycles = body.recurringCycles != null ? parseInt(body.recurringCycles) : current.recurringCycles
            // cycles === 0 means infinite, otherwise check remaining
            const shouldCreate = cycles === 0 || cycles === null || cycles > 1

            if (shouldCreate) {
                const now = new Date()
                const mm = String(now.getMonth() + 1).padStart(2, '0')
                const yyyy = now.getFullYear()
                const suffix = `/${mm}/${yyyy}`
                const existing = await prisma.invoice.findMany({ where: { number: { endsWith: suffix } }, select: { number: true }, orderBy: { number: 'desc' } })
                let nextNum = 1
                if (existing.length > 0) {
                    const nums = existing.map(inv => { const m = inv.number.match(/^FA-(\d+)\//); return m ? parseInt(m[1], 10) : 0 })
                    nextNum = Math.max(...nums) + 1
                }
                const nextNumber = `FA-${String(nextNum).padStart(3, '0')}${suffix}`

                // Calculate next due date
                let nextDue = null
                if (invoice.dueDate) {
                    nextDue = new Date(invoice.dueDate)
                    if (period === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1)
                    else nextDue.setMonth(nextDue.getMonth() + 1)
                }

                const nextInvoice = await prisma.invoice.create({
                    data: {
                        number: nextNumber,
                        customerId: invoice.customerId,
                        status: 'draft',
                        type: invoice.type,
                        subtotal: invoice.subtotal,
                        taxRate: invoice.taxRate,
                        taxAmount: invoice.taxAmount,
                        total: invoice.total,
                        currency: invoice.currency,
                        notes: invoice.notes,
                        dueDate: nextDue,
                        recurring: true,
                        recurringPeriod: period,
                        recurringCycles: cycles > 1 ? cycles - 1 : cycles,
                        items: {
                            create: invoice.items.map(item => ({
                                description: item.description,
                                quantity: item.quantity,
                                unit: item.unit,
                                unitPrice: item.unitPrice,
                                total: item.total,
                            })),
                        },
                    },
                })
                nextInvoiceId = nextInvoice.id
            }
        }

        return NextResponse.json({ success: true, id: invoice.id, nextInvoiceId })
    } catch (error) {
        console.error('PUT /api/invoices/[id] error:', error)
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

        // Get the invoice being deleted to know its number
        const invoice = await prisma.invoice.findUnique({ where: { id }, select: { number: true } })
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        // Parse: FA-042/09/2025 → num=42, suffix=/09/2025
        const match = invoice.number.match(/^FA-(\d+)(\/\d{2}\/\d{4})$/)

        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
        await prisma.invoice.delete({ where: { id } })

        // Decrement numbers of invoices with higher numbers in the same month/year
        if (match) {
            const deletedNum = parseInt(match[1], 10)
            const suffix = match[2]

            const higherInvoices = await prisma.invoice.findMany({
                where: { number: { endsWith: suffix } },
                select: { id: true, number: true },
            })

            for (const inv of higherInvoices) {
                const m = inv.number.match(/^FA-(\d+)\//)
                if (m) {
                    const num = parseInt(m[1], 10)
                    if (num > deletedNum) {
                        const newNumber = `FA-${String(num - 1).padStart(3, '0')}${suffix}`
                        await prisma.invoice.update({
                            where: { id: inv.id },
                            data: { number: newNumber },
                        })
                    }
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('DELETE /api/invoices/[id] error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

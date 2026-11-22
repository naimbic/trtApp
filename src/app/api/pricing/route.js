import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

const DEFAULT_PLANS = [
    {
        planId: 'basic',
        name: 'Basic',
        description:
            'Ideal for individuals or small teams. Includes essential task and project management features.',
        monthlyPrice: 59,
        annualPrice: 500,
        features: ['taskManagement', 'managementTools', 'reporting', 'support'],
        recommended: false,
        order: 0,
    },
    {
        planId: 'standard',
        name: 'Standard',
        description:
            'Perfect for growing teams. Offers advanced features for better productivity and collaboration.',
        monthlyPrice: 79,
        annualPrice: 700,
        features: [
            'taskManagement',
            'managementTools',
            'reporting',
            'support',
            'fileSharing',
        ],
        recommended: false,
        order: 1,
    },
    {
        planId: 'pro',
        name: 'Pro',
        description:
            'Best for large teams. Includes premium features and dedicated support for optimal workflow.',
        monthlyPrice: 129,
        annualPrice: 1000,
        features: [
            'taskManagement',
            'managementTools',
            'reporting',
            'support',
            'fileSharing',
            'advancedSecurity',
            'customIntegrations',
        ],
        recommended: true,
        order: 2,
    },
]

export async function GET() {
    const denied = await needSession()
    if (denied) return denied
    try {
        let plans = await prisma.pricingPlan.findMany({
            orderBy: { order: 'asc' },
        })

        // Seed defaults if no plans exist
        if (plans.length === 0) {
            await prisma.pricingPlan.createMany({ data: DEFAULT_PLANS })
            plans = await prisma.pricingPlan.findMany({
                orderBy: { order: 'asc' },
            })
        }

        return NextResponse.json({
            plans: plans.map((p) => ({
                id: p.planId,
                name: p.name,
                description: p.description,
                price: { monthly: p.monthlyPrice, annually: p.annualPrice },
                features: p.features,
                recommended: p.recommended,
            })),
        })
    } catch (error) {
        console.error('GET /api/pricing error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        )
    }
}

export async function PUT(request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 },
            )
        }

        const body = await request.json()
        const { action } = body

        // Update a single plan's pricing/details
        if (action === 'updatePlan') {
            await prisma.pricingPlan.update({
                where: { planId: body.planId },
                data: {
                    name: body.name,
                    description: body.description,
                    monthlyPrice: body.monthlyPrice,
                    annualPrice: body.annualPrice,
                    features: body.features,
                    recommended: body.recommended,
                },
            })
            return NextResponse.json({ success: true })
        }

        // Subscribe: save card, update user plan, create transaction
        if (action === 'subscribe') {
            const { planId, planName, amount, billingCycle, card } = body
            const nextPayment =
                Math.floor(Date.now() / 1000) +
                (billingCycle === 'monthly' ? 30 : 365) * 86400

            // Upsert payment method (use last4 as identifier)
            if (card) {
                const last4 = card.ccNumber.slice(-4)
                const cardType = card.ccNumber.startsWith('4')
                    ? 'VISA'
                    : 'MASTER'
                const [expMonth, expYear] = (card.cardExpiry || '').split('/')

                // Check if card already exists
                const existing = await prisma.userPaymentMethod.findFirst({
                    where: {
                        userId: session.user.id,
                        last4Number: last4,
                    },
                })

                if (!existing) {
                    // Set all existing cards to non-primary
                    await prisma.userPaymentMethod.updateMany({
                        where: { userId: session.user.id },
                        data: { primary: false },
                    })
                    await prisma.userPaymentMethod.create({
                        data: {
                            userId: session.user.id,
                            cardHolderName:
                                card.cardHolderName || session.user.name,
                            cardType,
                            last4Number: last4,
                            expMonth: expMonth || '12',
                            expYear: expYear || '26',
                            primary: true,
                        },
                    })
                }
            }

            // Update user plan
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    currentPlan: planName,
                    planStatus: 'active',
                    billingCycle,
                    nextPaymentDate: nextPayment,
                    planAmount: amount,
                },
            })

            // Create transaction record
            await prisma.transaction.create({
                data: {
                    userId: session.user.id,
                    item: `${planName} plan - ${billingCycle}`,
                    status: 'paid',
                    amount,
                    date: Math.floor(Date.now() / 1000),
                },
            })

            return NextResponse.json({ success: true })
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 },
        )
    } catch (error) {
        console.error('PUT /api/pricing error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        )
    }
}

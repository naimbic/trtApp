import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { corsResponse, refreshCors } from '@/lib/cors'
import { guardIngest } from '@/lib/platform/ingest'
import { sendMail, buildSubmissionEmail } from '@/lib/mailer'
import { createNotification } from '@/lib/notify'

export const dynamic = 'force-dynamic'

const VALID_FORMS = [
    'audit-seo', 'audit-ads', 'audit-web', 'audit-social',
    'audit-aeo', 'audit-analytics', 'audit-gratuit',
    'contact', 'newsletter', 'lead', 'candidature',
]

export async function OPTIONS(request) {
    await refreshCors()
    return corsResponse(request)
}

// POST /api/submissions — receive form submission (public, CORS, site-aware)
export async function POST(request) {
    // CORS + site resolution + key enforcement + rate limit (1 per 30s per site/IP)
    const { slug, source, headers, error } = await guardIngest(request, { rateMs: 30000 })
    if (error) {
        return NextResponse.json(
            { data: null, error: error.message },
            { status: error.status, headers }
        )
    }
    try {
        const body = await request.json()
        const formType = body.form || body.formType
        const name = body.name
        const email = body.email

        if (!name || !email) {
            return NextResponse.json(
                { data: null, error: 'name and email are required' },
                { status: 400, headers }
            )
        }
        if (!formType || !VALID_FORMS.includes(formType)) {
            return NextResponse.json(
                { data: null, error: `formType must be one of: ${VALID_FORMS.join(', ')}` },
                { status: 400, headers }
            )
        }

        const submission = await prisma.submission.create({
            data: {
                site: slug,
                form: formType,
                name,
                email,
                phone: body.phone || null,
                company: body.company || null,
                website: body.website || null,
                needs: body.needs || null,
                budget: body.budget || null,
                budgetMin: body.budgetMin || null,
                budgetMax: body.budgetMax || null,
                deadline: body.deadline || null,
                deadlineMonths: body.deadlineMonths || null,
                message: body.message || null,
                page: body.pageUrl || body.page || null,
                read: false,
            },
        })

        // Fire-and-forget: send email notification to team.
        // Skip it for keyed spoke submissions — the spoke already sent its own
        // email; the hub only needs to store + notify in-dashboard. Legacy
        // (non-key, trtmaroc frontend) submissions still get the hub email.
        if (source !== 'key') {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
            const userAgent = (request.headers.get('user-agent') || '').slice(0, 300)
            sendMail(
                `New ${formType} submission from ${name} [${slug}]`,
                buildSubmissionEmail({ form: formType, site: slug, name, email, ...body, ip, userAgent }),
            ).catch(() => {})
        }

        // Fire-and-forget: notify all admin users in the dashboard
        prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true },
        }).then((admins) => {
            for (const admin of admins) {
                createNotification(
                    admin.id,
                    name,
                    `New ${formType} submission from ${email} (${slug})`,
                    'info',
                    null,
                )
            }
        }).catch(() => {})

        return NextResponse.json(
            { data: { success: true, id: submission.id }, error: null },
            { status: 201, headers }
        )
    } catch (error) {
        console.error('POST /api/submissions error:', error)
        return NextResponse.json(
            { data: null, error: 'Internal server error' },
            { status: 500, headers }
        )
    }
}

// GET /api/submissions — list all (admin auth required)
export async function GET(request) {
    noStore()
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const readFilter = searchParams.get('read')
        const siteFilter = searchParams.get('site')

        const where = {}
        if (readFilter === 'false') where.read = false
        if (readFilter === 'true') where.read = true
        if (siteFilter && siteFilter !== 'all') where.site = siteFilter

        const submissions = await prisma.submission.findMany({
            where,
            orderBy: { date: 'desc' },
        })

        return NextResponse.json({ data: submissions, error: null })
    } catch (error) {
        console.error('GET /api/submissions error:', error)
        return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
    }
}

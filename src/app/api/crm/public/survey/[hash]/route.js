import { NextResponse } from 'next/server'
import { publicSurvey, submitSurvey } from '@/lib/crm/surveys'
import { surveyPage } from '@/lib/crm/surveyPublic'
import { rateLimit, clientIp } from '@/lib/rateLimit'

const text = (body, status) => new NextResponse(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(_request, { params }) {
    const found = await publicSurvey((await params).hash)
    if (!found) return text('Survey not found.', 404)
    return new NextResponse(await surveyPage(found), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}

export async function POST(request, { params }) {
    try {
        const ip = clientIp(request)
        rateLimit(`survey:${ip || 'x'}`, 30, 60000) // a person fills a survey in; a script does not
        const body = await request.json().catch(() => ({}))
        return NextResponse.json(await submitSurvey((await params).hash, body.answers, { ip, userAgent: request.headers.get('user-agent') }))
    } catch (e) {
        const status = e?.status || 500
        return NextResponse.json({ error: status === 500 ? 'Something went wrong, please try again' : e.message }, { status })
    }
}

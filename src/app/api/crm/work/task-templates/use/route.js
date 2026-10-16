import { NextResponse } from 'next/server'
import { taskFromTemplate } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

// POST { templateId, relType?, relId?, milestoneId?, assigneeIds?, startDate? } -> the new task
export async function POST(request) {
    try {
        const b = await request.json()
        return NextResponse.json(await taskFromTemplate(b.templateId, b), { status: 201 })
    } catch (e) { return errorResponse(e) }
}

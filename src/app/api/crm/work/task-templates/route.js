import { NextResponse } from 'next/server'
import { listTemplates, saveTemplate, templateFromTask } from '@/lib/crm/tasksApi'
import { errorResponse } from '@/lib/crm/crud'

export async function GET() {
    try { return NextResponse.json(await listTemplates()) } catch (e) { return errorResponse(e) }
}
// POST { name, description, priority, dueInDays, checklist: [], subtasks: [] }  or  { fromTask: id, name? }
export async function POST(request) {
    try {
        const b = await request.json()
        return NextResponse.json(b.fromTask ? await templateFromTask(b.fromTask, b.name) : await saveTemplate(b), { status: 201 })
    } catch (e) { return errorResponse(e) }
}

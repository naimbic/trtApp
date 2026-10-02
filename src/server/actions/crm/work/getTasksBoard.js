import prisma from '@/lib/prisma'

export const TASK_BOARD_STATUSES = [
    { status: 1, label: 'Not Started' },
    { status: 2, label: 'Awaiting Feedback' },
    { status: 3, label: 'Testing' },
    { status: 4, label: 'In Progress' },
    { status: 5, label: 'Complete' },
]

const staffName = (s) =>
    [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff'

/**
 * Loads tasks grouped by Perfex status (1-5) with their assignees.
 * @param {{ projectId?: string, limit?: number }} opts  projectId filters on relType='project'.
 */
const getTasksBoard = async ({ projectId, limit = 1000 } = {}) => {
    const where = projectId ? { relType: 'project', relId: projectId } : {}
    const tasks = await prisma.crmTask.findMany({
        where,
        orderBy: [{ kanbanOrder: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        include: { assignees: true, _count: { select: { comments: true, checklistItems: true } } },
    })

    const staffIds = [...new Set(tasks.flatMap((t) => t.assignees.map((a) => a.staffId)))]
    const staffMap = {}
    if (staffIds.length) {
        const staff = await prisma.crmStaff.findMany({ where: { id: { in: staffIds } } })
        for (const s of staff) staffMap[s.id] = { id: s.id, name: staffName(s), img: s.profileImage || '' }
    }

    const items = tasks.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        relType: t.relType || null,
        comments: t._count.comments,
        checklist: t._count.checklistItems,
        members: t.assignees.map((a) => staffMap[a.staffId] || { id: a.staffId, name: 'Staff', img: '' }),
    }))

    const columns = TASK_BOARD_STATUSES.map((c) => ({
        ...c,
        tasks: items.filter((t) => t.status === c.status),
    }))
    return { columns }
}

export default getTasksBoard

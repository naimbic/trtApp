// Work domain mappers: projects, tasks and related tables (+ timesheets module, best effort).
// Keys = source table name without the `tbl` prefix.
import { oid, fk, toDate, toInt, toFloat, toBool, str } from '../lib.mjs'

/** tasks.rel_type -> source table whose PK rel_id points to. */
export const REL_TABLES = {
    project: 'projects',
    customer: 'clients',
    lead: 'leads',
    invoice: 'invoices',
    proposal: 'proposals',
    ticket: 'tickets',
    expense: 'expenses',
    estimate: 'estimates',
    contract: 'contracts',
    credit_note: 'creditnotes',
    subscription: 'subscriptions',
}

export const relFk = (relType, relId) => {
    const table = REL_TABLES[relType]
    return table ? fk(table, relId) : null
}

/** UNIX seconds (taskstimers) -> Date */
export const fromUnix = (v) => {
    const n = toInt(v)
    return n ? new Date(n * 1000) : null
}

/** Columns not in `known` go to an `extra` JSON blob (uncertain module tables). */
const extraOf = (r, known) => {
    const out = {}
    for (const [k, v] of Object.entries(r)) if (!known.includes(k) && v !== null && v !== undefined) out[k] = v
    return Object.keys(out).length ? out : null
}

const created = (v) => (toDate(v) ? { createdAt: toDate(v) } : {})

const checklistTemplate = {
    model: 'crmChecklistTemplate',
    id: 'id',
    map: (r) => ({
        id: oid('checklist_templates', r.id),
        legacyId: toInt(r.id),
        description: str(r.description) ?? '',
    }),
}

export default {
    projects: {
        model: 'crmProject',
        id: 'id',
        map: (r) => ({
            id: oid('projects', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
            description: str(r.description),
            status: toInt(r.status, 1),
            clientId: fk('clients', r.clientid),
            billingType: toInt(r.billing_type, 1),
            startDate: toDate(r.start_date),
            deadline: toDate(r.deadline),
            dateFinished: toDate(r.date_finished),
            progress: toInt(r.progress, 0),
            progressFromTasks: toBool(r.progress_from_tasks),
            projectCost: toFloat(r.project_cost),
            projectRatePerHour: toFloat(r.project_rate_per_hour),
            estimatedHours: toFloat(r.estimated_hours),
            addedFrom: fk('staff', r.addedfrom),
            contactNotification: toInt(r.contact_notification, 1),
            notifyContacts: str(r.notify_contacts),
            ...created(r.project_created),
        }),
    },

    project_members: {
        model: 'crmProjectMember',
        id: 'id',
        map: (r) => ({
            id: oid('project_members', r.id),
            legacyId: toInt(r.id),
            projectId: fk('projects', r.project_id),
            staffId: fk('staff', r.staff_id),
        }),
    },

    project_files: {
        model: 'crmProjectFile',
        id: 'id',
        map: (r) => ({
            id: oid('project_files', r.id),
            legacyId: toInt(r.id),
            projectId: fk('projects', r.project_id),
            fileName: str(r.file_name) ?? '',
            subject: str(r.subject),
            description: str(r.description),
            fileType: str(r.filetype),
            lastActivity: toDate(r.last_activity),
            visibleToCustomer: toBool(r.visible_to_customer),
            staffId: fk('staff', r.staffid),
            contactId: fk('contacts', r.contact_id),
            external: str(r.external),
            externalLink: str(r.external_link),
            thumbnailLink: str(r.thumbnail_link),
            ...created(r.dateadded),
        }),
    },

    project_discussions: {
        model: 'crmProjectDiscussion',
        id: 'id',
        map: (r) => ({
            id: oid('project_discussions', r.id),
            legacyId: toInt(r.id),
            projectId: fk('projects', r.project_id),
            subject: str(r.subject) ?? '',
            description: str(r.description),
            showToCustomer: toBool(r.show_to_customer),
            lastActivity: toDate(r.last_activity),
            staffId: fk('staff', r.staff_id),
            contactId: fk('contacts', r.contact_id),
            ...created(r.datecreated),
        }),
    },

    project_discussion_comments: {
        model: 'crmProjectDiscussionComment',
        id: 'id',
        map: (r) => ({
            id: oid('project_discussion_comments', r.id),
            legacyId: toInt(r.id),
            // 'regular' -> project_discussions, 'file' -> project_files
            discussionId: fk(r.discussion_type === 'file' ? 'project_files' : 'project_discussions', r.discussion_id),
            discussionType: str(r.discussion_type) ?? 'regular',
            parentId: fk('project_discussion_comments', r.parent),
            modified: toDate(r.modified),
            content: str(r.content),
            staffId: fk('staff', r.staff_id),
            contactId: fk('contacts', r.contact_id),
            fullName: str(r.fullname),
            fileName: str(r.file_name),
            fileMimeType: str(r.file_mime_type),
            ...created(r.created),
        }),
    },

    project_notes: {
        model: 'crmProjectNote',
        id: 'id',
        map: (r) => ({
            id: oid('project_notes', r.id),
            legacyId: toInt(r.id),
            projectId: fk('projects', r.project_id),
            content: str(r.content),
            staffId: fk('staff', r.staff_id),
            ...created(r.dateadded),
        }),
    },

    project_activity: {
        model: 'crmProjectActivity',
        id: 'id',
        map: (r) => ({
            id: oid('project_activity', r.id),
            legacyId: toInt(r.id),
            projectId: fk('projects', r.project_id),
            staffId: fk('staff', r.staff_id),
            contactId: fk('contacts', r.contact_id),
            fullName: str(r.fullname),
            visibleToCustomer: toBool(r.visible_to_customer),
            descriptionKey: str(r.description_key),
            additionalData: str(r.additional_data),
            ...created(r.dateadded),
        }),
    },

    project_settings: {
        model: 'crmProjectSetting',
        id: 'id',
        map: (r) => ({
            id: oid('project_settings', r.id),
            legacyId: toInt(r.id),
            projectId: fk('projects', r.project_id),
            name: str(r.name) ?? '',
            value: str(r.value),
        }),
    },

    milestones: {
        model: 'crmMilestone',
        id: 'id',
        map: (r) => ({
            id: oid('milestones', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
            description: str(r.description),
            descriptionVisibleToCustomer: toBool(r.description_visible_to_customer),
            dueDate: toDate(r.due_date),
            projectId: fk('projects', r.project_id),
            color: str(r.color),
            milestoneOrder: toInt(r.milestone_order, 0),
            ...created(r.datecreated),
        }),
    },

    tasks: {
        model: 'crmTask',
        id: 'id',
        map: (r) => ({
            id: oid('tasks', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
            description: str(r.description),
            priority: toInt(r.priority, 2),
            startDate: toDate(r.startdate),
            dueDate: toDate(r.duedate),
            dateFinished: toDate(r.datefinished),
            addedFrom: fk('staff', r.addedfrom),
            isAddedFromContact: toBool(r.is_added_from_contact),
            // 1 not started, 2 awaiting feedback, 3 testing, 4 in progress, 5 complete (kept as-is)
            status: toInt(r.status, 1),
            recurringType: str(r.recurring_type),
            repeatEvery: toInt(r.repeat_every, 0),
            recurring: toBool(r.recurring),
            isRecurringFrom: fk('tasks', r.is_recurring_from),
            cycles: toInt(r.cycles, 0),
            totalCycles: toInt(r.total_cycles, 0),
            customRecurring: toBool(r.custom_recurring),
            lastRecurringDate: toDate(r.last_recurring_date),
            relType: str(r.rel_type),
            relId: relFk(r.rel_type, r.rel_id),
            isPublic: toBool(r.is_public),
            billable: toBool(r.billable),
            billed: toBool(r.billed),
            invoiceId: fk('invoices', r.invoice_id),
            hourlyRate: toFloat(r.hourly_rate, 0),
            milestoneId: fk('milestones', r.milestone),
            kanbanOrder: toInt(r.kanban_order, 0),
            milestoneOrder: toInt(r.milestone_order, 0),
            visibleToClient: toBool(r.visible_to_client),
            deadlineNotified: toBool(r.deadline_notified),
            ...created(r.dateadded),
        }),
    },

    task_assigned: {
        model: 'crmTaskAssigned',
        id: 'id',
        map: (r) => ({
            id: oid('task_assigned', r.id),
            legacyId: toInt(r.id),
            taskId: fk('tasks', r.taskid),
            staffId: fk('staff', r.staffid),
            assignedFrom: fk('staff', r.assigned_from),
            isAssignedFromContact: toBool(r.is_assigned_from_contact),
        }),
    },

    task_followers: {
        model: 'crmTaskFollower',
        id: 'id',
        map: (r) => ({
            id: oid('task_followers', r.id),
            legacyId: toInt(r.id),
            taskId: fk('tasks', r.taskid),
            staffId: fk('staff', r.staffid),
        }),
    },

    task_comments: {
        model: 'crmTaskComment',
        id: 'id',
        map: (r) => ({
            id: oid('task_comments', r.id),
            legacyId: toInt(r.id),
            taskId: fk('tasks', r.taskid),
            content: str(r.content),
            staffId: fk('staff', r.staffid),
            contactId: fk('contacts', r.contact_id),
            fileId: fk('files', r.file_id),
            ...created(r.dateadded),
        }),
    },

    task_checklist_items: {
        model: 'crmTaskChecklistItem',
        id: 'id',
        map: (r) => ({
            id: oid('task_checklist_items', r.id),
            legacyId: toInt(r.id),
            taskId: fk('tasks', r.taskid),
            description: str(r.description),
            finished: toBool(r.finished),
            addedFrom: fk('staff', r.addedfrom),
            finishedFrom: fk('staff', r.finished_from),
            listOrder: toInt(r.list_order, 0),
            assigned: fk('staff', r.assigned),
            ...created(r.dateadded),
        }),
    },

    checklist_templates: checklistTemplate,
    // alias in case the dump names it with the tasks_ prefix
    tasks_checklist_templates: checklistTemplate,

    taskstimers: {
        model: 'crmTaskTimer',
        id: 'id',
        map: (r) => ({
            id: oid('taskstimers', r.id),
            legacyId: toInt(r.id),
            taskId: fk('tasks', r.task_id),
            startTime: fromUnix(r.start_time),
            endTime: fromUnix(r.end_time),
            staffId: fk('staff', r.staff_id),
            hourlyRate: toFloat(r.hourly_rate, 0),
            note: str(r.note),
        }),
    },

    // ---- timesheets module (column names best effort; extras kept in `extra`)
    timesheets_timesheet: {
        model: 'crmTimesheet',
        id: 'id',
        map: (r) => ({
            id: oid('timesheets_timesheet', r.id),
            legacyId: toInt(r.id),
            staffId: fk('staff', r.staff_id),
            dateWork: toDate(r.date_work),
            value: str(r.value),
            addedFrom: fk('staff', r.add_from),
            type: str(r.type),
            relateId: str(r.relate_id),
            extra: extraOf(r, ['id', 'staff_id', 'date_work', 'value', 'add_from', 'type', 'relate_id']),
        }),
    },

    timesheets_requisition_leave: {
        model: 'crmLeaveRequest',
        id: 'id',
        map: (r) => ({
            id: oid('timesheets_requisition_leave', r.id),
            legacyId: toInt(r.id),
            subject: str(r.subject),
            staffId: fk('staff', r.staff_id),
            startTime: toDate(r.start_time),
            endTime: toDate(r.end_time),
            reason: str(r.reason),
            status: toInt(r.status),
            numberOfDays: toFloat(r.number_of_leaving_day),
            extra: extraOf(r, ['id', 'subject', 'staff_id', 'start_time', 'end_time', 'reason', 'status', 'number_of_leaving_day']),
        }),
    },

    timesheets_day_off: {
        model: 'crmDayOff',
        id: 'id',
        map: (r) => ({
            id: oid('timesheets_day_off', r.id),
            legacyId: toInt(r.id),
            reason: str(r.reason),
            offDate: toDate(r.off_date),
            extra: extraOf(r, ['id', 'reason', 'off_date']),
        }),
    },
}

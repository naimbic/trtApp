// Support & content domain mappers. Keys = source table names WITHOUT the `tbl` prefix.
import { oid, fk, toDate, toInt, toBool, str } from '../lib.mjs'

const T_REL = {
    invoice: 'invoices', estimate: 'estimates', proposal: 'proposals', contract: 'contracts',
    credit_note: 'creditnotes', task: 'tasks', ticket: 'tickets', lead: 'leads',
}

export default {
    tickets_status: {
        model: 'crmTicketStatus', id: 'ticketstatusid',
        map: (r) => ({
            id: oid('tickets_status', r.ticketstatusid), legacyId: toInt(r.ticketstatusid),
            name: str(r.name) ?? '', isDefault: toBool(r.isdefault),
            statusColor: str(r.statuscolor), statusOrder: toInt(r.statusorder),
        }),
    },
    tickets_priorities: {
        model: 'crmTicketPriority', id: 'priorityid',
        map: (r) => ({ id: oid('tickets_priorities', r.priorityid), legacyId: toInt(r.priorityid), name: str(r.name) ?? '' }),
    },
    services: {
        model: 'crmService', id: 'serviceid',
        map: (r) => ({ id: oid('services', r.serviceid), legacyId: toInt(r.serviceid), name: str(r.name) ?? '' }),
    },
    tickets: {
        model: 'crmTicket', id: 'ticketid',
        map: (r) => {
            const created = toDate(r.date)
            return {
                id: oid('tickets', r.ticketid), legacyId: toInt(r.ticketid),
                adminReplying: toInt(r.adminreplying, 0),
                clientId: fk('clients', r.userid), contactId: fk('contacts', r.contactid),
                email: str(r.email), name: str(r.name),
                departmentId: fk('departments', r.department),
                priorityId: fk('tickets_priorities', r.priority),
                statusId: fk('tickets_status', r.status),
                serviceId: fk('services', r.service),
                ticketKey: str(r.ticketkey), subject: str(r.subject), message: str(r.message),
                adminId: fk('staff', r.admin), projectId: fk('projects', r.project_id),
                lastReply: toDate(r.lastreply),
                clientRead: toInt(r.clientread, 0), adminRead: toInt(r.adminread, 0),
                assignedId: fk('staff', r.assigned), cc: str(r.cc),
                mergedTicketId: fk('tickets', r.merged_ticket_id),
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    ticket_replies: {
        model: 'crmTicketReply', id: 'id',
        map: (r) => {
            const created = toDate(r.date)
            return {
                id: oid('ticket_replies', r.id), legacyId: toInt(r.id),
                ticketId: fk('tickets', r.ticketid),
                clientId: fk('clients', r.userid), contactId: fk('contacts', r.contactid),
                name: str(r.name), email: str(r.email), message: str(r.message),
                attachment: toInt(r.attachment), adminId: fk('staff', r.admin), ip: str(r.ip),
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    ticket_attachments: {
        model: 'crmTicketAttachment', id: 'id',
        // `missing` stays false here; the importer sets it after checking the uploads folder.
        map: (r) => {
            const created = toDate(r.dateadded)
            return {
                id: oid('ticket_attachments', r.id), legacyId: toInt(r.id),
                ticketId: fk('tickets', r.ticketid), replyId: fk('ticket_replies', r.replyid),
                fileName: str(r.file_name) ?? '', fileType: str(r.filetype), missing: false,
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    tickets_pipe_log: {
        model: 'crmTicketPipeLog', id: 'id',
        map: (r) => {
            const created = toDate(r.date)
            return {
                id: oid('tickets_pipe_log', r.id), legacyId: toInt(r.id),
                emailTo: str(r.email_to), name: str(r.name), subject: str(r.subject),
                message: str(r.message), email: str(r.email), status: str(r.status),
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    predefined_replies: {
        model: 'crmPredefinedReply', id: 'id',
        map: (r) => ({ id: oid('predefined_replies', r.id), legacyId: toInt(r.id), name: str(r.name) ?? '', message: str(r.message) }),
    },
    spam_filters: {
        model: 'crmSpamFilter', id: 'id',
        map: (r) => ({ id: oid('spam_filters', r.id), legacyId: toInt(r.id), type: str(r.type) ?? '', value: str(r.value) ?? '', relType: str(r.rel_type) ?? 'tickets' }),
    },
    knowledge_base_groups: {
        model: 'crmKnowledgeBaseGroup', id: 'groupid',
        map: (r) => ({
            id: oid('knowledge_base_groups', r.groupid), legacyId: toInt(r.groupid),
            name: str(r.name) ?? '', groupSlug: str(r.group_slug), description: str(r.description),
            active: toBool(r.active), color: str(r.color), groupOrder: toInt(r.group_order),
        }),
    },
    knowledge_base: {
        model: 'crmKnowledgeBaseArticle', id: 'articleid',
        map: (r) => {
            const created = toDate(r.datecreated)
            return {
                id: oid('knowledge_base', r.articleid), legacyId: toInt(r.articleid),
                groupId: fk('knowledge_base_groups', r.articlegroup),
                subject: str(r.subject) ?? '', description: str(r.description), slug: str(r.slug),
                active: toBool(r.active), articleOrder: toInt(r.article_order),
                staffArticle: toBool(r.staff_article),
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    knowledge_base_article_feedback: {
        model: 'crmKnowledgeBaseArticleFeedback', id: 'articleanswerid',
        map: (r) => {
            const created = toDate(r.date)
            return {
                id: oid('knowledge_base_article_feedback', r.articleanswerid), legacyId: toInt(r.articleanswerid),
                articleId: fk('knowledge_base', r.articleid), answer: toInt(r.answer), ip: str(r.ip),
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    tracked_mails: {
        model: 'crmTrackedMail', id: 'id',
        map: (r) => {
            const created = toDate(r.date)
            const relTable = T_REL[r.rel_type]
            return {
                id: oid('tracked_mails', r.id), legacyId: toInt(r.id), uid: str(r.uid),
                relType: str(r.rel_type), relId: relTable ? fk(relTable, r.rel_id) : null,
                email: str(r.email), opened: toBool(r.opened), dateOpened: toDate(r.date_opened),
                ...(created ? { createdAt: created } : {}),
            }
        },
    },
    mail_queue: {
        model: 'crmMailQueue', id: 'id',
        map: (r) => ({
            id: oid('mail_queue', r.id), legacyId: toInt(r.id), engine: str(r.engine), email: str(r.email),
            cc: str(r.cc), bcc: str(r.bcc), message: str(r.message), altMessage: str(r.alt_message),
            status: str(r.status), headers: str(r.headers), attachments: str(r.attachments),
        }),
    },
    user_api: {
        model: 'crmUserApi', id: 'id',
        map: (r) => ({
            id: oid('user_api', r.id), legacyId: toInt(r.id), user: str(r.user), name: str(r.name),
            token: str(r.token), expirationDate: toDate(r.expiration_date),
            permissionEnable: toBool(r.permission_enable),
        }),
    },
}

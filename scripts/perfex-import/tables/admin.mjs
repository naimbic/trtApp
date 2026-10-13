// Admin / system domain mappers (see docs/perfex/ARCHITECTURE.md).
// key = Perfex table without prefix; map(row) is pure and returns the Prisma `data` object.
import { oid, fk, toDate, toInt, toFloat, toBool, str } from '../lib.mjs'

/** rel_type (as stored by Perfex) -> source table whose legacy id rel_id points to. */
export const REL_TABLES = {
    customer: 'clients', customers: 'clients', client: 'clients', company: null,
    contact: 'contacts', contacts: 'contacts',
    lead: 'leads', leads: 'leads',
    project: 'projects', projects: 'projects',
    task: 'tasks', tasks: 'tasks',
    invoice: 'invoices', invoices: 'invoices',
    estimate: 'estimates', estimates: 'estimates',
    proposal: 'proposals', proposals: 'proposals',
    contract: 'contracts', contracts: 'contracts',
    ticket: 'tickets', tickets: 'tickets',
    expense: 'expenses', expenses: 'expenses',
    credit_note: 'creditnotes', creditnote: 'creditnotes',
    staff: 'staff',
    item: 'items', items: 'items',
    survey: 'surveys', surveys: 'surveys',
    kb_article: 'knowledge_base',
}

/** rel_id -> deterministic ObjectId using the table implied by rel_type (unknown types fall back to the type name). */
export const relOid = (relType, relId) => {
    const t = str(relType)
    if (t === null) return null
    const table = Object.prototype.hasOwnProperty.call(REL_TABLES, t) ? REL_TABLES[t] : t
    if (!table) return null
    return fk(table, relId)
}

const created = (v) => toDate(v) ?? undefined

export default {
    // ------------------------------------------------------------ staff / roles
    staff: {
        model: 'crmStaff',
        id: 'staffid',
        map: (r) => ({
            id: oid('staff', r.staffid),
            legacyId: toInt(r.staffid),
            email: str(r.email),
            firstName: str(r.firstname),
            lastName: str(r.lastname),
            facebook: str(r.facebook),
            linkedin: str(r.linkedin),
            phoneNumber: str(r.phonenumber),
            skype: str(r.skype),
            passwordHash: str(r.password), // runner nulls unless --keep-passwords
            profileImage: str(r.profile_image),
            lastIp: str(r.last_ip),
            lastLogin: toDate(r.last_login),
            lastActivity: toDate(r.last_activity),
            lastPasswordChange: toDate(r.last_password_change),
            admin: toBool(r.admin),
            roleId: fk('roles', r.role),
            active: toBool(r.active),
            defaultLanguage: str(r.default_language),
            direction: str(r.direction),
            mediaPathSlug: str(r.media_path_slug),
            isNotStaff: toBool(r.is_not_staff),
            hourlyRate: toFloat(r.hourly_rate, 0),
            twoFactorAuthEnabled: toBool(r.two_factor_auth_enabled),
            emailSignature: str(r.email_signature),
            createdAt: created(r.datecreated),
        }),
    },
    roles: {
        model: 'crmRole',
        id: 'roleid',
        map: (r) => ({
            id: oid('roles', r.roleid),
            legacyId: toInt(r.roleid),
            name: str(r.name) ?? '',
            permissionsRaw: str(r.permissions),
        }),
    },
    permissions: {
        model: 'crmPermission',
        id: 'permissionid',
        map: (r) => ({
            id: oid('permissions', r.permissionid),
            legacyId: toInt(r.permissionid),
            name: str(r.name) ?? '',
            shortName: str(r.shortname),
        }),
    },
    staff_permissions: {
        model: 'crmStaffPermission',
        id: ['staff_id', 'feature', 'capability'],
        map: (r) => {
            const staffId = fk('staff', r.staff_id)
            if (!staffId) return null
            const key = r.permissionid != null && r.feature == null
                ? `${r.staff_id}:p${r.permissionid}`
                : `${r.staff_id}:${r.feature}:${r.capability}`
            return {
                id: oid('staff_permissions', key),
                staffId,
                permissionId: fk('permissions', r.permissionid),
                feature: str(r.feature),
                capability: str(r.capability),
            }
        },
    },
    departments: {
        model: 'crmDepartment',
        id: 'departmentid',
        map: (r) => ({
            id: oid('departments', r.departmentid),
            legacyId: toInt(r.departmentid),
            name: str(r.name) ?? '',
            imapUsername: str(r.imap_username),
            email: str(r.email),
            emailFromHeader: str(r.email_from_header),
            host: str(r.host),
            // `password` (encrypted IMAP password) intentionally NOT imported
            encryption: str(r.encryption),
            folder: str(r.folder),
            deleteAfterImport: toBool(r.delete_after_import),
            calendarId: str(r.calendar_id),
            hideFromClient: toBool(r.hidefromclient),
        }),
    },
    staff_departments: {
        model: 'crmStaffDepartment',
        id: 'staffdepartmentid',
        map: (r) => {
            const staffId = fk('staff', r.staffid)
            const departmentId = fk('departments', r.departmentid)
            if (!staffId || !departmentId) return null
            return {
                id: oid('staff_departments', r.staffdepartmentid),
                legacyId: toInt(r.staffdepartmentid),
                staffId,
                departmentId,
            }
        },
    },

    // ------------------------------------------------------------ settings / setup
    options: {
        model: 'crmOption',
        id: 'id',
        map: (r) => ({
            id: oid('options', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
            value: r.value === null || r.value === undefined ? null : String(r.value),
            autoload: toBool(r.autoload),
        }),
    },
    currencies: {
        model: 'crmCurrency',
        id: 'id',
        map: (r) => ({
            id: oid('currencies', r.id),
            legacyId: toInt(r.id),
            symbol: str(r.symbol),
            name: str(r.name) ?? '',
            decimalSeparator: str(r.decimal_separator),
            thousandSeparator: str(r.thousand_separator),
            placement: str(r.placement),
            isDefault: toBool(r.isdefault),
        }),
    },
    taxes: {
        model: 'crmTax',
        id: 'id',
        map: (r) => ({
            id: oid('taxes', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
            taxRate: toFloat(r.taxrate, 0),
        }),
    },
    payment_modes: {
        model: 'crmPaymentMode',
        id: 'id',
        map: (r) => ({
            id: oid('payment_modes', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
            description: str(r.description),
            showOnPdf: toBool(r.show_on_pdf),
            invoicesOnly: toBool(r.invoices_only),
            expensesOnly: toBool(r.expenses_only),
            selectedByDefault: toBool(r.selected_by_default),
            active: toBool(r.active),
        }),
    },
    emailtemplates: {
        model: 'crmEmailTemplate',
        id: 'emailtemplateid',
        map: (r) => ({
            id: oid('emailtemplates', r.emailtemplateid),
            legacyId: toInt(r.emailtemplateid),
            type: str(r.type),
            slug: str(r.slug),
            language: str(r.language),
            name: str(r.name),
            subject: str(r.subject),
            message: str(r.message),
            fromName: str(r.fromname),
            fromEmail: str(r.fromemail),
            plainText: toBool(r.plaintext),
            active: toBool(r.active),
            sortOrder: toInt(r.order, 0),
        }),
    },
    customfields: {
        model: 'crmCustomField',
        id: 'id',
        map: (r) => ({
            id: oid('customfields', r.id),
            legacyId: toInt(r.id),
            fieldTo: str(r.fieldto) ?? '',
            name: str(r.name) ?? '',
            slug: str(r.slug),
            required: toBool(r.required),
            type: str(r.type),
            options: str(r.options),
            displayInline: toBool(r.display_inline),
            fieldOrder: toInt(r.field_order),
            active: toBool(r.active),
            showOnPdf: toBool(r.show_on_pdf),
            showOnTicketForm: toBool(r.show_on_ticket_form),
            onlyAdmin: toBool(r.only_admin),
            showOnTable: toBool(r.show_on_table),
            showOnClientPortal: toBool(r.show_on_client_portal),
            disallowClientToEdit: toBool(r.disalow_client_to_edit),
            bsColumn: toInt(r.bs_column),
            defaultValue: str(r.default_value),
        }),
    },
    customfieldsvalues: {
        model: 'crmCustomFieldValue',
        id: 'id',
        map: (r) => ({
            id: oid('customfieldsvalues', r.id),
            legacyId: toInt(r.id),
            relId: relOid(r.fieldto, r.relid),
            fieldId: fk('customfields', r.fieldid),
            fieldTo: str(r.fieldto) ?? '',
            value: r.value === null || r.value === undefined ? null : String(r.value),
        }),
    },
    tags: {
        model: 'crmTag',
        id: 'id',
        map: (r) => ({
            id: oid('tags', r.id),
            legacyId: toInt(r.id),
            name: str(r.name) ?? '',
        }),
    },
    taggables: {
        model: 'crmTaggable',
        id: ['rel_id', 'rel_type', 'tag_id'],
        map: (r) => {
            const tagId = fk('tags', r.tag_id)
            if (!tagId) return null
            return {
                id: oid('taggables', `${r.rel_type}:${r.rel_id}:${r.tag_id}`),
                relType: str(r.rel_type) ?? '',
                relId: relOid(r.rel_type, r.rel_id),
                tagId,
                tagOrder: toInt(r.tag_order, 0),
            }
        },
    },
    modules: {
        model: 'crmModule',
        id: 'id',
        map: (r) => ({
            id: oid('modules', r.id),
            legacyId: toInt(r.id),
            moduleName: str(r.module_name) ?? '',
            installedVersion: str(r.installed_version),
            active: toBool(r.active),
        }),
    },
    countries: {
        model: 'crmCountry',
        id: 'country_id',
        map: (r) => ({
            id: oid('countries', r.country_id),
            legacyId: toInt(r.country_id),
            iso2: str(r.iso2),
            shortName: str(r.short_name),
            longName: str(r.long_name),
            iso3: str(r.iso3),
            numCode: str(r.numcode),
            unMember: str(r.un_member),
            callingCode: str(r.calling_code),
            cctld: str(r.cctld),
        }),
    },

    // ------------------------------------------------------------ utilities
    notes: {
        model: 'crmNote',
        id: 'id',
        map: (r) => ({
            id: oid('notes', r.id),
            legacyId: toInt(r.id),
            relType: str(r.rel_type) ?? '',
            relId: relOid(r.rel_type, r.rel_id),
            description: str(r.description),
            dateContacted: toDate(r.date_contacted),
            addedFrom: fk('staff', r.addedfrom),
            createdAt: created(r.dateadded),
        }),
    },
    reminders: {
        model: 'crmReminder',
        id: 'id',
        map: (r) => ({
            id: oid('reminders', r.id),
            legacyId: toInt(r.id),
            description: str(r.description),
            date: toDate(r.date),
            isNotified: toBool(r.isnotified),
            relType: str(r.rel_type),
            relId: relOid(r.rel_type, r.rel_id),
            staffId: fk('staff', r.staff),
            notifyByEmail: toBool(r.notify_by_email),
            creatorId: fk('staff', r.creator),
        }),
    },
    activity_log: {
        model: 'crmActivityLog',
        id: 'id',
        map: (r) => {
            const sid = toInt(r.staffid)
            return {
                id: oid('activity_log', r.id),
                legacyId: toInt(r.id),
                description: str(r.description),
                staffId: sid ? oid('staff', sid) : null,
                staffName: sid ? null : str(r.staffid), // e.g. '[CRON]'
                fullName: str(r.full_name),
                createdAt: created(r.date),
            }
        },
    },
    announcements: {
        model: 'crmAnnouncement',
        id: 'announcementid',
        map: (r) => ({
            id: oid('announcements', r.announcementid),
            legacyId: toInt(r.announcementid),
            name: str(r.name) ?? '',
            message: str(r.message),
            showToUsers: toBool(r.showtousers),
            showToStaff: toBool(r.showtostaff),
            showName: toBool(r.showname),
            userAdded: str(r.userid ?? r.useradded),
            createdAt: created(r.dateadded),
        }),
    },
    dismissed_announcements: {
        model: 'crmDismissedAnnouncement',
        id: 'dismissedannouncementid',
        map: (r) => {
            const isStaff = toBool(r.staff)
            return {
                id: oid('dismissed_announcements', r.dismissedannouncementid),
                legacyId: toInt(r.dismissedannouncementid),
                announcementId: fk('announcements', r.announcementid),
                isStaff,
                userId: fk(isStaff ? 'staff' : 'contacts', r.userid),
            }
        },
    },
    todos: {
        model: 'crmTodo',
        id: 'todoid',
        map: (r) => ({
            id: oid('todos', r.todoid),
            legacyId: toInt(r.todoid),
            description: str(r.description),
            staffId: fk('staff', r.staffid),
            finished: toBool(r.finished),
            dateFinished: toDate(r.datefinished),
            itemOrder: toInt(r.item_order),
            createdAt: created(r.dateadded),
        }),
    },
    events: {
        model: 'crmEvent',
        id: 'eventid',
        map: (r) => ({
            id: oid('events', r.eventid),
            legacyId: toInt(r.eventid),
            title: str(r.title) ?? '',
            description: str(r.description),
            userId: fk('staff', r.userid),
            start: toDate(r.start),
            end: toDate(r.end),
            isPublic: toBool(r.public),
            color: str(r.color),
            isStartNotified: toBool(r.isstartnotified),
            reminderBefore: toInt(r.reminder_before),
            reminderBeforeType: str(r.reminder_before_type),
        }),
    },
    notifications: {
        model: 'crmNotification',
        id: 'id',
        map: (r) => ({
            id: oid('notifications', r.id),
            legacyId: toInt(r.id),
            isRead: toBool(r.isread),
            isReadInline: toBool(r.isread_inline),
            description: str(r.description),
            fromUserId: fk('staff', r.fromuserid),
            fromClientId: fk('contacts', r.fromclientid),
            fromFullName: str(r.from_fullname),
            toUserId: fk('staff', r.touserid),
            fromCompany: toBool(r.fromcompany),
            link: str(r.link),
            additionalData: str(r.additional_data),
            createdAt: created(r.date),
        }),
    },
    files: {
        model: 'crmFile',
        id: 'id',
        map: (r) => ({
            id: oid('files', r.id),
            legacyId: toInt(r.id),
            relType: str(r.rel_type),
            relId: relOid(r.rel_type, r.rel_id),
            fileName: str(r.file_name),
            fileType: str(r.filetype),
            visibleToCustomer: toBool(r.visible_to_customer),
            attachmentKey: str(r.attachment_key),
            external: str(r.external),
            externalLink: str(r.external_link),
            thumbnailLink: str(r.thumbnail_link),
            staffId: fk('staff', r.staffid),
            contactId: fk('contacts', r.contact_id),
            taskCommentId: fk('task_comments', r.task_comment_id),
            createdAt: created(r.dateadded),
        }),
    },
    user_meta: {
        model: 'crmUserMeta',
        id: 'umeta_id',
        map: (r) => ({
            id: oid('user_meta', r.umeta_id),
            legacyId: toInt(r.umeta_id),
            staffId: fk('staff', r.staff_id),
            clientId: fk('clients', r.client_id),
            contactId: fk('contacts', r.contact_id),
            metaKey: str(r.meta_key),
            metaValue: r.meta_value === null || r.meta_value === undefined ? null : String(r.meta_value),
        }),
    },
    user_auto_login: {
        model: 'crmUserAutoLogin',
        id: ['key_id', 'user_id'],
        map: (r) => {
            const isStaff = toBool(r.staff)
            return {
                id: oid('user_auto_login', `${r.key_id}:${r.user_id}`),
                keyId: str(r.key_id),
                userId: fk(isStaff ? 'staff' : 'contacts', r.user_id),
                isStaff,
                userAgent: str(r.user_agent),
                lastIp: str(r.last_ip),
                lastUsed: toDate(r.last_login),
            }
        },
    },
    views_tracking: {
        model: 'crmViewTracking',
        id: 'id',
        map: (r) => ({
            id: oid('views_tracking', r.id),
            legacyId: toInt(r.id),
            relType: str(r.rel_type),
            relId: relOid(r.rel_type, r.rel_id),
            viewIp: str(r.view_ip),
            createdAt: created(r.date),
        }),
    },

    // ------------------------------------------------------------ newsfeed (table names: posts, post_comments, post_likes, post_comment_likes|comment_likes)
    newsfeed_posts: {
        model: 'crmPost',
        id: 'postid',
        map: (r) => ({
            id: oid('posts', r.postid),
            legacyId: toInt(r.postid),
            creatorId: fk('staff', r.creator),
            visibility: str(r.visibility),
            pinned: toBool(r.pinned),
            datePinned: toDate(r.datepinned),
            content: str(r.content),
            createdAt: created(r.datecreated),
        }),
    },
    post_comments: {
        model: 'crmPostComment',
        id: 'id',
        map: (r) => ({
            id: oid('post_comments', r.id),
            legacyId: toInt(r.id),
            content: str(r.content),
            userId: fk('staff', r.userid),
            postId: fk('posts', r.postid),
            createdAt: created(r.dateadded),
        }),
    },
    post_likes: {
        model: 'crmPostLike',
        id: 'id',
        map: (r) => ({
            id: oid('post_likes', r.id),
            legacyId: toInt(r.id),
            postId: fk('posts', r.postid),
            userId: fk('staff', r.userid),
            createdAt: created(r.dateliked),
        }),
    },
    ...Object.fromEntries(['post_comment_likes', 'comment_likes'].map((t) => [t, {
        model: 'crmPostCommentLike',
        id: 'id',
        map: (r) => ({
            id: oid(t, r.id),
            legacyId: toInt(r.id),
            postId: fk('posts', r.postid),
            commentId: fk('post_comments', r.commentid),
            userId: fk('staff', r.userid),
            createdAt: created(r.dateliked),
        }),
    }])),

    // ------------------------------------------------------------ goals
    goals: {
        model: 'crmGoal',
        id: 'id',
        map: (r) => ({
            id: oid('goals', r.id),
            legacyId: toInt(r.id),
            subject: str(r.subject) ?? '',
            description: str(r.description),
            startDate: toDate(r.start_date),
            endDate: toDate(r.end_date),
            goalType: toInt(r.goal_type),
            contractType: toInt(r.contract_type),
            achievement: toFloat(r.achievement),
            notifyWhenFail: toBool(r.notify_when_fail),
            notifyWhenAchieve: toBool(r.notify_when_achieve),
            notified: toBool(r.notified),
            staffId: fk('staff', r.staff_id),
        }),
    },

    // ------------------------------------------------------------ surveys
    surveys: {
        model: 'crmSurvey',
        id: 'surveyid',
        map: (r) => ({
            id: oid('surveys', r.surveyid),
            legacyId: toInt(r.surveyid),
            subject: str(r.subject) ?? '',
            slug: str(r.slug),
            description: str(r.description),
            viewDescription: str(r.viewdescription),
            redirectUrl: str(r.redirect_url),
            send: toBool(r.send),
            ipRestrict: toBool(r.iprestrict),
            active: toBool(r.active),
            hash: str(r.hash),
            onlyForLoggedIn: toBool(r.onlyforloggedin),
            createdAt: created(r.datecreated),
        }),
    },
    surveysendlog: {
        model: 'crmSurveySendLog',
        id: 'id',
        map: (r) => ({
            id: oid('surveysendlog', r.id),
            legacyId: toInt(r.id),
            staffId: fk('staff', r.staffid),
            surveyId: fk('surveys', r.surveyid),
            isCronFinished: toBool(r.iscronfinished),
            createdAt: created(r.date),
        }),
    },
    surveyresultsets: {
        model: 'crmSurveyResultSet',
        id: 'resultsetid',
        map: (r) => ({
            id: oid('surveyresultsets', r.resultsetid),
            legacyId: toInt(r.resultsetid),
            surveyId: fk('surveys', r.surveyid),
            ip: str(r.ip),
            userAgent: str(r.useragent),
            createdAt: created(r.date),
        }),
    },
    surveyresults: {
        model: 'crmSurveyResult',
        id: 'resultid',
        map: (r) => ({
            id: oid('surveyresults', r.resultid),
            legacyId: toInt(r.resultid),
            surveyId: fk('surveys', r.surveyid ?? (r.rel_type === 'survey' || r.rel_type == null ? r.rel_id : null)),
            questionId: fk('form_questions', r.questionid),
            boxId: fk('form_question_box', r.boxid),
            boxDescriptionId: fk('form_question_box_description', r.boxdescriptionid),
            resultSetId: fk('surveyresultsets', r.resultsetid),
            answer: str(r.answer),
        }),
    },
    form_questions: {
        model: 'crmFormQuestion',
        id: 'questionid',
        map: (r) => ({
            id: oid('form_questions', r.questionid),
            legacyId: toInt(r.questionid),
            relType: str(r.rel_type),
            relId: relOid(r.rel_type ?? 'survey', r.rel_id),
            question: str(r.question),
            required: toBool(r.required),
            questionOrder: toInt(r.question_order),
        }),
    },
    form_question_box: {
        model: 'crmFormQuestionBox',
        id: 'boxid',
        map: (r) => ({
            id: oid('form_question_box', r.boxid),
            legacyId: toInt(r.boxid),
            boxType: str(r.boxtype),
            questionId: fk('form_questions', r.questionid),
        }),
    },
    form_question_box_description: {
        model: 'crmFormQuestionBoxDescription',
        id: 'questionboxdescriptionid',
        map: (r) => ({
            id: oid('form_question_box_description', r.questionboxdescriptionid),
            legacyId: toInt(r.questionboxdescriptionid),
            description: str(r.description),
            boxId: fk('form_question_box', r.boxid),
            questionId: fk('form_questions', r.questionid),
        }),
    },
}

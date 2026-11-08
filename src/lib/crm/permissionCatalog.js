// Permission features and the capabilities that make sense for each one (shared by the API and the editor UI).
// Reconstructed from stock Perfex 3.x + the features this app checks (see docs/perfex/ARCHITECTURE.md).
// Permission features and the capabilities that make sense for each one (shared by the API and the editor UI).
// Source of truth: Perfex 3.x application/helpers/staff_helper.php (get_available_staff_permissions), plus the
// features this app adds (tickets, goals, surveys). `auto` capabilities have no checkbox: Perfex applies them
// implicitly (e.g. every staff member sees the tasks they are assigned to).
const STD = ['view', 'view_own', 'create', 'edit', 'delete']
const CRUD = ['view', 'create', 'edit', 'delete']

export const CAPABILITIES = [
    ['view', 'View'],
    ['view_own', 'View own'],
    ['create', 'Create'],
    ['edit', 'Edit'],
    ['delete', 'Delete'],
]

export const EXTRA_LABELS = {
    change_email: 'Change own sign-in email',
    view_all_templates: 'View all templates',
    login_as: 'Log in as another member',
    edit_others_notes: "Edit notes added by others",
    share: "Share notes",
    edit_others_mails: "Edit mails logged by others",
    edit_others_meetings: "Edit meetings added by others",
    send_files: 'Send files, pictures and voice messages',
    create_groups: 'Create group chats',
    call: 'Make calls',
    client_chats: 'See and answer client conversations',
    react: 'React with stamps',
    bookmark: 'Save messages (bookmarks)',
    pin: 'Pin messages in a conversation',
    edit_own: 'Edit own messages',
    delete_own: 'Delete own messages',
    delete_others: 'Delete messages of other people',
    view_team: "See everybody's growth, goals and trophies",
    approve: 'Accept, refuse and move the ideas on the board (administrators always can)',
    manage: 'Approve goals, verify certificates, pay the monthly primes and the trophy prizes',
    view_all_events: "See every event, private ones included",
    decide: 'Accept or refuse leave requests',
    close_days: "Close days for appointments (holidays, out of office)",
    edit_others_events: "Edit and delete events of others",
    create_milestones: 'Create milestones',
    edit_milestones: 'Edit milestones',
    delete_milestones: 'Delete milestones',
    edit_timesheet: 'Edit timesheets',
    edit_own_timesheet: 'Edit own timesheets',
    delete_timesheet: 'Delete timesheets',
    delete_own_timesheet: 'Delete own timesheets',
    'view-timesheets': 'View timesheet report',
    view_amounts: 'See money amounts',
    report_sales: 'Sales report',
    report_profit: 'Profit & expenses report',
    report_leads: 'Leads report',
    report_support: 'Support report',
    report_work: 'Work & time report',
}

/** One-line explanations shown under a feature name in the permission editor. */
export const FEATURE_HINTS = {
    bulk_pdf_exporter: 'Download many invoices, estimates or other documents as PDFs in one go.',
    email_templates: 'The Email templates sent by the CRM (invoices, reminders, welcome mails...).',
    settings: 'The Settings pages (company, mail server, files, numbering, AI keys...). Edit changes them; View only reads them.',
    roles: 'Roles & permissions: create roles and decide what every role can see and do.',
    staff: 'The Team members page: add, edit and remove members, their roles and their documents. "Log in as" lets someone act as another member.',
    profile: 'My profile: everyone can edit their own details; this adds the right to change their own sign-in email.',
    knowledge_base: 'The Knowledge base articles and groups (Help center).',
    tickets: 'Support tickets, their replies, departments, predefined replies and reminders.',
    surveys: 'Surveys sent to people, with the answers.',
    goals: 'Company goals with their progress.',
    checklist_templates: 'The ready-made checklists you can add to a task (Create saves a template, Delete removes one).',
    issues: 'Issues reported on projects and assigned to people.',
    tasks: 'Tasks, the Kanban board, My tasks, Team tasks and the timers. Everyone always sees the tasks assigned to them.',
    projects: 'Projects with their tasks, files, discussions, milestones and timesheets. View own = only the projects you are a member of.',
    passwords: 'The Password vault page. Each entry is also shared on its own: only the owner, selected people, or the whole team, chosen when the entry is opened. Staff without View never see the page; administrators see every entry.',
    items: 'The Items & Groups catalogue used on invoices, estimates and proposals.',
    expenses: 'Expenses and their categories, with the receipt files.',
    subscriptions: 'Recurring subscriptions billed to clients.',
    contracts: 'Contracts and their types, with signatures and renewals.',
    credit_notes: 'Credit notes issued against invoices.',
    proposals: 'Proposals sent to leads and clients, with the public link, comments and the signed copy.',
    purchase_orders: 'Purchase orders to suppliers.',
    estimates: 'Estimates (quotes) sent to clients, accepted or declined by them.',
    payments: 'The Payments list: money received on invoices. Money amounts also need "Financial figures".',
    invoices: 'Invoices and their payments, PDFs and reminders. Money amounts also need "Financial figures".',
    estimate_request: 'Estimate requests that come from the website or from clients.',
    leads: 'The lead board and the lead popup: profile, tasks, mails, meetings, files, comments and offers. View own = only the leads assigned to you or added by you.',
    customers: 'Clients with their contacts, mails, notes, files and requests. Without View the Customers menu is hidden. View own = only the clients you look after.',
    dashboard: 'The Dashboard with revenue, invoices and client figures. Administrators and people who manage roles always see it; everyone else lands on the Team dashboard.',
    activity_log: 'See what team members and clients did (sign-ins, documents, tasks, emails). Normally for administrators only.',
    finance: 'Without this, every income, total, balance and money chart shows *** (cards, lists, reports, client profiles).',
    departments: 'The Departments list (ticket departments and the people in them): see, add, edit and delete departments. Setup items such as currencies, taxes and ticket statuses stay under Settings.',
    work_hours: 'The Team hours page: everybody\'s active hours, mouse / keyboard time and days worked. People with Team members view also keep access. Everyone always sees their own hours.',
    lead_mail: 'Lead email integration: the mailboxes that turn website form emails into leads, keep the emails of leads and clients on their Mails tab (with files and meeting invitations), remind to answer and send the automatic answer. View = the list and the import log; Edit = add, change, test, check and re-read them (they hold a mail password).',
    freelancers: 'The Freelancers page: side jobs that get paid like invoices but have no number and stay out of the company dashboard, reports and goals. View own shows only the jobs this person added.',
    announcements: 'Post, edit and delete the announcements the whole team sees.',
    leave: 'Leave requests and days off (Attendance & leave in the menu). View own lets someone see their own; View lets a manager see everybody\'s',
    calendar: 'The Calendar page: tasks, deadlines, meetings and events. Without it the page and its menu entry are hidden.',
    client_reports: 'The Reports & Strategies tab of a client: reports the team sends to the client and strategies it proposes. Create writes them; Edit changes them and sends them by email to the client\'s contacts; Delete removes them.',
    client_requests: 'The Requests tab of a client: errors to report, code integrations, changes and questions that the client (or the team for the client) asks for, followed like tasks with a status the client can see. Create adds one; Edit changes it, moves it to another status, answers and makes a task from it; Delete removes it.',
    client_ideas: 'The Ideas tab of a client: ideas the team proposes to grow the client\'s business or save it money, with the AI research helper. Create writes and researches; Edit moves, answers and proposes them to the client (which sends them an email); Delete removes them. The client only sees an idea after it is proposed, and only when the client area allows Ideas.',
    notes: 'The Notes page (like Google Keep): coloured notes and checklists with reminders, pictures, voice notes, links and comments. View = write your own notes; "Share notes" = share them with colleagues (also by mentioning them with @).',
    growth: 'The My growth page: my skills and certification goals, learning ideas, points, levels and trophies, and the team playbook. Everyone can have it. "See everybody\'s growth" shows the team page; "Approve goals, set and pay primes" lets a manager approve a goal, fix the company support and prime, mark a prime paid and award trophies.',
    ai: 'AI insights: the analyses, the assistant and the routine that read your own CRM data. View = use them; Edit = change the AI keys, models and instructions in Settings. The super administrator always has both.',
    payroll: 'The Payroll page: salaries, payments and the expenses they create. View = read; Edit = change salaries and payments. The super administrator always has both. Give it with great care.',
    api: 'API and webhooks: the keys other apps (Meet, forms, automations) use, their activity, the webhooks, and the sign-in apps of the single sign-on. View = read; Edit = create, change and revoke. The super administrator always has both. Give it with great care.',
    scheduled_messages: 'Messages the CRM posts in the team chat by itself at a chosen date and time, once or repeating: to the Team room, the administrators, everybody or chosen people. Administrators only, normally.',
    grow: 'Grow for the company: the dashboard of leads, clients, tasks and income, the ideas and advice board, and the routine that writes them. Administrators only by default. View = see; Create / Edit = add, assign and turn ideas into tasks, set up the routine and the team skills and bonuses; Delete = remove ideas.',
    chat: 'The chat bubble and the Chat page: team room, direct messages and calls. Without View they are hidden and the chat refuses this person. The other switches decide who can send files, pictures and voice messages, create groups, make calls, and see and answer the conversations with clients.',
    chat_messages: 'What a person can do with the messages of the chat: react with stamps, save (bookmark) a message for later, pin it for everybody in the conversation, edit and delete their own messages, and delete the messages of other people (for moderators). Needs Team chat → View.',
    file_manager: 'The File manager page (every upload in one place). Files attached to a record stay visible to people who may see that record.',
    reports: 'Choose which reports this person may open. Money reports also need "See money amounts".',
}

export const PERMISSION_GROUPS = [
    {
        group: 'Customers & leads',
        features: [
            { key: 'customers', label: 'Customers', caps: [...CRUD, 'edit_others_mails'], auto: { view_own: 'Staff always see the customers they are an admin of' } },
            { key: 'leads', label: 'Leads', caps: ['view', 'delete', 'edit_others_notes', 'edit_others_mails', 'edit_others_meetings'], auto: { view_own: 'Staff always see leads assigned to or added by them, and can add and edit those', create: 'Any staff member can add leads', edit: 'Any staff member can edit their own leads' } },
            { key: 'client_ideas', label: 'Client ideas', caps: CRUD },
            { key: 'client_requests', label: 'Client requests', caps: CRUD },
            { key: 'client_reports', label: 'Client reports & strategies', caps: CRUD },
            { key: 'estimate_request', label: 'Estimate requests', caps: STD },
            { key: 'lead_mail', label: 'Lead email integration', caps: ['view', 'edit'] },
        ],
    },
    {
        group: 'Sales',
        features: [
            { key: 'invoices', label: 'Invoices', caps: STD },
            { key: 'payments', label: 'Payments', caps: CRUD, auto: { view_own: 'Based on the invoices the staff member can see' } },
            { key: 'estimates', label: 'Estimates', caps: STD },
            { key: 'purchase_orders', label: 'Purchase orders', caps: STD },
            { key: 'proposals', label: 'Proposals', caps: [...STD, 'view_all_templates'] },
            { key: 'credit_notes', label: 'Credit notes', caps: STD },
            { key: 'contracts', label: 'Contracts', caps: [...STD, 'view_all_templates'] },
            { key: 'subscriptions', label: 'Subscriptions', caps: STD },
            { key: 'expenses', label: 'Expenses', caps: STD },
            { key: 'freelancers', label: 'Freelancers', caps: STD },
            { key: 'items', label: 'Items', caps: CRUD },
        ],
    },
    {
        group: 'Team',
        features: [
            { key: 'dashboard', label: 'Business dashboard', caps: ['view'] },
            { key: 'activity_log', label: 'Activity log', caps: ['view'] },
        ],
    },
    {
        group: 'Work',
        features: [
            { key: 'projects', label: 'Projects', caps: [...CRUD, 'create_milestones', 'edit_milestones', 'delete_milestones'], auto: { view_own: 'Based on the projects the staff member is a member of' } },
            { key: 'leave', label: 'Attendance & leave', caps: [...STD, 'decide'], auto: { view_own: 'Staff always see their own leave' } },
            { key: 'tasks', label: 'Tasks', caps: [...CRUD, 'edit_timesheet', 'edit_own_timesheet', 'delete_timesheet', 'delete_own_timesheet'], auto: { view_own: 'Based on the tasks assigned to or followed by the staff member' } },
            { key: 'issues', label: 'Issues', caps: CRUD, auto: { view_own: 'Staff only see the issues assigned to them or reported by them' } },
            { key: 'checklist_templates', label: 'Checklist templates', caps: ['create', 'delete'] },
            { key: 'goals', label: 'Goals', caps: CRUD },
            { key: 'surveys', label: 'Surveys', caps: CRUD },
        ],
    },
    {
        group: 'Support',
        features: [
            { key: 'tickets', label: 'Tickets', caps: STD },
            { key: 'knowledge_base', label: 'Knowledge base', caps: CRUD },
        ],
    },
    {
        group: 'Tools',
        features: [
            { key: 'calendar', label: 'Calendar', caps: ['view', 'view_all_events', 'edit_others_events', 'close_days'], auto: { create: 'Anyone who can open the Calendar adds events', edit: 'Everyone edits their own events, the events they are invited to and public events', delete: 'Everyone deletes their own events, the events they are invited to and public events' } },
            { key: 'chat', label: 'Team chat', caps: ['view', 'send_files', 'create_groups', 'call', 'client_chats'], auto: {} },
            { key: 'chat_messages', label: 'Chat messages', caps: ['react', 'bookmark', 'pin', 'edit_own', 'delete_own', 'delete_others'], auto: {} },
            { key: 'notes', label: 'Notes (Keep-style memos)', caps: ['view', 'share'], auto: { create: 'Anyone who can open Notes writes notes', edit: 'Everyone edits their own notes', delete: 'Everyone deletes their own notes' } },
            { key: 'growth', label: 'My growth (skills, certifications, playbook)', caps: ['view', 'view_team', 'manage'], auto: {} },
            { key: 'ai', label: 'AI insights', caps: ['view', 'edit'] },
            { key: 'grow', label: 'Grow (company dashboard, ideas, routine)', caps: ['view', 'create', 'edit', 'approve', 'delete'] },
            { key: 'scheduled_messages', label: 'Scheduled messages (chat)', caps: ['view', 'create', 'edit', 'delete'] },
            { key: 'file_manager', label: 'File manager', caps: ['view'], auto: {} },
            { key: 'passwords', label: 'Password vault (shared logins and passwords)', caps: CRUD, auto: { view_own: 'Staff only see the entries shared with them or created by them' } },
        ],
    },
    {
        group: 'Account',
        features: [
            { key: 'profile', label: 'My profile', caps: ['change_email'], auto: {} },
        ],
    },
    {
        group: 'Administration',
        features: [
            { key: 'staff', label: 'Team members', caps: [...CRUD, 'login_as'] },
            { key: 'work_hours', label: 'Team hours', caps: ['view'] },
            { key: 'payroll', label: 'Payroll', caps: ['view', 'edit'] },
            { key: 'api', label: 'API, webhooks and sign-in apps', caps: ['view', 'edit'] },
            { key: 'roles', label: 'Roles & permissions', caps: CRUD },
            { key: 'departments', label: 'Departments', caps: CRUD },
            { key: 'announcements', label: 'Announcements', caps: CRUD },
            { key: 'settings', label: 'Settings', caps: ['view', 'edit'] },
            { key: 'email_templates', label: 'Email templates', caps: ['view', 'edit'] },
            { key: 'bulk_pdf_exporter', label: 'Bulk PDF exporter', caps: ['view'] },
        ],
    },
    {
        group: 'Money & reports',
        features: [
            { key: 'finance', label: 'Financial figures', caps: ['view_amounts'], auto: {} },
            { key: 'reports', label: 'Reports', caps: ['view', 'report_sales', 'report_profit', 'report_leads', 'report_support', 'report_work', 'view-timesheets'] },
        ],
    },
]

export const FEATURES = PERMISSION_GROUPS.flatMap((g) => g.features)
export const featureMap = Object.fromEntries(FEATURES.map((f) => [f.key, f]))

/** Keep only known feature/capability pairs; view and view_own are mutually exclusive (view wins). */
export function cleanPermissions(perms = {}) {
    const out = {}
    for (const [feature, caps] of Object.entries(perms || {})) {
        const def = featureMap[feature]
        if (!def || !Array.isArray(caps)) continue
        let list = [...new Set(caps.filter((c) => def.caps.includes(c)))]
        if (list.includes('view')) list = list.filter((c) => c !== 'view_own')
        if (list.length) out[feature] = list
    }
    return out
}

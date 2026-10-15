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
    activity_log: 'See what team members and clients did (sign-ins, documents, tasks, emails). Normally for administrators only.',
    finance: 'Without this, every income, total, balance and money chart shows *** (cards, lists, reports, client profiles).',
    reports: 'Choose which reports this person may open. Money reports also need "See money amounts".',
}

export const PERMISSION_GROUPS = [
    {
        group: 'Customers & leads',
        features: [
            { key: 'customers', label: 'Customers', caps: CRUD, auto: { view_own: 'Staff always see the customers they are an admin of' } },
            { key: 'leads', label: 'Leads', caps: ['view', 'delete'], auto: { view_own: 'Staff always see leads assigned to or added by them, and can add and edit those', create: 'Any staff member can add leads', edit: 'Any staff member can edit their own leads' } },
            { key: 'estimate_request', label: 'Estimate requests', caps: STD },
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
            { key: 'items', label: 'Items', caps: CRUD },
        ],
    },
    {
        group: 'Team',
        features: [
            { key: 'activity_log', label: 'Activity log', caps: ['view'] },
            { key: 'passwords', label: 'Password vault', caps: CRUD, auto: { view_own: 'Staff only see the entries shared with them or created by them' } },
        ],
    },
    {
        group: 'Work',
        features: [
            { key: 'projects', label: 'Projects', caps: [...CRUD, 'create_milestones', 'edit_milestones', 'delete_milestones'], auto: { view_own: 'Based on the projects the staff member is a member of' } },
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
        group: 'Account',
        features: [
            { key: 'profile', label: 'My profile', caps: ['change_email'], auto: {} },
        ],
    },
    {
        group: 'Administration',
        features: [
            { key: 'staff', label: 'Team members', caps: CRUD },
            { key: 'roles', label: 'Roles & permissions', caps: CRUD },
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

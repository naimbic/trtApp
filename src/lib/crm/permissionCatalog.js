// Permission features and the capabilities that make sense for each one (shared by the API and the editor UI).
// Reconstructed from stock Perfex 3.x + the features this app checks (see docs/perfex/ARCHITECTURE.md).
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
    create_timesheets: 'Create timesheets',
    edit_timesheets: 'Edit timesheets',
    delete_timesheets: 'Delete timesheets',
}

export const PERMISSION_GROUPS = [
    {
        group: 'Customers & leads',
        features: [
            { key: 'customers', label: 'Customers', caps: STD },
            { key: 'leads', label: 'Leads', caps: CRUD },
        ],
    },
    {
        group: 'Sales',
        features: [
            { key: 'invoices', label: 'Invoices', caps: STD },
            { key: 'payments', label: 'Payments', caps: STD },
            { key: 'estimates', label: 'Estimates', caps: STD },
            { key: 'proposals', label: 'Proposals', caps: STD },
            { key: 'credit_notes', label: 'Credit notes', caps: STD },
            { key: 'contracts', label: 'Contracts', caps: STD },
            { key: 'subscriptions', label: 'Subscriptions', caps: STD },
            { key: 'expenses', label: 'Expenses', caps: STD },
            { key: 'items', label: 'Items', caps: CRUD },
        ],
    },
    {
        group: 'Work',
        features: [
            { key: 'projects', label: 'Projects', caps: [...STD, 'create_timesheets', 'edit_timesheets', 'delete_timesheets'] },
            { key: 'tasks', label: 'Tasks', caps: STD },
            { key: 'checklist_templates', label: 'Checklist templates', caps: CRUD },
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
        group: 'Administration',
        features: [
            { key: 'staff', label: 'Team members', caps: CRUD },
            { key: 'roles', label: 'Roles & permissions', caps: CRUD },
            { key: 'settings', label: 'Settings', caps: ['view', 'edit'] },
            { key: 'email_templates', label: 'Email templates', caps: ['view', 'edit'] },
            { key: 'bulk_pdf_exporter', label: 'Bulk PDF exporter', caps: ['view'] },
            { key: 'reports', label: 'Reports', caps: ['view'] },
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

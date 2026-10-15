import { FEATURES, cleanPermissions } from './permissionCatalog.js'

/** The standard roles (name -> { feature: [capabilities] }). Used by the first-start setup and scripts/setup-roles.mjs. */
const std = (f) => FEATURES.find((x) => x.key === f)?.caps.filter((c) => c !== 'view_own') || []
const FULL = Object.fromEntries(FEATURES.map((f) => [f.key, f.caps.filter((c) => c !== 'view_own')]))
const without = (base, drop) => Object.fromEntries(Object.entries(base).filter(([k]) => !drop.includes(k)))
const pick = (spec) => Object.fromEntries(Object.entries(spec).map(([f, caps]) => [f, caps === 'all' ? std(f) : caps === 'edit' ? ['view', 'create', 'edit'].filter((c) => std(f).includes(c)) : caps === 'read' ? ['view'].filter((c) => std(f).includes(c)) : caps]))
const REPORT = (...kinds) => ['view', ...kinds.map((k) => `report_${k}`)]

export const ROLES = {
    'Super Admin': FULL,
    Admin: { ...FULL, roles: ['view', 'create', 'edit'], staff: ['view', 'create', 'edit'] },
    'Account Manager': pick({
        customers: 'edit', leads: 'edit', estimates: 'edit', proposals: 'edit', contracts: 'edit', invoices: 'edit', payments: ['view', 'create'], expenses: 'read',
        projects: 'edit', tasks: 'edit', tickets: 'edit', knowledge_base: 'read', items: 'read', finance: ['view_amounts'], reports: REPORT('sales', 'leads', 'support', 'work'),
    }),
    Editor: pick({
        customers: 'edit', leads: 'edit', proposals: 'edit', contracts: 'edit', estimates: 'edit', projects: 'edit', tasks: 'edit', tickets: 'edit', knowledge_base: 'all', goals: 'edit',
        reports: REPORT('leads', 'support', 'work'),
    }),
    'Sales Rep': pick({
        customers: 'edit', leads: ['view'], estimates: 'edit', proposals: 'edit', contracts: 'read', items: 'read', tasks: 'edit', tickets: 'read', finance: ['view_amounts'], reports: REPORT('leads'),
    }),
    'Support Agent': pick({ customers: 'read', tickets: 'edit', knowledge_base: 'all', tasks: 'edit', projects: 'read', reports: REPORT('support') }),
    Accountant: pick({
        customers: 'read', invoices: 'all', payments: 'all', credit_notes: 'all', expenses: 'all', subscriptions: 'all', estimates: 'read', purchase_orders: 'all', items: 'all',
        finance: ['view_amounts'], reports: REPORT('sales', 'profit'),
    }),
    'Project Manager': pick({
        customers: 'read', projects: 'all', tasks: 'all', checklist_templates: ['create', 'delete'], tickets: 'read', goals: 'read', reports: REPORT('work', 'support'),
    }),
    Viewer: pick(Object.fromEntries(FEATURES.filter((f) => !['staff', 'roles', 'settings', 'email_templates', 'passwords', 'finance', 'bulk_pdf_exporter', 'profile'].includes(f.key)).map((f) => [f.key, 'read']))),
}

export const standardRolePermissions = (name) => cleanPermissions(ROLES[name])

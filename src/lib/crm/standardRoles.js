import { FEATURES, cleanPermissions } from './permissionCatalog.js'

/** The standard roles (name -> { feature: [capabilities] }). Used by the first-start setup and scripts/setup-roles.mjs. */
const std = (f) => FEATURES.find((x) => x.key === f)?.caps.filter((c) => c !== 'view_own') || []
const FULL = Object.fromEntries(FEATURES.map((f) => [f.key, f.caps.filter((c) => c !== 'view_own')]))
const without = (base, drop) => Object.fromEntries(Object.entries(base).filter(([k]) => !drop.includes(k)))
const pick = (spec) => Object.fromEntries(Object.entries(spec).map(([f, caps]) => [f, caps === 'all' ? std(f) : caps === 'edit' ? ['view', 'create', 'edit'].filter((c) => std(f).includes(c)) : caps === 'read' ? ['view'].filter((c) => std(f).includes(c)) : caps]))
// salaries, API keys and AI keys stay with the Super Admin unless a role is given them on purpose
const SENSITIVE = ['payroll', 'api', 'ai', 'my_space']
const REPORT = (...kinds) => ['view', ...kinds.map((k) => `report_${k}`)]

const TOOLS = { calendar: ['view'], chat: ['view', 'send_files', 'create_groups', 'call', 'client_chats'], chat_messages: ['react', 'bookmark', 'pin', 'edit_own', 'delete_own'], file_manager: ['view'], growth: ['view'], notes: ['view', 'share'] }
const withTools = (roles) => Object.fromEntries(Object.entries(roles).map(([n, p]) => [n, { ...TOOLS, ...p }]))

export const ROLES = withTools({
    'Super Admin': FULL,
    Admin: { ...without(FULL, SENSITIVE), roles: ['view', 'create', 'edit'], staff: ['view', 'create', 'edit'] },
    'Account Manager': pick({
        customers: 'edit', ai_email: 'all', lead_mails: 'all', lead_tabs: 'all', client_tabs: 'all', client_mails: 'all', client_files: 'edit', client_ideas: 'edit', client_requests: 'edit', client_reports: 'edit', client_report_files: 'all', leads: 'edit', estimates: 'edit', proposals: 'edit', contracts: 'edit', invoices: 'edit', payments: ['view', 'create'], expenses: 'read',
        projects: 'edit', tasks: 'edit', task_checklist: 'all', issues: 'edit', tickets: 'edit', knowledge_base: 'read', items: 'read', finance: ['view_amounts'], reports: REPORT('sales', 'leads', 'support', 'work'),
    }),
    Editor: pick({
        customers: 'edit', ai_email: 'all', lead_mails: 'all', lead_tabs: 'all', client_tabs: 'all', client_mails: 'all', client_files: 'edit', leads: 'edit', proposals: 'edit', contracts: 'edit', estimates: 'edit', projects: 'edit', tasks: 'edit', task_checklist: 'all', issues: 'edit', tickets: 'edit', knowledge_base: 'all', goals: 'edit',
        reports: REPORT('leads', 'support', 'work'),
    }),
    'Sales Rep': pick({
        customers: 'edit', ai_email: 'all', lead_mails: 'all', lead_tabs: 'all', client_tabs: 'all', client_mails: 'all', client_files: 'edit', client_ideas: 'edit', client_requests: 'edit', client_reports: 'edit', client_report_files: 'all', leads: ['view'], estimates: 'edit', proposals: 'edit', contracts: 'read', items: 'read', tasks: 'edit', task_checklist: 'all', tickets: 'read', finance: ['view_amounts'], reports: REPORT('leads'),
    }),
    'Support Agent': pick({ customers: 'read', client_requests: 'edit', tickets: 'edit', knowledge_base: 'all', tasks: 'edit', task_checklist: 'all', issues: 'edit', projects: 'read', reports: REPORT('support') }),
    Accountant: pick({
        customers: 'read', invoices: 'all', payments: 'all', credit_notes: 'all', expenses: 'all', subscriptions: 'all', estimates: 'read', purchase_orders: 'all', items: 'all',
        finance: ['view_amounts'], reports: REPORT('sales', 'profit'),
    }),
    'Project Manager': pick({
        customers: 'read', projects: 'all', tasks: 'all', issues: 'all', checklist_templates: ['create', 'delete'], tickets: 'read', goals: 'read', reports: REPORT('work', 'support'),
    }),
    Viewer: pick(Object.fromEntries(FEATURES.filter((f) => !['staff', 'roles', 'settings', 'email_templates', 'passwords', 'activity_log', 'dashboard', 'finance', 'profile', 'ai_email', ...SENSITIVE].includes(f.key)).map((f) => [f.key, 'read']))),
})

export const standardRolePermissions = (name) => cleanPermissions(ROLES[name])

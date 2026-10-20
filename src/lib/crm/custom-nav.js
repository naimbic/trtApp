// Nav entries for hand-built pages that are not generic resources.
// { group, key, title, path, feature }
export const customNavItems = [
    { group: 'Tasks', key: 'my-tasks', title: 'My tasks', path: '/crm/my-tasks', feature: 'tasks' },
    { group: 'Tasks', key: 'team-tasks', title: 'Team tasks', path: '/crm/team-tasks', feature: 'tasks' },
    { group: 'Tasks', key: 'timeline', title: 'Timeline', path: '/crm/timeline', feature: 'tasks' },
    { group: 'Tasks', key: 'time-report', title: 'Time report', path: '/crm/time-report', feature: 'tasks' },
    { group: 'Tasks', key: 'issues', title: 'Issues', path: '/crm/issues', feature: 'issues' },
    { group: 'Projects', key: 'scrum-board', title: 'Scrum board', path: '/crm/scrum-board', feature: 'tasks' },
    { group: 'Tasks', key: 'notes', title: 'Notes', path: '/crm/notes', feature: 'tasks' },
    { group: 'Tasks', key: 'tasks-board', title: 'Tasks board', path: '/crm/tasks-board', feature: 'tasks' },
    { group: 'Administration', key: 'work-hours', title: 'Work hours', path: '/crm/work-hours', feature: 'staff' },
    { group: 'Setup', key: 'platform-settings', title: 'Settings', path: '/crm/settings', feature: 'settings' },
    { group: 'Setup', key: 'mails', title: 'Mails', path: '/crm/mails', feature: 'email_templates' },
    { group: 'Sales', key: 'purchase-orders', title: 'Purchase orders', path: '/crm/purchase-orders', feature: 'purchase_orders' },
    { group: 'Knowledge Base', key: 'help-center', title: 'Help center', path: '/crm/knowledge-base', feature: 'knowledge_base' },
    { group: 'Knowledge Base', key: 'kb-manage', title: 'Manage articles', path: '/crm/knowledge-base/manage', feature: 'knowledge_base' },
    { group: 'Utilities', key: 'ai', title: 'AI insights', path: '/crm/ai', feature: null, superOnly: true },
    { group: 'Utilities', key: 'reports', title: 'Reports', path: '/crm/reports', feature: 'reports' },
    { group: 'Utilities', key: 'passwords', title: 'Password vault', path: '/crm/passwords', feature: 'passwords' },
    { group: 'Utilities', key: 'file-manager', title: 'File manager', path: '/crm/file-manager', feature: 'file_manager' },
]

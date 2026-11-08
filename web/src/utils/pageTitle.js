import { getResource } from '@/lib/crm/resources'
import { customNavItems } from '@/lib/crm/custom-nav'
import { tr } from '@/utils/t'

// Pages whose title is not a resource name (or reads better another way), by path without the leading slash
const STATIC = {
    '': 'Dashboard', dashboard: 'Dashboard', 'team-dashboard': 'Team dashboard', calendar: 'Calendar', team: 'Team', versions: 'Versions',
    'account/profile': 'My profile', 'account/security': 'Security',
    'crm/settings': 'Settings', 'crm/company': 'Company', 'crm/staff': 'Team', 'crm/roles': 'Roles & permissions', 'crm/chat': 'Chat',
    'crm/tasks-board': 'Tasks board', 'crm/my-tasks': 'My tasks', 'crm/team-tasks': 'Team tasks', 'crm/scrum-board': 'Scrum board', 'crm/tasks': 'Tasks',
    'crm/all-activity': 'Activity log', 'crm/activity': 'Activity log', 'crm/leave-requests': 'Leave requests', 'crm/days-off': 'Days off', 'crm/work-hours': 'Work hours',
    'crm/knowledge-base': 'Help center', 'crm/scheduled-messages': 'Scheduled messages', 'crm/time-report': 'Time report', 'crm/timeline': 'Timeline',
    'crm/lead-email-integration': 'Lead emails', 'crm/file-manager': 'Files', 'crm/my-growth': 'My growth', 'crm/grow': 'Grow', 'crm/ai': 'AI',
    'crm/api': 'Sign-in & API', 'crm/status': 'Statuses', 'crm/statuses': 'Statuses', 'crm/projects': 'Projects', 'crm/customers-setting': 'Customers setting',
}
const human = (s) => s.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** The title of the page at this path (translated), without the platform name. */
export function pageTitleFor(pathname) {
    const segs = String(pathname || '/').split('/').filter(Boolean)
    const key2 = segs.slice(0, 2).join('/')
    const seg = segs[0] === 'crm' ? segs[1] : segs[0]
    let base = STATIC[key2] || (segs[0] === 'crm' ? '' : STATIC[segs[0] || '']) || ''
    if (!base && seg) base = getResource(seg)?.plural || customNavItems.find((i) => i.key === seg)?.title || human(seg)
    if (!base) base = 'Dashboard'
    const last = segs[segs.length - 1]
    const extra = last === 'new' ? 'New' : last === 'edit' || (segs.length > 2 && segs.includes('edit')) ? 'Edit' : ''
    return extra ? `${tr(base)} · ${tr(extra)}` : tr(base)
}

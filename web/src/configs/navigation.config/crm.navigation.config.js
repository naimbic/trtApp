import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { resources } from '@/lib/crm/resources'
import { customNavItems } from '@/lib/crm/custom-nav'

// Sidebar built from the Perfex resource registry (src/lib/crm/resources/*).
const GROUP_ORDER = [
    ['Sales', 'crmSales'],
    ['Customers', 'crmCustomers'],
    ['Leads', 'crmLeads'],
    ['Projects', 'crmProjects'],
    ['Tasks', 'crmTasks'],
    ['Purchases', 'crmPurchases'],
    ['Support', 'crmSupport'],
    ['Knowledge Base', 'crmKnowledgeBase'],
    ['Administration', 'crmAdministration'],
    ['Setup', 'crmSetup'],
    ['Utilities', 'crmUtilities'],
]

const authorityFor = (feature) =>
    feature
        ? ['admin', 'crm.admin', `crm.${feature}.view`, `crm.${feature}.view_own`]
        : ['admin', 'crm.admin', 'user']

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

// Per group: important items first, the rest folded into sub-groups. Anything not listed is appended at the end.
const S = (key, title, items) => ({ sub: key, title, items })
const LAYOUT = {
    Customers: ['clients', 'contacts', S('more', 'More', ['customer-groups', 'vault', 'consent-purposes'])],
    Leads: ['leads', S('setup', 'Lead setup', ['lead-sources', 'lead-statuses', 'web-to-lead', 'lead-email-integration'])],
    Projects: ['projects', 'scrum-board', 'milestones'],
    Tasks: ['my-tasks', 'team-tasks', 'time-report', 'issues', 'tasks-board', 'tasks', 'task-timers', S('hr', 'Attendance & leave', ['timesheets', 'leave-requests', 'days-off']), S('setup', 'Templates', ['checklist-templates'])],
    Sales: [
        'invoices', 'payments', 'estimates', 'proposals', 'contracts', 'purchase-orders', 'credit-notes', 'subscriptions', 'expenses',
        S('catalog', 'Items & catalog', ['items', 'item-groups']),
        S('setup', 'Sales setup', ['expense-categories', 'contract-types']),
    ],
    Support: [
        'tickets',
        S('setup', 'Ticket setup', ['ticket-statuses', 'ticket-priorities', 'services', 'predefined-replies']),
        S('email', 'Email & spam', ['spam-filters', 'ticket-pipe-log', 'tracked-mails', 'mail-queue']),
    ],
    'Knowledge Base': ['help-center', 'kb-manage'],
    Administration: ['staff', 'roles', 'departments', S('comms', 'Communication', ['announcements', 'newsfeed']), 'modules'],
    Setup: [
        'platform-settings', 'mails',
        S('finance', 'Finance', ['currencies', 'taxes', 'payment-modes']),
        S('data', 'Data', ['custom-fields', 'tags', 'countries']),
    ],
    Utilities: [
        'reports', 'file-manager', 'passwords',
        S('tools', 'Personal', ['todos', 'reminders', 'notes', 'events']),
        S('team', 'Team & feedback', ['goals', 'surveys', 'notifications']),
        S('more', 'System', ['files', 'activity-log']),
    ],
}

const groups = GROUP_ORDER.map(([group, icon]) => {
    const flat = [
        ...customNavItems.filter((i) => i.group === group),
        ...resources
            .filter((r) => r.group === group && r.nav !== false && !r.hidden)
            .map((r) => ({ key: r.key, title: r.plural, path: `/crm/${r.key}`, feature: r.feature })),
    ]
    const byKey = Object.fromEntries(flat.map((i) => [i.key, i]))
    const used = new Set()
    const take = (k) => {
        used.add(k)
        return byKey[k]
    }
    const items = []
    for (const e of LAYOUT[group] || []) {
        if (typeof e === 'string') {
            if (byKey[e]) items.push(take(e))
        } else {
            const kids = e.items.filter((k) => byKey[k]).map(take)
            if (kids.length) items.push({ sub: e.sub, title: e.title, items: kids })
        }
    }
    flat.filter((i) => !used.has(i.key)).forEach((i) => items.push(i))
    return { group, icon, items, flat }
}).filter((g) => g.flat.length)

const itemNode = (group, i) => ({
    key: `crm.${i.key}`,
    path: i.path,
    title: i.title,
    translateKey: `nav.crm.item.${i.key}`,
    icon: `nav.${i.key}`,
    type: NAV_ITEM_TYPE_ITEM,
    authority: authorityFor(i.feature),
    meta: { description: { translateKey: `nav.crm.item.${i.key}Desc`, label: i.title } },
    subMenu: [],
})

const entryNode = (group, e) =>
    e.sub
        ? {
              key: `crm.group.${slug(group)}.${e.sub}`,
              path: '',
              title: e.title,
              translateKey: `nav.crm.sub.${slug(group)}.${e.sub}`,
              icon: `sub.${e.sub}`,
              type: NAV_ITEM_TYPE_COLLAPSE,
              authority: ['admin', 'crm.admin', ...e.items.flatMap((i) => authorityFor(i.feature)).filter((a) => a !== 'user')],
              subMenu: e.items.map((i) => itemNode(group, i)),
          }
        : itemNode(group, e)

const crmNavigationConfig = groups.length
    ? [
          {
              key: 'crm',
              path: '',
              title: 'CRM',
              translateKey: 'nav.crm.crm',
              icon: 'crm',
              type: NAV_ITEM_TYPE_TITLE,
              authority: ['admin', 'crm.admin', 'user'],
              meta: { horizontalMenu: { layout: 'columns', columns: 3 } },
              subMenu: groups.map(({ group, icon, items, flat }) => ({
                  key: `crm.group.${slug(group)}`,
                  path: '',
                  title: group,
                  translateKey: `nav.crm.${slug(group)}`,
                  icon,
                  type: NAV_ITEM_TYPE_COLLAPSE,
                  authority: ['admin', 'crm.admin', ...flat.flatMap((i) => authorityFor(i.feature)).filter((a) => a !== 'user')],
                  meta: { description: { translateKey: `nav.crm.${slug(group)}Desc`, label: group } },
                  subMenu: items.map((e) => entryNode(group, e)),
              })),
          },
      ]
    : []

export default crmNavigationConfig

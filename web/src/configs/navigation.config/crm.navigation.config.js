import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { resources } from '@/lib/crm/resources'
import { customNavItems } from '@/lib/crm/custom-nav'

// Sidebar built from the Perfex resource registry (src/lib/crm/resources/*) and the hand-built pages (src/lib/crm/custom-nav.js).
// The structure is written here, once: six pills for the daily work, then "More" (one column per topic). Rules: a column holds 3 items or more,
// there is no "More" column inside a pill, and every area ends with its own "... setting" entry (all of them open Lists & statuses, already filtered).
const col = (title, items) => ({ sub: title.toLowerCase().replace(/[^a-z]+/g, ''), title, items })
const STRUCTURE = [
    { group: 'Leads', icon: 'crmLeads', entries: ['leads', 'web-to-lead', 'lead-email-integration', 'leads-setting'] },
    { group: 'Tasks', icon: 'crmTasks', entries: [col('Work', ['tasks-board', 'my-tasks', 'team-tasks', 'timeline', 'notes', 'todos']), col('Tracking', ['time-report', 'task-timers', 'issues', 'statuses', 'checklist-templates', 'tasks-setting'])] },
    { group: 'Customers', icon: 'crmCustomers', entries: ['clients', 'contacts', 'passwords', 'file-manager', 'customers-setting'] },
    { group: 'Sales', icon: 'crmSales', entries: [col('Documents', ['invoices', 'estimates', 'proposals', 'contracts', 'purchase-orders']), col('Money & catalog', ['payments', 'expenses', 'credit-notes', 'subscriptions', 'items', 'freelancers', 'sales-setting'])] },
    { group: 'Projects', icon: 'crmProjects', entries: ['projects', 'scrum-board', 'milestones'] },
    { group: 'Growth & insight', icon: 'crmUtilities', entries: ['grow', 'goals', 'surveys', 'my-growth', 'reports', 'ai', 'activity-log'] },
    { group: 'Support & Help', icon: 'crmSupport', entries: ['tickets', 'help-center', 'kb-manage', 'support-setting'] },
    { group: 'Team', icon: 'crmAdministration', entries: ['staff', 'roles', 'announcements', 'scheduled-messages', 'team-setting'] },
    { group: 'Time & pay', icon: 'crmAdministration', entries: ['work-hours', 'timesheets', 'leave-requests', 'days-off', 'payroll'] },
    { group: 'Setup', icon: 'crmSetup', entries: ['platform-settings', 'mails', 'lists', 'custom-fields', 'countries', 'api', 'files'] },
]

// `also`: newer, narrower permissions that open the same page (next to the older broad one)
const authorityFor = (feature, also = []) =>
    feature
        ? ['admin', 'crm.admin', `crm.${feature}.view`, `crm.${feature}.view_own`, ...also.map((a) => `crm.${a}.view`), ...(feature === 'checklist_templates' ? ['crm.checklist_templates.create'] : [])]
        : ['admin', 'crm.admin', 'user']

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const pool = Object.fromEntries([
    ...customNavItems,
    ...resources.filter((r) => r.nav !== false && !r.hidden).map((r) => ({ key: r.key, title: r.plural, path: `/crm/${r.key}`, feature: r.feature, also: r.also })),
].map((i) => [i.key, i]))
// pages that live in the profile menu (top right) instead of the menu: placed there, so they are not "lost"
const IN_PROFILE_MENU = ['reminders', 'events', 'notifications']
const placed = new Set([...IN_PROFILE_MENU, ...STRUCTURE.flatMap((g) => g.entries.flatMap((e) => (typeof e === 'string' ? [e] : e.items)))])
// a page nobody placed still shows (at the end of Setup), so nothing is ever missing from the menu
const lost = Object.keys(pool).filter((k) => !placed.has(k))
if (lost.length && import.meta.env?.DEV) console.warn('[menu] pages not placed in the structure:', lost.join(', '))

const groups = STRUCTURE.map(({ group, icon, entries }) => {
    const list = group === 'Setup' ? [...entries, ...lost] : entries
    const items = []
    for (const e of list) {
        if (typeof e === 'string') { if (pool[e]) items.push(pool[e]) } else {
            const kids = e.items.filter((k) => pool[k]).map((k) => pool[k])
            if (kids.length) items.push({ sub: e.sub, title: e.title, items: kids })
        }
    }
    const flat = items.flatMap((i) => (i.sub ? i.items : [i]))
    return { group, icon, items, flat }
}).filter((g) => g.flat.length)

const itemNode = (group, i) => ({
    key: `crm.${i.key}`,
    path: i.path,
    title: i.title,
    translateKey: `nav.crm.item.${i.key}`,
    icon: `nav.${i.key}`,
    type: NAV_ITEM_TYPE_ITEM,
    authority: i.superOnly ? ['admin', 'crm.admin'] : authorityFor(i.feature, i.also), // AI insights: the super administrator only
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
              authority: ['admin', 'crm.admin', ...e.items.flatMap((i) => authorityFor(i.feature, i.also)).filter((a) => a !== 'user')],
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
                  authority: ['admin', 'crm.admin', ...flat.flatMap((i) => authorityFor(i.feature, i.also)).filter((a) => a !== 'user')],
                  meta: { description: { translateKey: `nav.crm.${slug(group)}Desc`, label: group } },
                  subMenu: items.map((e) => entryNode(group, e)),
              })),
          },
      ]
    : []

export default crmNavigationConfig

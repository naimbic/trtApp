import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { resources } from '@/lib/crm/resources'
import { customNavItems } from '@/lib/crm/custom-nav'

// Sidebar built from the Perfex resource registry (src/lib/crm/resources/*).
const GROUP_ORDER = [
    ['Customers', 'crmCustomers'],
    ['Leads', 'crmLeads'],
    ['Projects', 'crmProjects'],
    ['Tasks', 'crmTasks'],
    ['Sales', 'crmSales'],
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

const groups = GROUP_ORDER.map(([group, icon]) => {
    const items = [
        ...customNavItems.filter((i) => i.group === group),
        ...resources
            .filter((r) => r.group === group && r.nav !== false && !r.hidden)
            .map((r) => ({ key: r.key, title: r.plural, path: `/crm/${r.key}`, feature: r.feature })),
    ]
    return { group, icon, items }
}).filter((g) => g.items.length)

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
              subMenu: groups.map(({ group, icon, items }) => ({
                  key: `crm.${slug(group)}`,
                  path: '',
                  title: group,
                  translateKey: `nav.crm.${slug(group)}`,
                  icon,
                  type: NAV_ITEM_TYPE_COLLAPSE,
                  authority: ['admin', 'crm.admin', ...items.flatMap((i) => authorityFor(i.feature)).filter((a) => a !== 'user')],
                  meta: { description: { translateKey: `nav.crm.${slug(group)}Desc`, label: group } },
                  subMenu: items.map((i) => ({
                      key: `crm.${slug(group)}.${i.key}`,
                      path: i.path,
                      title: i.title,
                      translateKey: `nav.crm.item.${i.key}`,
                      icon: '',
                      type: NAV_ITEM_TYPE_ITEM,
                      authority: authorityFor(i.feature),
                      meta: { description: { translateKey: `nav.crm.item.${i.key}Desc`, label: i.title } },
                      subMenu: [],
                  })),
              })),
          },
      ]
    : []

export default crmNavigationConfig

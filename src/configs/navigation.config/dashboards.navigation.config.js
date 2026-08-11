import { DASHBOARDS_PREFIX_PATH } from '@/constants/route.constant'
import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ } from '@/constants/roles.constant'

const dashboardsNavigationConfig = [
    {
        key: 'dashboard',
        path: '',
        title: 'Dashboard',
        translateKey: 'nav.dashboard.dashboard',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ],
        meta: {
            horizontalMenu: {
                layout: 'default',
            },
        },
        subMenu: [
            {
                key: 'dashboard.analytic',
                path: `${DASHBOARDS_PREFIX_PATH}/analytic`,
                title: 'Analytic',
                translateKey: 'nav.dashboard.analytic',
                icon: 'dashboardAnalytic',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ],
                subMenu: [],
            },
            {
                key: 'dashboard.redirects',
                path: `${DASHBOARDS_PREFIX_PATH}/redirects`,
                title: 'Redirects & 404s',
                translateKey: 'nav.dashboard.redirects',
                icon: 'documentation',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN],
                subMenu: [],
            },
            {
                key: 'dashboard.submissions',
                path: `${DASHBOARDS_PREFIX_PATH}/submissions`,
                title: 'Submissions',
                translateKey: 'nav.dashboard.submissions',
                icon: 'documentation',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN],
                subMenu: [],
            },
            {
                key: 'dashboard.sites',
                path: `${DASHBOARDS_PREFIX_PATH}/sites`,
                title: 'Sites',
                translateKey: 'nav.dashboard.sites',
                icon: 'dashboardAnalytic',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN],
                subMenu: [],
            },
        ],
    },
]

export default dashboardsNavigationConfig

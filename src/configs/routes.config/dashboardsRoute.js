import { ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ } from '@/constants/roles.constant'

const dashboardsRoute = {
    '/dashboards/ecommerce': {
        key: 'dashboard.ecommerce',
        authority: [ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ],
        meta: {
            pageContainerType: 'contained',
        },
    },
    '/dashboards/project': {
        key: 'dashboard.project',
        authority: [ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ],
        meta: {
            pageContainerType: 'contained',
        },
    },
    '/dashboards/marketing': {
        key: 'dashboard.marketing',
        authority: [ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ],
        meta: {
            pageContainerType: 'contained',
        },
    },
    '/dashboards/analytic': {
        key: 'dashboard.analytic',
        authority: [ADMIN, USER, SUPERVISOR, SUPPORT, AUDITOR, REPORTS_READ],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    '/dashboards/redirects': {
        key: 'dashboard.redirects',
        authority: [ADMIN],
        meta: {
            pageContainerType: 'contained',
        },
    },
    '/dashboards/submissions': {
        key: 'dashboard.submissions',
        authority: [ADMIN],
        meta: {
            pageContainerType: 'contained',
        },
    },
    '/dashboards/sites': {
        key: 'dashboard.sites',
        authority: [ADMIN],
        meta: {
            pageContainerType: 'contained',
        },
    },
}

export default dashboardsRoute

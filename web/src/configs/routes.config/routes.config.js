import { lazy } from 'react'
import authRoute from './authRoute'
import othersRoute from './othersRoute'

export const publicRoutes = [...authRoute]

// Every CRM resource shares one generic route; hand-built screens get their own entry first.
export const protectedRoutes = [
    {
        key: 'dashboard',
        path: '/dashboard',
        component: lazy(() => import('@/views/crm/Dashboard')),
        authority: [],
    },
    {
        key: 'calendar',
        path: '/calendar',
        component: lazy(() => import('@/views/crm/calendar/Calendar')),
        authority: [],
    },
    {
        key: 'team',
        path: '/team',
        component: lazy(() => import('@/views/crm/team/Team')),
        authority: [],
    },
    {
        key: 'crm.staff',
        path: '/crm/staff',
        component: lazy(() => import('@/views/crm/team/Team')),
        authority: [],
    },
    {
        key: 'crm.tasks-board',
        path: '/crm/tasks-board',
        component: lazy(() => import('@/views/crm/ResourcePage')),
        authority: [],
    },
    {
        key: 'crm.resource',
        path: '/crm/:resource',
        component: lazy(() => import('@/views/crm/ResourcePage')),
        authority: [],
    },
    ...othersRoute,
]

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
        key: 'account.security',
        path: '/account/security',
        component: lazy(() => import('@/views/account/Security')),
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
        key: 'crm.roles',
        path: '/crm/roles',
        component: lazy(() => import('@/views/crm/team/Team')),
        authority: [],
    },
    {
        key: 'crm.clients',
        path: '/crm/clients',
        component: lazy(() => import('@/views/crm/clients/ClientsList')),
        authority: [],
    },
    {
        key: 'crm.clients.new',
        path: '/crm/clients/new',
        component: lazy(() => import('@/views/crm/clients/ClientForm')),
        authority: [],
    },
    {
        key: 'crm.clients.edit',
        path: '/crm/clients/:id/edit',
        component: lazy(() => import('@/views/crm/clients/ClientForm')),
        authority: [],
    },
    {
        key: 'crm.clients.detail',
        path: '/crm/clients/:id',
        component: lazy(() => import('@/views/crm/clients/ClientDetail')),
        authority: [],
    },
    { key: 'crm.invoices', path: '/crm/invoices', component: lazy(() => import('@/views/crm/sales/InvoicesList')), authority: [] },
    { key: 'crm.invoices.new', path: '/crm/invoices/new', component: lazy(() => import('@/views/crm/sales/InvoiceEditor')), authority: [] },
    { key: 'crm.invoices.edit', path: '/crm/invoices/:id/edit', component: lazy(() => import('@/views/crm/sales/InvoiceEditor')), authority: [] },
    { key: 'crm.invoices.view', path: '/crm/invoices/:id', component: lazy(() => import('@/views/crm/sales/InvoiceView')), authority: [] },
    { key: 'crm.contracts', path: '/crm/contracts', component: lazy(() => import('@/views/crm/sales/ContractsList')), authority: [] },
    { key: 'crm.contracts.view', path: '/crm/contracts/:id', component: lazy(() => import('@/views/crm/sales/ContractView')), authority: [] },
    { key: 'crm.mails', path: '/crm/mails', component: lazy(() => import('@/views/crm/mail/Mails')), authority: [] },
    { key: 'crm.payments', path: '/crm/payments', component: lazy(() => import('@/views/crm/sales/PaymentsList')), authority: [] },
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

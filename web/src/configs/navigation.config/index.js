import { NAV_ITEM_TYPE_ITEM } from '@/constants/navigation.constant'
import crmNavigationConfig from './crm.navigation.config'

const navigationConfig = [
    {
        key: 'dashboard',
        path: '/dashboard',
        title: 'Dashboard',
        translateKey: 'nav.dashboard',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'calendar',
        path: '/calendar',
        title: 'Calendar',
        translateKey: 'nav.calendar',
        icon: 'calendar',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'team',
        path: '/team',
        title: 'Team',
        translateKey: 'nav.team',
        icon: 'team',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['admin', 'crm.admin', 'crm.staff.view', 'crm.staff.view_own'],
        subMenu: [],
    },
    ...crmNavigationConfig,
]

export default navigationConfig

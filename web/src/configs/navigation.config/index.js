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
    ...crmNavigationConfig,
]

export default navigationConfig

import dashboardsNavigationConfig from './dashboards.navigation.config'
import othersNavigationConfig from './others.navigation.config'

// Only the real TRT tools are shown in the sidebar. The Ecme template's demo
// sections (concepts, ui-components, guide, auth) are intentionally excluded to
// keep the dashboard focused. Their pages still exist under src/app if needed.
const navigationConfig = [
    ...dashboardsNavigationConfig,
    ...othersNavigationConfig,
]

export default navigationConfig

import dashboardsRoute from './dashboardsRoute'
import conceptsRoute from './conceptsRoute'
import uiComponentsRoute from './uiComponentsRoute'
import authDemoRoute from './authDemoRoute'
import guideRoute from './guideRoute'

// TEMPORARY: the original template demo pages (dashboards, concepts, UI components, guide / docs).
// Delete this file, its import in routes.config.js and the views/ folders when the CRM is finished.
const open = (routes) => routes.map((r) => ({ ...r, authority: [] }))

export default open([...dashboardsRoute, ...conceptsRoute, ...uiComponentsRoute, ...authDemoRoute, ...guideRoute])

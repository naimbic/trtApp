import admin from './admin'
import crm from './crm'
import work from './work'
import sales from './sales'
import support from './support'

export const resources = [...crm, ...work, ...sales, ...support, ...admin]
export const resourceMap = Object.fromEntries(resources.map((r) => [r.key, r]))
export const getResource = (key) => resourceMap[key] || null

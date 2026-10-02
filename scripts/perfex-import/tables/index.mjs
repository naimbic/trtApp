// Aggregates every domain mapper. Each file exports an object:
//   { [sourceTableWithoutPrefix]: { model: 'crmClient', id: 'userid' | ['a','b'], map(row, h) { return {...} } } }
// `model` is the Prisma delegate name. `id` is the source primary key column(s).
// `map` returns the Prisma `data` object INCLUDING `id: oid(table, row.<pk>)` and `legacyId`.
import admin from './admin.mjs'
import crm from './crm.mjs'
import work from './work.mjs'
import sales from './sales.mjs'
import support from './support.mjs'

export default { ...admin, ...crm, ...work, ...sales, ...support }

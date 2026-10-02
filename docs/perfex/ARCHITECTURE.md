# Perfex CRM → trtApp port: architecture & conventions

Goal: every Perfex 3.4 model (table) and function exists in trtApp, using trtApp's
design system and components, with all historical TRT data importable. Work is
additive (new files) so it can be re-applied on a fresh trtApp template.

## Stack decisions
- Database stays MongoDB + Prisma (trtApp's existing stack). Multi-file schema in `prisma/schema/`
  (`base.prisma` = original template, `crm-*.prisma` = Perfex port).
- Money = `Float` rounded to 2 decimals (`Math.round(x*100)/100`); importer verifies sums per currency.
- Dates: `DateTime`. MySQL datetimes are imported as UTC.
- UI language: English first (`messages/en.json`, fall back for other locales).

## Naming
- Prisma model `Crm<Name>` (PascalCase singular), `@@map("crm_<perfex_table_without_tbl_prefix>")`.
  Delegate name = `crm<Name>` (e.g. `prisma.crmClient`).
- Every model has:
  ```prisma
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  legacyId  Int?     // original Perfex PK (omit only for composite-key / pure-link tables)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ```
  plus `@@index` on every foreign key and on commonly filtered columns.
- Foreign keys are `String @db.ObjectId` fields named `<thing>Id`, with Prisma `@relation`
  only where the UI needs `include` (otherwise plain indexed FK is fine).
- Perfex columns map to camelCase fields (`datecreated` → `createdAtLegacy`? NO: use
  `dateCreated`; keep the meaning, normalise the spelling: `clientid` → `clientId`,
  `addedfrom` → `addedFrom`, `duedate` → `dueDate`). `createdAt` is the Prisma timestamp; when the
  source has its own created date (`datecreated`, `dateadded`, `date_created`), map it to `createdAt`
  during import AND do not duplicate it as a separate field.
- Perfex enum-ish ints (status 1..5, etc.) stay as `Int` with the Perfex meaning documented in a
  comment above the field. Do not invent new codes.
- Polymorphic `rel_type` / `rel_id` pairs: `relType String`, `relId String? @db.ObjectId`
  (the importer converts rel_id using `oid(<table for rel_type>, id)`).
- Tables you cannot model confidently go to `CrmLegacyRow` (already in `crm-core.prisma`) — never drop data.

## Deterministic ids & idempotent import
`oid(table, legacyId)` in `src/lib/crm/legacyId.js` → 24-hex ObjectId. A mapper sets
`id: oid('clients', row.userid)` and FKs with `fk('clients', row.userid)`. No lookup pass is needed
and the importer can be re-run (upsert by `id`).

## Importer mapper contract (`scripts/perfex-import/tables/<domain>.mjs`)
```js
import { oid, fk, toDate, toInt, toFloat, toBool, str, json, csv } from '../lib.mjs'
export default {
  // key = source table name WITHOUT the `tbl` prefix
  clients: {
    model: 'crmClient',          // prisma delegate
    id: 'userid',                // source PK column (array for composite keys)
    map: (r) => ({ id: oid('clients', r.userid), legacyId: toInt(r.userid), company: str(r.company), ... }),
  },
}
```
`r` = raw row (all values strings or null, exactly as in the SQL dump). `map` must be pure.
Return `null` to skip a row. Do not read passwords into models except `CrmStaff.passwordHash` /
`CrmContact.passwordHash` (kept only if the importer is run with `--keep-passwords`; the runner nulls them otherwise).

## Resource configs (`src/lib/crm/resources/<domain>.js`) — drive the generic UI + API
```js
export default [{
  key: 'clients',                 // url slug: /crm/clients, /api/crm/clients
  model: 'crmClient',             // prisma delegate
  label: 'Client', plural: 'Clients',
  group: 'Customers',             // sidebar group
  icon: 'TbUsers',                // react-icons/tb name
  feature: 'customers',           // Perfex permission feature (see list below)
  titleField: 'company',          // used in relation pickers/links
  search: ['company', 'phoneNumber', 'vat'],
  defaultSort: { createdAt: 'desc' },
  columns: [{ key:'company', label:'Company', type:'text', link:true },
            { key:'active', label:'Active', type:'boolean' },
            { key:'groupId', label:'Group', type:'relation', resource:'customer-groups' }, ...],
  fields:  [{ key:'company', label:'Company', type:'text', required:true, section:'General' },
            { key:'country', label:'Country', type:'select', options:[{value:'MA',label:'Morocco'}] }, ...],
  filters: [{ key:'active', label:'Status', type:'select', options:[{value:'true',label:'Active'},{value:'false',label:'Inactive'}] }],
  children: [{ resource:'contacts', fk:'clientId', label:'Contacts' }],   // tabs on the detail page
  actions: [],                    // optional named server actions: [{key:'convert',label:'Convert to client'}]
  readOnly: false,                // true => no create/edit/delete in UI
}]
```
Column/field `type` ∈ `text | textarea | richtext | number | money | date | datetime | boolean | select |
multiselect | relation | tags | json | email | url | color | file`. `relation` needs `resource`
(another config key) and stores an ObjectId string. `select` needs `options`.
Add every Prisma model that a human would browse/edit as a resource; pure link/log tables can be
exposed only as `children`.
Hand-built pages (invoice editor, kanban, etc.) live in `src/app/(protected-pages)/crm/<key>/...`
and take precedence over the generic `[resource]` route (Next prefers static segments).

## Permissions
Perfex features: `bulk_pdf_exporter, contracts, credit_notes, customers, email_templates, estimates,
expenses, invoices, items, knowledge_base, payments, projects, proposals, roles, settings, staff,
subscriptions, tasks, checklist_templates, leads, surveys, goals, reports (view only)`.
Capabilities: `view, view_own, create, edit, delete` (+ feature extras, e.g. `projects.create_timesheets`).
trtApp authority strings are `crm.<feature>.<capability>` (e.g. `crm.invoices.view`). A Perfex "admin"
staff gets `crm.admin` which implies everything. `src/lib/crm/permissions.js` implements `can(session, feature, cap)`.
`view_own` means: only records where `addedFrom == staff` (or assigned / member, per feature).

## Directory map
| Concern | Path |
| --- | --- |
| Prisma models | `prisma/schema/crm-<domain>.prisma` |
| Resource configs | `src/lib/crm/resources/<domain>.js` |
| Generic CRUD + permissions | `src/lib/crm/crud.js`, `permissions.js` |
| Generic API | `src/app/api/crm/[resource]/...` |
| Generic pages | `src/app/(protected-pages)/crm/[resource]/...` |
| Custom pages | `src/app/(protected-pages)/crm/<module>/...` |
| Custom server actions | `src/server/actions/crm/<domain>/*.js` |
| Importer | `scripts/perfex-import/` |

## Domains
1. **admin** – staff, roles/permissions, departments, options (settings), currencies, taxes, payment modes,
   email templates, custom fields, tags, notes, reminders, activity log, announcements, todos, calendar events,
   notifications, files, modules, user meta, newsfeed, goals, surveys, misc system tables.
2. **crm** – clients, contacts, customer groups, customer admins, leads (+sources, statuses, activity, web-to-lead forms,
   email integration), vault, consents, shipping/billing, client statuses etc.
3. **work** – projects (+members, files, discussions, notes, activity, milestones, settings), tasks (+assignees, followers,
   comments, checklists, timers, priorities), timesheets/attendance/leave/HR tables found in the dump.
4. **sales** – items & groups, invoices, payments, estimates, proposals, contracts, credit notes, expenses, subscriptions,
   itemable lines, item taxes, recurring, sales activity, scheduled emails, purchasing (`pur_*`) tables.
5. **support** – tickets (+replies, statuses, priorities, services, departments, predefined replies, spam filters, pipe log),
   knowledge base (+groups, feedback), mail/tracked-mail, other module tables.

## Verification (every domain)
- `DATABASE_URL=mongodb://localhost/x npx prisma validate` passes.
- Mapper unit checks in `scripts/perfex-import/__tests__/` using hand-written sample rows.
- Resource configs only reference fields that exist on the Prisma model.

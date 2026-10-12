# Perfex → trtApp coverage (status)

## Done (data layer, 113 Crm models, 90 resources, generic UI)
| Domain | Models |
| --- | --- |
| Admin | staff, roles, permissions, staff permissions, departments, options (settings), currencies, taxes, payment modes, email templates, custom fields + values, tags, notes, reminders, activity log, announcements, todos, calendar events, notifications, files, modules, countries, user meta, newsfeed, goals, surveys |
| CRM | clients, contacts (+permissions), groups, customer admins, leads (+sources, statuses, activity, web-to-lead, email integration), vault, consents |
| Work | projects (+members, files, discussions, notes, activity, settings), milestones, tasks (+assignees, followers, comments, checklists, timers, templates), timesheets/leave/days-off |
| Sales | items/groups, invoices, payments, estimates, proposals, contracts, credit notes (+refunds, credits), expenses, subscriptions, itemable lines, sales activity |
| Support | tickets (+replies, attachments, statuses, priorities, services, pipe log), predefined replies, spam filters, knowledge base, tracked mails, mail queue, API tokens |
Everything else in the dump (purchasing `pur_*`, other module tables) is stored verbatim in `crm_legacy_rows`.

UI: every resource has list (search/filter/sort/paging), create, detail with child tabs, edit, delete, RBAC
(Perfex features → `crm.<feature>.<cap>`), plus Tasks board and Ticket thread pages.

## Invoices (done)
Hand-built editor + view for `/crm/invoices` (line items, per-line taxes, discount before/after tax, adjustment,
live totals via `calcDocument`, auto numbering from `invoice_prefix`/`next_invoice_number`, record/delete payment,
Perfex status automation, cancel/mark sent, activity log). Server actions: `src/server/actions/crm/sales/invoices.js`;
UI: `crm/_components/sales/Invoice{Editor,View}.jsx`, wired from the generic `[resource]` pages.

## NOT done yet (functions, not data)
- Same editor for estimates/proposals/credit notes (reuse Invoice components), PDF, email sending, status automation jobs.
- Lead kanban + convert button (server action exists: `server/actions/crm/crm/convertLead.js`), lead email import.
- Cron jobs (recurring invoices/tasks, reminders, overdue notices), email templates rendering, SMTP/IMAP.
- Client (contact) portal, reports, dashboards, calendar view, global search, custom-field rendering on forms.
- Settings screens beyond raw `settings` rows; roles/permissions editor UI.
- Purchasing module typed models; payment gateways (Stripe etc.).
- Real-data verification: mappers/Prisma columns are from Perfex 3.4 knowledge and must be reconciled with the actual dump.

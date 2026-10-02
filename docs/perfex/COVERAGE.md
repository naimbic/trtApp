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

## NOT done yet (functions, not data)
- Invoice/estimate/proposal editor with line items, tax/discount calc UI, PDF, email sending, payment
  recording, status automation (`src/lib/crm/sales/calc.js` has the tested logic; actions are declared but unwired).
- Lead kanban + convert button (server action exists: `server/actions/crm/crm/convertLead.js`), lead email import.
- Cron jobs (recurring invoices/tasks, reminders, overdue notices), email templates rendering, SMTP/IMAP.
- Client (contact) portal, reports, dashboards, calendar view, global search, custom-field rendering on forms.
- Settings screens beyond raw `settings` rows; roles/permissions editor UI.
- Purchasing module typed models; payment gateways (Stripe etc.).
- Real-data verification: mappers/Prisma columns are from Perfex 3.4 knowledge and must be reconciled with the actual dump.

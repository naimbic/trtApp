// trtCRM versions. Add a new entry at the TOP for every change we make; the first entry is the running version
// shown in the sidebar footer. Format: MAJOR.MINOR.PATCH (new feature = minor, fix = patch).
export const CHANGELOG = [
    {
        version: '0.44.1',
        date: '2026-10-16',
        title: 'Fixes: new task template, subtasks tab; date filter on projects',
        items: ['Creating a new task template crashed the page (the priority list was read the wrong way); fixed and tested by creating a template, using it and ticking its subtasks', 'The Subtasks tab of a task showed a blank page; fixed', 'Projects: filter by a date range on the deadline, the start date or the creation date, with a clear button']
    },
    {
        version: '0.44.0',
        date: '2026-10-16',
        title: 'Subtasks, templates, recurring tasks, timeline, team goals, rate limits',
        items: ['Subtasks: a Subtasks tab on every task (add, tick, progress bar), a "Subtask of" link, a progress chip on the lists and the boards; a task cannot be finished while its subtasks are open, cannot become a subtask of itself, and deleting a task deletes its subtasks; only the team of a task adds subtasks to it', 'Task templates: Templates button on the task list to use or create one (description, priority, due date, checklist and subtasks with due dates counted from the start), and "Save as template" on any task', 'Recurring tasks now repeat: once a recurring task is complete and its interval has passed, the daily cron creates a fresh copy (people, checklist unticked, labels, dates moved forward) until the number of cycles is reached; no email is sent', 'New Timeline (Tasks menu): every task as a bar from its start to its due date, grouped by project with subtasks under their parent, today marked, overdue in red, days or weeks zoom, one project or all', 'Team dashboard goals: managers set a weekly number of completed tasks per person and a share finished on time; everybody sees their progress, managers also the team\'s; CSV export of the leaderboard and of the time report', 'Rate limits: uploads, forgot / reset / change password, the second sign-in step and every create / change / delete are limited per person or address, with a clear message and a Retry-After header when exceeded']
    },
    {
        version: '0.43.0',
        date: '2026-10-16',
        title: 'No-access pages, raw errors, time report, audit of access changes',
        items: ['Opening a page you have no permission for now sends you to a friendly Access Denied page (with a way back to your dashboard) instead of a half-loaded screen full of errors; the same for every list of records', 'Uploads and forms that receive something unreadable (a bad file, bad JSON) answer with a clear message instead of an Internal server error, and signing in is checked before the file is read', 'New Time report (Tasks menu): hours per day, per project and per person, billable time, the latest timer sessions, with a 7 / 30 / 90 days switch; managers see the team and can pick a person, everybody else sees their own time', 'The activity log really records changes now (it silently recorded nothing before), including every change of roles and member access with exactly which permissions were added or removed; new roles can start from a copy of an existing role', '"Mark all as read" in the notifications is remembered on the server for the person, so it follows them to another browser and survives a sign-out', 'New scripts/smoke-api.mjs: signs in with one account and opens every list of the API, reporting errors and what the role may not reach, to run after each deployment (once per role)']
    },
    {
        version: '0.42.2',
        date: '2026-10-16',
        title: 'Access audit: own-records scope really applied, private notes, reminders and files',
        items: ['Members who may only see their own records (clients, leads, invoices, contracts, expenses, tickets...) could still read everything through the generic lists and record pages, because the owner column was not recognised there; the owner is now taken from the real column, child lists (contacts, project files...) follow the record they belong to, and tables with no owner (payments, vault entries...) are closed to them; lookups such as statuses and sources stay readable', 'Notes and files are shown only to their author and to people who may open the kind of record they are attached to; reminders, to-dos, events and notifications are private to their owner (administrators still see all); before, any signed-in member could list, edit and delete everyone\'s', 'Task tables reached through the generic API can only be changed by managers; everybody else goes through the task rules (assignees, creator)']
    },
    {
        version: '0.42.1',
        date: '2026-10-16',
        title: 'Notifications page fixed',
        items: ['The Notifications page (Team and feedback) crashed for everyone but worked only as an empty screen: its address was answered by the bell\'s data instead of a list; it is now a real page with everything that needs your attention, filters by kind, unread marks and Mark all as read (shared with the bell)', 'The overdue invoices and the received payments in the notifications are now only shown to people who may see all invoices and payments; before, a member who only sees their own records could see the company-wide ones']
    },
    {
        version: '0.42.0',
        date: '2026-10-16',
        title: 'All tasks visible to everyone, edited only by their team; richer scrum board',
        items: ['Everybody who opens the tasks sees all of them (read only for the tasks that are not theirs); a task can only be edited, finished, moved, given a checklist item or a timer by the people assigned to it, the person who created it and people who see all tasks (managers, administrators); comments stay open to everybody who sees the task', 'Scrum board redesigned: a project strip (client, status, deadline with days left, progress), metric cards (tasks, in progress, overdue, completed with the average time to finish, team and tasks without an owner), a burn-up chart of the last 21 days, tasks by status, who works on what and the tasks due soon, above the columns; the charts can be hidden and the choice is remembered', 'Done tasks older than two weeks now count in the project figures too']
    },
    {
        version: '0.41.0',
        date: '2026-10-16',
        title: 'Only the assignees can finish a task',
        items: ['A task\'s status (finish, reopen, move on the board) can now only be changed by the people assigned to it, the person who created it, and people who see all tasks (managers, administrators); before, anyone who could see a task and had the edit permission could finish it, for example a public task assigned to a colleague', 'For everybody else the tick box, the status field and the drag and drop on the boards are disabled, and the server refuses the change with a clear message; comments, following and the rest are unchanged']
    },
    {
        version: '0.40.1',
        date: '2026-10-16',
        title: 'Nothing of the previous person stays after sign-out',
        items: ['Signing out now reloads the app and wipes what the browser remembered about that person (remembered views, filters, favourites, task order, caches); signing in also starts clean, so the next person never sees the previous one\'s data; language and theme are kept', 'API answers are never kept by the browser, a proxy or a CDN any more (no-store, per cookie), so a shared cache cannot hand one person\'s data to another']
    },
    {
        version: '0.40.0',
        date: '2026-10-15',
        title: 'Team performance on the Team dashboard',
        items: ['New Team performance section with a 7 / 30 / 90 days switch: tasks completed (compared with the previous period), share finished on time, average time to finish and the backlog (with the age of the oldest open task)', 'Who stands out: Best performer, Fastest, Most reliable, Top closer (leads converted) and Most active, each with the figure behind it', 'Leaderboard with rank, tasks, on time, average days, hours tracked and a score (10 per task, +5 on time, +8 per issue resolved, +15 per lead converted, +1 per tracked hour up to 40), and a Your performance card with your own rank', 'Template-style charts: tasks created and completed per day (gradient area), open tasks by status, busiest days of the week and leads per week (new and converted); people who can only see their own tasks get their own numbers and curve, never the others']
    },
    {
        version: '0.39.0',
        date: '2026-10-15',
        title: 'Team dashboard, business dashboard for admins only',
        items: ['The Dashboard (revenue, invoices, clients) is now for administrators only, and for people who manage roles or were given the new permission "Business dashboard"; it is hidden from the menu for everyone else and opening it sends them to the Team dashboard; the data behind it refuses them too', 'New Team dashboard, the home of every team member: a greeting and quick New task / lead / issue buttons, figures (my open tasks, overdue, my leads and how many need a follow-up, my issues, my tickets, today), My tasks to tick off, Leads to follow up (longest without contact first), the Agenda (events and reminders), Issues and ideas (by priority and platform, ideas and requests waiting), My tickets, the Team activity of the last 7 days and who is online', 'For people who may see all tasks and leads: Team workload (open, overdue and done per person, unassigned), Leads pipeline by status, Leads by owner; everyone only sees the parts they have permission for']
    },
    {
        version: '0.38.0',
        date: '2026-10-15',
        title: 'Your language is kept: profile, client and contact',
        items: ['Team members: the language chosen in My profile or with the flag menu is saved on the account and applied on every browser and device from the first screen, in the staff area and everywhere (Japanese stays Japanese until you change it)', 'Clients: the client\'s Default language is now a list (English, Français, Español, 日本語, العربية) and each contact has its own Language; the client area opens in the contact\'s language, else the client\'s, on every browser; a contact who picks another language with the flag menu keeps it', 'Profile language list now matches the languages of the app']
    },
    {
        version: '0.37.2',
        date: '2026-10-15',
        title: 'Template project addresses open the real pages',
        items: ['The template addresses /concepts/projects/scrum-board, /tasks, /tasks/<id>, /project-details/<id> and /project-list now open the real project pages (scrum board, My tasks, task page, project page, projects list); Scrum board is also in the Projects menu']
    },
    {
        version: '0.37.1',
        date: '2026-10-15',
        title: 'Email templates only in the languages in use',
        items: ['New setting Languages in use (Settings > Localization), English, Français, Español, 日本語 and العربية by default: the Mails screen lists templates in these languages only', 'Add a language there and its templates are created at once from the English ones (ready to translate); every template always exists in every language in use. Templates of a language you switch off are kept but hidden, and come back if you switch it on again']
    },
    {
        version: '0.37.0',
        date: '2026-10-15',
        title: 'Project pages like the template: task page, scrum board, tasks',
        items: ['Task page (/crm/tasks/...) laid out like the template\'s issue page: code, title, label / assigned to / status / due date / priority / start date / milestone, description, tabs for Comments, Checklist, Attachments and Time, and an Activity panel (created, comments, tracked time, completed); everything saves on the spot', 'Scrum board for every project (the Scrum board button on the project page and in the projects list, or Tasks > Scrum board and pick a project): columns by status, cards with labels, priority, people, comments and files; drag a card to change its status, add a task at the bottom of a column; a card opens the task page', 'Project page > Tasks is now the template\'s grouped task list with one block per milestone (drag a task between milestones); names, cards and the board all open the task page, and the task page links back to the project and its board', 'Tasks now carry labels (tags) and show their file count']
    },
    {
        version: '0.36.3',
        date: '2026-10-15',
        title: 'My tasks and Team tasks like the template',
        items: ['My tasks and Team tasks now look like the template\'s task list: one block per project (and Other tasks), each with a grip to drag the whole block, rows with a round check, name, status and priority pills, date and person, and a + Add task bar that opens a small form (name, status, priority, person, date)', 'Drag a task up or down to reorder it, or into another project block to move it there; completed tasks stay in the list (older ones are hidden until you switch on Show all completed); click a task name to open it']
    },
    {
        version: '0.36.2',
        date: '2026-10-15',
        title: 'Activity log permission',
        items: ['New permission "Activity log" in Roles (Team group): only administrators and roles that were given it can open the activity log of a team member or a client, and the clock icons are hidden for everyone else; the API refuses it too. The standard roles do not have it, Super Admin and Admin do']
    },
    {
        version: '0.36.1',
        date: '2026-10-15',
        title: 'Menu footer link, one Tasks entry',
        items: ['Bottom of the menu: "What\'s new" is replaced by "Dev by trtAgency", a link to trtdigital.ma (the version next to it still opens the Versions page)', 'Tasks menu: the duplicate "Tasks" entry is gone; "Tasks board" is the one that opens the board and list']
    },
    {
        version: '0.36.0',
        date: '2026-10-15',
        title: 'My tasks, team tasks and an issue tracker',
        items: ['Tasks menu: My tasks (yours, grouped Overdue, Today, Next 7 days, Later, No due date, Completed) and Team tasks (everyone together, grouped by person, with Unassigned), one page with a switch; tick a task to complete it, click it to open the task, add one with the quick box (assigned to you)', 'New Issues page to follow problems and requests on our platforms and websites: number, title, description, type (bug, improvement, new feature, question), priority, status (open, in progress, in review, resolved, closed), platform or website, page address, labels, assignees, due date, files, comments and a history of every change; list with status counts and filters (platform, priority, type, person, mine, search)', 'Platforms and websites are managed from the Platforms button on the Issues page (name, address, kind, on or off)', 'New permission Issues in Roles (the standard Editor, Account Manager, Support Agent and Project Manager roles get it; existing custom roles need it ticked once)']
    },
    {
        version: '0.35.0',
        date: '2026-10-15',
        title: 'Activity log for team members and clients',
        items: ['New Activity log page like the template\'s: a timeline grouped by day with an icon per kind of event, filters (sign-ins, sales, work, leads, notes and emails, other) with counts, a link to the record on each entry, and Load more', 'Team member: sign-ins, invoice, estimate, proposal and contract activity, leads, projects, task comments and timers, notes, emails sent, password vault use and what they created. Client: the client timeline (lead origin, invoices, payments, estimates, proposals, contracts, projects, tickets, tasks, notes, what the client opened, portal sign-ins)', 'Open it with the clock icon in every Team row, in the clients list and in the client page header (team members need the Staff view permission, clients the Customers one)']
    },
    {
        version: '0.34.2',
        date: '2026-10-15',
        title: 'Sales first in the menu',
        items: ['Sidebar: Sales now comes before Customers']
    },
    {
        version: '0.34.1',
        date: '2026-10-15',
        title: 'Cairo font for Arabic',
        items: ['When the language is Arabic, the staff area and the client area use the Cairo font (code and monospace text keep their own font); other languages keep Inter']
    },
    {
        version: '0.34.0',
        date: '2026-10-15',
        title: 'The whole staff area in 5 languages',
        items: ['Every page of the staff area is now translated in English, Français, Español, 日本語 and العربية: menus, headers, buttons, forms, dialogs, tooltips, empty states, notifications, error messages, statuses, settings and permission names, charts, the calendar (month names, weekdays, task and invoice entries) and the project timeline', 'Arabic switches the whole layout to right-to-left; the language you pick is kept and applied from the first screen (the page restarts when you change it, so everything switches at once)', 'Names and data you typed (clients, tasks, templates, release notes) stay as written; the release notes on the Versions page are in English', 'For developers: scripts/i18n-wrap.mjs, i18n-broad.mjs, i18n-scan.mjs, i18n-keys.mjs and i18n-merge.mjs wrap new texts in tr() and list what a language is missing; dictionaries are in web/src/locales/staff']
    },
    {
        version: '0.33.0',
        date: '2026-10-15',
        title: 'Japanese replaces Chinese, sidebar in every language',
        items: ['Languages are now English, Français, Español, 日本語 and العربية: Chinese is removed everywhere (language menu, client area, saved choices go back to English, the client language list in Setup) and Japanese is added, including the whole client area (menu, dashboard, invoices, estimates, proposals, contracts, projects, support, help center, profile, chat, statuses and dates)', 'The sidebar is translated for real now: dashboard, calendar, chat, team, every CRM group, sub-group and page name in all five languages (the translation switch was off, so even French showed English)', 'The language you chose is kept and applied from the first screen when you reload', 'Page contents of the staff area (tables, forms, buttons) are still written in English only']
    },
    {
        version: '0.32.0',
        date: '2026-10-15',
        title: 'Versions page with a release timeline',
        items: ['New Versions page (click the version at the bottom of the sidebar): every release on a timeline grouped by month, with its type (Feature or Fix), date and time, how long ago, the git commit (click to copy), the author, lines added and removed, files changed, git tags and the list of changes', 'Figures on top (releases, features, code changed, latest release), search by version, commit or text, a Features / Fixes filter and pages of 5, 10, 20 or 50 releases; the running version is marked and the two latest releases are open', 'The commit details come from scripts/gen-versions.mjs, which is run before each release commit (the release being committed shows the build commit until the next run)']
    },
    {
        version: '0.31.0',
        date: '2026-10-15',
        title: 'Chat page and group chats',
        items: ['New Chat page in the sidebar (under Calendar): conversations on the left with search, tabs (All, Groups, Direct, Clients), unread counters, last message and time; the open conversation on the right with files, pictures, voice messages and calls, and a details panel; on a phone it shows the list or the conversation, one at a time', 'Group chats: New group asks for a name and the colleagues to add; inside the group, anyone can rename it and add people, the creator and administrators can remove people or delete it, anyone can leave; the conversation records who joined, left or renamed it', 'New chat starts a private conversation from a searchable list of colleagues with their status', 'The chat bubble stays on the other pages (groups show there too, with a button that opens the full page) and hides on the Chat page']
    },
    {
        version: '0.30.26',
        date: '2026-10-15',
        title: 'Invoice page redesign, drag to reorder lines',
        items: ['Invoice page: Record payment, Send, PDF and Edit stay in the header and the rest (download, reminder, receipt, mark as sent, cancel, delete) moved into a ... menu; a figures strip shows client, due date (with days overdue), total, paid (with a progress bar) and balance due; items on the left with numbered rows and tax chips, payments, files, internal note and activity on the right', 'Document tab: the invoice is shown as a paper sheet on a grey background, sized to its content with margins, refreshed whenever the lines, payments or status change, with Open PDF and Download buttons', 'Invoice, estimate, proposal and purchase order editors: drag a line by its handle (or focus it and use Space and the arrow keys) to reorder the lines; the order is saved and used in the PDF and the client page. Lines are now cards instead of a table row, and the tax menu no longer gets clipped'],
    },
    {
        version: '0.30.25',
        date: '2026-10-15',
        title: 'Contracts: open, lock when signed, signing proof',
        items: ['Client page -> Contracts: clicking a contract opens the contract (not the editor); New contract opens the editor with the client already chosen', 'A signed contract is final: it cannot be edited or deleted (the editor, the lists and the API all refuse); the Edit and Delete buttons are gone and the editor sends you back to the contract. A contract the client signed on screen cannot be marked as not signed; a contract marked as signed by staff still can. Renewing and the trash still work', 'Signing proof: the exact date and time (to the second, in the company time zone), the IP address, the email and the drawn signature are kept and shown on the staff Signature tab, on the public contract page (banner and signature box) and in the contract PDF']
    },
    {
        version: '0.30.24',
        date: '2026-10-15',
        title: 'Document numbers without slashes',
        items: ['Invoice, estimate and other document numbers now use dashes instead of slashes and keep a space after a prefix like "FA -": FA -100/10/2026 becomes FA - 100-10-2026 (lists, PDFs, emails and the public pages); the page heading reads #FA - 100-10-2026 (no space after #)']
    },
    {
        version: '0.30.23',
        date: '2026-10-15',
        title: 'Public invoice page, contract signature, favicon',
        items: ['Public invoice page (the link sent to clients): now a proper page like estimates and contracts, a top bar with the company name and Print / Download PDF, a status banner (paid, overdue, amount due), a centred card with margins that also works on a phone; the PDF and the printed page are unchanged', 'Fixed: signing a contract from the client link always ended with "Error" (the page posted to a route that did not exist); it now signs, shows who signed and the signature; the sign dialog fields no longer overflow the dialog', 'Favicon: it is now only the one chosen in Settings -> General (the app, sign-in pages and the public invoice, estimate, proposal and contract pages); the built-in default icon files are deleted']
    },
    {
        version: '0.30.22',
        date: '2026-10-15',
        title: 'Tickets: files, screenshots, notifications, internal notes',
        items: ['Files and screenshots, for the team and for clients (client area too): attach files, drag and drop them on the message box, paste a screenshot straight from the clipboard (Ctrl+V) or capture the screen with the new button; up to 10 files per message, pictures are optimised and shown as thumbnails you can enlarge, other files download with their size', 'New tickets can carry files too (staff and client area); the client\'s reply and new request emails to the team and the team\'s replies to the client list the attachment links', 'Notifications: the team is now emailed when a client opens a ticket or replies (the assigned person, else the department, else the administrators); client emails greet by name and the "View ticket" button works; in the client area Support shows a red badge with the number of unread replies', 'Internal notes: a switch under the reply box adds a note only your team sees (amber, never shown to the client, never emailed, does not change the status)', 'Send and close: reply and close the ticket in one click; Close ticket / Reopen buttons at the top of a ticket', 'Ticket list: one row of filters, a dot on unread tickets, a paperclip on tickets with files, compact table', 'Imported tickets keep their old replies visible to clients; old attachments that have no file stay greyed out']
    },
    {
        version: '0.30.21',
        date: '2026-10-15',
        title: 'Client area in 5 languages, better dashboard',
        items: ['Client area (portal): a language menu in the header and on the sign-in pages, English, French, Spanish, Chinese and Arabic (Arabic switches the whole page to right-to-left). Everything on the pages is translated: menu, dashboard, invoices, estimates, proposals, contracts, projects, support, help center, profile, chat bubble, statuses and dates', 'First visit: the portal opens in the client\'s own language (set on the client record), else the browser language; after that the choice is remembered', 'Dashboard rearranged: "Waiting for you" on top, then one row of figures (To pay with the overdue amount, Paid, Invoiced, Projects in progress, Open requests), then Latest invoices next to Offers and contracts, and Projects next to Support; a card takes the full width when its neighbour has nothing to show', 'Header: the Password link is gone (it is under My profile) so the menu fits', 'Texts that come from the server (error messages, project names, article content) stay in the language they were written in']
    },
    {
        version: '0.30.20',
        date: '2026-10-15',
        title: 'Client tabs and Activity justified',
        items: ['Client page: the tabs now share the full width of the row evenly', 'Activity tab uses the whole width: one row per event with the time, icon, title and detail, and a group tag (Billing, Sales, Work...) on the right, grouped by day, with the filter and the event count on one line']
    },
    {
        version: '0.30.19',
        date: '2026-10-15',
        title: 'Client billing chart like the Reports overview',
        items: ['Client page, Overview -> Billing: Invoiced, Paid and Invoices tiles with the growth against the period before, a line chart of the chosen tile with the previous period dashed behind it, and a Balance due tile (all time, with the overdue amount)', 'The period and currency follow the top-bar filter (Today ... 12M, custom range, currency), the same one the dashboard and Reports use, so there is no extra filter bar on the page', 'Invoices by status stays as a donut next to it; money charts are only sent to people who may see amounts']
    },
    {
        version: '0.30.18',
        date: '2026-10-15',
        title: 'Client page redesigned',
        items: ['Client page: the left column is gone; a compact portfolio section on top has the logo, status, city and country, key facts, quick actions (follow up, new invoice/estimate/proposal/project/ticket/note, email, call, WhatsApp, edit), the lead-to-client path as a slim stepper, and the contacts with their client-area buttons', 'Tabs are ordered by use: Overview, Invoices, Payments, Contracts, Estimates, Proposals, Projects, Tickets, Activity, Notes, Files, Contacts', 'Overview is section by section: Billing (4 figures, invoiced vs paid chart for 12 months, invoices by status), Needs attention and Reminders, Sales and work (status bars for estimates, proposals, contracts, projects, tickets, tasks), Document views, Details with the addresses', 'Every list (here and across the CRM) now keeps its search and filters in one row; Payments got filters too (search, payment mode, date range)', 'The invoiced/paid chart is only sent to people who may see money amounts']
    },
    {
        version: '0.30.17',
        date: '2026-10-15',
        title: 'Team list redesigned',
        items: ['Team -> Members fits the screen without sideways scrolling: compact rows, a smaller role picker, shorter last-login date, and the secondary actions (reset link, one-time password, sign out everywhere, two-step reset) are in a "..." menu next to Edit, Permissions and Set password', 'The role dropdown now opens over the page (not inside the table), so you never have to scroll to see its options, also on the last row']
    },
    {
        version: '0.30.16',
        date: '2026-10-15',
        title: 'Sign-in layout centred',
        items: ['Sign-in: two equal halves again, the form centred in the left half and the slides centred (text and cards) in the right half, dots under the slide']
    },
    {
        version: '0.30.15',
        date: '2026-10-15',
        title: 'Admins can sign in again',
        items: ['Fixed: members with a big role (Admin, about 100 permissions) could not sign in, the page said "Invalid email or password". Their session cookie is about 4 KB and the sign-in answer was blocked by the web server\'s small header buffer (502 "upstream sent too big header"). The buffers are now large enough; Super Admin and small roles were never affected'],
    },
    {
        version: '0.30.14',
        date: '2026-10-15',
        title: 'Sign-in page: form left, bold panel right',
        items: ['Sign-in: the form is back on the left with no heading text; the right side is a wide, bolder panel with slides (quotes about our services, and 8 random cards from our 48 domains, new ones each time)'],
    },
    {
        version: '0.30.13',
        date: '2026-10-15',
        title: 'Set a member password',
        items: ['Team -> Members: new "Set a password" button (padlock) where the administrator types the new password (8+ characters), so you know exactly what it is; it signs the member out everywhere. Only a Super Admin can change a Super Admin password. The one-time generated password still exists'],
    },
    {
        version: '0.30.12',
        date: '2026-10-15',
        title: 'Sign-in slides: our services only',
        items: ['The quotes on the sign-in page are now short lines about our own services (websites, SEO, ads), no outside quotes'],
    },
    {
        version: '0.30.11',
        date: '2026-10-15',
        title: 'Notifications (toasts) fixed',
        items: ['Several notifications fired at the same moment are now all shown (before, only the last one survived and the others flashed and vanished)', 'Notifications fade out fully instead of being cut off, and the ones below slide up smoothly when one closes'],
    },
    {
        version: '0.30.10',
        date: '2026-10-15',
        title: 'Sign-in clears old session cookies',
        items: ['Before signing in, the page now removes any old session cookie left in the browser by an earlier version; a stale cookie could make a correct password look wrong ("Invalid email or password")'],
    },
    {
        version: '0.30.9',
        date: '2026-10-15',
        title: 'One logo on the sign-in page',
        items: ['Sign-in side panel: the second (white) logo is removed, only the logo in the form card stays'],
    },
    {
        version: '0.30.8',
        date: '2026-10-15',
        title: 'Sign-in page redesign (same layout as Ratokil)',
        items: ['Sign-in, forgot and reset pages: full-height split layout like the Ratokil login, a picture panel with the brand colour over it, the logo, a short pitch and rotating slides (links to our websites, then quotes), and the form in a bordered card on a light background with a "developed by trtDigital" footer and the version'],
    },
    {
        version: '0.30.7',
        date: '2026-10-15',
        title: 'New sign-in page',
        items: ['Sign-in: dark side panel (no more coloured background) with slides: quotes and links to our websites (trtdigital.ma, sea.ma, trtseo.com, trtads.com, adsagency.ma); pauses when you hover it', 'Sign-in form is simpler: the Google/GitHub buttons and the Sign up link are gone (sign-up is disabled anyway), text fixed'],
    },
    {
        version: '0.30.6',
        date: '2026-10-15',
        title: 'Popups open smoothly',
        items: ['Dialogs and side panels no longer flash: the dark backdrop now fades in instead of appearing at full strength before the window zooms in'],
    },
    {
        version: '0.30.5',
        date: '2026-10-15',
        title: 'Two-step verification switch for test servers',
        items: ['Setting TWO_FACTOR_OFF=1 on a server skips the two-step verification code at sign-in for everyone (used on staging while testing; never set it on the live server)'],
    },
    {
        version: '0.30.4',
        date: '2026-10-15',
        title: 'Sign-in picture back',
        items: ['The sign-in page right column shows the picture again, with the trtCRM logo and tagline on top and your accent colour tinting it'],
    },
    {
        version: '0.30.3',
        date: '2026-10-15',
        title: 'Assign roles from the Team list',
        items: ['Team -> Members: the Role column is now a small dropdown, pick a role for a member right in the list and they get that role\'s permissions immediately (Super Admin rows stay fixed)'],
    },
    {
        version: '0.30.2',
        date: '2026-10-15',
        title: 'Super Admin and Admin separated',
        items: ['The Super Admin on/off switch is gone from the member form: Super Admin is only ask@trtdigital.ma and has no settings; everyone else, including the former Perfex administrators, is an Admin (a normal role) whose permissions you can edit in Team and Roles & permissions', 'On the first start the former administrators are converted to the Admin role automatically (only once, and only while the Super Admin account exists)', 'New helper: node scripts/staff-check.mjs email shows why a team member cannot sign in and can unlock or reset the password'],
    },
    {
        version: '0.30.1',
        date: '2026-10-15',
        title: 'Login pages',
        items: ['Sign-in, sign-up and the client area sign-in now show the full trtdigital logo (not the small icon), and the coloured side panel shows the logo in white with the tagline'],
    },
    {
        version: '0.30.0',
        date: '2026-10-15',
        title: 'Super Admin vs Admin',
        items: ['Only a Super Admin (full access, shown as "Super Admin" in Team) is locked: its permissions and the Super Admin role cannot be edited, renamed or deleted', 'Admin is an ordinary role: its permissions, and the permissions of any member who is not a Super Admin, can be changed (the Admin role can now also create and edit roles)', 'Turning off Super Admin on a member makes them an Admin: they get the permissions of their role (or of the Admin role) so they keep working'],
    },
    {
        version: '0.29.8',
        date: '2026-10-15',
        title: 'Standard roles created on start',
        items: ['The standard roles (Super Admin, Admin, Account Manager, Editor, Sales Rep, Support Agent, Accountant, Project Manager, Viewer) are created automatically the first time the app starts on a database; existing roles are never changed'],
    },
    {
        version: '0.29.7',
        date: '2026-10-15',
        title: 'Role icons, login images',
        items: ['Roles: hover a role tab to get Rename and Delete icons; the Rename button at the right is gone', 'Sign-in pages no longer use the deleted template pictures (gradient panel and trtCRM logo instead, Google/GitHub icons are vector); staff pictures that are only an imported file name (e.g. tech.jpeg) show initials instead of a broken image until the files are uploaded'],
    },
    {
        version: '0.29.6',
        date: '2026-10-15',
        title: 'No role name field',
        items: ['Roles & permissions: the role name field is gone from the toolbar; the name is asked in a small dialog when you press New role, and Rename changes it'],
    },
    {
        version: '0.29.5',
        date: '2026-10-15',
        title: 'Standard roles, Super Admin',
        items: ['New standard roles: Super Admin, Admin, Account Manager, Editor, Sales Rep, Support Agent, Accountant, Project Manager and Viewer (editable in Roles & permissions); ask@trtdigital.ma is the Super Admin with full access'],
    },
    {
        version: '0.29.4',
        date: '2026-10-15',
        title: 'Compact roles page',
        items: ['Roles & permissions: the role name is now a small field in the toolbar (same row as search and presets) instead of a big block; role tabs, group chips, card headers and rows are all tighter'],
    },
    {
        version: '0.29.3',
        date: '2026-10-15',
        title: 'Roles as top tabs',
        items: ['Roles & permissions: the roles list moved from the left column to tabs across the top (with a New role button), and the editor now uses the full page width'],
    },
    {
        version: '0.29.2',
        date: '2026-10-14',
        title: 'Page tabs in the top bar',
        items: ['Team: the Members / Roles & permissions tabs moved to the top bar (any page can now put its tabs there)', 'Roles & permissions: sticky roles list, a header with the role name and counters, quick-jump chips for each permission group, and the editor no longer overflows the page'],
    },
    {
        version: '0.29.1',
        date: '2026-10-14',
        title: 'Cleaner permission editor',
        items: ['Permission editor: aligned View / View own / Create / Edit / Delete columns under a header row in every group, single-switch features (Financial figures, Reports, My profile) listed as simple switches below their name, "auto" shown as a small lock tag, and the Save bar stays visible at the bottom'],
    },
    {
        version: '0.29.0',
        date: '2026-10-14',
        title: 'Money permission, report permissions, new permission editor',
        items: ['New permission "See money amounts" (Roles & permissions → Money & reports → Financial figures): without it every income, total and balance shows ***, money charts are replaced by a notice, and the dashboard and reports no longer send the figures', 'Reports now have one switch per report (Sales, Profit & expenses, Leads, Support, Work & time); Sales and Profit also need "See money amounts". Existing members who could open Reports keep all reports', 'The permission editor is redesigned: one card per group, switches instead of checkboxes, search, "Read only / Everything / Nothing" presets and "Allow all" per group'],
    },
    {
        version: '0.28.4',
        date: '2026-10-14',
        title: 'Remembered theme, demo menus',
        items: ['Light or dark mode picked in the top bar, profile menu or settings is remembered after a refresh (the profile theme only applies until you pick one)', 'The template demo menus show for every administrator account (admin or CRM admin), not only accounts with the legacy "admin" role'],
    },
    {
        version: '0.28.3',
        date: '2026-10-14',
        title: 'Client area shows every section',
        items: ['The client area now shows all sections (Invoices, Estimates, Proposals, Contracts, Projects, Support) to every client contact; the imported per-contact permission boxes were not usable and left the area empty'],
    },
    {
        version: '0.28.2',
        date: '2026-10-14',
        title: 'Open the client area as a client',
        items: ['New "Open client area" button on every contact of a client: opens the client area as that person without email or password (read-only preview for 2 hours, with an amber bar and an Exit button; works even for inactive clients)'],
    },
    {
        version: '0.28.1',
        date: '2026-10-14',
        title: 'Client passwords',
        items: ['Staff can set a client contact\'s client-area password directly (client page, Contacts, Set password; with a password generator), no email needed', 'The client area menu has a Password link that opens the change-password card'],
    },
    {
        version: '0.28.0',
        date: '2026-10-14',
        title: 'Chat files, voice messages and calls',
        items: ['Send files, pictures and videos in chat with the paperclip (images are optimised, previews inside the bubble)', 'Record and send voice messages with the microphone button', 'Voice calls between colleagues and with clients, when an administrator turns them on (phone icon in the chat header, green = on). Incoming calls ring on any page; a client calling from the portal rings every available team member and the first to answer takes it', 'A line like "Voice call · 2:31" or "Missed call" is left in the conversation'],
    },
    {
        version: '0.27.4',
        date: '2026-10-14',
        title: 'Pick from the file manager',
        items: ['Profile picture, staff pictures, client logos and the company logo, dark logo and signature can be uploaded or picked from the file manager (click the picture, then Upload or From files)', 'Files attached to invoices, clients, contracts and other records can also be picked from the file manager without uploading again', 'Replacing or removing a picture never deletes a file that is still in the file manager'],
    },
    {
        version: '0.27.3',
        date: '2026-10-14',
        title: 'Demo pages for super admin only',
        items: ['The template demo menus and pages (Dashboard, Concepts, UI components, Auth, Guide) are visible and reachable only by the super admin; everyone else no longer sees them in the menu and is denied if they open the address'],
    },
    {
        version: '0.27.2',
        date: '2026-10-14',
        title: 'Template media removed',
        items: ['The default logo and favicon are now trtCRM (shown when no company logo is set); all template logos, sample images, avatars and landing pictures were deleted from the project'],
    },
    {
        version: '0.27.1',
        date: '2026-10-14',
        title: 'Chat sound and status',
        items: ['A short ping plays when a new chat message arrives (bell icon in the chat header mutes it)', 'Chat status: green = available, orange = idle (no activity for 2 minutes or tab in background) or away (set yourself in the profile menu), grey = offline', 'Your status dot also shows on your profile picture in the top bar'],
    },
    {
        version: '0.27.0',
        date: '2026-10-14',
        title: 'Chat',
        items: ['Chat bubble for the team after login: a Team room, private conversations with colleagues (green dot = available now) and a Clients tab for clients who write in', 'Clients get the same bubble in the client area: they see who from the team is available and can leave a message even when nobody is online', 'Unread counters on the bubble, messages refresh every few seconds'],
    },
    {
        version: '0.26.11',
        date: '2026-10-14',
        title: 'Compact sidebar',
        items: ['Smaller, tighter menu rows, text and icons', 'Only one menu group is open across the whole sidebar (CRM and template sections together)'],
    },
    {
        version: '0.26.10',
        date: '2026-10-14',
        title: 'Sidebar accordion and icons',
        items: ['Opening a menu group closes the one that was open (same for sub-groups), so only one is open at a time', 'Top menu groups have coloured icons; sub-menu icons are smaller and grey'],
    },
    {
        version: '0.26.9',
        date: '2026-10-14',
        title: 'Sidebar menu',
        items: ['Every menu entry has an icon', 'Important pages come first (Sales: Invoices, Payments, Estimates, Proposals, Contracts...), the rest is folded into sub-groups such as Items & catalog, Sales setup, Ticket setup, Email & spam, Finance, Data and Personal', 'The current page is highlighted and its group opens automatically'],
    },
    {
        version: '0.26.8',
        date: '2026-10-14',
        title: 'Colour everywhere, chart comparisons',
        items: ['The colour picked in the top bar now repaints every CRM page (buttons, tabs, links, progress)', 'Reports and the dashboard charts show a dashed "previous period" line to compare against the period before', 'Reports header is one line: Reports 2025-11-01 → 2026-10-14'],
    },
    {
        version: '0.26.7',
        date: '2026-10-14',
        title: 'Filter row',
        items: ['Invoice, estimate, proposal, purchase order and contract lists: one filter row with "Choose a client" on the left, the status chips in the middle and the search on the right'],
    },
    {
        version: '0.26.6',
        date: '2026-10-14',
        title: 'Dashboard filter bar everywhere',
        items: ['Reports, expenses, invoices, estimates, proposals, purchase orders, payments, tickets and leads now use the exact dashboard filter bar in the top bar (periods, custom range, currency, colour); the period and currency are shared with the dashboard'],
    },
    {
        version: '0.26.5',
        date: '2026-10-14',
        title: 'Compact list headers, top-bar filters',
        items: ['Top bar periods are now 1D, 2D, 3D, 5D, 7D, 30D, Current M, Last M, This year and Last year, with a calendar icon for custom dates; click a period again to clear it', 'The currency choice moved to the top bar too (invoices, estimates, proposals, purchase orders, reports)', 'List figure tiles are smaller; status chips (Draft, Unpaid, Paid…) now sit inside the filter card with the other filters and replace the duplicate status dropdown'],
    },
    {
        version: '0.26.4',
        date: '2026-10-14',
        title: 'Payments and contracts lists',
        items: ['Payments and contracts open on the same pastel figure tiles; contract states are filter chips with counts'],
    },
    {
        version: '0.26.3',
        date: '2026-10-14',
        title: 'Date filter in the top bar',
        items: ['The dashboard-style date filter (Today, 7D, 30D, Month, Last month, Year, 12M, All, or a custom range) now sits in the top bar on Reports, Expenses, Invoices, Estimates, Proposals, Purchase orders, Payments, Tickets and Leads; each page remembers its own period', 'Tickets and leads can now be filtered by the date they were opened or created'],
    },
    {
        version: '0.26.2',
        date: '2026-10-14',
        title: 'Lists in the template style',
        items: ['Invoices, estimates, proposals, purchase orders, clients and team now open on the same pastel figure tiles as the dashboards; invoice, estimate, proposal and purchase-order statuses are filter chips with counts instead of plain boxes'],
    },
    {
        version: '0.26.1',
        date: '2026-10-14',
        title: 'Reports like the e-commerce dashboard',
        items: ['Reports now use the template e-commerce layout: Overview card with three clickable figures (growth versus the period before) and a chart, a target circle, top lists, a split bar, and a table of the latest records', 'Fixed: switching to Profit, Leads, Support or Work crashed the page'],
    },
    {
        version: '0.26.0',
        date: '2026-10-14',
        title: 'Reports',
        items: ['Reports under Utilities with five tabs: Sales (invoiced vs received, top clients and items, payment methods, tax, receivables ageing), Profit & expenses, Leads (conversion by source, status and owner), Support (first response time, by department) and Work & time', 'Pick the period (this month to custom dates) and the currency; every table exports to CSV', 'Each tab only appears if your role may see all the records behind it', 'Dashboard project statuses fixed (Finished and Cancelled were swapped there too)'],
    },
    {
        version: '0.25.0',
        date: '2026-10-14',
        title: 'Knowledge base',
        items: ['Help center like the template: search hero, topics (groups) with article counts, most read and recently updated articles', 'Article page with reading time, "In this page" menu, related articles and view / helpful counts', 'Manage articles: table with group, audience (clients or staff only), published or draft, views and votes; groups with colours, hide or delete', 'Article editor with the visual editor, create a group on the spot; articles marked staff only never reach clients', 'Client area gets a Help center: search, topics, articles and "Was this helpful?" feedback; client views are counted'],
    },
    {
        version: '0.24.2',
        date: '2026-10-14',
        title: 'Password vault layout',
        items: ['Vault page is now cards only (charts removed); search, client filter, show filters (all, mine, shared, private, client logins) and category chips sit together in one bar on top, with the entries in a full-width card grid'],
    },
    {
        version: '0.24.1',
        date: '2026-10-14',
        title: 'Password vault overview',
        items: ['Vault page opens on overview cards (entries, shared, need attention, with 2FA code), a category donut, a 14-day activity chart and the latest actions on your entries'],
    },
    {
        version: '0.24.0',
        date: '2026-10-13',
        title: 'Password vault',
        items: ['Password vault under Utilities: the team’s shared logins with name, category, client, URL, username, password, notes, tags and a "change before" date', 'Choose who sees each entry: only me, selected people (viewers and editors) or the whole team; owner and administrators manage the sharing', 'Passwords are encrypted, never listed; show or copy them on demand, every reveal and copy is logged in the entry history', 'Optional 2FA secret: the team copies the live 6-digit code; built-in password generator with strength meter; manage categories with colours', 'New permission "Password vault" in Roles'],
    },
    {
        version: '0.23.0',
        date: '2026-10-13',
        title: 'Contracts with e-signature',
        items: ['Contract editor with the visual editor and merge fields (client, company, dates, value); preview and PDF use your PDF settings', 'Public contract page for the client: read, comment and sign on screen; the signature is kept with name, email, date and IP, and you are emailed', 'Contracts email now links to that page (the old link did not open anything); copy the client link or send it', 'Client area shows contracts to sign and signed ones; a signed contract cannot change its text'],
    },
    {
        version: '0.22.1',
        date: '2026-10-13',
        title: 'Notifications',
        items: ['Notification bell next to your profile: client replies on tickets, tasks assigned or due, reminders, payments received, offers accepted or declined, new leads, documents opened by clients, overdue invoices; click one to open it, "mark all as read" clears the dot', 'Top-bar icons (language, settings, notifications, profile) now share one size and the same hover style'],
    },
    {
        version: '0.22.0',
        date: '2026-10-13',
        title: 'Expenses',
        items: ['Expenses screen: totals (spent, to invoice, invoiced), spending by month and by category, filters (category, client, dates, state) and search', 'Add and edit an expense in a side panel: category (create one on the spot), taxes with live total, payment mode, client and project, billable, receipts stored in the Space', 'Turn a billable expense into an invoice in one click; invoiced expenses are locked, and deleting that invoice frees the expense', 'Recurring expenses: automatic copies from Settings → Cron job (previewable; the invoice of a recurring billable expense is still manual)'],
    },
    {
        version: '0.21.0',
        date: '2026-10-13',
        title: 'Client area',
        items: ['New client area at /portal with its own sign-in, built from the template components: overview, invoices, estimates, proposals, projects and support', 'Clients see what is waiting for them (invoices to pay, offers to answer), open and download documents, follow shared project tasks, and open or reply to support requests', 'Invite a contact from the client page (Invite to client area / Send password reset); the link is emailed, or copied for you when mail is not set up', 'Contact permissions decide which sections each person sees; password change signs the old session out; sign-in is locked after 5 wrong attempts'],
    },
    {
        version: '0.20.0',
        date: '2026-10-13',
        title: 'Client profile with follow-up',
        items: ['Client page now tells the lead-to-client story: where the client came from, who owned it, how many days it took, and each step (first contact, proposal, conversion, first invoice, first payment)', 'Needs attention: overdue and unpaid invoices, unanswered proposals and estimates, open tickets and tasks, contracts ending soon', 'Document views with the IP address of the client (invoices, estimates, proposals) plus last client-area login and IP per contact; new views are recorded from the public links', 'Activity tab: one timeline of everything (billing, sales, work, notes, views and logins) with filters', 'Quick actions: follow-up note or reminder, new invoice, estimate, proposal, ticket or project, email, call, WhatsApp'],
    },
    {
        version: '0.19.2',
        date: '2026-10-13',
        title: 'Client pages like the template',
        items: ['Client page: profile card on the left (logo, contact details, address, admins, send email, new invoice, delete) and tabs on the right, starting with an Overview of billing totals, addresses and contacts', 'New and edit client use the template form layout with a sticky Save bar; Perfex fields kept (VAT/ICE, industry, currency, language, groups, admins, billing and shipping addresses, primary contact)'],
    },
    {
        version: '0.19.1',
        date: '2026-10-13',
        title: 'Projects dashboard',
        items: ['Projects now opens on a dashboard like the template: overview cards, project schedule (Gantt with milestones), calendar with the day plan, current tasks, task overview chart and recent activity', 'The project list moved to Projects → All projects'],
    },
    {
        version: '0.19.0',
        date: '2026-10-13',
        title: 'Support tickets',
        items: ['Tickets list with status counts, filters (priority, department, assignee, Mine, hide closed) and search by subject or number', 'Ticket page as a conversation: client and team messages, attachments, saved replies, and reply with a status change', 'Reply emails use the Ticket reply template; opening a ticket can notify the client and the assignee', 'Change status, priority, department, service and assignee in one click; open tickets for clients or plain email addresses'],
    },
    {
        version: '0.18.0',
        date: '2026-10-13',
        title: 'Projects',
        items: ['Projects list like the template: favourites, progress bars, team avatars, task counts, status filter', 'Project page with Overview, Tasks board, Files, Discussions, Notes, Activity and Settings', 'Create, edit and delete projects; assign a team; progress from tasks or set by hand', 'Fixed project statuses: Finished and Cancelled were swapped by the import'],
    },
    {
        version: '0.17.1',
        date: '2026-10-13',
        title: 'Lead pipeline cleanup',
        items: ['Lead statuses are now real stages: New, Contacted, À rappeler, En attente, Planifié, Proposal sent, Customer', 'Channels that were used as statuses (Social Media, WhatsApp, Popups / Forms, Via XY…) moved to the lead source', 'Each changed lead has a "Pipeline cleanup" line in its activity'],
    },
    {
        version: '0.17.0',
        date: '2026-10-13',
        title: 'Leads board',
        items: ['Leads kanban board: drag a lead between pipeline statuses, with load more per column', 'Board or list view; filters for owner, source, My leads, and Lost, Junk or Converted leads', 'Lead panel: profile, notes, related proposals and tasks, activity history', 'Convert a lead to a client (copying notes), mark lost or junk, restore', 'Cards per column and board order from Settings now apply', 'File manager shows the 20 most recent files under Folders'],
    },
    {
        version: '0.16.1',
        date: '2026-10-13',
        title: 'File manager redesign',
        items: ['File manager now follows the template layout: Folders and Files sections, details panel with info and actions, upload dialog with drag and drop'],
    },
    {
        version: '0.16.0',
        date: '2026-10-13',
        title: 'Tasks board',
        items: ['Tasks kanban board: drag cards between Not started, In progress, Testing, Awaiting feedback and Complete', 'Board or list view, search, assignee, priority, My tasks and Show completed filters', 'Task panel with details, checklist, comments and a start/stop timer with time log', 'Assign team members and followers, link a task to a client, lead or project, repeat tasks'],
    },
    {
        version: '0.15.0',
        date: '2026-10-13',
        title: 'Proposals',
        items: ['Proposals: list, editor with a visual text editor, PDF and email; for clients or leads', 'Public proposal page with accept, refuse and comments (signature, like estimates)', 'Turn a proposal into an estimate or an invoice; automatic invoice on acceptance is now a setting', 'Imported proposals keep their {proposal_items} text and print correctly'],
    },
    {
        version: '0.14.0',
        date: '2026-10-13',
        title: 'Purchase orders (bons de commande)',
        items: ['Purchase orders: list, editor, PDF, email with the PDF attached, status (draft, sent, confirmed, delivered, cancelled)', 'Create a purchase order from an estimate, and an invoice from a purchase order', 'Numbering, delivery days, notes and terms from Settings → Billing → Purchase orders; new permission under Sales'],
    },
    {
        version: '0.13.0',
        date: '2026-10-13',
        title: 'Estimates',
        items: ['Estimates list, editor and page: send by email, PDF, mark as sent / accepted / declined, convert to an invoice', 'See what the client answered: acceptance details with signature, and the comment thread with replies', 'Numbering, valid-for days, notes and terms come from Settings → Billing → Estimates'],
    },
    {
        version: '0.12.0',
        date: '2026-10-13',
        title: 'Platform settings and cron job',
        items: [
            'New Settings area: General, Company information, Localization, Email, Billing (General, Invoices, Estimates, Proposals, Purchase orders, Credit notes, Subscriptions), Clients, Tasks, Support, Leads, Google, Pusher, Calendar, AI, PDF, E-signature, Tags and Cron job',
            'Platform logos, favicon and per-document logos, from the file manager or an upload',
            'Company details with merge terms such as {company_name} {address} {city} {vat_number}, usable on documents and in emails',
            'Invoice numbering rules: prefix, format, restart every year or month, delete only the last, take the number back on delete',
            'PDF settings (font, size, page size and numbers, signature, total in words, separators, currency format) applied to invoices and estimates',
            'Estimates can create the invoice automatically when the client accepts',
            'Cron job: overdue and due-soon invoice reminders, recurring invoices, estimate/proposal/contract expiry notices, task deadlines, ticket auto-close; with a preview before the first real run',
        ],
    },
    {
        version: '0.11.0',
        date: '2026-10-13',
        title: 'Two-step verification, email change, Space sync',
        items: [
            'Two-step verification in Profile → Security: authenticator app and email code, with recovery codes',
            'Sign-in asks for the code as a second step; administrators can reset it for a member who lost their phone',
            'Change your sign-in email from the profile (needs your password); new permission "Change own sign-in email" under Account → My profile',
            'File manager lists everything already in the DigitalOcean Space, with "Refresh from Space"',
        ],
    },
    {
        version: '0.10.0',
        date: '2026-10-13',
        title: 'Files in DigitalOcean Spaces, profile and company pages',
        items: [
            'File manager: folders, upload by drag and drop, rename, move, search and preview; everything is stored in DigitalOcean Spaces',
            'Images are converted to WebP and optimised automatically (avatars cropped square, EXIF rotation fixed)',
            'Attachments on clients, invoices and contracts',
            'New profile page: picture, personal details, contact, online links, language and time zone, signature, notifications, display preferences',
            'Team members and clients get pictures / logos and more fields',
            'Company page: logo, signature and the details printed on documents',
        ],
    },
    {
        version: '0.9.0',
        date: '2026-10-13',
        title: 'trtCRM branding, new menu layout',
        items: [
            'Everything is branded trtCRM (logo, titles, texts)',
            'Sidebar footer with the signed-in user, role, sign out and version; click the version to see what is new',
            'Top bar: language, settings menu and a fuller profile menu',
            'Template demo, docs and API pages added to the menu temporarily (group names start with "Template")',
        ],
    },
    {
        version: '0.8.0',
        date: '2026-10-13',
        title: 'Calendar',
        items: ['Click an event to edit it, hover for details', 'Client, team members, guests, project, category and meeting link', 'Google / Apple Calendar subscription link and .ics files'],
    },
    {
        version: '0.7.0',
        date: '2026-10-13',
        title: 'Client documents',
        items: ['Invoice PDF and public invoice page', 'Public estimate page: accept, refuse and comments', 'Short readable links in emails'],
    },
    {
        version: '0.6.0',
        date: '2026-10-13',
        title: 'Mails',
        items: ['Email templates with visual and HTML editors, ready-made designs in French and English', 'Mail server settings, send dialog and sent log'],
    },
    { version: '0.5.0', date: '2026-10-13', title: 'Contracts', items: ['Contracts list with expiry states, signing, renewals and comments'] },
    { version: '0.4.0', date: '2026-10-13', title: 'Invoices & payments', items: ['Invoices and payments with Perfex numbering', 'Record, edit and delete payments'] },
    { version: '0.3.0', date: '2026-10-13', title: 'Clients', items: ['Clients list, profile and editor on the real Perfex data'] },
    { version: '0.2.0', date: '2026-10-13', title: 'Team, roles and sign-in', items: ['Team members, roles and permissions', 'Sign-in lock, password reset links, sign out everywhere'] },
    { version: '0.1.0', date: '2026-10-13', title: 'Foundations', items: ['Perfex data import', 'Dashboard with date, currency and colour filters'] },
]

export const VERSION = CHANGELOG[0].version

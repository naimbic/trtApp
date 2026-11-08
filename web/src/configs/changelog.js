// trtCRM versions. Add a new entry at the TOP for every change we make; the first entry is the running version
// shown in the sidebar footer. Format: MAJOR.MINOR.PATCH (new feature = minor, fix = patch).
export const CHANGELOG = [
    {
        version: '0.213.0',
        date: '2026-11-08',
        title: 'Note labels in the note colour',
        items: [
            'Notes: the labels of a note show at the bottom left of its card, as small tags in the colour chosen for the note (grey when the note has no colour).',
        ],
    },
    {
        version: '0.212.0',
        date: '2026-11-08',
        title: 'Closed days are back as they were; Days off is the same thing',
        items: [
            'Calendar → Closed days is back exactly as it was (periods, quick picks, reason, the booking-page notice line).',
            'Days off in the More menu now shows that same Closed days panel and works on the same list: what you close in one is in the other, and the booking page does not offer those days.',
            'Leave requests do not count the closed days as working days. The days off added in the last release were moved back into closed periods (days in a row with the same reason become one period).',
        ],
    },
    {
        version: '0.210.0',
        date: '2026-11-08',
        title: 'Coloured tab groups, icon tabs, more Notes filters',
        items: [
            'Client page: each group of tabs has its own light colour behind it (blue Sales, green Work, violet Client area, amber Records), like the colours of the counts.',
            'Mails, Files and Activity tabs show only their icon (the name appears when you hover).',
            'Notes: new filters for Person (owner or shared with), Date (today, 7 days, 30 days, this year), Colour, Attached files (any, none, pictures, voice notes, PDF, documents, sheets) and More (links, reminder, comments, pinned, shared), with a Clear filters button and a shown / total count. The label chips stay as the category filter.',
        ],
    },
    {
        version: '0.209.0',
        date: '2026-11-08',
        title: 'Client tabs in groups, and a Tasks tab',
        items: [
            'Client page: the tabs are in blocks with a small title each: Sales (Invoices, Payments, Estimates, Proposals, Contracts), Work (Projects, Tasks, Tickets), Client area (Ideas, Requests, Reports & Strategies), then Records (Mails, Notes, Files, Activity).',
            'New Tasks tab on the client: the tasks of the client, of its projects and of its lead, in columns by status, managed the same way as on the Tasks page (move, assign, priority, dates, popup).',
            'Each task has a Show to the client / Hide from the client choice in its menu, and a Client mark on its card. Only the tasks switched on are seen in the client area. A switch shows only those.',
        ],
    },
    {
        version: '0.208.1',
        date: '2026-11-08',
        title: 'Lead: activity tiles and offers as cards',
        items: [
            'Activity (tasks and leads): the tag is a small square tile, the icon on top and the tag name under it. The user (short, like Naim.B) and the date and time are together in a small compact card at the right.',
            'Lead, Offers tab: each proposal is a light card with its title, status, number and date, who created it, and the total amount with its currency.',
        ],
    },
    {
        version: '0.208.0',
        date: '2026-11-08',
        title: 'Client area: Reports & Strategies, hours on tasks, lead header, lead checklist setting',
        items: [
            'Client area: a new "Reports & Strategies" page. The client reads what the team shared (drafts and team-only items stay hidden), opens the files and links, writes back, and answers: Approve, Ask for changes or Decline. The team is notified. It can be switched off per client (Client area access) or for everyone (Settings > Client area).',
            'Task popup: the content no longer slides to the left when you change tab. The Files and Time tabs are removed; Details, Checklist, Comments and Activity remain.',
            'Hours: a new Hours field next to the start and due dates of a task, and an Hours chip next to the Date of every checklist item (and when adding one), from 30 minutes to 12 hours or more.',
            'Lead popup: the status bar now sits inside the coloured header like on tasks, the duplicate status under it is gone, and the team shows at the right.',
            'Settings > Leads: "Keep lead checklist items as plain lines". Off (default): each item added in a lead\'s Tasks tab is a real task linked to the lead. On: items stay in the lead and no task is created.',
            'Activity cards are more compact: one row with the tag, what happened, then the date and time, then who did it.',
        ],
    },
    {
        version: '0.207.0',
        date: '2026-11-08',
        title: 'Reports & Strategies like Requests, team and counts in the task header, activity cards',
        items: [
            'Customer, Reports & Strategies: now a board of statuses like Requests (Draft, Sent to the client, Client is reviewing, Changes requested, Approved, Declined). Drag a card to change its status; each card has a code (RPT-1, STR-1), priority, due date and team.',
            'Each report or strategy opens in a popup with the same sections as a request: the document (title, kind, period, priority, content), Files and links (upload files and add links with a name), Status and team (assignees, due date, visible to the client), and a Follow-up conversation with replies, edit, delete, @mentions and Team-only notes. Buttons: Make a task, Send by email (the email now includes the links and files).',
            'Task: the assigned team and the counts (comments, checklist, time) now sit inside the coloured header, on a light blur, under the title and above the statuses.',
            'Task and lead Activity: every activity is a card with its tag (Status, People, Checklist, Comment...), the date and time, what was done and who did it, with pages of 10 when there are many. This also fixes the Activity tab being pushed to the left.',
        ],
    },
    {
        version: '0.206.0',
        date: '2026-11-08',
        title: 'Task header, activity of tasks and leads, Reports & Strategies, contacts card',
        items: [
            'Task: a compact header. The coloured part keeps the due date, the status and the title; the statuses now sit inside it on a light blur; under it, the assigned team once (no repeat) and counts of comments, checklist and time (press one to open its tab). The tabs scroll sideways instead of being cut.',
            'Task: a new Activity tab, like the lead one: who changed the status, the dates, the people, who added or finished a checklist item, files added or removed, comments, timers; grouped by day with icons.',
            'Lead activity is richer: every edit (name, email, phone, value... with before and after), who it was given to, notes added, edited or deleted, files added or removed, and what happens on its tasks (created, status, due date, people, checklist, comments). Same design, by day.',
            'Customer: a new "Reports & Strategies" tab, kept like Requests for now: write a report or propose a strategy, send it by email to the contacts you tick, and note the client\'s answer (no answer yet, approved, declined). Permission: Client reports & strategies (roles that could handle Requests get it).',
            'Customer: the Contacts tab is gone. The Contacts card on the left has a + to add a contact and a pencil to edit one; each contact shows Primary and Active or Inactive, with the details on their own lines so nothing runs out of the card.',
        ],
    },
    {
        version: '0.205.9',
        date: '2026-11-08',
        title: 'Screenshots in the client area guide, chat links, hover tools on phones',
        items: [
            'The client area guide now has 26 screenshots (the sign-in page, the overview, the lists, a task, an idea, the new request forms, a support thread, the help center, the profile, the app install and the chat), taken in each of the five languages. The guide refreshes itself the first time the help center is opened after this update.',
            'Chat: a link in a message can be clicked again. The tools that appear under a message (reply, react, save, more) kept catching clicks while hidden and covered the first line of the next message, so a link there could not be opened. They only react when you point at their message now.',
            'Phones and tablets (screens without a mouse): everything that only showed on hover now shows. In the chat, tap a message to show its tools (reply, react, save, more) under it, tap again to hide them. Icons that appeared on hover elsewhere (edit, delete, reply, copy, contact icons on the Team page...) are always visible on a touch screen.',
        ],
    },
    {
        version: '0.205.8',
        date: '2026-11-08',
        title: 'The client area guide appears by itself',
        items: [
            'The client area guide (22 articles in five languages) is now loaded automatically the first time anyone opens the help center after this update, in the CRM (Help center) and in the client area (/portal/help). Staff and clients both see it; nothing to press. The "Client area guide" button in Help center → Manage is still there to refresh it.',
        ],
    },
    {
        version: '0.205.7',
        date: '2026-11-08',
        title: 'Client area guide in the help center, in five languages',
        items: [
            'New: 22 help center articles explaining every page of the client area, in English, French, Spanish, Japanese and Arabic, in five topics: Getting started, Invoices/estimates/proposals/contracts, Projects/tasks/ideas/requests, Support and the help center, Your account and notifications. The button names in the articles are the ones the client sees in their language.',
            'To add them: Help center → Manage → "Client area guide" → "Load the guide". Pressing it again refreshes the guide articles; your own articles are not touched. It replaces the older, shorter "client area" group, which wrongly said invoices can be paid online (they are paid by bank transfer, as described on the invoice page).',
        ],
    },
    {
        version: '0.205.6',
        date: '2026-11-08',
        title: 'Page titles, contact popup in accordions',
        items: [
            'Every page now has its own title in the browser tab and in the history: "Invoices · trtCRM", "Settings · Calendar · trtCRM", "Clients · New · trtCRM"... in your language. The client area too ("Invoices · Company name").',
            'The edit popup of a record with several sections (a contact, for example) is now colour-coded accordions: General open first, WhatsApp & Telegram and Email notifications folded, with "10 of 10 on" on the notifications, and the switches as a tidy two-column list. Expand all / Collapse all when there are more than two.',
        ],
    },
    {
        version: '0.205.5',
        date: '2026-11-08',
        title: 'Contact notifications match the client settings',
        items: [
            'A contact now has the same email notification switches as the client page: Invoices, Estimates, Proposals, Credit notes, Contracts, Projects, Tasks, Support, Ideas and Requests (new: Proposals, Ideas, Requests). They are in the contact\'s form (Email notifications) and in the client area, Profile, so the contact can choose too.',
            'The switches are used when emails go out: proposal emails to the ticked contacts, idea and request messages only to contacts who have them on. A contact with no choice yet counts as on. The client-level switch still turns a kind off for everybody.',
        ],
    },
    {
        version: '0.205.4',
        date: '2026-11-08',
        title: 'Client area: booking icon and blurred header',
        items: [
            'Client area: a calendar icon at the top right opens the booking page on meet.trtcrm.com (book a meeting with the team).',
            'Client area: the header gets the same blurred bar as the CRM once the page is scrolled.',
        ],
    },
    {
        version: '0.205.3',
        date: '2026-11-07',
        title: 'Scheduled messages in the menu',
        items: [
            'Scheduled messages is now in the main menu: More → Team → Scheduled messages (next to Announcements). It is still in the profile menu too.',
        ],
    },
    {
        version: '0.205.2',
        date: '2026-11-07',
        title: 'Contact icons under the name',
        items: [
            'Team page and team dashboard: the chat, WhatsApp, email and call icons now appear under the name, with a small slide, instead of beside it, so they never spill out of a card.',
        ],
    },
    {
        version: '0.205.1',
        date: '2026-11-07',
        title: 'Fix: the server build of 0.205.0',
        items: [
            'The appointments module was empty in 0.205.0 and the server build failed; it is restored (with the weekly schedule assignment). Redeploy to get 0.205.0 and everything after it.',
        ],
    },
    {
        version: '0.205.0',
        date: '2026-11-07',
        title: 'Weekly meeting schedule with team assignment, quick contact on the team',
        items: [
            'Settings → Calendar → "Weekly schedule": for each day of the week, tick whether people can book, set the hours of that day and choose which team members take the meetings that day. The Meet booking page offers a time only while one of them is free, and the meeting is assigned to (and the notification goes to) the one who is free. Each day is one row with everything for that day: on/off, hours, length of a meeting (or the default) and team. Days without a chosen team use the default team.',
            'Calendar → Closed days: quick picks for the coming week or a whole month.',
            'Team page and team dashboard: the name opens the profile (in the primary colour) and, on hover, icons to send a chat message, a WhatsApp message, an email or call. A link like /crm/chat?with=<member> opens the private conversation.',
        ],
    },
    {
        version: '0.204.0',
        date: '2026-11-07',
        title: 'Upload limits, booking days and hours, who hosts meetings, scheduled messages with AI',
        items: [
            'Settings → General → Uploads: the allowed file types and a separate largest size for pictures, documents and videos/audio, applied everywhere (tickets, tasks, chat, notes, library, client portal).',
            'Settings → Calendar: "Booking page: days and hours" (days of the week, hours of the day, meeting length 30 min to 2 h, earliest day, how far ahead) and "Who takes appointments and hosts meetings" (who is told about a request; who may host on Meet: everybody, administrators and managers, or administrators only, plus named people). The Meet booking page follows these rules.',
            'Team dashboard: every name (workload, leads by owner, activity, performance) opens that person\'s profile.',
            'Scheduled messages: grouped in coloured accordions by category (Tips and training, Reminders, Meetings, Announcements, Celebrations, Other), with search, date filters (today, this week, next 30 days, your dates) and an "Active only" switch, one compact line per message. "Write it with AI": describe what you want to tell the team, pick a tone and the AI writes the message (and a title) for you to check and edit; it needs an AI key in Settings → AI.',
        ],
    },
    {
        version: '0.203.0',
        date: '2026-11-07',
        title: 'Settings: coloured accordions everywhere, left menu too',
        items: [
            'Settings left menu: the groups (General, Billing, Configure features, Integrations, More, Automation) are coloured accordions like Expenses; the one you are on is open and your choice is remembered.',
            'Every settings page with several cards (General, Company, Invoices, Clients, Tasks, Tickets, Calendar, PDF, Sign-in, Messaging...) now shows each card as a coloured accordion row with its description on the row, instead of one long page.',
        ],
    },
    {
        version: '0.202.0',
        date: '2026-11-07',
        title: 'Cron job settings in colour-coded accordions, Grow routine fix',
        items: [
            'Settings → Cron job is now grouped in accordions (Run and schedule, Safety and upkeep, Money documents, Work and support, Leads and growth, Recent runs), with the same coloured rows as Expenses, a count of what is on in each, and Expand all / Collapse all. It remembers which ones you opened.',
            'Fix: the automatic "Grow routine" no longer fails with "Unauthorized" when run by the scheduler (it needs no signed-in person to read its settings).',
        ],
    },
    {
        version: '0.201.0',
        date: '2026-11-06',
        title: 'One summary a day, reply to tickets from a notification, phone fixes',
        items: [
            'Profile → Notifications → "One summary a day": one email each morning (at the hour set in Settings → General → Daily summary email) with what is new for you, tasks due or late, reminders and meetings of the day, instead of one email for each event; nothing is sent when there is nothing to tell. "Send me today\'s summary now" shows what it looks like. Chat apps, the bell and sign-in emails are not affected.',
            'Notifications: a ticket notification can be answered from the card: a reply to the client (emailed as usual) or an internal note.',
            'Phone pass: the Tasks board header, the Tickets filters (and every table filter row) wrap instead of pushing the page sideways, the Expenses period switcher scrolls, and the invoice page no longer widens the screen.',
        ],
    },
    {
        version: '0.200.0',
        date: '2026-11-06',
        title: 'WhatsApp: "(#100) Invalid parameter" explained, template check, number format, optional webhook',
        items: [
            'The test message now says what Meta objected to instead of "(#100) Invalid parameter": a wrong number format (write +212 600 000 000, never a 0 in front), a template that is not accepted as sent, or a wrong Phone number ID.',
            'New optional "WhatsApp Business Account ID": with it, "Check the WhatsApp connection" lists the approved templates and checks the one named in Settings (exists? approved? in that language? how many variables?). The messages are then built with the right number of variables (a template with no variable, or with two, no longer fails with #100).',
            'Numbers are cleaned before sending (spaces, dashes, + and 00 are removed) and a local number written with a 0 in front is refused with a clear sentence.',
            'Optional webhook (the Meta app does not need it to SEND): the check panel shows the callback URL and a verify token to paste in Meta for Developers → WhatsApp → Configuration. Meta then tells the CRM when a message could not be delivered afterwards; the reason is shown in the panel and the administrators are alerted. With the App Secret saved, only Meta (signed requests) is believed.',
        ],
    },
    {
        version: '0.199.0',
        date: '2026-11-06',
        title: 'WhatsApp check and renewal, idea discussion like comments, the team opening pages is not a client view',
        items: [
            'WhatsApp: sending only needs the Phone number ID and a token, but a 24-hour test token stops working the next day. New optional App ID and App Secret (Settings → WhatsApp & Telegram): the CRM checks the token every day, turns it into a 60-day one and renews it before it ends, and warns the administrators when it cannot. New "Check the WhatsApp connection" button (name and number, quality, until when the token is valid, Renew now).',
            'WhatsApp errors from Meta are now explained in plain words (expired token, number not allowed, the 24-hour rule and templates, wrong template name or language, number not on WhatsApp, wrong Phone number ID).',
            'Idea popup, Discussion: the same options as the comments elsewhere: emoji reactions, tag a colleague after sending, Remind me (opens the idea again), reply, edit and delete under each message.',
            'Opening the public page of an invoice, estimate, proposal or contract as a team member (signed in, or from an address a team member used in the last 45 days, even in a private window) is no longer recorded as the client having seen it: no "Client opened a proposal" notification, and old rows from team addresses are hidden. Switch in Settings → Billing → Views by the team.',
        ],
    },
    {
        version: '0.198.0',
        date: '2026-11-06',
        title: 'Duplicate warning, deal value and forecast, contract from an accepted estimate or proposal',
        items: [
            'Possible duplicates: while you type a lead (company, email, phone) or a client (company, phone), an amber note lists leads and clients that already have the same email, the same phone (any country code) or the same company (case, accents and SARL / Ltd ignored), with a link to each.',
            'Deal value: each lead can have a value, a chance of winning (empty = the status chance, set in Lists & statuses → Lead statuses → "Win chance", or its place in the pipeline) and an expected closing date. The cards show the value, each column its total, and the Leads page a strip: Open pipeline, Forecast (value × chance) and Expected this month.',
            'Accepted estimates and proposals get a "Create contract" button: a draft contract for the same client with the same total, made once per document (asked again, it opens the first).',
            'The browser tests now also cover the duplicate note, the forecast and the contract (9 flows).',
        ],
    },
    {
        version: '0.197.0',
        date: '2026-11-06',
        title: 'Bulk actions, saved views and browser tests',
        items: [
            'Bulk actions on the Leads list and the Tasks list: tick several rows (or all) and a bar appears: Leads: status, source, add an owner, mark lost / restore, delete; Tasks: status, priority, add a person, delete. One request for all, each row goes through the usual permissions, and you are told how many worked and why the others did not.',
            'Saved views: a "Views" button on Leads, Tasks and the tables saves the search and filters under a name (private, or shared with the team) and applies them in one click.',
            'Browser tests of the main flows (npm run test:e2e, local test database only): sign in, create a lead and convert it to a client, change several leads at once, save and reuse a view, edit a list in place, create a task, read a notification. They create a throw-away administrator and remove everything they made.',
        ],
    },
    {
        version: '0.196.0',
        date: '2026-11-06',
        title: 'New profile menu, My space moved into it, Growth opens Grow, backups stream to the storage',
        items: [
            'Profile menu redesigned: a card with your picture, name, email and role that opens your profile (no more "My profile" line), your status switch, then My space (Reminders, Calendar events, Scheduled messages, Notifications, File manager) and My account (Password & security, My growth, Team & roles, Mail settings), each with a short description; the footer has icon buttons (dark mode, install the app) and Sign Out.',
            'The "My space" pill is gone from the top menu (its pages are in the profile menu). "Growth & insight" now opens the Grow page.',
            'Backups go to the DigitalOcean Space while they are read (the server never holds the file), and a download is a short-lived link straight from the Space.',
        ],
    },
    {
        version: '0.195.0',
        date: '2026-11-06',
        title: 'Nightly backups, alerts to the administrators, compulsory two-step sign-in',
        items: [
            'Backups: every night after 02:00 (company time) the whole database is saved to the file storage, kept 14 days plus one a week for 12 weeks. Settings → Cron job → Backup files: status, list, Download, "Back up now". It runs even when the automatic tasks are off. Restore with node scripts/restore-backup.mjs (checked on a copy: all documents and ids come back).',
            'Alerts: the administrators are told (bell, email, Telegram / WhatsApp) when a backup fails or is late (36 h), when the automatic tasks stop (6 h) or report errors, and when the CRM returns 5 server errors in 10 minutes. One alert per kind per hour at most; switch off in Settings → Cron job → Alerts.',
            'Two-step sign-in can be made compulsory (Settings → Sign-in & API): for administrators, or for administrators and everyone who sees the vault, payments or payroll. Someone covered who has not turned it on is sent to their Security page and can open nothing else until they do (takes effect within a minute).',
        ],
    },
    {
        version: '0.194.0',
        date: '2026-11-06',
        title: 'My space and Growth & insight as pills, Remind me in the bell, notifications on mobile',
        items: [
            'Menu: "My space" and "Growth & insight" are pills before More (Dashboard, Leads, Tasks, Customers, Sales, Projects, My space, Growth & insight, More).',
            'The notification bell has the Remind me alarm on every line (same choices as the Notifications page).',
            'Notifications page on a phone: the action icons (read, remind, reply, open) sit under the content, and the header buttons wrap instead of being cut.',
        ],
    },
    {
        version: '0.193.0',
        date: '2026-11-06',
        title: 'Notifications with actions, short lists like Items, menu order',
        items: [
            'Notifications page: richer cards (what happened, the detail, kind, record, who sent it, exact date and time) and actions without opening them: mark read / unread, Remind me (in 1 hour, this evening, tomorrow, next Monday), Reply (a comment on the task or a note on the lead) and Open.',
            'The page shows the last 5 days by default, newest first; quick periods (Today, 5, 14, 30 days, All) and From / To dates; "Mark these as read" for what is shown. The bell keeps a read button on every line and shows who it is from.',
            'Lists & statuses (and every short list) look like Items & Groups: a coloured accordion per list with a + to add, drag handles, a colour you edit in the row, a star for the default, rows as small cards.',
            'Menu order: Dashboard, Leads, Tasks, Customers, Sales, Projects, More.',
        ],
    },
    {
        version: '0.192.0',
        date: '2026-11-06',
        title: 'Menus re-organised: five pills and a clear More, each area with its own setting entry',
        items: [
            'Pills: Sales, Customers, Leads, Projects, Tasks, then More. Support is no longer a pill: Tickets, Help center and Manage articles are a column of More.',
            'More has one column per topic: Support & Help, Team, Time & pay, My space, Growth & insight, Setup. No column holds a single page, and there is no "More" column inside a pill any more.',
            'Sales and Tasks have two named columns (Documents / Money & catalog, Work / Tracking). To-dos moved next to Notes in Tasks.',
            'Every area ends with its own "... setting" entry (Sales, Customers, Leads, Tasks, Support, Team). They all open the same page, Lists & statuses, already filtered to that area; chips at the top switch area.',
            'Currencies, taxes, payment modes, departments and tags moved into Lists & statuses (inline, paged). The old separate Vault list was removed from the menu: Password vault stays under Customers.',
        ],
    },
    {
        version: '0.191.0',
        date: '2026-11-06',
        title: 'Every short list edited in place (no pencil, no popup) with paging, Customers setting, one Lists page, Events by month',
        items: [
            'All the short lists (statuses, sources, tags, taxes, currencies, payment modes, departments, groups...) are edited only in the row: the pencil and its popup are gone. Long texts (descriptions, predefined replies) are edited in the row too. Each list has its own pager (10 / 25 / 50 per page).',
            'Lists & statuses is now the only page for lead statuses and sources, task statuses, ticket statuses, priorities, services, predefined replies, spam filters and leave types (menu: Setup). The duplicate "Statuses & sources" and "Ticket lists" menu entries are removed.',
            'New "Customers setting" page under Customers: customer groups, idea categories and consent purposes as accordions. The "More" column of Customers is gone; Leads and Support menus are one column.',
            'Calendar events: loads one month at a time, month arrows, search, a pager in each group (by week or category), two lines per event: title, category, times, then the meeting link (with a Join button), place, client or lead, owner, guests and a note.',
        ],
    },
    {
        version: '0.190.0',
        date: '2026-11-06',
        title: 'One page for statuses and lists, leave and days off redesigned, to-dos like notes, cleaner menus',
        items: [
            'Won / Lost (Done / In progress / Delete) drop zones removed from the Leads and Tasks boards: use the card menu (Convert to client, Mark lost, Mark complete, Delete).',
            'Lead statuses and sources are one page ("Statuses & sources" under Leads): one accordion per list, every cell edited in place (name, colour, default, active, order by drag, add at the top), saved as you type, no popup.',
            'New page "Lists & statuses" (Setup > More): lead statuses and sources, task statuses, ticket statuses, priorities, services, predefined replies, spam filters and the new leave types, all as accordions with in-place editing. Task statuses use the same editor.',
            'Timeline: one fold per project (name, done / total, late tasks, its span as a thin bar while closed), compact rows, task names and dates that stay in view while you scroll, "Hide completed", collapse / expand all.',
            'Leave requests: accordions by status, leave type or person; subject, type, dates and days edited in the row; Accept / Refuse in one click (the person is told); month or date filters, person and type filters; new request in a row. New "Leave types" list and a new "Accept or refuse" use of the Attendance & leave permission.',
            'Days off: a calendar, month by default (or week, or a list of cards by month); add a day off with the + of any day, click one to rename or delete it.',
            'To-dos now live in the notes: same cards, colours, pins, reminders, sharing and comments, only the checklists, with Open / Done tabs. Your old to-dos are moved into one checklist note.',
            'The + at the top right now creates a to-do, lead, task, client, expense or note in one click (only what you may create).',
            'Reminders and Calendar events pages: accordions (late / today / coming up / done; by month or by category), everything edited in place.',
            'Menu re-arranged: the important pages in one column, setup in "More"; Attendance & leave moved under Administration; one entry for the ticket lists.',
            'Demo code of the original template removed (demo pages, menus and unused services); the template guide pages are kept (open by address /guide/documentation).',
        ],
    },
    {
        version: '0.189.0',
        date: '2026-11-06',
        title: 'Cleaner lead and task cards, Won / Lost on top, Won counter fixed',
        items: [
            'Lead and task cards redesigned so long names never break them: date on the left, comments and the menu on the right, the title on two lines (cut with "…"), the contact on one line, the next action as a pill, then the source as a chip and the team at the foot (3 faces and "+N").',
            'Won and Lost (Done / In progress / Delete on tasks) moved to the top of the page, next to the count, as small one-line drop zones with their number.',
            'The Won counter showed 0 even with converted leads: it now counts every lead converted to a client.',
        ],
    },
    {
        version: '0.188.1',
        date: '2026-11-06',
        title: 'Lead Mails tab: buttons and filters on one compact row',
        items: [
            'Lead popup, Mails tab: "Log a mail" and "New draft" are small icon buttons (with a tooltip) on the same row as the filters.',
            'The two From / To date fields are now one "Date period" picker (pick the first and last day on one calendar).',
            'Search, period, Received / Sent / Drafts, "with files" (paperclip) and Clear fit on that single row.',
        ],
    },
    {
        version: '0.188.0',
        date: '2026-11-06',
        title: 'Articles: full editor with mentions, favorites, pin, and comments (nested, reactions, edit)',
        items: [
            'The article editor is now the full editor used in comments: headings H2 / H3, colours, highlight, tables, pictures, links, emojis and @ mentions (the colleagues you tag are told). Headings still build the "In this page" menu.',
            'Favorites: a star on each article (and in Manage articles) keeps your own list; "My favorites" shows on the help center home.',
            'Pin: pin an article to show it first in its group lists and in a "Pinned" strip on the help center home (needs the Edit permission).',
            'Comments under every article (the team only, clients never see them): newest thread first, nested replies, emoji reactions, tag a colleague, set a reminder, edit and delete. People who starred the article or already commented are told of new comments.',
            'Headings in all editors now show in proportion (H2 larger than H3).',
        ],
    },
    {
        version: '0.187.1',
        date: '2026-11-06',
        title: 'New notification sound',
        items: [
            'The sound that plays for a new chat message or notification is now the new "short notification" sound (a sound file instead of the synthesised ping). The mute switch still silences it; call ringing is unchanged.',
        ],
    },
    {
        version: '0.187.0',
        date: '2026-11-06',
        title: 'Manage articles: groups as accordions, drag to reorder or move, switches, icons, pager',
        items: [
            'Manage articles is now organised by group: each group is a coloured accordion (fold / unfold, or Expand all / Collapse all; your choice is remembered).',
            'Drag a group by its handle to reorder the groups; drag an article by its handle to reorder it, or drop it on another group (a row, or the group header) to move it there.',
            'Every article row has a publish / hide switch, a Staff / Clients badge you click to change who sees it, views and helpful votes, and icons to read, edit and delete (with a confirmation). Every group header has its switch (shown or hidden in the help center), edit and delete icons.',
            'Pager inside each group (5, 10, 20 or 50 articles per page, page numbers with Previous / Next); search and the Published / Drafts / Staff only filters open the groups that match.',
            'The new order is the one the help center and the client area use.',
        ],
    },
    {
        version: '0.186.0',
        date: '2026-11-06',
        title: 'Tasks shared with clients: they see them, answer and send files; Any lead / Any client filters; compact customer page with Email access',
        items: [
            'Tasks page: two new filters, "Any lead" and "Any client" (for a client: its own tasks, the tasks of its projects and of the lead it came from).',
            'A task switched "Visible to the client" is now seen by the client whenever it belongs to that client: its own tasks, the tasks of its projects (no project needed any more), or the tasks of the lead it came from once converted. The task popup tells you if the link is missing.',
            'New "Tasks" page in the client area (and each task of a project opens it): status, dates, priority, description, team, progress of the checklist (the internal steps are never shown), the files you share and a conversation.',
            'Conversation: a comment you write on a shared task has a switch "send to the client too" (off by default, so nothing leaks); the client gets a phone message and an email (unless switched off) and can answer and add files; you are told, and see "From the client" / "Seen by the client" badges. Files have the "visible to the client" switch.',
            'Customer page: now compact, in accordions (Company, Money and documents, Address, Image and groups, Customer admins, Client area access, Email access, Account).',
            'New "Email access" on the customer page, like the client area access: invoices, estimates, proposals, contracts, credit notes, projects, tasks, support tickets, ideas, requests. Switch one off and no email of that kind goes to any contact of that client (reminders, notices, ticket replies, idea and request messages, task comments; manual document mails start with nobody ticked).',
        ],
    },
    {
        version: '0.185.1',
        date: '2026-11-06',
        title: 'Reminder on a comment: the assigned people are reminded, email off by default',
        items: [
            'The bell icon of a comment now lists who is reminded: every person assigned to the task or lead and you, each with a switch, all on by default. Add anyone else with "Add another person".',
            'Each person switched on gets their own reminder at the chosen time (bell and phone), marked with the name of who set it and the comment as the note. It opens the Comments tab.',
            'The "Send an email too" switch is off by default on a comment reminder (the private "Remind me" button keeps its own default).',
        ],
    },
    {
        version: '0.185.0',
        date: '2026-11-05',
        title: 'Client ideas: a detailed offer in the Value section (SaaS, development, marketing, hosting; one price or recurring; contracts; options)',
        items: [
            'The Value section of an idea now has "Simple price" (as before) or "Detailed offer": what we sell (SaaS, development, marketing, hosting, service, design), how it is billed (once, monthly, every 3 months, yearly) and the contract length (1 to 5 years, or open with a notice period).',
            'A setup fee, a discount in % and a catalogue of options to add in one click: domain name, SSL, professional mailboxes, web hosting, VPS, managed server, CDN, backups, maintenance, support (standard and priority), monitoring, hours packs, setup, migration, training, integrations, audits, extra users and storage, white label, API access, SEO, ads, social media, content, monthly report. Each option is once, monthly or yearly, with a price and a quantity, and can be switched off; or add your own.',
            'Ready-made starting points: SaaS subscription, Website + hosting and maintenance, Custom app + support plan, Marketing monthly package, Hosting + domain + mailboxes.',
            'The totals are worked out as you build: paid once, per month, first year and the whole contract (or "open"). The price of the idea follows the offer (the first year), so cards and lists stay in step.',
            'The client sees the same offer line by line in their portal, with the totals.',
        ],
    },
    {
        version: '0.184.0',
        date: '2026-11-05',
        title: 'Comments everywhere: newest on top with its replies, last 5 days first, then "Show older comments"',
        items: [
            'Every comment list in the CRM now shows the newest thread on top, with its replies right under it (oldest reply first inside a thread). A thread that gets a new reply moves up. No more scrolling to the bottom to see the latest.',
            'Only the threads with something in the last 5 days are shown at first (at least the newest few); the button "Show older comments" adds 10 more each time. Faster pages when there are hundreds of comments.',
            'Applies to task comments (popup and page), lead comments, client requests and ideas (CRM and client portal), quick-note comments, the comments of proposals, estimates and contracts, and the public document pages (older ones are folded in "Older comments").',
            'On tasks the writing box is now above the list, next to the newest comment.',
        ],
    },
    {
        version: '0.183.1',
        date: '2026-11-05',
        title: 'Emoji picker: the group tabs sit on a light bar',
        items: [
            'The row of group tabs at the top of the emoji picker (faces, hands, hearts, animals...) is now on a light background bar with the open group highlighted, so it is not mistaken for emojis to send.',
        ],
    },
    {
        version: '0.183.0',
        date: '2026-11-05',
        title: 'Lead address: Country next to the ZIP code',
        items: [
            'The Address of a lead now has a Country (same list as the clients), next to the ZIP code, and it shows in the address summary.',
        ],
    },
    {
        version: '0.182.3',
        date: '2026-11-05',
        title: 'Direct emails: the people in copy count, and the log explains ambiguous companies',
        items: [
            'An email is now also matched through the other addresses it was sent to or copied to: a colleague of the lead writes and the lead\'s own address is only in copy (Cc), the email still goes to that lead\'s Mails tab.',
            'When several leads or clients use the same company domain and nothing else tells which one, the Activity log and the Preview say so and tell you what to fix (put the sender, or the person in copy, as the email of the right lead or contact) instead of "not a lead".',
        ],
    },
    {
        version: '0.182.2',
        date: '2026-11-05',
        title: 'Direct emails are also matched by the company name',
        items: [
            'When the sender is neither a known address nor a known domain, the email is matched by name: the company name in the domain (info@strasforma.ch) or the sender\'s display name against the name or company of a lead or client. Only when exactly one lead or client has that name; webmail senders (Gmail, Outlook...) are matched by their display name only. The Activity log says "matched by its company domain or name".',
        ],
    },
    {
        version: '0.182.1',
        date: '2026-11-05',
        title: 'Roles & permissions: the password vault is easy to find, every permission is explained',
        items: [
            'The Password vault permission moved to the Tools group and is called "Password vault (shared logins and passwords)", with an explanation of the per-entry sharing (only me, selected people, whole team).',
            'Every permission in the role editor now has a short explanation (28 had none). The lead email integration entry explains the new reply catching and automatic answer.',
            'A test makes sure no future permission is added without an explanation.',
        ],
    },
    {
        version: '0.182.0',
        date: '2026-11-05',
        title: 'Mails tab: hover icons, comments on mails, filters; lead replies are caught even if already read',
        items: [
            'Every mail of a lead or a client has hover icons: mention a colleague, remind me, comment (internal, only the team reads it), reply (a draft to the sender with the mail quoted) and edit. On a client, received and sent mails can no longer be deleted (drafts can).',
            'New filters above the mails: search, from / to dates, received / sent / drafts, and "With files". Received mails show their attached files.',
            'The mailbox no longer skips emails that were already opened in webmail when it keeps the replies of leads and clients (the "unread only" rule applies only if you switch the catching off).',
            'The mailbox Preview now shows, for each email, whether it would be kept on a Mails tab ("Kept on Mails") or why not.',
        ],
    },
    {
        version: '0.181.2',
        date: '2026-11-05',
        title: 'Direct emails from a lead or client are matched by company domain too',
        items: [
            'An email that is not a form is kept on the Mails tab of the lead or client who wrote it. If the exact address is not known (info@company.com writes, the lead is contact@company.com), the company domain is used: only company domains (never Gmail, Outlook...), and only when exactly one lead or client has that domain. The Activity log says "matched by its company domain".',
        ],
    },
    {
        version: '0.181.1',
        date: '2026-11-05',
        title: 'Re-read the mailbox since a date',
        items: [
            'New button "Re-read since…" on each mailbox: the emails received from a chosen day on, read or unread, are looked at again. Emails skipped before (for example "subject does not match the filter") are now kept on the Mails tab of the lead or client who wrote them, with files and meeting invitations.',
        ],
    },
    {
        version: '0.181.0',
        date: '2026-11-05',
        title: 'The mailbox keeps the emails of your leads and clients, with files and meeting bookings',
        items: [
            'An email from a lead (or from a contact of a client) that is not a website form is now kept on their Mails tab as a received mail, with its attached files (open them from the mail).',
            'A meeting invitation (.ics) in the email becomes a calendar event about that lead or client, with its video link.',
            'The team is told with a bell notification that opens the Mails tab, a "Reply to ..." task is created, and the responsible person gets a reminder to answer (default after 4 hours; it is removed when you send your answer).',
            'Optional automatic answer ("we received your email, we will check your request and get back to you"): switch it on in the mailbox settings; once a day per person at most, never to robots or out-of-office messages, and it shows on the Mails tab.',
            'Settings of the mailbox: new group "Emails from your leads and clients".',
        ],
    },
    {
        version: '0.180.2',
        date: '2026-11-05',
        title: 'Comment reactions show who sent each emoji',
        items: [
            'Under a task or lead comment, each emoji now shows the names of the people who sent it (You, Ada, Naim +2), always visible, not only on hover.',
        ],
    },
    {
        version: '0.180.1',
        date: '2026-11-05',
        title: 'The emoji reaction button is always visible on comments',
        items: [
            'The emoji button under every task and lead comment is shown all the time (not only on hover), next to the reactions already given.',
        ],
    },
    {
        version: '0.180.0',
        date: '2026-11-05',
        title: 'Sent comments: tag a colleague and set a reminder from the hover row',
        items: [
            'Every sent task or lead comment has a new @ icon in its hover row: pick a colleague and they are tagged under the comment and notified, without editing it.',
            'Every sent comment also has a bell icon: a reminder on that comment, with the comment as its note; the reminder opens the Comments tab.',
        ],
    },
    {
        version: '0.179.3',
        date: '2026-11-05',
        title: 'The @mention written by Reply is clickable',
        items: [
            'A reply that starts with the @mention written by the Reply button now shows the name as a clickable mention (it opens the chat), like any other mention.',
        ],
    },
    {
        version: '0.179.2',
        date: '2026-11-05',
        title: 'Event reminder emails open the event',
        items: [
            'The link in an event reminder email now opens that event in the Calendar, like the in-app notification.',
        ],
    },
    {
        version: '0.179.1',
        date: '2026-11-05',
        title: 'A meeting notification opens the meeting popup',
        items: [
            'Meeting notifications (a meeting added to a lead, an event reminder, an appointment request) now open the Calendar on that event, with its popup, whatever month it is in.',
        ],
    },
    {
        version: '0.179.0',
        date: '2026-11-05',
        title: 'Lead comments work like task comments: threaded replies, reactions, tools under the comment',
        items: [
            'Lead Comments: replies sit under the comment they answer (also replies to replies), pushed to the right with a line.',
            'Share / reply / edit / delete moved under each comment so they no longer hide the date; emoji reactions on every comment.',
            'Reply writes the @mention with a space and puts the cursor after it. The person you answer is notified.',
        ],
    },
    {
        version: '0.178.0',
        date: '2026-11-05',
        title: 'Notifications open the exact tab; lead Comments and Offers; files, pictures and audio in comments; files and links on meetings',
        items: [
            'Clicking a notification now lands on the exact tab: a lead comment opens the lead\'s Comments tab, a mail its Mails tab, a meeting its Meetings tab, a task comment the task\'s Comments tab.',
            'On a lead, the tab "Notes" is now "Comments" and "Related" is now "Offers".',
            'Comments (lead comments, task comments, any editor with pictures) accept pictures, files and audio: use the paperclip, drop or paste. Audio shows a player, other files a link.',
            'Calendar events: add files or paste links in the Meeting section; a link is shown like a file.',
        ],
    },
    {
        version: '0.177.0',
        date: '2026-11-05',
        title: 'Task comments: threaded replies, emoji reactions, tools under the comment',
        items: [
            'Replies now sit under the comment they answer, pushed to the right with a line, also replies to replies.',
            'The share / reply / edit / delete icons moved under each comment, so they no longer hide the date.',
            'Pressing Reply writes the @mention followed by a space and puts the cursor after it: just start typing.',
            'Emoji reactions on task comments: pick any emoji, click a reaction again to take it back; hover shows who reacted.',
        ],
    },
    {
        version: '0.176.0',
        date: '2026-11-04',
        title: 'Faster pages: fonts and pictures served by us, lighter first load, skeleton tables, slow-query log',
        items: [
            'Fonts (Inter, Urbanist, Cairo) are now served by the CRM itself instead of Google: no outside request before the page can draw, and only the needed weights.',
            'The sign-in side picture is AVIF / WebP (20 KB instead of 288 KB); thumbnails below the fold load lazily.',
            'The chat message list and its editor (about 300 KB) load only when a conversation is opened, so most pages start lighter.',
            'The same request asked twice at the same moment is sent once; the "logged in as" bar no longer repeats the /me request.',
            'Tables show grey skeleton rows while the first page loads instead of a plain "Loading…".',
            'Server: database calls slower than 0.8 s are written to the log ([slow-query] model.action ms), the connection pool is explicit (30 connections, idle ones closed, 15 s wait limit), and the last two outside calls have a time limit.',
        ],
    },
    {
        version: '0.175.1',
        date: '2026-11-04',
        title: 'A refused SEO key now says why and which IP the server calls from',
        items: [
            'Settings → AI → Test: when Ahrefs or Open PageRank refuses the key, the message gives the answer of the service and the public IP address this server calls from, to add to the list of allowed IPs of the service. Open PageRank moved to openpagerank.keywordseverywhere.com (old DomCop keys no longer work): the CRM now calls the new address.',
        ],
    },
    {
        version: '0.175.0',
        date: '2026-11-04',
        title: 'Public comments: the @ list is fully visible and names the client too; free SEO checks for lead websites',
        items: [
            'Public proposal, estimate and contract comments: the @ and # suggestion list was cut by the comment frame; the frame now makes room for it. @ also offers the client side of the document (the contacts and company of the client, or the lead).',
            'Lead website tooltip, free: a line of SEO basics needs no key at all (title and description length, mobile, indexing, canonical, robots.txt, sitemap). For authority figures, an Ahrefs API needs a paid plan with API access (a refused key means the plan has none), so a free Open PageRank key (openpagerank.com) can be saved in Settings → AI: page rank 0-10 and world rank. The sources are tried in order: Ahrefs, Ubersuggest, Open PageRank.',
        ],
    },
    {
        version: '0.174.0',
        date: '2026-11-04',
        title: 'Items & Groups in one page; dragging a group no longer crashes; Ahrefs for the SEO figures of a lead website',
        items: [
            'Fixed: dragging a group on the Items page crashed the page. The menu now shows one entry, Items & Groups; the Item groups, Expense categories and Contract types entries no longer appear (their old links still open the right page).',
            'Lead website tooltip: the SEO figures (domain rating, organic traffic and keywords, backlinks, referring domains) now come from Ahrefs. Save the Ahrefs API key in Settings → AI; when both an Ahrefs and an Ubersuggest key are saved, Ahrefs is used.',
        ],
    },
    {
        version: '0.173.0',
        date: '2026-11-04',
        title: 'Proposal mails carry the uploaded files; real editor on public comments; Expenses and Contracts in coloured groups',
        items: [
            'Fixed: a proposal sent by email did not carry the files uploaded on it. The Send dialog now lists the files of the document (all ticked, up to 20 MB in all) and offers the document as a PDF (proposals, estimates, contracts and invoices).',
            'Comments on a public proposal, estimate or contract use the same editor as the rest of the CRM, not a plain text box: bold, italic, underline, colours, headings, lists, quotes, tables, alignment, links, emoji, and @ to mention a colleague and # for tags. The comment is cleaned for safety, shown with its style, and the colleagues named are told (bell, push, Telegram / WhatsApp), like the person in charge of the document.',
            'Proposals: your reply (same editor, @ to tell a colleague) can be emailed to the lead or client with the message and the link, in their language; the comments of the team and of the lead show with their style.',
            'Expenses: the list is now grouped by category in coloured accordions (totals per category), with drag between categories, rename, recolour, add and delete a category right on the page. The period filter is on the page and starts on This month (Last month, This year, All time or two dates). The Expense categories page and menu are gone.',
            'Contracts: the same, by contract type (colour, length in months, default, offered), with the period on the start date, This month by default. A signed contract keeps its type. The Contract types page and menu are gone, as is Item groups (groups are managed on the Items page).',
        ],
    },
    {
        version: '0.172.0',
        date: '2026-11-04',
        title: 'Lead website (clean, open, info on hover), Items in coloured groups with drag and AI, clear Telegram / WhatsApp notices',
        items: [
            'Lead popup → Contact: Website, Language and Position are on one line. The website is shown in grey with three icons: what is known about it on hover (online or not, response time, SSL, domain age and expiry, registrar, IP, name servers, mail provider, and, with an Ubersuggest key saved in Settings → AI, its domain authority, organic traffic and keywords, backlinks and referring domains), open it in a new tab, and change it.',
            'Fixed: a lead received from a form could have text after its website (“…/ Projet”). The address is now cleaned when the lead arrives and when it is saved, and the leads already received are cleaned once.',
            'Items page: the catalogue is shown in groups, as accordions with a colour (click a group to open its items). Drag an item to reorder it or to move it to another group, drag a group to reorder the groups, assign a group from the line, edit, delete, filter by group or search. “New group” adds a group; deleting a group keeps its items. “AI help” writes items from a short description (name, description, unit and a suggested price, in the language you work in); you tick the ones to add.',
            'Proposals, estimates and invoices: “Add from the catalogue” lists the items by group name (coloured), searchable.',
            'Telegram and WhatsApp notices now start with the category and the level: “🔴 TASK · Urgent”, then what happened (reminder, mention, comment, checklist step...), the title, the facts (status, due date, who, the client, the amount...), a short extract and the link. The dot follows the level of a task or ticket (green low, yellow medium, orange high, red urgent) and the colour of the category for the others. In the language of the person.',
        ],
    },
    {
        version: '0.171.1',
        date: '2026-11-04',
        title: 'Proposals: Mark as… Expired',
        items: [
            'A proposal can now be marked Expired by hand, from the “Mark as” menu of the proposal and of the proposals list (for a proposal you want to close before its “open until” date). Mark it Open, Sent or Revised again to reopen it; if its date has passed it expires again at the next automatic run.',
        ],
    },
    {
        version: '0.171.0',
        date: '2026-11-04',
        title: 'Clear notification emails, a Language on leads, proposals that go Sent then Expired',
        items: [
            'Emails to the team now tell you what it is at a glance, in your language: reminders on a task, lead, client, ticket, project, invoice, estimate, proposal, contract or expense show the record (status, priority, dates, who, the client, the amount, a short extract), your note, and a button to open it. The same design is used for a note reminder, a task deadline and an expired proposal. Before, they only had a title and a link.',
            'Leads have a Language (Lead popup → Contact). The proposal emails (send, expiry reminder, expired) are written in the language of the lead, or of the client for a client.',
            'Fixed: sending a proposal by email left it as Draft, and a Draft proposal cannot be opened by the lead on its public link. A proposal that goes out is now Sent and its link opens. Proposals that had already been emailed while Draft become Sent by themselves.',
            'The day after “Open until”, a Sent / Open / Revised proposal becomes Expired by itself: the lead or client gets an email saying it expired (new template “Proposal expired”, in Mails → Templates), and the person in charge gets a bell notification and an email.',
        ],
    },
    {
        version: '0.170.0',
        date: '2026-11-03',
        title: 'Customers: a Mails tab, the same as the Mails tab of a lead',
        items: [
            'New “Mails” tab on every customer: log a received or sent mail (date and time, from, to, subject, text), or write a draft with To, Cc, Bcc, Reply to, the sender address, a note for whoever sends it, checks to confirm before sending, attached files (also from the files already on the customer’s tasks and records), and send it now or automatically at a date and time. The address starts with the customer’s primary contact.',
            'Who can do what: anybody who sees the customer reads its mails; “Edit” on Customers writes, sends and deletes their own; the new permission “Edit mails logged by others” (Customers) lets someone change or send the mails of a colleague. A scheduled mail that goes out, or cannot go out, is told to its author, like for leads.',
        ],
    },
    {
        version: '0.169.7',
        date: '2026-11-03',
        title: 'Events: cancelling the confirmation brings the colour back',
        items: [
            'Fixed: when you confirmed an event it turned green, but un-confirming it (and saving) kept it green. The event now remembers the colour you chose, so un-confirming brings that colour back. An event that was already un-confirmed while green keeps green: choose its colour again once.',
        ],
    },
    {
        version: '0.169.6',
        date: '2026-11-03',
        title: 'Chat bubble: the message menu (three dots) shows above the popup',
        items: [
            'In the chat bubble, the menu of the three dots on a message (Pin, Edit, Delete, Make a task…) was drawn under the chat popup and was cut off. It now opens on top of it.',
        ],
    },
    {
        version: '0.169.5',
        date: '2026-11-03',
        title: 'Proposals, estimates and invoices: 7 days by default',
        items: [
            'A new proposal is open for 7 days from the day it is created (“Open until”), a new estimate is valid for 7 days (“Valid until”) and a new invoice is due in 7 days, instead of 14, 14 and 30. The number of days is still yours to change in Settings → Proposals / Estimates / Invoices (a value saved there before is kept).',
        ],
    },
    {
        version: '0.169.4',
        date: '2026-11-03',
        title: 'Lead cards: the company name on top, in bold',
        items: [
            'On the lead cards of the board, the company name is now the bold title and the contact name is the line under it. A lead without a company keeps the contact name as the title.',
        ],
    },
    {
        version: '0.169.3',
        date: '2026-11-03',
        title: 'Grow: only an administrator accepts, refuses or moves ideas; certificates are approved by a manager, never by the person',
        items: [
            'Grow ideas: writing or editing an idea no longer lets anybody accept it. A new idea always starts as “New”; accepting, refusing, moving it on the board, or making a task from a new idea needs an administrator, or the new permission “Accept, refuse and move the ideas” (Grow). The status field and the board buttons are locked for everyone else.',
            'Certificates and goals: approving a goal, setting the company support and verifying a certificate need an administrator or “Approve goals, verify certificates…” (My growth). “Edit” on Grow (ideas) no longer gives that power. Nobody approves or verifies their own goal, and nobody sets the support on their own goal (administrators included for the approval).',
        ],
    },
    {
        version: '0.169.2',
        date: '2026-11-03',
        title: 'Files uploaded on tasks, leads and clients show in the File manager and can be added to a draft mail',
        items: [
            'File manager: a new filter “On records” lists the files uploaded on tasks, leads, clients, tickets and other records, with the record each one belongs to (Open the record). You only see the files of records you may open.',
            'Lead draft mail → Attachments → “From files”: choose “Uploaded on records” to add a file that is already on a task, a lead or a client to the mail, without uploading it again (the same file is not stored twice).',
        ],
    },
    {
        version: '0.169.1',
        date: '2026-11-03',
        title: 'Lead popup: drag the tasks to reorder them',
        items: [
            'In the lead popup, Tasks tab, every task now has a drag handle: drag it up or down to put the tasks in the order you want (the order is saved). Dragging only changes the order, never the status of a task.',
        ],
    },
    {
        version: '0.169.0',
        date: '2026-11-03',
        title: 'Monthly team review by AI, sent to each person’s chat',
        items: [
            'New: on the 8th of every month at 08:00 the AI reads what each team member did the month before (tasks done on time and late, tasks made without a deadline or a description, tasks created and closed alone with nobody following them, supervisors not following the work, time tracked, comments) and writes a short personal review with what went well, what to improve and 3 actions for next month. It arrives in their own chat conversation “My monthly review” (with a push). Supervisors (the administrators, or the people set in the option coach_supervisors) also get how much of the team work they followed.',
            'Settings → AI → Monthly team review: “Send me my review of last month” and “Send to the whole team now”. Turn it off in Settings → Cron job → Monthly team review. It uses the AI key already set in Settings → AI.',
        ],
    },
    {
        version: '0.168.0',
        date: '2026-11-03',
        title: 'Notification hours (10:00–17:00), working day (9:00–18:00), reminders with a time on every record',
        items: [
            'The CRM now notifies only inside the notification hours (default 10:00 to 17:00, company time zone). Push, Telegram/WhatsApp and reminder emails that come outside them wait and are sent when the hours open (several at once become one summary). Change the hours in Settings > General > Working hours and notification hours.',
            'No more midnight notifications: “due today” and “overdue” items in the bell are dated at the start of the working day (default 09:00) and appear only once the day has started.',
            'Reminders: a new Remind me button on tasks and leads (date AND time, optional note and email). Reminders on tickets, client follow-ups and every other record are now really notified (they were saved but never sent before). The default time of a new reminder is the next hour inside the notification hours.',
        ],
    },
    {
        version: '0.167.2',
        date: '2026-11-03',
        title: 'Lead mails: no more notifications for drafts that are not scheduled; tables in every editor',
        items: [
            'Fixed: a lead draft mail with NO schedule was treated as due by the automatic sending, so the CRM tried to send it at every run and told you “Scheduled mail not sent” again and again (and could even have sent a complete draft by itself). Now only a draft with a date and time that has come is picked up. You are told when a scheduled mail went out, or once when it could not be sent (and why). The same safeguard now protects the note reminders, the ticket reminders and the scheduled messages.',
            'Every text editor (client requests, notes, comments, replies, ideas, tickets, emails…) can now insert tables: the Table button adds a 3×3 table with a header row, and when the cursor is in the table the buttons add or delete a column, a row or the whole table.',
        ],
    },
    {
        version: '0.167.1',
        date: '2026-11-03',
        title: 'Fix: the client page opened blank',
        items: ['The client (customer) page crashed to a blank screen since 0.166.0 (a link from a notification could not switch the tab). It opens again, and a notification link to a client request or idea switches the tab even when that client is already open.'],
    },
    {
        version: '0.167.0',
        date: '2026-11-03',
        title: 'Meet: no booking the day before, closed days; shorter notifications',
        items: [
            'Minimum notice for the Meet booking page: by default today and tomorrow cannot be booked (nobody books the day before). Change it in Settings → Calendar (days from today: 2 by default, 1 = from tomorrow, 0 = no limit). Meet itself now also refuses anything under 48 hours when the CRM cannot be reached.',
            'Closed days: Calendar → Closed days. Close one day or a period (holidays, Eid, away, too busy) with a reason only the team sees; the Meet booking page never offers those days. New permission “Close days for appointments” in Roles (administrators have it). Both rules reach Meet as busy time, so nothing changes to deploy except the Meet update.',
            'Notifications: one header for every filter (Unread / Read / All and the kinds) in a single row that slides sideways; the bell popup is 460 px wide; the title and the description of each notification are short (cut at a word, the whole text is in the tooltip) and every line has a light background (tinted when unread) so it is easy to read, hover and click.',
        ],
    },
    {
        version: '0.166.1',
        date: '2026-11-03',
        title: 'Bell popup: Unread / Read / All and the kind filters too',
        items: ['The bell popup now has the same Unread, Read and All tabs and the same kind filters (Tasks, Leads, Mentions, Requests…) as the Notifications page, with the compact lines, the read / unread button on each line, and a click that opens the item.'],
    },
    {
        version: '0.166.0',
        date: '2026-11-03',
        title: 'Notifications redone: unread / read, every kind in one place, and a click lands on the item',
        items: [
            'The bell and the Notifications page now show everything written for you (before, requests from clients, shared notes, ideas, appointments, reminders, growth and account requests were missing): mentions, comments, assignments, tickets, tasks, leads, payments, shared notes, client requests and ideas, reminders.',
            'Unread is the default view; Read and All are one click away. Each notification is read on its own when you open it, and can be marked read or unread from the small button on its line. “Mark all as read” remembers it for you on every device. Filter by kind (Tasks, Leads, Mentions, Requests…) and see the day it came (Today, Yesterday…).',
            'More compact: one line per notification (icon, what happened, about what, how long ago). A click takes you to the exact task, lead, ticket, note, client request, idea or chat, even when that page is already open.',
            'Reminders now open the record they are about (task, ticket, project, invoice, estimate, proposal, contract, expense) instead of nothing.',
        ],
    },
    {
        version: '0.165.0',
        date: '2026-11-03',
        title: 'Team growth: a monthly prime with a ceiling, and a verification that cannot be tricked',
        items: [
            'The prime of each certificate (200 to 1000 MAD, which could add up to a lot) is replaced by a monthly prime: 1 or 2 verified certificates in a month earn 200 MAD, 3 to 5 earn 500 MAD, and nobody earns more than 500 MAD in a month, trophy prizes included (a prize above the limit waits for the next month). The amounts and limits are settings (Settings → Tasks → Team growth).',
            'Only what a manager verified counts: certificates and language exams only (courses and skills give points, not money); the goal approved by a manager BEFORE the exam; at least 7 days between creating the goal and the result; the certificate attached; the same certificate counts once whatever its title or its month; nobody approves, verifies or pays their own; the month is the day of the verification taken from the server, not a date typed by the member; a verified goal cannot be edited, renamed or deleted; a month can be paid once and the amount is worked out by the CRM, never taken from the screen.',
            'My growth → My goals now explains what you gain and how to get it (the steps and the rules), shows your month, what is missing for the next amount, and why a certificate does not count. The Team tab lists the monthly primes to pay with a Pay button.',
        ],
    },
    {
        version: '0.164.2',
        date: '2026-11-02',
        title: 'Lead email: a customer who writes again also gets the email in its notes',
        items: ['When someone who is already a lead writes again, the email is added to that lead (Mails tab, notes, activity and a follow-up task), never as a new lead: this already worked. Now an existing customer who writes again also gets the email added to the notes of its client page, next to the follow-up task.'],
    },
    {
        version: '0.164.1',
        date: '2026-11-02',
        title: 'Lead email: match the [LEAD] tag at the start of the subject',
        items: ['Settings → Leads → Lead email integration → Subject contains: an entry written [LEAD] now matches only emails whose subject starts with the tag [LEAD] (also after Re: / Fwd:), and an email that starts with another tag such as [CANDIDATE] is never taken for a lead (it is logged as “Subject tag [CANDIDATE] is not a lead tag”). Plain words still work as before. To switch your mailbox to the tag rule, write [LEAD] in “Subject contains”.'],
    },
    {
        version: '0.164.0',
        date: '2026-11-02',
        title: 'Client Requests tab; pin and favourite clients; empty tabs hidden; coloured counts',
        items: [
            'New Requests tab on the client page, built like Ideas: errors to report, code integrations, changes and questions (for example for a client whose website we do not build). Each request has a reference (REQ-12), a kind, a priority, details, the page address, screenshots and files, an assignee, a due date and a status (New, Under review, Planned, In progress, Testing, Waiting for the client, Done, Declined) that you move on a board. Every change is a line in the follow-up; messages support mentions (also the client’s contacts), replies, edit and delete; “Make a task” turns it into a task.',
            'The client sees its requests in a new Requests section of the client area (switchable in Settings → Clients → Client area and per client): it sends a request with screenshots, follows the status, writes and replies, and reopens one that is not solved. The team is told on the bell and phone; the client by email and phone when the status changes or the team writes.',
            'New permission “Client requests” in Roles (everybody who could see clients keeps seeing them).',
            'Clients: each card has a Pin (pinned clients come first) and a Favorite star, personal to each team member, with a Favorites filter.',
            'Client page: the Estimates, Proposals, Projects, Files, Tickets and Notes tabs are hidden while they are empty, and the count of each tab has its own colour. The count of the Files tab now includes the files of the file library.',
            'Settings → Clients → Client area: the Ideas switch of a client is now saved (it was dropped before).',
        ],
    },
    {
        version: '0.163.2',
        date: '2026-11-02',
        title: 'Ideas: mention the client’s contacts in the discussion',
        items: ['In the Discussion of an idea, typing @ now also suggests the client’s contacts (marked “Client”). A contact you name is told personally, by email and on their phone, and sees your message in the client area, where they can reply (replies to any message already work for the team and for the client).'],
    },
    {
        version: '0.163.1',
        date: '2026-11-02',
        title: 'Every status name is a link to its page',
        items: ['The title of each column on the Tasks board, the Leads board and the client Ideas board, and the status of a task in the task list, now opens the page of that status, like the Notes column opens the Notes page.'],
    },
    {
        version: '0.163.0',
        date: '2026-11-02',
        title: 'A page for every status of Tasks, Leads and Ideas; old notes back; new events are public',
        items: [
            'New Statuses page (Tasks menu and Leads menu): every status of Tasks, Leads and Ideas as a coloured card with its count. Each status has its own page showing its items as a canvas of cards: open and edit them in the usual popup, add a new one in that status, and move a card to another status from its menu or the step bar. A status you add in the settings gets its page automatically.',
            'Notes: administrators see every note again, as on the old Notes page (they can read, comment, edit and delete them); the Tasks board shows only their own and the ones shared with them.',
            'Calendar: a new event is visible to the whole team by default (the switch is on).',
        ],
    },
    {
        version: '0.162.0',
        date: '2026-11-02',
        title: 'Notes like Google Keep: coloured cards, checklists, pictures, voice, reminders, sharing and comments',
        items: [
            'New Notes page: “Take a note…” bar, coloured cards in columns, pinned notes on top, important notes (star), labels, search, an Archive and a Shared tab. Cards show the text, the checklist (tick items right on the card), pictures, a voice player, files and links.',
            'Each note has an editor with the same rich text as everywhere (styles, images, @mentions), a checklist mode, pictures, voice recording and files, links, a reminder (bell, phone notification, email, Telegram / WhatsApp), colours and labels, and comments with replies, edit and delete.',
            'Share a note with colleagues (or just mention them with @ in the text): they get a notification, see the note, and can comment. The reminder can also tell them. Only the author changes or deletes the note.',
            'Tasks page: the Notes column now shows the important and pinned notes first (about 10 cards) and its title opens the Notes page.',
            'New permission “Notes” (View, Share notes) in Roles; everybody keeps the notes they already had.',
        ],
    },
    {
        version: '0.161.1',
        date: '2026-11-02',
        title: 'Calendar: the team can edit and delete the events they are part of',
        items: ['Everybody who opens the Calendar can now edit and delete their own events, the events they are invited to, and public events (before, only the author could, so colleagues got "Forbidden" on almost every event). Private events of others still need "Edit and delete events of others".'],
    },
    {
        version: '0.161.0',
        date: '2026-11-02',
        title: 'Install the app on the phone and get notifications on the screen',
        items: [
            'trtCRM is now an installable app (Android and iPhone) with your logo and name: Android → profile menu → Install the app; iPhone → Safari → Share → Add to Home Screen, then open it from the home screen.',
            'Push notifications: every bell notification (mentions, tasks, assignments…), private and group chat messages, and for clients the answers on tickets, ideas and chat appear on the phone screen, even when the app is closed. Tapping one opens the right page.',
            'Profile menu → Install the app & notifications (team and client area): install button or steps, turn notifications on or off per device, send a test, remove a device.',
            'Settings → WhatsApp & Telegram → Push notifications: one switch for the whole company. The VAPID keys are created once automatically and stored encrypted.',
        ],
    },
    {
        version: '0.160.3',
        date: '2026-11-02',
        title: 'Chat bubble: same full-width messages and tools under the message',
        items: ['The chat bubble (the flying chat) now shows messages the way the chat page does: full width, the name and time above each group, and the tools (Reply, React, Save, Pin / Edit / Delete) in a small bar under the message when the pointer is on it. The emoji bar floats above the bubble.'],
    },
    {
        version: '0.160.2',
        date: '2026-11-02',
        title: 'Chat: any emoji, a full-width conversation, tools under the message, emoji button everywhere',
        items: [
            'Reactions: besides the 8 quick stamps there is a "more" button with a full emoji picker (about 600 emojis in 8 groups: faces, hands, hearts, animals, food, sport and travel, objects, symbols and flags). Any emoji is accepted, with skin tones, flags and joined ones; text and markup are refused. The picker floats above everything, so it is never cut by the conversation or hidden behind another message.',
            'Chat page: messages use the full width of the conversation, with the name and the time above each group of messages. The tools (Reply, React, Save, Pin / Edit / Delete...) appear in a small bar under the message when the pointer is on it. The chat bubble keeps the compact bubbles.',
            'An emoji button next to the paperclip of the chat box, and in the toolbar of every rich text editor (tickets, comments, notes, ideas), inserts an emoji where the cursor is.',
        ],
    },
    {
        version: '0.160.1',
        date: '2026-11-02',
        title: 'Ticket messages and more comment boxes use the editor',
        items: [
            'Support tickets: the reply box of the team, the new ticket message (team and client area) and the reply box of the client are now the rich text editor (bold, lists, links, colours, tags), no longer a plain text area. Pasted screenshots still go to the attachments. The email the client or the team gets is the text of the message (with its attachment links). Messages are cleaned of scripts on the server; old plain messages display as before.',
            'Issues (comments) and Grow ideas (comments) use the editor too, with @mentions and #tags.',
            'Still plain text on purpose: the notes printed on invoices / estimates, and the comments on contracts, estimates and proposals, because the client sees them on the public pages, which only show plain text.',
        ],
    },
    {
        version: '0.160.0',
        date: '2026-11-02',
        title: 'Chat messages: stamps, saved messages, pins, edit and delete, and finer chat permissions',
        items: [
            'Chat (the bubble and the page): hover a message for React (8 stamps, click a stamp again to take yours back), a star to save it for later, and "..." to Pin to the conversation, Edit (your own text) and Delete. A pinned message shows on top of the conversation (click to jump to it) and a line says who pinned it. A deleted message leaves a grey "This message was deleted" line; an edited one says "edited". Other people\'s open conversations pick these changes up at once (every 3 seconds).',
            'New "Saved" tab in the chat page and in the bubble: all the messages you starred, from every conversation; click one to open its conversation.',
            'Roles & permissions: a new row "Chat messages" (React with stamps, Save messages, Pin, Edit own, Delete own, Delete messages of other people for moderators) and the Team chat row now has Send files / pictures / voice, Create groups, Make calls and See and answer client conversations. Everybody who had the chat keeps all of it (except deleting other people\'s messages, which only the Admin roles get by default); the read-only Viewer role only reads. Clients see a deleted message as deleted in their chat.',
        ],
    },
    {
        version: '0.159.0',
        date: '2026-11-02',
        title: 'Client ideas: real conversations (editor, mentions, replies, edit, delete); long text no longer leaves its card',
        items: [
            'The conversation of an idea now works like the one of a task. Team: a rich text box (bold, lists, links, colours, pictures), @mentions of colleagues (they are notified on the bell and on Telegram / WhatsApp) and #tags, reply to a message (the quote shows above the answer), edit your own messages (marked "edited") and delete your own (or any, with the Delete permission). Team-only notes stay hidden from the client, and so do the quotes of them.',
            'Client area: the client also writes with a rich text box (bold, italic, lists, links), can answer a message, edit and delete its own messages, and the answer to an idea (Approve, I am interested, Not now) takes the same box. Clients cannot mention the team or add pictures. Every message is cleaned of scripts on the server.',
            'Cards: long words, web addresses and titles no longer run out of their card. Fixed on the idea cards (team and client area: the title wraps in 3 lines at most, the price is shortened) and on the cards of the client area, and checked on the task board and the lead and project boards, which already clip long text with "…".',
        ],
    },
    {
        version: '0.158.2',
        date: '2026-11-02',
        title: 'Smaller coloured tags for impact, effort and priority; help when a client cannot sign in',
        items: [
            'Idea popup, Value: Impact, Effort and Priority are now small tags, light-coloured by meaning: a high impact is green, a high effort is red, a high priority is red, low ones are grey or green.',
            'Setting a client\'s area password now tells you at once if that contact still cannot sign in (client inactive, contact inactive, no valid email, locked) and where they sign in (/portal, not the team sign-in). The client area now says "Your company account is not active" when the password is right but the client is switched off, instead of "Wrong email or password".',
            'Team sign-in page: a link "Client area sign-in", and if a client types their client email and password there, it says these belong to the client area and gives the address.',
        ],
    },
    {
        version: '0.158.1',
        date: '2026-11-02',
        title: 'Fixed: Impact, Effort and Priority of an idea can be selected',
        items: ['In the idea popup (Value section) the three choices Low / Medium / High did not show which one was picked, so they looked impossible to select. Every switch with number values (Impact, Effort, Priority, the number of ideas for the AI research) now highlights its choice.'],
    },
    {
        version: '0.158.0',
        date: '2026-11-02',
        title: 'Sign in with Google or GitHub without an account: the person asks, the administrators approve',
        items: ['Someone who signs in with Google or GitHub (with a verified email) and has no account is no longer just refused: a request is written, they see "Your request was sent to the administrators", and the administrators and the members allowed to add team members are told on the bell, by email and on Telegram / WhatsApp. One request per email: signing in again only shows "waiting for approval".',
            'Team page: a blue block "Account requests" lists who is waiting (name, email, Google or GitHub, date). Choose a role and Approve: the account is created with the name and photo from Google, no password, no admin rights, and the person gets an email telling them they can sign in. Decline keeps the request on record; they see that it was declined. Nobody gets any access before approval.',
            'Settings → Sign-in & API has a switch "Let people ask for an account with Google or GitHub" (on). Off brings back the old message "There is no account for you here yet".'],
    },
    {
        version: '0.157.1',
        date: '2026-11-02',
        title: 'Ideas: editable categories, a plain tab with an AI icon, and the page no longer overflows',
        items: [
            'The Ideas tab is back to the normal tab design, with a small AI sparkle icon. The client page no longer grows wider than the screen when it has many tabs (the right column now keeps to its width and the board scrolls inside its card).',
            'The categories of ideas can be edited: Customers → More → Idea categories (also the "Edit categories" link above the board, and a button in Settings → Clients). Name, colour, order, on/off, add your own. The eight that come with the app (Grow the business, Save money, Marketing, Sales, Tech, Operations, Brand, Other) are translated in the five languages; a category you add shows as you typed it. A category in use cannot be deleted (switch it off instead) and Other always stays. The AI research uses your list, and the client area shows the colours.',
        ],
    },
    {
        version: '0.157.0',
        date: '2026-11-02',
        title: 'Client Ideas: a board of ideas to propose to each client, the client answers from its area, and an AI researcher',
        items: [
            'New blue tab Ideas on every client, next to Invoices: a board like Tasks with the columns Draft, Proposed, Interested, Approved, In progress, Done and Declined. Drag a card to change its status. A card shows its category, impact and effort, price, whether the client can see it, comments and the client\'s answer.',
            'The idea popup has accordions: The idea (title, category, rich description), Value (impact, effort, priority, what the client gains, price, answer-by date), Status and client (status, visible to the client, the client\'s answer), Team and work (who works on it, tags, "Make a task of it") and Discussion (messages with the client and team-only notes).',
            'The client sees an idea only after it is Proposed, and only when Settings → Clients → Client area has Ideas on (also per client under Client area access). Moving a card to Proposed emails the client\'s contacts (new email templates "client-idea-proposed" and "client-idea-message", in five languages). In the client area, a new Ideas page lists the ideas and the client can Approve, say it is interested or decline, with a word, and ask questions. The team is told on the bell and on Telegram / WhatsApp when the client answers or writes.',
            'AI research: the button reads what we sold this client, its projects, support subjects, proposals and the ideas already written, studies its business, and (with Claude) searches the web for the closest competitors and compares them with the client. It proposes only ideas we can deliver with our services and prices, each with the evidence, the plan, the expected gain, impact and effort, our service that fits and its sources. Generic advice is refused by the prompt. You pick the ideas; they become hidden drafts. The last research (the business and the competitor benchmark) stays on top of the board. Only company-level facts are sent to the AI: never contact names, emails or phone numbers.',
            'New permission row "Client ideas" (View, Create, Edit, Delete) in Roles & permissions; the Account Manager and Sales Rep roles get Edit. New webhook events client_idea.created, client_idea.moved and client_idea.answered.',
        ],
    },
    {
        version: '0.156.1',
        date: '2026-11-02',
        title: 'Drag to reorder works again (task checklists, milestones, lists)',
        items: ['Fixed: the checklist of a task (and of a lead\'s tasks) and the milestones of a project could not be reordered by dragging: the grip was a bare icon, which browsers do not let you drag. Every list with a position now uses one shared grip that works in Chrome, Safari and Firefox, shows the whole row while you move it and saves the new order at once: task checklists, project milestones, and all the lists managed in Setup (statuses, priorities, sources, departments, payment methods, groups...). The client custom fields in Settings can be dragged too.'],
    },
    {
        version: '0.156.0',
        date: '2026-11-02',
        title: 'Settings and menu tidied: unbuilt options, duplicated lists and old Perfex pages removed',
        items: [
            'Settings: the Google and Pusher pages are gone (none of their options did anything), and so is "Sign in with Google or Microsoft to send" under Email and every option marked "Soon" that no screen used (queue, client registration, ticket notification switches, e-signature identity...). The Subscriptions, Payment methods and Tags pages went too: Subscriptions had no working option, and the other two lists live in the menu.',
            'Statuses, priorities, departments, predefined replies, spam filters, lead statuses and sources, web-to-lead forms, task statuses, currencies, taxes, payment methods, tags and countries were in Settings and in the menu. They are now only in the menu (so the whole team finds them in one place); Settings keeps a card with buttons that open them. Their data and permissions are unchanged.',
            'New Settings page "Sign-in & API" (Integrations): shows whether Google and GitHub sign-in are on, the address to register at each provider with a copy button, the server variables to set when one is off, and a button to API and webhooks.',
            'Menu: the old Perfex pages Modules, Newsfeed (Announcements replace it), Mail queue, Tracked emails and Ticket pipe log are hidden (no feature used them; their data is kept). Notes was listed twice and now once, open to everybody. The Calendar sync entry of the gear menu is gone.',
        ],
    },
    {
        version: '0.155.1',
        date: '2026-11-02',
        title: 'Sign in with trtAgency removed; Google and GitHub stay',
        items: ['The "Sign in with trtAgency" button and its server routes are gone from the sign-in page. Email and password, Google and GitHub (each shown when its keys are set) remain.'],
    },
    {
        version: '0.155.0',
        date: '2026-11-02',
        title: 'Roles & permissions: API, AI insights, Payroll and team growth have their own rows; Meet drops requests deleted in the CRM',
        items: [
            'Roles & permissions (and each member\'s access): four new rows. "API, webhooks and sign-in apps" (View / Edit), "AI insights" (View = use, Edit = change the AI keys and models), "Payroll" (View / Edit) and, on "My growth", two new switches: "See everybody\'s growth, goals and trophies" and "Approve goals, set and pay primes, award trophies". These pages and actions used to be for the super administrator only; the super administrator keeps them, nobody else has them until a role is given them. The standard Admin and Viewer roles do not get them, and the "Read only" button never switches them on. Their menu entries now show for whoever has the permission.',
            'Meet: a meeting request deleted in the CRM now leaves the requested list of Meet (and one declined or accepted in the CRM is refused or confirmed there). Meet asks the CRM each time the list is opened, so it needs no webhook.',
        ],
    },
    {
        version: '0.154.0',
        date: '2026-11-01',
        title: 'Meet sends the meeting recap to the CRM: minutes on the event, action items as tasks',
        items: [
            'New call POST /api/v1/calendar/recap (key with the scope calendar:write). Meet sends the AI recap of a meeting with its room; the CRM finds the calendar event of that room, writes the minutes on it (also shown on its lead) and creates one task per action item, assigned to the person named in the recap when the name matches one team member, otherwise to the member who saved. Tasks are linked to the event\'s client or lead; saving twice adds the minutes below the first ones and never duplicates a task.',
            'Calendar event: a new section "Meeting minutes" with a rich text editor, to read or change what Meet saved.',
        ],
    },
    {
        version: '0.153.0',
        date: '2026-11-01',
        title: 'Confirmed meetings in green, reminders for the client with an email template, popups on top of each other',
        items: [
            'Fixed: a popup opened from another popup (for example "Delete this event?" over the event form) showed under it. Every popup now opens above the ones already open.',
            'Calendar event, Details: a switch Confirmed (off by default). A confirmed event turns green, with a light green background and a glowing dot in the calendar (month, week, day and the list at the side). Accepting an appointment request also confirms it. The Details section is now compact: the two switches on one line, project, colour and reminder on one row.',
            'Reminders now really go out. At the time chosen ("30 minutes before") the team members of the event get a bell and Telegram / WhatsApp message, once. New switch "Also remind the client, the lead and the guests by email", with a choice of email template: Meeting reminder, what to prepare, or Starting soon (with the join link), in five languages, plus any template you make in Settings → Email templates whose name starts with event-. Without a meeting link the email has no join button. A new time makes the reminder due again. The automatic task is "Calendar event reminders" in Settings → Cron job (it must run every few minutes).',
        ],
    },
    {
        version: '0.152.1',
        date: '2026-11-01',
        title: 'Meet can delete, edit and answer its requests even after its API key was replaced',
        items: [
            'A program key used to act only on the requests created with that very key, so after a key was replaced (for example to add the read scope) the earlier bookings could no longer be deleted, edited, accepted or refused from Meet: the CRM answered 404 and the event stayed on the calendar. A key with calendar:write now acts on every event that came in through the API (the ones that carry a source such as trtmeet-booking), whichever key sent it. An event nobody requested through the API (a meeting you created in the CRM) can never be deleted, edited or answered by a key.',
        ],
    },
    {
        version: '0.152.0',
        date: '2026-11-01',
        title: 'Learning now earns points, levels and trophies with prizes from 200 to 1000 MAD',
        items: [
            'Points: every goal passed (certificate 100 to 300 by level, language exam 200, course 100, skill 80, +50 for AI), a few points for goals planned or started, +50 for every trophy. Levels: Rookie, Learner (100), Skilled (300), Expert (600), Master (1000), with the way to the next one.',
            'Eight trophies with a cash prize or a badge: First step, First certificate (200 MAD), Polyglot (300), AI ready (400), Proof kept, Hat-trick (600, three goals in 12 months), High five (800, five goals in 12 months) and Master learner (1000 MAD, 1000 points). A trophy is won once, the member and the administrators are told, and the administrators see the prizes to pay on My growth → Team and mark them paid.',
            'Primes from 200 to 1000 MAD: every certification and language exam of the catalog now shows its prime (200 to 700 by level, +100 for AI, +100 when the exam is paid; languages 600 to 1000). Approving a goal from the catalog with no prime set gives it that prime, and a manager can change it.',
            'New My growth → Trophies tab: your level and points, the trophies (won ones lit, locked ones with progress and prize), the hall of fame of the team and how points work. My goals starts with your level. A Growth card with level, trophies and recent certificates is on the staff profile page and in My profile → Growth.',
            'The team dashboard counts learning too: a Learning column in the leaderboard (+1 point per 4 learning points), a new Best learner badge, and the CSV export.',
        ],
    },
    {
        version: '0.151.1',
        date: '2026-11-01',
        title: 'Sign-out address of an app (Meet): any page of the same site is accepted',
        items: [
            'The CRM sends a person back to an app after signing out only when the address is registered. An app whose sign-out address was not listed, or differed by a path, ended on the CRM sign-in page. Any page of the same site as one of the app\'s registered addresses is now accepted (never another site). Meet itself now signs out of Meet only and keeps the CRM session.',
        ],
    },
    {
        version: '0.151.0',
        date: '2026-11-01',
        title: 'Grow ideas can be dragged between columns; scheduled messages repeat as you choose',
        items: [
            'Grow → Ideas and advice: drag a card to another column (New, Accepted, In progress, Done, Dismissed) like leads and tasks. The status is saved at once and put back if it cannot be saved. It also works from the keyboard (focus a card, Space, arrow keys, Space). Only people who can edit Grow can drag.',
            'Scheduled messages, Repeat: new "Custom…" with every N days, weeks, months or years (1 to 365), and for every repeat a "Stop after" number of times, as on recurring invoices: for example every day, 2 times, or every 2 weeks, 5 times. Empty means never stop. The card shows "Every 3 days, 2 times · 1/2". "Send now" does not use up one of the times.',
        ],
    },
    {
        version: '0.150.0',
        date: '2026-11-01',
        title: 'Grow: free AI and cloud credits, grants and partner programs; AI learning',
        items: [
            'New tab Grow → Programs: 10 programs researched this month that give credits, grants or badges: AWS Activate (up to 100,000 USD), AWS Generative AI Accelerator (up to 1 million USD, cohort calls), Google for Startups Cloud Program AI tier (up to 350,000 USD), Microsoft for Startups Founders Hub (up to 150,000 USD), Claude for Startups, OpenAI for Startups, NVIDIA Inception (free), Meta Llama Impact Grants (no round open now), and the agency badges Meta Business Partner and Google Partner. Each card gives the amount, who can apply, what it means for us, the steps and the official link.',
            'One click puts a program on the ideas board (once) with its steps, so it can be assigned, commented, tagged and turned into tasks, and the card shows where it stands. The monthly routine reminds the administrators of the programs not started yet.',
            'Amounts and rules change often and the sources disagree, so each card says to confirm on the official page. Many startup programs refuse agencies and consultancies: apply as the maker of trtCRM and trtMeet, not for client work.',
            'AI learning in My growth: three more AI certifications in the catalog (DeepLearning.AI short courses, AWS Certified AI Practitioner, Microsoft Azure AI Fundamentals) next to Anthropic Academy, Google AI Essentials and OpenAI Academy, and a new "AI learning" section in the team playbook (one hour a week, use it on a real task, check every answer, protect client data, share one trick a week, one small automation, one AI certificate a quarter). Add any of them to your goals; the company can pay the exam and a prime.',
        ],
    },
    {
        version: '0.149.1',
        date: '2026-11-01',
        title: 'Fixed: after signing in for Meet, the browser went to the CRM instead of back to Meet',
        items: [
            'When another app (Meet) sends someone who is not signed in to the CRM, the sign-in page remembers the request. The page that guards the sign-in screen then sent the person to the CRM home as soon as they were signed in, which won the race against the return to the request. It now goes back to the authorization request (and from there to Meet) as a full page load. The server does the same when someone who is already signed in opens the sign-in address.',
        ],
    },
    {
        version: '0.149.0',
        date: '2026-11-01',
        title: 'Fixed: older meetings were missing for Meet; a message for the person who asked',
        items: [
            'Fixed: meetings saved before the status field existed (the existing ones in your calendar) were left out of the list that Meet reads and out of the busy times, because the filter dropped every event with no status stored. They now count as confirmed, so Meet shows the same meetings as the CRM calendar and no longer offers a slot that is taken.',
            'A booking request now has a text box on its banner: "A message for the person who asked" (why, another time, what to prepare) goes in the email with Accept or Decline. When you change an accepted appointment that came from Meet, a switch "Tell the person who asked about this change" emails the new time with your note. The same note can be sent from Meet with PATCH /api/v1/calendar/events/<id> {message, notify}.',
        ],
    },
    {
        version: '0.148.2',
        date: '2026-11-01',
        title: 'Calendar feed also says what it did not list',
        items: [
            'The "meta" block of GET /api/v1/calendar/events now has not_shown: the requests still waiting for acceptance, the refused ones, and the tasks and invoices due in the same dates (other layers of the CRM calendar, never events), so a program can tell why its list is shorter than the calendar screen.',
        ],
    },
    {
        version: '0.148.1',
        date: '2026-11-01',
        title: 'Calendar feed says what it let the member see',
        items: [
            'GET /api/v1/calendar/events now ends with a "meta" block: which events the CRM let that member see (everything, own, invited, shared and public, or own and invited), how many it found in the range and how many it returned. It helps to tell a CRM that sent too little from a program that dropped some.',
        ],
    },
    {
        version: '0.148.0',
        date: '2026-11-01',
        title: 'Meet shows the same meetings as the CRM calendar',
        items: [
            'With a member\'s own token, GET /api/v1/calendar/events now answers what that member sees in the CRM calendar: their own events and the ones they are invited to, the events nobody owns, the public events, and every event for administrators and for who may see all events. Events with a Google Meet, Zoom or any other link (include_unlinked=1 adds the ones with no link) are all returned. A member without access to the calendar gets an empty list. An API key still answers only for the member named by staff_id (their own and invited events).',
            'Fixed: an event saved without an end time came back with end null, which a program could not show. It now ends one hour after its start (a day for an all-day event).',
        ],
    },
    {
        version: '0.147.0',
        date: '2026-11-01',
        title: 'Meet can see all of a member\'s events, and the team busy times',
        items: [
            'GET /api/v1/calendar/events (member token, scope calendar.read) now honours include_unlinked=1: it returns every event of the member in the range, including those without a meeting link (meeting_url and room are null) and those on other sites, each with all_day. Without the parameter it still returns only the events with a meeting link on meet.trtcrm.com.',
            'New GET /api/v1/calendar/busy?from=&to= (API key with calendar:read, or a member token with calendar.read): when the team is busy, for a booking page that offers free slots. Every confirmed event of the team (with or without a link) and every request still waiting (draft) gives only its start, end, state and the staff ids in it: no titles, no names. ?staff_id= limits it to one member; at most 62 days at a time.',
        ],
    },
    {
        version: '0.146.0',
        date: '2026-11-01',
        title: 'Calendar event form: compact accordion with icons and light coloured headers',
        items: [
            'The event popup is now four folding sections with an icon and a light coloured header each: Event (type, title, all day, dates), People (client or lead, team members, other guests, invitation), Meeting (link with the ready-made rooms, location) and Details (description, project, colour, reminder, visibility). One section is open at a time and each closed one shows a one-line summary; a missing title or date opens the right section. The popup is shorter and narrower.',
        ],
    },
    {
        version: '0.145.0',
        date: '2026-11-01',
        title: 'Appointment requests: the Meet app can accept, refuse, edit and delete them',
        items: [
            'With the same API key (scope "Send appointment requests"), a program can now act on the requests it sent: POST /api/v1/calendar/events/<id>/decision {decision: accept | refuse, staff_id, notify?, message?} (staff_id is the team member who decided in the program; accepting makes them the owner and emails the person who asked), PATCH /api/v1/calendar/events/<id> to change title, dates, meeting link, description and guests, and DELETE to remove it. Only the requests that key created can be touched; the same answer twice changes nothing; a request can be refused after it was accepted (cancelled).',
            'The other direction: when a team member changes or deletes such an event in the CRM calendar, the CRM now calls the webhooks appointment.updated and appointment.deleted (next to appointment.requested, accepted and declined), so the program stays in step. Examples are in the "How to use" tab of API and webhooks.',
        ],
    },
    {
        version: '0.144.0',
        date: '2026-11-01',
        title: 'Scheduled messages: compact accordion form, and a lead can be linked like a client',
        items: [
            'The scheduled message form is now four folding sections (Message, Send to, When, When it goes out), one open at a time, each with a one-line summary while closed: much shorter, nothing hidden.',
            'Client or Lead (same switch as in the calendar event): the message, its task and its optional email can now be linked to a lead as well as to a client. The same choice is in the chat menu "Link a client and email them", and a message linked to a lead shows a Lead tag in the chat.',
        ],
    },
    {
        version: '0.143.0',
        date: '2026-11-01',
        title: 'Scheduled messages: rich editor with screenshots, mentions and tags; team, task and client',
        items: [
            'The message of a scheduled chat message is now written in the rich editor (formatting, links, colours, @ mentions, # tags, screenshots pasted or dropped) instead of a plain box, and goes into the chat exactly like that.',
            'New options under "When it goes out": assign it to team members (they are told on the bell), make a task of it at each send (for the people assigned, with the client if one is chosen), and link a client and email them the message with its screenshots. If the task or the email cannot be done, the message still goes out and the automatic-task log says why.',
        ],
    },
    {
        version: '0.142.0',
        date: '2026-11-01',
        title: 'Appointment requests from the Meet booking page land on the calendar as drafts',
        items: [
            'New API call POST /api/v1/calendar/events (API key with the new scope "Send appointment requests to the calendar"): title, start, end, meeting_url, room, attendees (name, email, phone), description, source. The request is recorded as a DRAFT: it shows on the calendar in yellow with ⏳, nobody is invited, no reminder goes out and it is not in anyone\'s meetings feed until a team member accepts it. The same room is never recorded twice (a second call updates the draft). If an attendee\'s email is a known lead or client contact, the event is linked to them. The administrators are told on the bell and on Telegram / WhatsApp.',
            'Open the event: a banner shows who asked (name, email, phone) with Accept and Decline. Accept makes it a normal confirmed event owned by you and emails the person with the meeting link; Decline hides it and tells them. The program that sent it can ask its state with GET /api/v1/calendar/events/<id>, or listen to the new webhooks appointment.requested, appointment.accepted and appointment.declined. The "How to use" tab of API and webhooks has an example.',
        ],
    },
    {
        version: '0.141.0',
        date: '2026-11-01',
        title: 'Chat: rich messages with screenshots, tags and mentions; make a task, assign the team, email a client',
        items: [
            'The team chat box is now a real editor (not a plain text box): bold, italic, lists, links, colours (button Aa), @ to mention a colleague (they get a notification), # to add a tag (shown as a chip on the message), and pictures pasted, dropped or chosen. Enter sends, Shift+Enter makes a new line. The camera button takes a screenshot of your screen, a window or a tab and puts it in the message. The client chats keep the simple box.',
            'On every message, the ⋯ menu: "Make a task" (the message becomes a task with its text and screenshots, the people you choose assigned and told, a due date and a client if you like; the message then shows a Task link), "Assign to the team" (people are told on the bell and shown on the message), and "Link a client and email them" (the message is linked to the client and, if you switch it on, emailed to the client\'s contact with the screenshots, and written in the activity log).',
        ],
    },
    {
        version: '0.140.0',
        date: '2026-11-01',
        title: 'Scheduled messages: the CRM posts in the team chat by itself',
        items: [
            'New page Utilities → Scheduled messages (permission "Scheduled messages (chat)": View, Create, Edit, Delete; administrators have it). Write a message, choose who gets it: the Team room (everybody sees it), a private message to each administrator, to each team member, or to chosen people. Choose the date and time and whether it repeats: once, every day, every weekday (Mon to Fri), every week or every month.',
            'The message appears in the chat as sent by you, at the first run of the automatic tasks after its time (the new task "Scheduled chat messages" in Settings → Cron job; the tasks should run every few minutes). It is sent only once even if two runs overlap, and a server that was off sends it once and moves on to the next time. Each message can be switched off, sent now, edited or deleted, and shows its next time, its last send and how many times it went out.',
        ],
    },
    {
        version: '0.139.0',
        date: '2026-11-01',
        title: 'Invoices: mark old unpaid balances as Lost, so they stop showing',
        items: [
            'New invoice status Lost (written off). Mark any unpaid, partly paid or overdue invoice as lost, from the row menu or the invoice page, and restore it any time. A lost invoice leaves the outstanding and overdue figures, the overdue calendar, the automatic reminders (it is never turned back to overdue) and the client area. It is hidden from the default list and found under the new Lost filter; if it is finally paid in full it shows as Paid.',
            'New button "Old unpaid" on the Invoices page: lists the invoices older than 1, 2, 3 or 5 years that are still unpaid or partly paid (what is still due on each), and marks the ones you tick as lost in one go. Every change is written in the invoice history.',
        ],
    },
    {
        version: '0.138.2',
        date: '2026-11-01',
        title: 'The Meet app can show each member their own meetings',
        items: [
            'New call GET /api/v1/calendar/events?from=&to= : with the access token of the member who signed in to Meet (scope calendar.read) it answers only with that member\'s meetings, the ones they created or are invited to, that have a meeting link on meet.trtcrm.com (all=1 for any link). Per event: id, title, start, end, meeting link and room, organizer, guests and their number. Another member\'s calendar cannot be read with it.',
            'An API key with the new scope "Read the meetings of a team member" can do the same by adding ?staff_id=…, for a server-to-server use; a leaked key would expose every calendar, so the member token is the recommended way.',
        ],
    },
    {
        version: '0.138.1',
        date: '2026-11-01',
        title: 'Calendar: ready-made meeting rooms and your own room name; SSO shares more of the profile',
        items: [
            'Calendar event, field Meeting link: one click puts a ready-made room on meet.trtcrm.com (Discovery call, Proposal review, Contract signing, Client check-in, Internal, Interview), or type your own room name and press "Use this name" to get https://meet.trtcrm.com/your_name. "Create" still makes a random room.',
            'Sign in with CRM now also tells the app the first and last name, phone, language and LinkedIn of the team member, and uses their profile photo (the account photo, else the team profile photo).',
        ],
    },
    {
        version: '0.138.0',
        date: '2026-11-01',
        title: 'Sign in with the CRM (SSO) for the Meet app, and meeting links on meet.trtcrm.com',
        items: [
            'The CRM is now an OpenID Connect provider: your Meet app (or any app of yours) can let the team sign in with their CRM account. New tab Setup → API and webhooks → "Sign in with CRM": add an app with its redirect addresses, get a client id and a secret (shown once, only its hash is kept), switch it off, renew its secret or delete it, and see its last sign-in and how many sign-ins it had. The addresses to give the app (discovery, authorize, token, user info, keys, sign-out) and a Node.js example are on the same tab.',
            'Only active team members can sign in; clients and former members are refused, and an app that is switched off stops at once (even for tokens already given). The app learns the id, name, email, photo, staff id, whether the person is an administrator, and their role: Meet can use "administrator" to decide who admits guests from the waiting room. Standard code flow with PKCE, RS256 signed tokens, single-use codes valid 60 seconds, exact redirect addresses only, and silent re-checks (prompt=none) so Meet can stay signed in only while the CRM session lives. Signing out of Meet can end the CRM session too.',
            'The "Create" button of a calendar event now makes the video room on https://meet.trtcrm.com/… instead of meet.3a.ma.',
        ],
    },
    {
        version: '0.137.2',
        date: '2026-11-01',
        title: 'Grow routine: uses the AI key even when no model was saved',
        items: [
            'The Grow Routine tab said "No AI key yet" although a key existed in Settings → AI, because no model had been saved for the provider. The routine now uses the same default model as the AI settings screen (the first preset) when none is saved.',
        ],
    },
    {
        version: '0.137.1',
        date: '2026-11-01',
        title: 'Profile menu: Grow and My growth added, Calendar sync removed',
        items: [
            'The menu under your picture now has My growth (everyone) and Grow (the company dashboard, ideas and routine, for those with the Grow permission). The Calendar sync entry is gone.',
        ],
    },
    {
        version: '0.137.0',
        date: '2026-11-01',
        title: 'My growth: learning goals, certifications, primes and a playbook for the team',
        items: [
            'New page Utilities → My growth, for every team member (the permission "My growth", on by default). My goals: add a certification, a language exam, a course or a skill, with provider, link, target date (with the days left) and notes; move it from Planned to Learning to Passed; attach the certificate or the receipt (PDF or photo, up to 10 MB).',
            'Support and primes: a manager (permission Grow, Edit) approves a goal, sets how much the company pays for the exam or the course and the prime promised when it is passed, and marks the prime as paid. The member sees their amounts but cannot change them. The administrators are notified when a goal is added or passed; the member is notified when it is approved or when the prime is paid.',
            'Catalog: 35 certifications (Google Ads and Analytics, Meta, HubSpot, SEO, Microsoft, Shopify, AI, design, project management, automation…) with level, cost, validity, why it is worth it and a suggested prime, five language exams (English, French, Spanish, Arabic, Japanese) with free resources, and 12 sources to follow what is new in digital. One click adds an item to your goals. Costs and links are indicative.',
            'Playbook: daily, weekly and monthly checklists (ticked per day, week or month on your own device), and tips to work fast, avoid mistakes, follow up without missing anything and upgrade your skills. Administrators (Grow) also get a playbook to convert leads into clients, find opportunities, bring more income and run the weekly and monthly routines.',
            'Team tab (Grow viewers): who is learning, who passed this year, goals waiting for approval, primes to pay and paid, what the company spent, and who has no goal. The Grow dashboard now counts the members without a goal and the Grow routine suggests it every month.',
        ],
    },
    {
        version: '0.136.0',
        date: '2026-11-01',
        title: 'Grow: the company dashboard, ideas and advice board, and the daily routine',
        items: [
            'New page Utilities → Grow (for administrators; the permission "Grow" controls who sees it and who can edit). Overview: open leads and conversion, invoiced this year against last year, what is left to collect, open and overdue tasks, support requests and their rating, how much the 5 biggest clients weigh, charts of leads and income per month, where the leads come from, and a "Needs attention" list that links to the right page.',
            'Ideas and advice board with the columns New, Accepted, In progress and Done. Every idea has a category, a repeat (daily, weekly, monthly, one time), a priority, tags, people assigned, a due date and comments. One click turns an idea into a real task (assigned people are notified); when the task is completed the idea is marked done by itself. Filters by search, category, repeat, tag and "mine".',
            'The routine: every day, week and month it reads the figures of the CRM and writes ideas by itself (leads never contacted, overdue tasks, tickets waiting, overdue invoices, silent leads, proposals without an answer, best source, dormant clients, client concentration, income against last year, recurring revenue, prices, team skills). An idea is never written twice for the same period. If an AI key is set in Settings → AI, the AI adds its own ideas, and with Claude it can search the web for what is new in ads, SEO, AI tools and ways to bring more income. Administrators get a notification when new ideas arrive. Switches, language, "Preview" and "Run" per period are in the Routine tab; the automatic task is "Run the Grow routine" in Settings → Cron job.',
            'Everything is also available through the API (ideas read and write) and the webhooks.',
        ],
    },
    {
        version: '0.135.0',
        date: '2026-11-01',
        title: 'API and webhooks: read and push data, and be told when something happens',
        items: [
            'New page for the super administrator: Setup → API and webhooks. API keys: create a key per program (n8n, a website form, your own code), choose exactly what it may do (read or create and change leads, clients, tasks, Grow ideas; read tickets, invoices, proposals, projects, team names), see when it was last used and its last calls, set an expiry date, revoke it at once. Only a hash of the key is stored; the key is shown once.',
            'Public API at /api/v1: GET lists (search, paging, updated_since), GET one, POST to create, PATCH to change leads, clients, tasks and ideas; read-only for tickets, invoices, proposals, projects and staff. Nothing can be deleted, and passwords, bank details and private notes are never available. 120 calls a minute per key, one clear error format, every call logged for 30 days.',
            'Webhooks (the other direction): the CRM calls your address when a lead is created or converted, a client or a task is created or completed, a support request is opened or answered by the client, or a Grow idea is created. Each call is signed (HMAC SHA-256 with a secret shown once), has an 8-second limit, is logged, can be tested with one click, and a webhook that fails 20 times in a row switches itself off. Addresses on a private network are refused.',
            'A "How to use" tab explains it all with examples you can copy (curl, and how to check the signature in Node.js and PHP).',
        ],
    },
    {
        version: '0.134.2',
        date: '2026-11-01',
        title: 'A proposal sent to a lead opens without signing in',
        items: [
            'The CRM address of a proposal (/crm/proposals/...) used to ask for a sign-in even when it was shared with a lead. Now, when the proposal is for a LEAD and its status is Sent (or Open, or Revised), a visitor who is not signed in is taken straight to its public page, where they can read it, comment and accept or refuse. A draft, a proposal of a client, or one already accepted or declined still asks for the sign-in. Team members signed in see the normal CRM page as before.',
        ],
    },
    {
        version: '0.134.1',
        date: '2026-11-01',
        title: 'Client area: the same width on every page',
        items: [
            'Fixed: the pages of the client area did not share one width. The Overview was held to the browser\'s standard steps, the Profile to a narrow column, the Help center to 1100 px and the request page to 1150 px, while the other pages were fluid. Every page (Overview, Invoices, Estimates, Proposals, Contracts, Projects, Support, a request, Help center, Profile) now uses exactly the same width as the top bar. Measured on a wide screen: 1549 px for all eight.',
        ],
    },
    {
        version: '0.134.0',
        date: '2026-11-01',
        title: 'Ticket automatic messages: ready-made templates; wider client-area pages',
        items: [
            'Tickets → Automatic messages now come with ready-made templates in English, French, Spanish, Japanese and Arabic: request received, request reopened, we are working on it, we replied to you, on hold, request closed. Pick the language, then use one template for a rule, or click "Fill every status with its template" to fill and switch on all the statuses at once; adjust the texts and save.',
            'Client area: the request page used the middle of the screen only. It now uses the full width, with larger conversation text, bigger counters and cards on the Support list, and a wider side panel. The profile page is wider too.',
        ],
    },
    {
        version: '0.133.0',
        date: '2026-11-01',
        title: 'Tickets: a new client-area Support page, tasks, reminders and automatic messages',
        items: [
            'Client area, Support list: three counters (Open, Waiting for you, Closed) that filter the list, a search, filter tabs, and one card per request with its status colour, priority, department, "waiting for you" / "new reply" labels, the last reply time and the rating. The cards are real links.',
            'Client area, one request: the conversation with automatic messages tagged, a Details panel (opened, last reply, handled by, department, priority, project), all the files of the request, and buttons to Close or Reopen the request. When it is closed the client can rate it from 1 to 5 stars with a comment. The new request form has priority chips.',
            'Team side, a ticket: Create a task (a task opens already filled with the ticket, its assignee and a link; the tasks of a ticket are listed on it), Remind me (a private reminder on the bell, by email and on Telegram / WhatsApp at the chosen time, in the automatic tasks "Note and ticket reminders"), automatic messages tagged in the conversation, and the client\'s rating.',
            'Tickets list, Automatic messages (administrators): for each status and for "request received", a message sent to the client when a ticket gets that status, in the conversation and/or by email, with fields like {contact_firstname}, {ticket_id}, {ticket_status}, {agent_name}, {ticket_url}. It fires whoever changes the status: a team member, a reply, or the client closing or reopening.',
        ],
    },
    {
        version: '0.132.2',
        date: '2026-10-31',
        title: 'Notes: a tag shows how far the reminder is',
        items: [
            'A note with a reminder now shows a small tag next to its date and time, on the board and on the Notes page: -12D (12 days ago, red), +5H (in 5 hours, amber), +3D (in 3 days, grey). M is minutes, H hours, D days.',
        ],
    },
    {
        version: '0.132.1',
        date: '2026-10-31',
        title: 'Date and time pickers open on top of everything',
        items: [
            'Fixed: the calendar of a date or time field was cut by the dialog or the section it sat in (the note reminder, the draft schedule...). Every date and time picker in the app (single date, date and time, and date range) now opens on top of the page and is fully visible.',
        ],
    },
    {
        version: '0.132.0',
        date: '2026-10-31',
        title: 'Notes: reminder with a date and time',
        items: [
            'A note (your own private note, not shared) now has a "Remind me" switch. Turn it on and a date and time field appears on its right. At that time you are told on the bell, by email, and on Telegram or WhatsApp if you set them in your profile.',
            'The reminder is sent at the first run of the automatic tasks after the chosen time (new task "Note reminders" in Settings → Cron job, on by default), once. Changing the date sets a new reminder. A note with a reminder shows a bell and its date on the board and on the Notes page.',
        ],
    },
    {
        version: '0.131.1',
        date: '2026-10-31',
        title: 'Draft mail schedule: compact row',
        items: [
            'The automatic-send switch of a draft is now one compact row: the switch and "Send automatically" on the left, the date and time picker on the right when it is on, with the explanation underneath. Clicking the text also turns it on or off.',
        ],
    },
    {
        version: '0.131.0',
        date: '2026-10-31',
        title: 'Lead mail drafts: send automatically at a chosen date and time',
        items: [
            'A draft now has a switch "Send it automatically at a chosen date and time" with a date and time picker. A scheduled draft shows a blue "Scheduled for ..." label. Send now still works whenever you want.',
            'The mail goes out at the first run of the automatic tasks after that time (new task "Scheduled lead mails" in Settings → Cron job, on by default; run the automatic tasks often, for example every 5 minutes), from the chosen address, with the signature and attachments, and becomes Sent with the real sending time.',
            'Safety: a mail can only be scheduled for a future time, with an address and a subject, and with every red check confirmed. If you change the text, the checks reset and the schedule is cancelled (you are told), so a mail never leaves with a text nobody confirmed. If the send fails, it is not retried: the draft shows the reason in red and its author gets a notification.',
        ],
    },
    {
        version: '0.130.0',
        date: '2026-10-31',
        title: 'Calendar permissions',
        items: [
            'The Calendar now has its own switches in the role editor and in a member\'s access: "See every event, private ones included" and "Edit and delete events of others", next to View. Adding events and editing or deleting your own stay open to everyone who can open the Calendar (shown as automatic).',
            'Without "See every event", a member still sees only their own events, the ones they are invited to and the public ones. Without "Edit and delete events of others", someone else\'s event opens read-only ("Click to view"), and the server refuses any change. Administrators keep full access.',
            'Roles that already have Calendar access are unchanged: nobody loses anything, and the two new switches start off.',
        ],
    },
    {
        version: '0.129.0',
        date: '2026-10-31',
        title: 'Send-from accounts: each sender address with its own mail login',
        items: [
            'Fixed: sending a lead mail from hello@trtmaroc.com was refused by the mail server ("Sender is not same as SMTP authenticate username"), because the CRM always logged in with the one main mailbox. You can now give each send-from address its own login: Mails → Mail server → "Send-from accounts" (sender email, username, password, optional sender name, and optionally another mail server for that address).',
            'When a draft is sent from an address that has an account, the CRM logs in with that account; other addresses keep using the main mail server. Each account has its own Test connection / Send test email button. Passwords are stored on the server and never shown again; only administrators can see or change the accounts.',
            'Every configured account also appears in the "From" list of a draft.',
        ],
    },
    {
        version: '0.128.3',
        date: '2026-10-31',
        title: 'Share menu: Open in new tab',
        items: [
            'The share icon that appears on a link (and on records, files and images) now has "Open in new tab" as its first item, above Copy link, WhatsApp, Email and the others.',
        ],
    },
    {
        version: '0.128.2',
        date: '2026-10-31',
        title: 'Links in comments and texts: Open in new tab in the right-click menu',
        items: [
            'Right-click on a link inside a comment, note, description or any text (while writing it or reading it) now shows a small menu with "Open in new tab" and "Copy link". While writing, the browser\'s own menu has no such entry, which is why a link could not be opened directly. Ctrl/Cmd + click keeps working, and a link in a saved text still opens in a new tab with a normal click.',
        ],
    },
    {
        version: '0.128.1',
        date: '2026-10-31',
        title: 'Open in a new browser tab from the menus',
        items: [
            'The three-dots menu of every card on the boards (tasks, leads, projects...) now has "Open in new tab" under "Open".',
            'Right-click on any card, row or button that opens a record now shows a small menu with "Open in new tab" and "Copy link" (the browser\'s own menu has no such entry on those, because they are not real links). Ctrl/Cmd + click and middle click keep working.',
        ],
    },
    {
        version: '0.128.0',
        date: '2026-10-31',
        title: 'Chat: reply to a message; draft Edit scrolls to the form',
        items: [
            'Chat: hover a message and click the reply arrow to answer it. The reply shows the quoted message (name and text) inside its bubble, a click on the quote jumps to the original, and a bar above the box shows what you are answering (X or Escape cancels). Works in the staff chat, the chat bubble and the client chat.',
            'Lead mails: clicking Edit on a draft (or New draft, or Log a mail) now scrolls the popup to the form, so you no longer have to scroll up to find it.',
        ],
    },
    {
        version: '0.127.1',
        date: '2026-10-31',
        title: 'Dropdowns open on top of everything',
        items: [
            'Fixed: in the foldable sections of the task and lead popups, a dropdown list was cut by its section or by the bottom of the popup, so some items could not be reached. Every dropdown list (status, priority, people, record...) now opens on top of the page and shows all its items.',
        ],
    },
    {
        version: '0.127.0',
        date: '2026-10-31',
        title: 'Task popup: compact fields in coloured foldable sections',
        items: [
            'The Details tab of the task popup is now grouped in five coloured foldable sections with icons: Task (subject, status, priority, dates), People (assigned to, followers), Related to, Description, and Billing and options (billable, hourly rate, visibility, repeat). Task and People are open, the others closed; a closed section shows a one-line summary. Expand all / Collapse all at the top.',
            'Fields and labels are tighter, and the visibility and billing switches sit side by side, so the popup needs much less scrolling.',
            'The foldable section is now one shared component, used by the lead popup and the task popup.',
        ],
    },
    {
        version: '0.126.2',
        date: '2026-10-31',
        title: 'Lead mails: hello@trtmaroc.com is always the default sender; coloured sections',
        items: [
            'Fixed: the From of a draft was not hello@trtmaroc.com. The list of senders now always starts with hello@trtmaroc.com (the default); the mail server\'s own address (noreply@, ask@...) is no longer offered unless it is added to the list in Settings → Email. A draft saved earlier with another address now shows and sends from hello@trtmaroc.com.',
            'Lead popup profile: each section header has its own colour (blue, green, amber, violet) and a coloured icon badge, so the groups are easier to tell apart.',
        ],
    },
    {
        version: '0.126.1',
        date: '2026-10-31',
        title: 'Lead popup: Convert, Lost and Junk in the top card',
        items: [
            'The Convert to client, Lost, Junk and Restore buttons moved into the top card of the lead popup, bottom left under the lead name and company (the team avatars stay on the right). They are small chips in the card\'s own colours, and the row they used to take below the card is gone.',
        ],
    },
    {
        version: '0.126.0',
        date: '2026-10-31',
        title: 'Lead popup: compact profile in foldable sections',
        items: [
            'The Profile tab of the lead popup is now grouped in four foldable sections: Pipeline and team (status, source, assigned to, followers, DO:, visibility), Contact (name, company, email, phone, position, website), Address and Description. Pipeline and Contact are open, the others are closed.',
            'A closed section shows a one-line summary of what is inside (for example the email and phone, or the city), so nothing is hidden. Expand all / Collapse all at the top.',
            'Labels and spacing are tighter, so the whole profile fits with much less scrolling.',
        ],
    },
    {
        version: '0.125.2',
        date: '2026-10-31',
        title: 'Lead mail drafts: old drafts show and send with the right From and To',
        items: [
            'Fixed: a draft saved before (or saved without them) kept an empty To and a From that is not in the allowed list (for example noreply@). The draft now shows, edits and sends with the lead\'s email as To when To is empty, and with hello@trtmaroc.com (the default sender) as From when its own From is not an allowed address.',
        ],
    },
    {
        version: '0.125.1',
        date: '2026-10-31',
        title: 'Lead mails: the lead\'s email is filled in whichever way you start',
        items: [
            'Fixed: the To field was empty when a draft was started with Log a mail and then switched to Draft or Sent. The lead\'s email is now filled in as soon as the type is Draft or Sent (To), and as the From address for Received. A draft always starts from hello@trtmaroc.com.',
        ],
    },
    {
        version: '0.125.0',
        date: '2026-10-31',
        title: 'Lead mail drafts: default sender, lead address, red checks',
        items: [
            'The default "send from" address of a draft is now hello@trtmaroc.com (first in the list; change the list in Settings → Email), and a new draft already has the lead\'s email in To.',
            'A draft can carry a note and a list of checks (what to do, change or check before sending). They show in red on the draft; each one must be confirmed (click it, it turns green) before the Send now button becomes active. The note is never sent to the lead.',
            'Changing the subject, the text, the addresses or the sender of a draft cancels the confirmations, so the checks are confirmed again on the final text. The server refuses to send while a check is not confirmed.',
        ],
    },
    {
        version: '0.124.0',
        date: '2026-10-30',
        title: 'Lead mail drafts: sender, Cc/Bcc, attachments',
        items: [
            'A lead mail draft now has everything a real email needs: the address it is sent from (a list), To, Cc, Bcc, Reply to, the subject, the text in the editor, and attached files (save the draft first, then attach; up to 10 MB per file and 20 MB in all).',
            'Send now sends the email through the CRM mail server from the chosen address with the files attached; the mail becomes Sent. The sender can only be an address from the list: the mail server address, the staff member\'s own email, or the extra addresses written in Settings → Email → "Other send from addresses (lead mails)" (put hello@trtmaroc.com there; your mail server must allow it).',
            'Only the writer of a draft can attach or remove its files, and only while it is a draft. Deleting a mail or a lead removes its attached files.',
        ],
    },
    {
        version: '0.123.0',
        date: '2026-10-30',
        title: 'Lead mails: drafts and Send',
        items: [
            'In the lead popup, Mails tab: a new kind of mail, Draft. Click New draft, fill the address, the date, the subject and the text, and save it for later. A draft shows with an amber Draft label and does not count as contact with the lead yet.',
            'A Send now button on each draft sends the email for real through the CRM mail server (with your signature), then the mail becomes Sent with the date and time of the sending, the lead\'s last contact is updated and the history records it. If the mail server refuses it, the draft stays a draft and you see the reason.',
            'Only the person who wrote the draft (or someone allowed to edit other people\'s mails) can send it; followers cannot. A mail already sent or received cannot go back to a draft.',
        ],
    },
    {
        version: '0.122.1',
        date: '2026-10-30',
        title: 'Lead email integration: forms in any language',
        items: [
            'Fixed: notifications written in Japanese, Arabic, Spanish, English and other languages were not read. Labels in any alphabet were thrown away (a Japanese label became empty), so the lead came out with the sender\'s name and no company, email or website. Labels are now compared in any script, and the word lists cover English, French, Spanish, Japanese, Arabic, Chinese, Korean, German, Italian, Portuguese, Turkish, Russian and Dutch.',
            'A form in a language that has no word list yet is still understood by the shape of the values: the email address, the web address, the phone number and the name (the first line). Anything else is kept in the lead\'s description.',
            'Section titles and a label alone above its text (for example the message block) are recognised in any language, so they no longer glue onto the line before.',
        ],
    },
    {
        version: '0.122.0',
        date: '2026-10-30',
        title: 'Leads: a Files tab',
        items: [
            'The lead popup has a new Files tab: upload documents, images and PDFs to a lead (up to the usual 50 MB, images are optimised), open, share and delete them. Whoever sees the lead can open its files; whoever works on it (assigned, added it, or with the Leads edit permission, but not a mere follower) can add and delete them.',
        ],
    },
    {
        version: '0.121.2',
        date: '2026-10-30',
        title: 'Lead email integration: the site notification is read field by field',
        items: [
            'Tested on the real layout of the website form notification (a table with Nom, Email, Entreprise, Site web, Services, Budget, Délai, a MESSAGE block and the Page line). Fixed: the section title "PROJET" stuck to the website, and the MESSAGE text was glued to the Délai line. The name, email, company, website and service now fill their lead fields, the message becomes the description, and Budget, Délai and Page follow it.',
            'Fixed: when the email had an HTML part and a plain part that was only the HTML flattened (the cells of the table without any separator), the plain part was used and the lead came out with the sender\'s name and no company or email. The reader now keeps whichever part shows more "Label: value" lines.',
            'The technical lines (IP, browser, received-at) are no longer copied into the description; the full email stays on the lead\'s Mails tab.',
        ],
    },
    {
        version: '0.121.1',
        date: '2026-10-30',
        title: 'Lead email integration: forms written with "Label = value"',
        items: [
            'Fixed: website emails whose lines are written "Nom = ...", "Email = ...", "Entreprise = ...", "Site web = ...", "Services = ...", "MESSAGE = ..." were not read as a form, so the lead came out with the wrong name and no company, email or website. A label can now be followed by a colon or an equals sign, and "Services" fills the service.',
            'The other lines of the email (for example "cat : audit-seo" and "Page = ...") are kept in the lead\'s description, and the email itself is on the lead\'s Mails tab.',
        ],
    },
    {
        version: '0.121.0',
        date: '2026-10-30',
        title: 'Leads shown with their company; open any record in a new tab',
        items: [
            'Choosing a lead (on a task, and wherever a lead is picked) now shows "Natura Volt (Fousenou Saouanera)": the company first, then the person; a lead without a company shows "(nan) Fousenou Saouanera". You can also search a lead by its company. The related lead on task cards uses the same name.',
            'Ctrl / Cmd + click, or a middle click, on a card, a task or lead tile, or a table row now opens that record in a new browser tab; a normal click works as before. In the editors, Ctrl / Cmd + click on a link opens it. Web addresses written in comments, checklists, notes and descriptions already open in a new tab.',
        ],
    },
    {
        version: '0.120.1',
        date: '2026-10-30',
        title: 'Lead popup: followers are kept',
        items: [
            'Fixed: the followers you added to a lead were saved but the Followers box showed empty the next time the lead was opened, and saving the lead again then erased them. The popup now loads the followers of the lead, so they stay.',
        ],
    },
    {
        version: '0.120.0',
        date: '2026-10-30',
        title: 'Demo tour: free recording with your own moves and voice',
        items: [
            'New button "Free recording" in the Demo tour panel (dev only): it records the tab while you work yourself, with your voice from the microphone. After a 3-2-1 a faint control shows the time, Pause and Stop (Ctrl+Shift+E stops, Ctrl+Shift+P pauses); the video downloads when you stop.',
            'Options: record your voice or not, and show a dot (with a ring on every click) where your mouse is, since the browser does not record the system cursor.',
        ],
    },
    {
        version: '0.119.1',
        date: '2026-10-29',
        title: 'Demo tour: the recording no longer stops after the first popup',
        items: [
            'Fixed: the tour ended by itself after the first scene that closes a popup (the lead popup), so the video only had the first seven scenes and none of the how-to scenes. The tour\'s own Escape key no longer counts as a stop; only a real key press does.',
            'A step that fails (a field or button not found) is now skipped and listed in the panel after the run ("Steps the last run could not do") instead of ending the tour.',
        ],
    },
    {
        version: '0.119.0',
        date: '2026-10-29',
        title: 'Demo tour: how-to scenes that really do the work',
        items: [
            'New "writes" scenes in the Demo tour (dev only): how to add a client, create an invoice (duplicate, choose the client, save), record a payment, add a lead and move it between stages, follow a client with a reminder, create and move a task, and record an expense. The cursor types, picks from the lists and saves for real, with records named "Demo ...".',
            'The panel can run only the tour, only the how-to scenes, or both, and has a "Delete demo records" button that removes everything the how-to scenes created (tasks, expenses, invoices with their payments, leads, clients).',
            'The voiceover pack now includes the how-to scenes.',
        ],
    },
    {
        version: '0.118.0',
        date: '2026-10-29',
        title: 'Demo tour for the presentation video (dev only)',
        items: [
            'On dev.trtcrm.com (and localhost) a "Demo tour" button appears at the bottom left (also Ctrl+Shift+D). A red cursor dot walks through 30 scenes of the CRM (dashboard, clients, leads, invoices, tasks, calendar, roles...) while the browser records the tab; the video downloads at the end.',
            'The same panel downloads the voiceover pack: the English voiceover with timings, the scene list and a prompt for an AI to translate it to Arabic then French and build the video. It never appears on staging or the live site, and the tour only opens pages: it changes no data.',
        ],
    },
    {
        version: '0.117.2',
        date: '2026-10-29',
        title: 'Client area: see why a contact cannot sign in, and unlock',
        items: [
            'The Contacts card of a client now says, for each contact, "Can sign in to the client area" or "Cannot sign in" with the reason: the client is not active, the contact is not active, no valid email, no client area password yet, or locked after too many wrong passwords. A locked contact has an Unlock button.',
            'Fixed: a contact whose saved email had stray spaces around it could never sign in, get an invitation or a reset link. Sign-in, invitations and reset links now ignore those spaces.',
        ],
    },
    {
        version: '0.117.1',
        date: '2026-10-29',
        title: 'Client area: sign-in works again',
        items: [
            'Fixed: opening the client area (/portal) sent a signed-out client straight to the staff sign-in page, so no client could reach the client sign-in at all, whatever their password. The staff sign-in redirect no longer applies to the client area or to the sign-in pages themselves.',
            'New: scripts/portal-check.mjs tells the owner why a contact cannot sign in (inactive client or contact, no password, lock after too many attempts, duplicate emails) and can unlock or set a password. Run it in the Coolify terminal: node scripts/portal-check.mjs name@email',
        ],
    },
    {
        version: '0.117.0',
        date: '2026-10-29',
        title: 'New tasks: assigned to their creator, followed by the Super Admin',
        items: [
            'Every new task is now assigned to the person who creates it, and the Super Admin(s) follow it, by default. The New task form shows them already chosen, and the same applies to tasks created from the lead popup and from templates.',
            'Settings → Tasks → New tasks: "Assign the creator automatically" is on by default (it had been saved as off) and there is a new switch "Add the Super Admin(s) as followers", also on. Turn either off there if you prefer.',
        ],
    },
    {
        version: '0.116.1',
        date: '2026-10-28',
        title: 'Roles: rename applies at once; language no longer follows another account',
        items: [
            'Fixed: renaming a role did nothing until you also pressed "Save role" at the bottom, and Enter in the rename box did nothing. Rename (button or Enter) now saves the new name immediately.',
            'Fixed: the interface language is remembered by the browser and could stay in French after working as another member. The browser now remembers which account set the language: when another account opens, it starts from that account\'s own language, or English.',
        ],
    },
    {
        version: '0.116.0',
        date: '2026-10-28',
        title: 'Task cards, clickable links and expense receipts',
        items: [
            'Task cards: the related client / project / lead is now a light tag you can click to open it. The priority is a light pill whose text takes the priority colour (grey, blue, orange, red).',
            'Task cards: the comment count moved to the top right, just above the people\'s pictures.',
            'Any web address written in a comment, a checklist item, a note or a description is now a link that opens in a new browser tab.',
            'Expenses: attach receipts and invoices (PDF or image, up to 5 MB each) while adding the expense, not only after saving it. The limits are also enforced on the server.',
        ],
    },
    {
        version: '0.115.3',
        date: '2026-10-28',
        title: 'Login as: your language no longer stays on the other member\'s',
        items: [
            'Fixed: after logging in as a member who uses another language and going back, your own account stayed in that language (French) even though your setting is English. Switching account (in or out of Login as) now forgets the previous language, so your own choice, or English, applies.',
        ],
    },
    {
        version: '0.115.2',
        date: '2026-10-28',
        title: 'Top bar: menu-style glass bar, full width, animated',
        items: [
            'Changed: the sticky header no longer has its own tinted background. At the top of the page nothing changes; once you scroll, a full-width bar in the same glass as the menu fades and slides in behind the header, and slides out again at the top.',
        ],
    },
    {
        version: '0.115.1',
        date: '2026-10-28',
        title: 'The top bar stays visible while you scroll',
        items: [
            'The header (logo, menu pills, search, Create, notifications, profile) is now sticky: it stays at the top of the page while you scroll, over a soft blurred background.',
        ],
    },
    {
        version: '0.115.0',
        date: '2026-10-28',
        title: 'Login as: open the CRM as a team member',
        items: [
            'New "Log in as this member" button on Team (row) and on the member profile. You work inside that person\'s account, with exactly their permissions, to see what they see or help them.',
            'A bar at the bottom of every page says who you are logged in as, with "Back to my account".',
            'New permission Team members > "Log in as another member" (Super Admins always have it). Only a Super Admin can enter a Super Admin; you cannot enter yourself, an inactive member, or log in as someone from inside another "login as". Password and sign-out-everywhere are blocked while logged in as someone.',
            'Every switch (and every client-area preview from a client page) is written in the Activity log under the real person.',
            'Clients: the "Open client area as" preview on a client page (read-only) (opened from the contact, read-only) is the way to log in as a client contact.',
        ],
    },
    {
        version: '0.114.1',
        date: '2026-10-28',
        title: 'Share menu: copy the text',
        items: [
            'The Share icon menu now has "Copy text" and "Copy text with link" wherever there is a text to share (comments, notes, lead and task popups), next to Copy link.',
        ],
    },
    {
        version: '0.114.0',
        date: '2026-10-27',
        title: 'Lead popup: choose who may edit the notes, mails and meetings of others',
        items: [
            'New permissions on Leads (Team > Roles): "Edit notes added by others", "Edit mails logged by others" and "Edit meetings added by others". Switch them on only for the roles you choose; the author can always edit their own.',
            'In the lead popup the pencil shows on a note, mail or meeting only when you may change it, even if you only follow the lead. Deleting still follows the Leads "Delete" permission (the author can always delete their own).',
            'Change: having the general Leads "Edit" permission no longer lets someone edit mails and meetings of other people; give the new permission instead.',
        ],
    },
    {
        version: '0.113.2',
        date: '2026-10-27',
        title: 'The bank assigned to a client now shows, and prints, on its documents',
        items: [
            'Fixed: an invoice (estimate, purchase order) of a client that has a bank account showed an empty "Bank account on the document" field. The field now shows the account that will really be printed and why: the client\'s account, the account for the invoice currency, or the default one. Choosing one yourself still wins.',
            'Fixed: the printed invoice, estimate and purchase order had no bank details at all unless your company header template used the bank terms. They now end with a "Bank details" block (bank, holder, RIB / IBAN, SWIFT) of that account; it is left out when your template already prints them.',
            'Safety: the merge of Bank accounts into Payment methods now also repairs itself when documents are printed, and one startup migration failing can no longer skip the others.',
        ],
    },
    {
        version: '0.113.1',
        date: '2026-10-27',
        title: 'Payment methods: the order you drag is now saved',
        items: ['Fixed: after dragging the rows of Payment methods into a new order, a refresh brought back the old order. The position was not a known field of the list, so the server ignored it. It is saved now. I checked every other draggable list (sources, statuses, departments, contract types, groups...): they were fine.'],
    },
    {
        version: '0.113.0',
        date: '2026-10-27',
        title: 'All popups in the Rapport style, and popup fixes',
        items: [
            'The side sheets that were still in the old flat style now use the Rapport popup (rounded sheet, dark head with its title, spring entry): every list popup (payment methods, sources, departments, statuses... the generic editor), expenses, password vault entries, a team member\'s permissions, and the file details. The centered forms (project, note, meeting, payment...) keep the Rapport dialog look.',
            'Fixed: Escape and a click outside now close every dialog (many ignored both and only closed with the cross).',
            'Fixed: Escape closes only the popup on top (a task opened from a lead used to close both).',
            'Fixed: the lists of settings (sources, departments, payment methods...) had two parts with the same internal key, which could confuse the popup\'s opening and closing.',
            'Fixed: a new record made in a list popup started switched off (Active off); it now starts active.',
            'Fixed: the saved / created messages and the section titles of those popups were not translated; field hints now show under the field. The "Default bank" column header is no longer a sentence.',
            'Fixed: a popup without a stage bar had a head the same colour as its title (unreadable in light mode).',
        ],
    },
    {
        version: '0.112.0',
        date: '2026-10-27',
        title: 'Share from anywhere; a status turned off no longer shows in the task popup',
        items: [
            'New Share icon: it opens a menu with this device\'s own share sheet (when the device has one), Copy link, WhatsApp, Telegram, Email, LinkedIn, X and Facebook. It is in the top bar of the task and lead popups, on every comment and note (it sends the text and the link to the record), next to each attached file (the file itself can be shared where the device allows, or downloaded), on invoices, estimates, proposals, purchase orders and contracts (the client link when there is one, and the PDF), and over any link or image inside a text when you rest the pointer on it.',
            'Fixed: a task status turned off in Tasks → Statuses (for example Testing) was still shown as a step in the task popup. Now only the active statuses are steps (the task\'s own status stays when it is a turned-off one).',
        ],
    },
    {
        version: '0.111.2',
        date: '2026-10-27',
        title: 'Lead popup Tasks tab: the same panel as a checklist',
        items: ['The Tasks tab of a lead now works like a task\'s checklist: tick a task, rename it in place, set or clear its date (red when late), give it to one or several people (two quick clicks never overwrite each other), delete it, and "@" and "#" work in the name. An arrow on each row opens the full task popup, and "New task with all its details" opens the full form. Tasks stay linked to the lead.'],
    },
    {
        version: '0.111.1',
        date: '2026-10-27',
        title: 'Tasks: Show completed now really hides completed tasks',
        items: ['Fixed: with "Show completed" off, tasks finished in the last 14 days were still listed (a rule from the first version of the board that nothing explained), and switching it on showed the older ones. Now off hides every completed task and on shows them all; filtering on the Complete status or on a date range still shows them.', 'The task popup keeps showing the right status (for example Complete) even when that task is hidden from the board.'],
    },
    {
        version: '0.111.0',
        date: '2026-10-27',
        title: 'Lead popup: Tasks, Mails, Meetings and followers; Freelance payment lines',
        items: [
            'Lead popup, new Tasks tab: the tasks of the lead are listed right there; tick them off, add one by typing and pressing Enter, or press Details for the full task popup. Every task created here is linked to the lead (no need to go to Tasks and pick the lead).',
            'Lead popup, new Mails tab: log any email sent to or received from the lead with the editor, with its date and time, from, to and subject. Emails read by the lead mailbox integration are added to it automatically.',
            'Lead popup, new Meetings tab: a meeting has a title, date and time, a link, a place, who joins, a reminder and the meeting report. Each meeting is a calendar event, so it shows in the Calendar with its reminder; deleting it removes it from there.',
            'Followers on leads, like in Tasks: followers see the lead and are told when a note, a mail or a meeting is added; only the team of the lead (and people who see all leads) can change it. Related now holds the proposals; Notes and Activity stay.',
            'Freelancers: each payment now has lines like an invoice (Name, UN, Cost, TVA %, Total) with a compact table, a button to add lines, and the sub total, TVA and total at the bottom. The amount is that total; repeating payments repeat their lines.',
        ],
    },
    {
        version: '0.110.0',
        date: '2026-10-27',
        title: 'Payment methods and bank accounts in one list; the client\'s currency on new documents',
        items: [
            'Bank accounts are now part of Payment methods (Setup → Finance): one list like Lead sources, with drag to reorder, switches, the bank, RIB / IBAN, the currency each account receives and a Default bank switch; the popup has the holder, SWIFT, the share the bank keeps in the currency (for example 70%, the rest being exchanged to MAD), and the text printed on the PDF. The Bank accounts page is gone.',
            'Nothing was broken by the move: every bank account became a payment method with the same id, so the account chosen on each client, invoice, estimate and purchase order still points at it.',
            'A document in a currency now prints the account that receives that currency (a EUR invoice prints the EUR account), unless the document or the client names an account.',
            'Fixed: a new invoice always started in MAD. Now the client\'s currency is used when you pick the client (or open New invoice from its page), on invoices, estimates, purchase orders and proposals; a currency you choose yourself still wins. Documents created without a currency (by an import or an integration) also take the client\'s currency.',
        ],
    },
    {
        version: '0.109.2',
        date: '2026-10-27',
        title: 'Freelancers: now in the Rapport look',
        items: ['The Freelancers page is redone in the same design as Leads and Tasks: the big title with its figures, a board with two stages (To collect, Paid) of animated tiles that show the amount, the due date and a "Repeats" tag, and the Rapport popup with its coloured head and stage bar. Drag a tile to Paid (or press a step in the popup) to mark it paid; the stage totals show on top of each column.'],
    },
    {
        version: '0.109.1',
        date: '2026-10-27',
        title: 'Task popup: clicking Complete in the step bar and pressing Save no longer undoes it',
        items: ['Fixed: in the task popup, clicking a step of the bar at the top (for example Complete) saved the new status, but the popup reloaded before the save had finished and kept showing the old status in the form. Pressing Save changes then wrote the old status back, so the task list still showed it as not complete. The popup now waits for the save and shows the new status.'],
    },
    {
        version: '0.109.0',
        date: '2026-10-26',
        title: 'Freelancers: side jobs paid without invoices',
        items: [
            'New Freelancers page (Sales menu): jobs that get paid like invoices but have no number. Each job has a name, who pays (a typed name or a client of the CRM), an amount in any currency, the date it is due, a payment mode and a note. Mark paid / Mark unpaid in one click; the cards show what is left to collect, what is overdue and what was collected.',
            'Repeating jobs (a monthly retainer, hosting...): choose every N days, weeks, months or years and how many times (or no end). The next payment is created automatically when it is due, from Settings → Cron job (new "Freelance jobs" card, with its own hour and switch).',
            'They are kept completely apart from the company: not in the dashboard, reports, goals or invoice numbering.',
            'New permission Freelancers (view, view own, create, edit, delete) in the role editor and on the menu.',
            'Fixed: the Work hours and Lead email integration menu entries were hidden from people who only had the new Team hours / Lead email integration permissions.',
        ],
    },
    {
        version: '0.108.0',
        date: '2026-10-26',
        title: 'Duplicate invoices, estimates, proposals, purchase orders and contracts',
        items: [
            'Duplicate: a Duplicate button (next to PDF on the page, and in the three-dots menu of the lists) on invoices, estimates, proposals, purchase orders and contracts. It opens a new draft with the same client, lines, notes and terms, a new number and today\'s dates; nothing is saved until you press Save. A duplicated contract starts today and is not signed.',
        ],
    },
    {
        version: '0.107.10',
        date: '2026-10-26',
        title: 'Search finds pages and every settings page',
        items: ['Fixed: the search box (Ctrl K) found nothing when you typed. It now finds menu pages and every Settings page, including words inside them (for example "telegram", "RIB", "numbering", "signature").', 'Lead email integration: when the mailbox folder does not exist, the test now lists the folders that do exist in that mailbox (type one of those names exactly, or create the folder in your webmail first).'],
    },
    {
        version: '0.107.9',
        date: '2026-10-25',
        title: 'Roles & permissions: Team hours and Lead email integration',
        items: ['Two new switches in the role editor: Team hours (see everybody\'s hours, with the new mouse / keyboard time) and Lead email integration (view, and edit to manage the mailboxes). Before, they were only reachable through Team members and Settings. People who already had those two keep their access.', 'Everyone still always sees their own hours.'],
    },
    {
        version: '0.107.8',
        date: '2026-10-25',
        title: 'Settings: WhatsApp & Telegram is now in the menu',
        items: ['Fixed: the Settings → WhatsApp & Telegram page (bot token, WhatsApp account, test sender) existed but was missing from the Settings menu, so it could not be found. It is now under Integrations.'],
    },
    {
        version: '0.107.7',
        date: '2026-10-25',
        title: 'Dashboard currency, HTML signature, Telegram, real mouse tracking',
        items: [
            'Fixed: the dashboard went back to MAD only because other pages (invoices, payments...) overwrote your currency choice when you opened them. Pages now only set a currency when you have not picked one, so All currencies stays.',
            'Profile: the email signature can be written in the editor or pasted as HTML code (tables, inline styles, links, https pictures), with a live preview. Scripts and unsafe code are removed on save. Emails you send now use your own signature.',
            'Telegram: mentions, comments and checklist steps given to you now also arrive on Telegram (before, only emails did). A "Send me a test" button in your profile tells you exactly what is missing (bot not set up in Settings, chat id, or Start not pressed on the bot).',
            'Team hours: a new Mouse / keyboard column shows the time the mouse or keyboard really moved, and its share of the active time. Only movement inside the CRM tab is counted, per second, never what is typed.',
        ],
    },
    {
        version: '0.107.6',
        date: '2026-10-25',
        title: 'Checklist dates: they can be set and changed',
        items: ['Fixed: the date of a checklist step could not be added or changed in some browsers (the date field was invisible and the browser did not open its calendar). Pressing the date now opens a real date field with the calendar, and a cross removes the date.'],
    },
    {
        version: '0.107.5',
        date: '2026-10-25',
        title: 'Dashboard filters: This year and All currencies by default, and they stay',
        items: ['The dashboard (and the pages that share its filters: reports, invoices, estimates, payments...) now starts with This year and All currencies (everything converted into the base currency; a company with one currency gets that currency).', 'Fixed: the All currencies choice was reset to the main currency every time the dashboard loaded. Your period and currency now stay as you set them, also after signing out and in.', 'Saved filters from before are moved once to This year and All currencies.'],
    },
    {
        version: '0.107.4',
        date: '2026-10-25',
        title: 'Checklist: give a step to several people',
        items: ['A checklist step can now be given to several team members: the Assign button opens a list with a tick for each person, which stays open while you tick, and the step shows their faces side by side. Each person added is told in their bell, and each one gets the due-today / overdue / reminder entries. Any of them can tick the step.', 'Two quick clicks in the list can no longer overwrite each other: every click adds or removes just that person.'],
    },
    {
        version: '0.107.3',
        date: '2026-10-25',
        title: 'Mentions in the editor: after a line break, and an @ button',
        items: ['Fixed: in the rich text editor the colleague list did not appear when you typed @ at the start of a new line made with Shift+Enter, or on a line of an older text (those lines are separated by a line break). It now does.', 'New @ button in the editor toolbar: it types the @ for you and shows the list of colleagues right away, so a mention can always be started with a click.'],
    },
    {
        version: '0.107.2',
        date: '2026-10-25',
        title: 'Checklist: an Edit button on each step',
        items: ['Each checklist step now shows an Edit (pencil) button next to Delete when you hover it: it opens the text for editing in place (Enter saves, Escape cancels). Clicking the text still works too.'],
    },
    {
        version: '0.107.1',
        date: '2026-10-25',
        title: 'Tasks list as an agenda',
        items: ['The List view of Tasks is now an agenda: tasks grouped by due day (Overdue first with how many days late, then Today, Tomorrow, each weekday, and No date), each as a soft rounded row with its status colour on the left, the date and priority, the title with its project, checklist and comment counts, the status and the people. Notes come first, and the status colours are listed at the top.'],
    },
    {
        version: '0.107.0',
        date: '2026-10-25',
        title: 'A better task checklist: people, dates, reminders, drag and drop',
        items: ['The checklist of a task has a new layout: a progress bar, a round tick for each step, the text editable in place, and for every step a due date chip (red when late, amber today, yellow tomorrow or soon, grey later), a reminder bell and the person it is given to.', 'Give a step to a team member: they are told in their bell, and the step shows on their notifications when it is late, due today or when its reminder time comes (at the due time, 1 hour, 1 day or 2 days before). The person a step is given to can tick it.', 'Drag a step by its handle to reorder, sort everything by date with one button, hide the done steps.', '@ mentions and # tags work in the step text (the colleague is told) and a mention in a step opens the chat when clicked.'],
    },
    {
        version: '0.106.2',
        date: '2026-10-25',
        title: 'Mentions in descriptions: highlight and notification',
        items: ['In the rich text editor a @mention is now picked out in colour while you type it, and when you save a task, lead or project description the people newly named in it are told (bell and Notifications page), once per mention and not again when you edit the text later.', 'Fixed: mentions written inside formatted text (a description or a comment with bold, lists...) were not recognised.'],
    },
    {
        version: '0.106.1',
        date: '2026-10-25',
        title: 'Text colours and highlight in the editor; dialogs above popups',
        items: ['The rich text editor has more options: text colour and highlight (a palette of colours, or any colour), left / centre / right alignment, and Clear formatting. Colours are kept when saved and shown in comments, notes and descriptions; only plain colour values are accepted, nothing else from a style.', 'Fixed: a dialog opened from the task or lead popup (for example Files > From files, or a delete confirmation) opened behind the blurred popup; dialogs, tooltips and menus now show above the popup.'],
    },
    {
        version: '0.106.0',
        date: '2026-10-25',
        title: 'Rich text editor and file upload in tasks, leads and projects',
        items: ['A rich text editor replaces the plain text boxes of task descriptions and comments, lead descriptions and notes, and project descriptions and notes: bold, italic, underline, strikethrough, heading, bulleted and numbered lists, quote, code, links and pictures, with undo and redo. Pictures are pasted, dropped or chosen with the picture button, optimised and kept in the Space. @ and # suggestions work inside it too.', 'Comments, notes and descriptions show their formatting and pictures, and a @mention in them still opens the chat. Texts written before stay as they were. Everything is cleaned when it is saved and when it is shown, so scripts and unsafe links never run.', 'The task popup has a new Files tab: drop or choose PDF, images, Office files, CSV, ZIP and more (up to 50 MB), attach files from the Space, and delete them. Available once the task exists.', 'Editing a comment or a note uses the same editor.'],
    },
    {
        version: '0.105.1',
        date: '2026-10-24',
        title: 'Fix: sign-in loop, mention opens the chat, calendar lines and hover',
        items: ['Fixed (important, from 0.104.0): signing in could bounce back to the sign-in page. The mention check ran during sign-in and was answered "not signed in", which cleared the session. It no longer runs on sign-in, and its answer can no longer sign you out.', 'Fixed: clicking a @mention opens the chat session with that person right away, on top of the open popup (it crashed before, and the chat could hide behind the popup).', 'Calendar, week and day views, redesigned like the reference: every day is a soft block with a gap between the days, light dashed lines mark each hour, today is tinted blue with a thin border, and the current time is a red pill with the time on the hour axis plus a dot and a red line across today.', 'Calendar: the hour under the pointer shows a clearly visible dashed frame with its time and a + that opens "New event at that hour / New task", at the right place.'],
    },
    {
        version: '0.105.0',
        date: '2026-10-24',
        title: 'Comments: reply, edit, delete; notifications; counts; calendar hours',
        items: ['The Tasks pill in the top menu now opens the task board.', 'A @mention in a comment, note or message is now clickable: it opens the chat with that person.', 'Comments (task comments and lead notes) show Reply, Edit and Delete icons when you hover them. Reply quotes the comment above yours and starts it with the person\'s @name; Edit changes your own comment in place and marks it edited.', 'Notifications: the people you @mention are told they were mentioned, and everyone following a task or lead (assigned people, followers, whoever created it, whoever you answer) is told that someone commented. They appear in the bell and on the Notifications page and open the page.', 'Cards on the task board and the lead board show a small speech bubble with the number of comments or notes.', 'Calendar, week and day views: the hour under the pointer gets a light dashed frame with its time and a + to add an event at that hour or a task for that day.', 'Calendar: the current time is a light red line across the day with a glowing dot, like Apple Calendar, and today in the header is red.'],
    },
    {
        version: '0.104.0',
        date: '2026-10-24',
        title: 'Mentions and tags everywhere, popups close after Save',
        items: ['Type @ in any comment, note, reply or chat box to pick a colleague, and # to pick a tag. It works in every multi-line text box of the app, with the arrow keys, Enter or a click. Mentioned colleagues get a "mentioned you" entry in their notification bell (and the Notifications page) that opens the page where it was written; saying the same thing twice in ten minutes tells them once.', 'Mentions and tags are picked out in colour in task comments, lead notes, project notes, issue comments and chat messages.', 'Popups now close after Save: the lead, expense and password-vault popups stayed open after saving a change; all the others already closed.'],
    },
    {
        version: '0.103.0',
        date: '2026-10-24',
        title: 'Task status colours, Awaiting feedback button, lead DO line',
        items: ['Fixed: the Not started status (and the other built-in ones) ignored the colour set in the statuses list: the pills and the board columns now always use it, readable in light and dark mode.', 'New menu page Tasks > Task setup > Task statuses to edit names, colours, order, default and Active without going to Settings.', 'When a task assigned to you is set to Awaiting feedback, the task popup shows a "Mark as complete" button (also in a yellow banner at the top) that completes it in one click.', 'Saving changes in the task popup now closes it.', 'Leads have a new "DO:" field in the popup (the next thing to do). It shows on the lead card, above the source, as a small vivid line with a glowing dot.'],
    },
    {
        version: '0.102.0',
        date: '2026-10-21',
        title: 'Mobile-ready emails and signature, and a new Milestones page',
        items: ['Emails: every ready-made template and the email design now adapt to phones: the detail rows stack, the button fills the width, long links wrap, the code is smaller and the page fits the screen. Use Settings > Email > Signature & design, or Mail templates > Apply the design, to update the templates you already have.', 'Signature: the logo is capped to a small fixed size (it no longer takes the room of the details), and on a phone it sits above the details. This applies to any signature, also the ones written by hand. A new Signature builder makes one from your logo, name, title, phone, email, website and address, with a Computer / Phone preview.', 'Milestones is a new page: every project with its milestones, each with a colour, due date and state (On track, Due soon, Overdue, Done), a progress bar from its tasks and the number of late tasks. Add a milestone from the line at the top of each project, drag to reorder, filter by state or project, and search.', 'The milestone popup holds the name, project, due date, colour, description (with a switch to show it to the customer) and its tasks, with a line to add a task straight into it. The row menu can complete all open tasks of a milestone, and deleting a milestone keeps its tasks in the project.'],
    },
    {
        version: '0.101.0',
        date: '2026-10-21',
        title: 'Lead email integration works: website forms become leads',
        items: ['Leads → Lead email integration is now real. Add the mailbox your website forms send to (IMAP server, email, password), test the connection, and the CRM reads it automatically (every N minutes, or Check now).', 'Only form emails become leads: filter by sender (for example the website address), by words in the subject or text, and require that the email looks like a form. Everything else stays untouched in the mailbox. Preview shows how the latest emails would be read before you switch it on.', 'Each lead gets the name, email, phone, company, website, city and the message, read from "Label: value" lines or an HTML table in English, French, Spanish or Arabic; your own field names can be added, and anything not recognised is kept in the description. It also gets the source, status and owner you chose, an activity entry, the original email, and a follow-up task due in a few hours.', 'The same person writing again is not duplicated: the message is added to their lead as a note with a new follow-up task. A sender who is already a customer raises a task instead. Every email is logged with what was decided and why (Activity), and the mailbox password is stored encrypted and never shown again.', 'Settings → Cron job has a new switch for it; the mailbox settings need the Settings permission.', 'Contract types now work like Lead sources: edit in place, colour, drag to reorder, Active switch, Default type for new contracts, how many contracts use each, and a Length in months that fills the end date of a new contract. The pencil adds a description.'],
    },
    {
        version: '0.100.0',
        date: '2026-10-21',
        title: 'Departments edited like Lead sources',
        items: ['Departments is now an in-place list like Lead sources: type a name, pick a colour, flip Hidden from clients and Active, drag to reorder, add a department from the row at the top, and see how many tickets use each one. The pencil opens the full form with the email and IMAP settings.', 'A department turned off is no longer offered for new tickets or staff; records that already have it keep it.'],
    },
    {
        version: '0.99.1',
        date: '2026-10-21',
        title: 'Authenticator app shows its real state',
        items: ['Fixed: on servers where the test switch that skips the second step at sign-in is on (TWO_FACTOR_OFF), Settings > Two-step verification kept showing "Set up" after the Authenticator app was turned on. The page now always shows the real state; the switch only affects the sign-in check.'],
    },
    {
        version: '0.99.0',
        date: '2026-10-21',
        title: 'Faster on slow internet, and a security clean-up',
        items: ['Security: any signed-in team member could list every user and change roles or passwords through a leftover template endpoint (/api/roles/users). Roles and users are now administrator-only, and the other leftover demo endpoints (customers, invoices, products, projects, help, changelog and similar) answer only to a signed-in session.', 'Security headers added on the web server: no content sniffing, no embedding in other sites, strict referrer policy, restricted camera and microphone, and HTTPS only (HSTS).', 'Faster: lists that rarely change (statuses, currencies, taxes, categories, company settings, form pickers) are kept in the browser (IndexedDB) per person. They show instantly, refresh in the background, and are used when the connection is slow or gone. They are cleared when anything is saved and when you sign out.', 'Faster: a service worker keeps the app files (scripts, styles, fonts, images) in the browser, so the CRM opens quickly on a slow connection. It never stores data from the API.', 'Better compression for text files on the web server.'],
    },
    {
        version: '0.98.0',
        date: '2026-10-21',
        title: 'Surveys redesigned: builder, public page and results',
        items: ['New Surveys page in the Rapport look: a card per survey with its state (Open, Scheduled, Closed, Off), questions, responses and last answer, an Open for answers switch, Results, Copy link, and a hover menu (Edit, Duplicate, Open the public page, Delete).', 'New survey popup: title, introduction, thank-you message, opens / closes dates, an address to go to afterwards, one answer per device, only for people signed in; and a question builder with single choice, multiple choice, yes / no, 1 to 5 rating, short and long text, required switch and move up / down.', 'Every survey has a public page (a short readable link) that anyone can answer on a phone or computer; it respects the dates, the on / off switch, one answer per device and a rate limit.', 'Results: per question the share of each answer, the rating average with its distribution, and the written answers; Export CSV gives one line per response.', 'Surveys imported from Perfex keep their questions and answers.']
    },
    {
        version: '0.97.0',
        date: '2026-10-20',
        title: 'Goals redesigned: live progress, periods and steps',
        items: ['New Goals page in the Rapport look: each goal is a card with where it stands today (e.g. 62,000 / 100,000), a progress bar with milestone dots and a tick for where it should be today, the status (Ahead, On track, Behind, Achieved, Missed), the days left and what is still needed per day.', 'New goal popup with proper fields: what to reach (income collected, invoiced, profit, new customers, new leads, leads won, new contracts, tasks completed), the target, who it is for (whole company or one team member), the period (every month, every quarter, every year, or fixed dates; the first three follow the current period by themselves), steps and a note. Progress is measured live from your payments, invoices, expenses, customers, leads, contracts and tasks, in the default currency.', 'Steps (the process): milestones that complete by themselves when the measured value reaches them (one click adds 25 / 50 / 75 / 100%), and action steps with an optional due date that you tick off on the card.', 'With no goal yet the page suggests ideas to start from; every goal has a hover menu (Edit, Duplicate, Delete). Goals imported from Perfex are shown as not measured until you edit them.']
    },
    {
        version: '0.96.1',
        date: '2026-10-20',
        title: 'Mail settings for administrators only',
        items: ['The Mail settings entry of the profile menu and the Mail server tab of the Mails page are now only for administrators. The server refuses the SMTP settings (read, save, test) to everyone else, also to people who may edit email templates; templates and the sent log keep their own permission.', 'The Team & roles entry of the profile menu only shows to people who may see team members or roles.']
    },
    {
        version: '0.96.0',
        date: '2026-10-20',
        title: 'Lead sources, lead statuses and task statuses: the same full list',
        items: ['The three lists in Settings now work the same way and have the same columns: drag to reorder, type a name, pick a colour, a Default switch (only one is default), an Active switch (off = not offered in forms and pickers, and no board column while empty; what already uses it keeps it), and how many records use each one.', 'Lead sources get an order, a default (a new lead without a source takes it) and Active. Lead statuses get Active. Task statuses get Default (replaces the old "Default status" setting under Settings → Tasks) and Active.', 'A search box appears above a list of more than six rows; a turned-off row is dimmed but its switch stays normal so you can turn it back on.']
    },
    {
        version: '0.95.0',
        date: '2026-10-20',
        title: 'Task statuses as a free list, like the lead statuses',
        items: ['Settings → Tasks → Statuses is now the same free list as the lead statuses: type a name to rename, pick a colour, drag to reorder, add a row for a brand new status, delete the ones you do not need. It replaces the five fixed rows of 0.94.0.', 'New statuses become columns of the Tasks board and appear in the list, the task page and popup, the calendar menu, the timeline, the dashboard and the client portal.', 'Not started (new tasks), In progress (set when a timer starts) and Complete (finished) are needed by the app, so they can be renamed, recoloured and moved but not deleted. Deleting any other status sends its tasks back to Not started.']
    },
    {
        version: '0.94.0',
        date: '2026-10-20',
        title: 'Rename and recolour task statuses',
        items: ['New Settings → Tasks → Task statuses: rename each of the five statuses (Not started, In progress, Testing, Awaiting feedback, Complete) and pick its colour from the swatches or any colour; Back to the original restores them. Existing tasks keep their status, only the name and colour change.', 'The new names and colours show on the Tasks board columns, list, task page and popup, timeline, calendar, dashboard "Tasks by status" and the client portal. A status you do not touch keeps the template colours.', 'Everybody signed in reads the names; only people who may edit Settings change them.']
    },
    {
        version: '0.93.0',
        date: '2026-10-20',
        title: 'Permissions that really follow "View own"; meetings on meet.3a.ma',
        items: ['Create meeting link now makes the room on https://meet.3a.ma instead of meet.jit.si.', 'Fixed: with "View own" a person could still open anyone\'s estimate, invoice, proposal, purchase order or contract by its link or PDF, edit it, delete it or add comments. Every one of those now checks that the document is theirs (the same rule as the lists), also the PDF / HTML views.', 'Fixed: a person with only the Estimates (or Proposals, Purchase orders, Credit notes, Expenses...) permission could not open the editor because its lookups required the Invoices permission. Any sales permission opens them now.', 'Fixed: form pickers were blocked or leaked: the customer picker listed every customer even with "View own" (it now offers only the customers you are assigned to, like the Customers page), while staff, currency, tax, payment mode, department, ticket status and similar pickers returned an empty list. Those name-only pickers are now open to every team member.', 'A permission changed from the member\'s access screen reaches the person\'s session within 5 seconds (it was 30).', 'New scripts/permissions-check.mjs: an automatic check of View own / View / no permission on estimates, invoices, proposals, purchase orders and contracts, creating an estimate and a changed permission; 67 checks, run it with the dev server up.', 'To let someone create estimates for a customer with "View own", assign them as an admin of that customer (or give them View on Customers).']
    },
    {
        version: '0.92.2',
        date: '2026-10-20',
        title: 'Event popup no longer closes when switching Client / Lead',
        items: ['Fixed: in the event popup, clicking Lead (or Client) submitted the form, which saved the event and closed the popup. The segmented buttons are no longer submit buttons, so this is fixed for every popup and form that uses them.']
    },
    {
        version: '0.92.1',
        date: '2026-10-20',
        title: 'Metrics show only the percentage',
        items: ['The "vs previous period" / "vs previous 30 days" caption is gone from every metric: dashboard, lists, team dashboard, time report, expenses and the Overview badges now show only +45% or -45% (green or red as before). The dashed previous-period line in charts stays.']
    },
    {
        version: '0.92.0',
        date: '2026-10-20',
        title: 'Phone layout: filters in the menu, compact heads, simple footer',
        items: ['On a phone or tablet the All activity icon moves into the profile menu (administrators).', 'The period, currency and colour pickers move from the toolbar into the left menu, above the navigation, on the pages that have them.', 'Page titles stay on one line and the metrics under them are compact two-column tiles.', 'The footer shows only the version at the left and "Dev by" at the right; the copyright line is hidden on phones.']
    },
    {
        version: '0.91.4',
        date: '2026-10-20',
        title: 'Active switch stays usable on inactive members',
        items: ['In the Team list the Active / Inactive switch of a greyed-out member is no longer greyed: the other columns and the action icons are, the switch stays normal so you can turn the member back on.']
    },
    {
        version: '0.91.3',
        date: '2026-10-20',
        title: 'Inactive members are greyed and locked',
        items: ['When a member is inactive the staff card is greyed out and its action icons (edit, activity, permissions, password, reset, sign out) are disabled until you switch them on again with the Active switch at the top right. In the Team list inactive rows are greyed and their actions disabled too; the Active switch stays usable.']
    },
    {
        version: '0.91.2',
        date: '2026-10-20',
        title: 'Salaries paid after the month',
        items: ['Payroll now follows how you pay: the salary of a month is paid after it ends, on the pay day (10 by default) of the next month. October is not shown until the 1st of November; until then the month to pay is September, "to pay" until the 10th and "late" after it. The salary card, the Pay button, the Payroll tiles and the chart use that month, and the payment popup opens on it.', 'New Settings → Sales → General → Payroll → Salaries are paid after the month (on by default); turn it off to show and pay the current month instead.']
    },
    {
        version: '0.91.1',
        date: '2026-10-20',
        title: 'The glowing dot shows online / offline',
        items: ['On the staff profile the dot before the name now means online (green and glowing) or offline (grey), not active / inactive. A member counts as online when the CRM or the chat was used in the last 3 minutes; hover the dot to see when they were last seen. The page refreshes it every minute. Active / inactive stays on the switch at the top right.']
    },
    {
        version: '0.91.0',
        date: '2026-10-20',
        title: 'Payroll payments as expenses',
        items: ['New Settings → Sales → General → Payroll and expenses: Record payroll payments as expenses (off by default). When on, every salary, advance and bonus recorded in Payroll also creates one expense in the category "Payroll" (named like "Salary - Sara Amrani - October 2026", dated the day it was paid); editing the payment updates the expense and deleting it removes the expense. Expense lists, reports and exports then include the team cost.', 'A button, Create expenses for existing payments, adds the expenses of payments recorded before. It only creates the missing ones and never changes expenses entered by hand.']
    },
    {
        version: '0.90.3',
        date: '2026-10-20',
        title: 'CV and portfolio only in the popup',
        items: ['The CV and portfolio files are no longer on the staff card; upload, replace and remove them from the member popup (Documents tab). Hire date, CNSS and RIB stay in the first card.']
    },
    {
        version: '0.90.2',
        date: '2026-10-20',
        title: 'Employment details in the first profile card',
        items: ['The separate Employment card is gone: hire date, CNSS, RIB (with Copy) and the CV / portfolio files now sit in the first staff card, just above the email and last login line.']
    },
    {
        version: '0.90.1',
        date: '2026-10-20',
        title: 'RIB, CV and portfolio now visible on the profile; popup in tabs',
        items: ['Staff profile: a new Employment card under the left card shows the hire date (and fire date), CNSS and the RIB with a Copy button (super administrators), and the CV and portfolio file with Upload / Replace / remove right there.', 'The member popup now has three tabs, Profile, Pay and contract (hire / fire dates, salary, currency, pay day, CNSS, RIB) and Documents (CV and portfolio), so nothing is hidden below a long scroll.']
    },
    {
        version: '0.90.0',
        date: '2026-10-20',
        title: 'Team member form as a popup; salary, RIB, CNSS, hire / fire dates, CV and portfolio',
        items: ['Edit / Add team member is now a popup in the template look, in sections (Identity, Position, Pay, Documents, About and links) instead of a long side panel.', 'Pay (super administrators only): monthly salary (replaces the hourly rate), currency, the day it is paid (10 by default), the RIB and a CNSS declared switch. Only super administrators receive these fields from the server.', 'Hire date and fire date: the salary is due from the hire month and stops after the fire month. CV and a portfolio file can be uploaded, replaced and removed on each member.', 'Skype and Facebook are gone; Website is now called Portfolio (also on your own profile).', 'Paying a month is one click: the staff profile card has a Pay (month) button; the popup is filled with the salary and shows the RIB with a Copy button and CNSS, and has a free Prime (bonus) field that is recorded as a bonus in the same month. The same Prime field is on the Payroll page Pay button.']
    },
    {
        version: '0.89.0',
        date: '2026-10-20',
        title: 'Salaries and payroll: what the team costs',
        items: ['Staff profile: a new Salary & payments card (super administrators only) with the monthly salary, currency, pay day and first month due, the last months of the year as Paid / Partly paid / Late / To pay, a Pay button for an unpaid month, and the list of payments (salary, advance, bonus, other) that you can add, edit or delete.', 'New Payroll page in the Administration menu (super administrators only): monthly payroll, paid this month, paid this year, who is still to pay, a bar chart of the team cost by month (paid against due), and every member with this month\'s status and a Pay button. Amounts are shown in the default currency, converted with the currency rates.', 'A salary or an advance pays the salary of the month; a bonus or other payment counts as an extra cost.']
    },
    {
        version: '0.88.5',
        date: '2026-10-20',
        title: 'Staff card: role tag under the name, info at the bottom',
        items: ['Staff profile card: the role / Super Admin tag is now a clear coloured tag under the name (purple for Super Admin, blue for a role), and the email and last login line moved to the bottom of the card.']
    },
    {
        version: '0.88.4',
        date: '2026-10-20',
        title: 'Compact staff profile card',
        items: ['Staff profile card: the Active switch is at the top right, a green glowing dot sits before the name (grey when inactive) with a small role / Admin tag after it, and the email and last login are on one line. The Active / Inactive tag and the contact list below the icons are gone.']
    },
    {
        version: '0.88.3',
        date: '2026-10-20',
        title: 'Actions on the staff profile card',
        items: ['The staff profile card now has an Active on / off switch and round icons with tooltips: Edit, Activity log, Permissions, Set a password, and a menu with Reset link, One-time password, Sign out everywhere and Reset two-step verification. They use the same permissions and dialogs as the Team list.']
    },
    {
        version: '0.88.2',
        date: '2026-10-20',
        title: 'Work hours chart under the staff profile',
        items: ['A bar chart under the left section of the staff profile (and on your own Work hours tab): one bar per day for the last 14 days, green when the expected hours are reached, blue when under, amber for overtime, with a dash for the expected hours. Hover a bar for the opening and last active times.', 'The left column of the staff profile now stays in view while you scroll.']
    },
    {
        version: '0.88.1',
        date: '2026-10-20',
        title: 'Work hours on your own profile',
        items: ['My profile has a new Work hours tab: today, the last 14 days against the working week, overtime, the time you usually open and leave, and the day by day table. Everyone can see their own hours; other people\'s hours still need the Team permission.']
    },
    {
        version: '0.88.0',
        date: '2026-10-20',
        title: 'Work hours: who opens first, who stays, who works a lot',
        items: ['While a team member really uses the CRM (tab visible, a click, key press or scroll in the last two minutes) the app records a heartbeat every minute: first time opened each day, last time active and active hours. Nothing outside the CRM is measured.', 'New Work hours page (Administration menu): everyone ranked by active hours for today, this week, last week, this month or 30 days, with days worked, hours against the working week, overtime, the time they usually open and leave, and late arrivals.', 'New Settings → Localization → Working hours: the day start time, a grace before late, and the hours for each day. Default: 8 hours Monday to Friday, 4 on Saturday, none on Sunday, starting at 09:00 on the company time zone.', 'The staff profile shows the last 14 days (opened, last active, active, expected); the Team list shows when each member was last active.']
    },
    {
        version: '0.87.1',
        date: '2026-10-20',
        title: 'Score rings on pictures across the app',
        items: ['The score ring now shows around a team member\'s picture on the Tasks board and list, the task page and popup (assignees and comments), Timeline, Scrum board, Time report and the Team dashboard, with the name and score on hover.', 'Scores are shown to people who may see the team (Team permission); everyone else sees plain pictures.']
    },
    {
        version: '0.87.0',
        date: '2026-10-20',
        title: 'Score ring for team members; staff profile page',
        items: ['Each team member now has a score ring around their picture, like the paid ring on a customer: the average of tasks completed (due or finished in the last 30 days), finished on time, and timer hours against 8 hours per working day (only when they use timers). Hover the ring to see each part; green from 75%, yellow from 50%, red below, no ring when there is nothing to measure.', 'The ring shows in the Team list and on your own profile.', 'New staff profile page (click a name in Team): the big ring, contact buttons, how the score is made, open tasks and recently completed tasks.']
    },
    {
        version: '0.86.7',
        date: '2026-10-19',
        title: 'Create menu really opens the popup',
        items: ['The + menu in the top bar now hands the request to the page it opens (Notes or Tasks board), which opens the new note / new task popup as soon as it is ready, also when you are already on that page.']
    },
    {
        version: '0.86.6',
        date: '2026-10-19',
        title: 'Create menu opens the page and the popup',
        items: ['From the + menu, New note goes to the Notes page and opens the new note popup; New task goes to the Tasks board and opens the new task form.']
    },
    {
        version: '0.86.5',
        date: '2026-10-19',
        title: 'Create menu in the top bar; new notes show at once',
        items: ['The top-bar note icon is now a + menu: New task or New note.', 'A note added from the top bar (or anywhere) now appears at once on the Notes page and the Tasks board, with no refresh.']
    },
    {
        version: '0.86.4',
        date: '2026-10-19',
        title: 'Footer: version and credit on the right',
        items: ['The footer no longer shows Terms & Conditions | Privacy & Policy. The version number (linked to the versions page) and Dev by trtAgency now sit on the right.']
    },
    {
        version: '0.86.3',
        date: '2026-10-19',
        title: 'Leads menu in one column; menu on note cards',
        items: ['The Leads menu now shows a single column: Leads and the lead setup entries in one list.', 'Each note card has a three-dot menu that appears on hover: Edit, Duplicate, Copy text, Make it a task and Delete (with a confirmation).']
    },
    {
        version: '0.86.2',
        date: '2026-10-19',
        title: 'A Notes page',
        items: ['New Notes page in the Tasks menu (right after My tasks): all your notes as cards with their title and description, a search box and a New note button. Click a card to edit or delete it. The top-bar note icon still adds one from any page.']
    },
    {
        version: '0.86.1',
        date: '2026-10-19',
        title: 'Invoices read FA - 101 - 10 - 2026; notes icon in the top bar',
        items: ['New invoices now read #FA - 101 - 10 - 2026 by default: prefix "FA -", the number, then month and year (number format 4), with the number padded to 3 digits instead of 6.', 'New Settings → Billing → Invoices → Existing invoices: one button, Apply to all existing invoices, gives every invoice the saved prefix and number format so old ones such as INV-000122 read the same way. The numbers themselves never change.', 'A New note icon sits in the top bar on every page: click it, type a title and a description, save. Notes still appear beside the tasks.']
    },
    {
        version: '0.86.0',
        date: '2026-10-19',
        title: 'Notes beside the tasks; choose Email / Telegram / WhatsApp',
        items: ['New quick notes: just a title and a description, private to their author, shown as a Notes column at the left of the Tasks board and as rows at the top of the list; New note button, click to edit, drag a note to a status column (or Make it a task in its menu) to turn it into a task', 'Profile → Notifications (team) and My profile (clients) now say How do you want to be notified?: Email, Telegram and WhatsApp are three switches, any combination; with Email off the automatic emails to that person (invoices, estimates, tickets, reminders...) are not sent, while sign-in, password and invitation emails always are', 'The invoice number keeps its month and year as before (the extra number format added in 0.84.1 is removed)']
    },
    {
        version: '0.85.0',
        date: '2026-10-19',
        title: 'Notifications by WhatsApp and Telegram',
        items: ['New Settings → WhatsApp & Telegram: the Telegram bot token, the WhatsApp Cloud API phone number ID and access token (with an optional approved template for messages outside the 24 hour window), and a test sender', 'Every email template that is sent (invoice, estimate, proposal, contract, ticket, reminders...) also goes out as a short message with the subject and the link, to the Telegram chat and the WhatsApp number of the contact or team member, when they switched it on', 'Team members set their WhatsApp number, Telegram chat id and switches in Profile → Notifications; clients in My profile (client area); administrators can also set them in the staff and contact forms', 'Not tested against the real services (no accounts here): the messages were checked with a simulated network']
    },
    {
        version: '0.84.1',
        date: '2026-10-19',
        title: 'Invoice number in the first section; client bank account fills the invoice',
        items: ['The invoice editor now starts with the number as it will read, #FA - 0089 - 09 - 26: the prefix and the month / year follow the settings and the invoice date, and administrators type the number in the middle (empty = the next one)', 'New number format in Settings → Billing → Invoices: Number - month - year, for example FA - 0089 - 09 - 26', 'The bank account assigned to a client now shows in its Detailed information and can be changed there; choosing a client on an invoice (or an estimate) picks that bank automatically, and an invoice saved without one gets the client\'s bank']
    },
    {
        version: '0.84.0',
        date: '2026-10-19',
        title: 'Popups in the Rapport look',
        items: ['Every popup now follows the Rapport design: a soft blurred backdrop, one warm rounded sheet centred on the screen, bold titles, rounded fields, pill buttons and a round close button that turns to the accent colour', 'A popup is never taller than the screen: long forms scroll inside, and in the event popup the Delete / Cancel / Save buttons stay pinned at the bottom', 'Confirmation popups lost the grey footer band: a thin line, Cancel and a red Delete for dangerous actions']
    },
    {
        version: '0.83.0',
        date: '2026-10-19',
        title: 'Event popup: one period field, client or lead',
        items: ['The event popup has a single Date field for the whole period: click it, pick the first and the last day on the calendar, set the start and end times (hidden for all-day events) and press Done; the field reads like 21 Oct 2026, 09:00 → 10:30', 'An event can be about a Client or a Lead: switch between the two beside the picker; the lead shows in the event tooltip like the client does']
    },
    {
        version: '0.82.6',
        date: '2026-10-19',
        title: 'Admins can delete invoices with payments and set document numbers',
        items: ['Administrators and super admins can delete an invoice that has payments (the payments are deleted with it, after a confirmation), and delete a payment of a paid invoice from the Payments list; before, the Payments list always answered This payment of a paid invoice is final', 'Administrators and super admins can type the number of an invoice, an estimate, a proposal or a purchase order in its editor (Number, top right; empty on a new document = the next number); a number already used is refused and the next-number setting moves ahead of it', 'Signature: the switch only allows it. With the switch on, the signature prints once the invoice is paid or the contract is signed, never before; with it off, it prints on no PDF']
    },
    {
        version: '0.82.5',
        date: '2026-10-19',
        title: 'Real number for a draft that gets paid; signature on every document until paid',
        items: ['Fix: an imported draft invoice carries the placeholder number 1000000000; when a payment was added it became Paid but kept that number (FA - 1000000000-01-2026). It now gets the next real number, prefix and format the moment it stops being a draft (a payment, mark as sent...), and the daily cron job also gives a real number to any invoice still stuck with the placeholder (run it from Settings → Cron job → Run manually to fix the existing ones)', 'The company signature (Settings → General → Document logos) prints on invoices and contracts only, each with its own switch in Settings → PDF (on by default): on, it only prints once the invoice is paid or the contract is signed, never before; off, it prints on no PDF']
    },
    {
        version: '0.82.4',
        date: '2026-10-19',
        title: 'Schedule starts on All for everyone',
        items: ['The team filter of the Schedule now starts on All for every user, not only for super admins; pick a person to narrow it down']
    },
    {
        version: '0.82.3',
        date: '2026-10-19',
        title: 'Documents and PDF: totals are part of the items table',
        items: ['Sub total, taxes, total and total paid are now the last rows of the same table as the items (same border, tinted rows, values under the Amount column) in invoices, estimates, proposals and purchase orders, on screen and in the PDF', 'Previously the totals were a separate small block below the table']
    },
    {
        version: '0.82.2',
        date: '2026-10-19',
        title: 'Send by email: sender small, recipients as switches, PDF off by default',
        items: ['The From box is gone: the sender is shown small next to the title', 'To is one row of switches with the contact names (the address shows on hover), and Attach the invoice as a PDF is a switch that starts off']
    },
    {
        version: '0.82.1',
        date: '2026-10-19',
        title: 'Send by email: compact, always fits the screen',
        items: ['The Send by email popup is more compact: Template, From and Other recipients on one row, the recipients as a wrapping line, Subject and Attach as a PDF on one row', 'The popup now fits the screen height: only its middle part scrolls and the preview takes the remaining space, so the Cancel and Send email buttons are always visible']
    },
    {
        version: '0.82.0',
        date: '2026-10-19',
        title: 'New help center: trtCRM and trtDigital articles in every language in use',
        items: ['New script scripts/seed-help-center.mjs: --replace deletes the existing help center (articles, groups, votes, view counts) and creates 14 articles in two groups, trtCRM (how to use the client area: signing in, overview, invoices, recurring invoices, estimates and proposals, contracts, projects, support, notifications) and trtDigital (about us, how a project works, billing, support and contact, privacy), in each language of Settings → Languages in use (English, French, Spanish, Japanese, Arabic); without --replace nothing existing is touched, --dry only reports', 'Help center groups have a language (new selector in the group manager): people see the groups of their own language, and groups set to All languages show for everyone; the client area uses the language chosen in its header']
    },
    {
        version: '0.81.1',
        date: '2026-10-19',
        title: 'Client page: left column stays in view',
        items: ['On wide screens the left column of the client page (profile, detailed information, contacts) is sticky: it stays in view while the tabs scroll, and scrolls on its own when it is taller than the screen']
    },
    {
        version: '0.81.0',
        date: '2026-10-19',
        title: 'Client page like the template customer profile',
        items: ['The client page now follows the template customer profile: a head with Billed, Still owed and Projects and tickets, a profile card (the logo inside a ring showing how much is paid, status and groups, all the quick actions: follow up, email, call, new invoice / estimate / proposal / project / ticket, note, WhatsApp, activity log, edit, delete), Detailed information, Contacts with their client area actions, and the lead-to-client path', 'The tabs (Overview, Invoices, Payments, Contracts, Estimates, Proposals, Projects, Tickets, Activity, Notes, Files, Contacts) and everything in them are unchanged; the Overview starts with Interaction history, the latest events as colour tiles with All / Sales / Work / Notes and emails filters']
    },
    {
        version: '0.80.1',
        date: '2026-10-19',
        title: 'Client area access is set per client',
        items: ['What a client sees in its client area (Invoices, Estimates, Proposals, Contracts, Projects, Support) is now set on the client edit page, Client area access, so each client has its own options; Settings → Clients → Client area stays as the switch for everyone', 'The access switches are no longer on the contact form (the email notification switches stay there and in the client My profile)']
    },
    {
        version: '0.80.0',
        date: '2026-10-19',
        title: 'Client area in the Rapport look, with access and notification switches',
        items: ['The client area (login portal) now has the Rapport look: pill menu, a head with To pay / Paid / Projects, and an Overview like the customer profile of the template: the person with a ring showing how much is paid, detailed information, the documents as colour tiles (the colour is the state), payments and projects bars, support', 'What a contact can see is switchable again: each contact has Client area access switches (Invoices, Estimates, Proposals, Contracts, Projects, Support) in its form, and Settings → Clients → Client area switches a section off for everyone; the menu shows only what is allowed', 'Email notifications (invoices, estimates, credit notes, contracts, projects, tasks, support) are switches in the contact form for staff and in My profile for the client, saved at once', 'My profile also lists the sections open to the signed-in client']
    },
    {
        version: '0.79.6',
        date: '2026-10-19',
        title: 'Invoice editor: one period picker for the dates',
        items: ['Invoice date and Due date are one start → stop period picker (the same component as the dashboard period); a new invoice still starts with the due date set by Settings (due after N days)']
    },
    {
        version: '0.79.5',
        date: '2026-10-19',
        title: 'Invoice editor: recurring row uses the full width',
        items: ['The recurring row spreads over the full width, on the same columns as the row above: switch, Repeat every, unit, Stop after and the note']
    },
    {
        version: '0.79.4',
        date: '2026-10-19',
        title: 'Invoice editor: compact layout',
        items: ['Client, currency, bank account, invoice date and due date are on one row', 'Recurring is a switch: when on, Repeat every, the unit and Stop after appear on one row next to it', 'Discount %, Fixed discount, Discount applies and Adjustment are on one row above the totals']
    },
    {
        version: '0.79.3',
        date: '2026-10-18',
        title: 'Invoice document and PDF: tinted table header, soft border',
        items: ['The items table and the payments table of the invoice document, its PDF and the other documents (estimates, proposals...) now have a tinted header row, a soft rounded outline and soft row lines']
    },
    {
        version: '0.79.2',
        date: '2026-10-18',
        title: 'Tables: tinted header and soft border',
        items: ['The list tables (invoices and the other lists built on the same table) now have a tinted header row, a soft rounded outline and soft lines between rows']
    },
    {
        version: '0.79.1',
        date: '2026-10-18',
        title: 'Check and connect the recurring invoices already in the database',
        items: ['New script scripts/recurring-check.mjs: lists every recurring invoice already in the database (imported or not) with its rule, last and next date and the copies linked to it, and flags copies whose original is missing and unlinked invoices that look like copies; with --link it attaches those to their original so they show Recurring invoice of … at the top', 'Old recurring invoices keep their rule and dates; the editor shows and keeps them (a Perfex invoice repeating every N months shows as every N months)']
    },
    {
        version: '0.79.0',
        date: '2026-10-18',
        title: 'Recurring invoices: set them up, link the copies, and the nightly job finds them',
        items: ['The invoice editor now has Repeat every N days / weeks / months / years and Stop after (copies); before, recurring could not be set from the app at all', 'A copy made by a recurring invoice shows at the top Recurring invoice of INV-… · date, linked to the original; the original shows its repeat rule, its last copy and the next date', 'Fix: the nightly job never picked up recurring invoices (and recurring expenses) created in the app, because on MongoDB a filter on an empty link field matches nothing when the field was never written; copies are now skipped in code instead']
    },
    {
        version: '0.78.1',
        date: '2026-10-18',
        title: 'Compact toasts in the top right',
        items: ['Messages (saved, deleted, errors...) now appear in the top right corner, smaller (icon and one line), and disappear faster (under 2 seconds), above menus and panels']
    },
    {
        version: '0.78.0',
        date: '2026-10-18',
        title: 'Settings lists are edited in place',
        items: ['Customer groups, lead sources and statuses, ticket statuses and priorities, services, item groups, contract types, expense categories, knowledge base groups, taxes, currencies, payment modes, tags, spam filters and consent purposes are now spreadsheet-like lists: type in a cell and press Enter, flip an on/off switch, pick a colour, choose from a menu, with no popup', 'A new row is added from the line at the top (type the name, press Enter); drag the handle to reorder the lists that have an order; the pencil still opens the full form for long text fields']
    },
    {
        version: '0.77.1',
        date: '2026-10-18',
        title: 'Lead sources get a colour; calendar invoices show their text',
        items: ['Lead sources can now have a colour (pick it in Lead sources, like the statuses); the colour shows as a dot before the source on the lead cards, in the lead Source picker and in the Source menu', 'Calendar: invoices, estimates, proposals, contracts, projects and reminders showed an empty card in the month grid; they show their title again']
    },
    {
        version: '0.77.0',
        date: '2026-10-18',
        title: 'Customer groups and other short lists: edit in place, reorder, delete',
        items: ['Customer groups, lead sources and statuses, ticket statuses, item groups, contract types and expense categories are now managed in place: add at the top, click a name to rename it, pick a colour, delete with a confirmation, and drag the handle to reorder the lists that have an order (customer groups, lead statuses, ticket statuses); the pencil still opens the full form', 'Fix: a customer group that had clients could not be deleted ("violates the required relation"); deleting it now just removes the group from those clients', 'Customer groups have a new order that is used in the client pickers']
    },
    {
        version: '0.76.3',
        date: '2026-10-18',
        title: 'Mails: ready-made designs in Spanish, Japanese and Arabic',
        items: ['The Ready-made design and Apply ready-made designs to all buttons now also work for the Spanish, Japanese and Arabic templates (all 93 designed templates are translated; Arabic is laid out right-to-left)', 'Templates created on first use (for example purchase orders) also get the design in those languages']
    },
    {
        version: '0.76.2',
        date: '2026-10-18',
        title: 'Fix: saving an email template',
        items: ['Saving a template in Mails failed with "Request failed (405)": the editor sent a PUT to a route that only accepts PATCH; it now sends PATCH']
    },
    {
        version: '0.76.1',
        date: '2026-10-18',
        title: 'Page footer: version and developer credit',
        items: ['The page footer now reads: Copyright © year trtCRM All rights reserved. · v0.76.1 (opens the Versions page with the release history) · Dev by trtAgency (linked to https://www.trtdigital.ma), all on the same line']
    },
    {
        version: '0.76.0',
        date: '2026-10-18',
        title: 'Projects as cards; Schedule shows everyone for super admins',
        items: ['Projects (the Projects menu entry) is now the Rapport page: a head with three metrics (in progress, open tasks, time logged), search, status tabs, date filters, sort, Grid / Table, and project cards with client, status, start date, deadline, time logged, billing, progress, members and tasks done, plus a three-dots menu (Open, Scrum board, Edit, Favorite, Delete)', 'The old projects dashboard is still available at /crm/projects/overview', 'Schedule: super admins start with All selected in the team filter (everyone else still starts on themselves)']
    },
    {
        version: '0.75.4',
        date: '2026-10-18',
        title: 'All activity in 2 columns',
        items: ['The date lists of All activity sit in 2 columns on wide screens (1 on small ones)']
    },
    {
        version: '0.75.3',
        date: '2026-10-18',
        title: 'All activity: plain list by date',
        items: ['All activity is a plain list grouped by date: time, type, what happened, client and who, one line each, with pages of 40 entries']
    },
    {
        version: '0.75.2',
        date: '2026-10-18',
        title: 'All activity: one card per category',
        items: ['Under each day the activity is gathered by category (Sign-ins, Sales, Work, Leads, Notes and emails, Other): one card per category, equal height, entries scroll inside the card', 'Pages now hold 3 days each']
    },
    {
        version: '0.75.1',
        date: '2026-10-18',
        title: 'All activity: cards, 3 columns, pages',
        items: ['Activity entries are now equal-height cards in 3 columns under each day, with pages of 24 entries', 'The type filters use grey text']
    },
    {
        version: '0.75.0',
        date: '2026-10-18',
        title: 'All activity page for the super admin; dashboard cleanup',
        items: ['New top-bar icon (super admins only) opens All activity: everything that happened in the CRM, grouped by day, with Today / 7 days / 30 days, a team member filter, a client filter and the same type chips as the member activity log', 'Clicking a name or a client in an entry filters the page on it', 'The dashboard no longer shows the Tasks due this week and Recent sales activity cards']
    },
    {
        version: '0.74.7',
        date: '2026-10-18',
        title: 'Top menu: click a group to go to its page',
        items: ['With a mouse, hovering a top menu group (Sales, Customers, Leads, Projects, Tasks, Support) still opens its panel, and clicking the group itself now goes to its main page (Customers → Clients, Leads → Leads, Sales → Invoices, Projects → Projects, Tasks → My tasks, Support → Tickets); More only opens its panel', 'On touch screens a tap still opens the panel, as before, and the arrow-down key opens it from the keyboard']
    },
    {
        version: '0.74.6',
        date: '2026-10-18',
        title: 'Ctrl K / ⌘K opens the search; change a task status from the calendar',
        items: ['Ctrl K (⌘K on a Mac) opens the search from any page and closes it again; the shortcut is shown on the search button and in the search box', 'The three-dots menu of a task in the calendar agenda and in the Overdue list has Change status with the five statuses (the dot shows each colour)']
    },
    {
        version: '0.74.5',
        date: '2026-10-18',
        title: 'Schedule: the + is above everything in the box',
        items: ['The + of a day box now sits above the entries, the +N link and the people, so it can always be seen and clicked']
    },
    {
        version: '0.74.4',
        date: '2026-10-18',
        title: 'Schedule: + on hover, tighter entries, you first',
        items: ['Hovering a day box shows a + button: it offers New event (the form opens on that day) or New task (the task form opens with that day as the due date)', 'Entries inside a box sit closer together', 'The team filter starts on you (the signed-in person) and has an All chip to see everyone']
    },
    {
        version: '0.74.3',
        date: '2026-10-18',
        title: 'Schedule: just the date on top, entries with a light bar',
        items: ['The first card of the right column shows only the date (Fri, 16 Oct 2026) and the + button; the other lines are gone', 'Under each title in the agenda: time - date - kind (for example 9h - 16 Oct - Event, or 16 Oct - Task)', 'Entries in the calendar boxes are a light bar tinted with their colour and dark text, also on the selected day']
    },
    {
        version: '0.74.2',
        date: '2026-10-18',
        title: 'Schedule polish, and the colour picker on every page',
        items: ['The colour button of the left dock is now on every page (the period and currency buttons still only where a page uses them)', 'Calendar boxes: the day number on the left and the people on the right (bigger photos); the selected day takes the colour you picked; entries read dot (task status or event colour), then the time as 9h or 14h30, then the title, in text colours that stay readable on any box', 'The Overdue card is just the title and the count in a red circle']
    },
    {
        version: '0.74.1',
        date: '2026-10-18',
        title: 'Schedule: big day, tick-off agenda, compact equal cells',
        items: ['The first card of the right column drops the "Agenda" title: the date is big, with "1/1 done · Overdue 6" under it; each task has a checkbox (ticking finishes it, ticking again reopens it), the assigned people and a three-dots menu (Open, Mark complete or Reopen, Assign to, Reschedule); events and other entries have their own dot and an Open menu; the Overdue list works the same way', 'Calendar boxes all have the same height; entries are one compact line (a dot in the colour of the task status or of the event, the time, then the title), at most two per day and then +N; finished tasks stay on their day, struck through; the people behind the day show as small photos at the top right of its box', 'The team filter only lists active people']
    },
    {
        version: '0.74.0',
        date: '2026-10-18',
        title: 'Schedule like the Rapport demo; no more piles of "Failed to fetch"',
        items: ['The calendar is a two-column Schedule: the calendar on the left (rounded day cells, today ringed, the selected day a solid block, Month / Week / Day and previous / today / next), and on the right the Agenda of the selected day plus an Overdue list (tasks past their due date and unpaid invoices past theirs, whatever month is on screen). Click a day to fill the agenda; drag across days or hours, or use + / New event, to create an event', 'Filters under the head: team chips (show only what concerns the people you pick: their events, invitations, assigned tasks, reminders and invoices) and kind chips (events, reminders, tasks, invoices, projects, estimates, proposals, contracts); the head shows today, this week and the overdue count', 'The server now sends who each calendar entry concerns, the overdue list and the team photos', 'The repeated "Failed to fetch" toasts are fixed: the calendar only asks the server again when the date range really changes, an older answer never overwrites a newer one, and the same error shows once (not again for 20 seconds)']
    },
    {
        version: '0.73.0',
        date: '2026-10-18',
        title: 'Clients like the Rapport customer directory: head with metrics, Grid / Table, one menu',
        items: ['The Clients page opens with the demo head: a big title and three icon metrics (clients in your book with the new ones this week, active clients with their share, and what the whole book still owes with the overdue part, in the base currency with the Settings rates)', 'A toolbar with search, status (All / Active / Inactive), group, sort (name, newest, city), a Grid / Table switch that is remembered, Export to CSV and New client', 'Grid shows one card per client: logo or initials, name, contact and city, outstanding and client since, a payment meter (the paid share of what was invoiced, red when something is overdue), the group and quick email and call buttons', 'Cards and table rows share the same three-dots menu: Open, Edit, New invoice, Send an email, Call, Activity log, Activate / Deactivate and Delete (with a confirmation)']
    },
    {
        version: '0.72.7',
        date: '2026-10-18',
        title: 'Enter works in the long description too',
        items: ['The "Long description" box of an item had the same trimming problem, so Enter at the end of a line was erased at once; it now keeps your line breaks like the description does, and grows with the text', 'The first description box is compact again (it grows line by line); the line breaks of a description also show on the invoice, estimate, proposal and purchase order pages']
    },
    {
        version: '0.72.6',
        date: '2026-10-18',
        title: 'Paper page as wide as the page body',
        items: ['The paper page takes the full width of the page body, exactly like the other pages (same left and right edges as their content), instead of a narrow centred sheet']
    },
    {
        version: '0.72.5',
        date: '2026-10-18',
        title: 'Enter makes a new line in an item description',
        items: ['In the line items of invoices, estimates, proposals and purchase orders, the description is now a growing text box: Enter starts a new line, and the line breaks show on the document and in the PDF']
    },
    {
        version: '0.72.4',
        date: '2026-10-18',
        title: 'Paper page at a normal width',
        items: ['The paper page is back to a normal width (860 px, centred) instead of stretching across the whole screen']
    },
    {
        version: '0.72.3',
        date: '2026-10-18',
        title: 'Document tab: only the paper, edge to edge',
        items: ['The paper colour no longer floods the whole frame (the page was painting its canvas with the paper colour, which looked like a second card with a long empty area): now only the paper card shows, as tall as the invoice, on the app background', 'On the invoice the document is no longer inset by the page container padding: it spans the full width of the content area']
    },
    {
        version: '0.72.2',
        date: '2026-10-18',
        title: 'Document tab: no grey box, full-width paper; Print button',
        items: ['The document page no longer has its own grey backdrop (that was the second card around the paper): only the paper card shows, across the full width, on the app background', 'A Print button next to Send on invoices, proposals, contracts (prints the paper page directly), and on estimates and purchase orders (opens the PDF, which you print from the viewer)']
    },
    {
        version: '0.72.1',
        date: '2026-10-18',
        title: 'Document tab: just the paper, full width',
        items: ['The Document tab of an invoice, and the document of a proposal and of a contract, are now only the paper page itself, full width: no card around it, no title and no buttons (use the PDF and Download buttons at the top of the page)']
    },
    {
        version: '0.72.0',
        date: '2026-10-18',
        title: 'Paid invoices and signed contracts are final; documents in the Rapport paper look',
        items: ['A paid invoice (its edit, status changes, payments) and a signed contract (edit, trash, delete, renew, unsign) can no longer be changed. Only a super admin can, and only after a caution asking them to confirm; the server refuses everyone else, so it holds even outside the screens. A contract the client signed on screen can still never be un-signed', 'Documents (invoice, estimate, proposal, purchase order, contract) now look like the Rapport invoice: a warm paper card on screen (the Document tab and the client page), small spaced labels, hairlines, a plain table, a bold total with a thick rule, and a stamp across paid, overdue and cancelled invoices', 'Downloads stay PDF files with the same look (the page is plain white when printed); your Settings for logo, font size, numbering and the bank block still apply, but the table heading colour setting no longer tints the new plain table']
    },
    {
        version: '0.71.0',
        date: '2026-10-18',
        title: 'Estimates, proposals, contracts and payments get their chart; payments get a row menu; lighter mega menu cards',
        items: ['Under their figure cards these lists now have a chart card like the invoices: estimates and proposals (offered against accepted, by period and currency), contracts (value by start date and the signed part) and payments (money received); big numbers are short (12.5K, 1.2M) with the currency', 'Payments rows get the three-dots menu: Open invoice, Download invoice and Delete payment (it replaces the old delete button)', 'The section cards of the mega menu use a lighter pane and a fainter border']
    },
    {
        version: '0.70.2',
        date: '2026-10-18',
        title: 'Logo takes the chosen colour and plays on each page',
        items: ['In the animated logo, "CRM" and the dot take the colour picked in the dock (with the default colour the dot stays coral); "trt" follows the text colour, light in dark mode', 'No more hover animation: the logo plays when the page is loaded and every time you go to another page, and stays still when motion is reduced']
    },
    {
        version: '0.70.1',
        date: '2026-10-18',
        title: 'Animated logo in the top bar',
        items: ['The Rapport top bar shows the animated logo (assets/lottie/trtLogo.json): it plays once when the page opens and again when the pointer passes over it; it stays still when motion is reduced, and its dark parts turn light in dark mode. The other layouts keep the image logo']
    },
    {
        version: '0.70.0',
        date: '2026-10-18',
        title: 'Estimates, proposals, purchase orders, contracts and payments like the invoices page',
        items: ['Each of these lists now opens with the demo-style head (big title and three icon metrics) above its figure cards', 'Every row has the three-dots menu: Open, Edit, Download, Send (the email dialog), Change status (estimates: Draft, Sent, Accepted, Declined; proposals: Draft, Open, Sent, Revised, Accepted, Declined; purchase orders: Draft, Sent, Confirmed, Delivered, Cancelled), Convert to invoice where it applies, and Delete; contracts also get Mark as signed / unsigned and Restore from the trash', 'Payments get the new head only (their delete button stays); the Cash flow chart is on the invoices page only for now, because the other lists have no chart data yet']
    },
    {
        version: '0.69.2',
        date: '2026-10-18',
        title: 'Return arrow in submenus',
        items: ['The first row of every submenu (Change status, Move to…, Priority, Assign to…) is now a return arrow followed by the menu name; the arrow nudges back on hover and flips in Arabic']
    },
    {
        version: '0.69.1',
        date: '2026-10-18',
        title: 'Invoices: demo-style head with three metrics, short numbers in the chart',
        items: ['The Revenue and Invoices big cards are replaced by the head of the Dashboard: a big title and three metrics with their icons (Revenue collected, number of Invoices with the overdue count, Cash flow still to collect); the four figure cards stay, then the Cash flow chart', 'Charts show big numbers short with the currency (12.5K MAD, 1.2M MAD) on the axis and in the tooltip']
    },
    {
        version: '0.69.0',
        date: '2026-10-18',
        title: 'Invoices like the Rapport finance page: Revenue, Invoices, Cash flow and a row menu',
        items: ['Under the four figure cards, three Rapport cards that follow the same filters and currency: Revenue (collected against invoiced, drawn in), Invoices (a stacked bar of the statuses with counts and shares) and Cash flow (running totals; the gap is what is still to collect)', 'Every invoice row has a three-dots menu: Record payment (a form with the balance), Open, Edit, Download, Send (the email dialog), Change status (Draft, Sent, Cancel; a cancelled invoice can be reopened with Sent) and Delete; cancelling and deleting ask first', 'New status action "back to draft" (not possible once payments exist); the invoices list now also returns the chart series for each currency, ALL included with the Settings rates']
    },
    {
        version: '0.68.4',
        date: '2026-10-18',
        title: 'Status row says what it will do',
        items: ['In the profile menu the status row now names the action: "Change status to away" while you are available or idle, "Change status to available" while you are away; the current status (Available, Idle, Away) is shown under it, and a glowing dot in the colour of the status you would switch to (orange for away, green for available)']
    },
    {
        version: '0.68.3',
        date: '2026-10-18',
        title: 'Status changes at once when you set yourself away',
        items: ['Setting yourself as away (or back to available) from the profile menu now changes the dot on the avatar, the menu row and the chat status immediately, without waiting for the next presence check']
    },
    {
        version: '0.68.2',
        date: '2026-10-18',
        title: 'One global status: the profile menu follows the avatar dot',
        items: ['The status row in the profile menu shows the same status as the dot on the avatar (Available, Idle after a while without activity, Away) and changes with it; below it, the action (Set as away / Set as available)', 'The status is tracked for everyone in the app, also people who cannot use the chat, so the dot goes orange when you are idle']
    },
    {
        version: '0.68.1',
        date: '2026-10-18',
        title: 'Wider profile menu',
        items: ['The profile menu is wider (340 px) with taller rows, so the name, email, role and every entry have room', 'Section titles of the mega menu (Administration, Setup…) are dark again instead of taking the picked colour, so they stay readable with light colours']
    },
    {
        version: '0.68.0',
        date: '2026-10-18',
        title: 'Tabs and switches like the Rapport demo',
        items: ['Every set of tabs in the app (pages, popups, settings, the page tabs in the top bar) is now the demo\'s pill track with a dark pill that glides to the active tab; counts and icons sit inside the tab', 'The Board / List and Active / Lost style switches use the same pill look; both follow light and dark mode and mirror in Arabic']
    },
    {
        version: '0.67.4',
        date: '2026-10-18',
        title: 'The chosen colour now reaches everything (no more red leftovers)',
        items: ['Parts of the design lived outside the page (the tile you drag, the panels that open beside the dock, the floating menus) and kept the template\'s terracotta whatever colour was picked. The colour now sits at the root and every Rapport colour reads it, so they all turn green when you pick green']
    },
    {
        version: '0.67.3',
        date: '2026-10-18',
        title: 'Menus follow the chosen colour',
        items: ['The mega menu (icon tiles, glow, active page, section cards), the tile and dropdown menus and the period and colour panels now take the colour picked in the dock, in light and dark mode; text on them switches to dark when the colour is light']
    },
    {
        version: '0.67.2',
        date: '2026-10-18',
        title: 'Won / Lost rows show their numbers',
        items: ['The rows at the right of the boards now carry a metric like the Rapport demo: leads show how many were converted and how many were lost; tasks show how many are completed, in progress and in view']
    },
    {
        version: '0.67.1',
        date: '2026-10-18',
        title: 'Task board: In progress row, scrum panels rearranged',
        items: ['The rows at the right of the task board are now Done, In progress and Delete: drop a task on In progress to start it', 'Scrum board: the Burn-up and By status cards are gone, and Who works on what and Due soon now sit under the board']
    },
    {
        version: '0.67.0',
        date: '2026-10-18',
        title: 'Project scrum board and every task link use the new pipeline and popup',
        items: ['The project scrum board (/crm/projects/:id/board and the Scrum board page) keeps its burn-up, status and workload panels but its board is now the new pipeline: coloured tiles, three-dots menu with Priority / Due date / Assign to / Move to, the Done and Delete rows, the + on each stage and the new popup; moving a task refreshes the panels', 'Every link to a task (from the team dashboard, lists, timeline, time report…) now opens the tasks board with that task in the new popup instead of the old full page', 'Tasks inside a project (project page) already used the same board; all three places (team tasks, project tasks, scrum board) now behave identically']
    },
    {
        version: '0.66.0',
        date: '2026-10-18',
        title: 'A lead can be assigned to several people; every menu moves the same',
        items: ['Leads can be assigned to more than one person: pick the team in the lead popup, or toggle people from the tile menu (Assign to); every tile and the lead list show the whole team, and "My leads", the owner filter and view-own access count every member. Existing leads keep their single owner as the first member', 'All the other menus (profile, language, notifications, row actions…) now look and move like the Rapport menus: they spring out of their button, their rows slide in one after the other, and the rows lift on hover, in light and dark mode']
    },
    {
        version: '0.65.0',
        date: '2026-10-18',
        title: 'One popup for tasks and leads, + on every stage, columns fill the screen',
        items: ['The old side drawers of tasks and leads are now the new popup: same springy slide-in, a head in the colour of the stage, the stage bar (press a step to move it) and every field, tab, checklist, comment, timer and action of the old drawer inside it; clicking a tile, choosing Open, or opening a task or lead from a list all show it', 'A + at the top right of every stage creates a task or lead already in that stage; stage headers can show the total cash of their tiles whenever tiles carry an amount (leads and tasks have no amount today, so none shows yet)', 'Board columns are no longer cut: they share the full width, and only scroll sideways when there are too many to fit', 'Translated into French, Spanish, Japanese and Arabic']
    },
    {
        version: '0.64.0',
        date: '2026-10-18',
        title: 'Pipeline like the Rapport demo: tile menu, popup, Won / Lost rows',
        items: ['Every tile has the three-dots button: Open, Move to… (a submenu of the stages), and the page\'s own entries with submenus (tasks: Priority, Due date, Assign to; leads: Assign to, Source), then Mark lost / Delete; menus open with a spring and slide between levels', 'Clicking a tile or choosing Open shows the same new popup: a head in the colour of its stage, the stage bar (press a step to move it), its fields, the team with photos and the actions; it slides in with the stage bar filling and the fields coming in one after the other', 'Won and Lost rows at the right of the board: drop a lead on Won to convert it to a client (with a confirmation) or on Lost to close it; for tasks they are Done and Delete (with a confirmation); they light up while you drag', 'Translated into French, Spanish, Japanese and Arabic']
    },
    {
        version: '0.63.2',
        date: '2026-10-18',
        title: 'Pipeline: the dragged tile follows the mouse and takes the colour of the column it is over',
        items: ['The tile you drag now sits right under the pointer (it was far below it because the column animation acted as a frame for it); it is lifted out of the column while dragging so nothing clips it', 'While dragging, the tile changes to the colour of the column it hovers and fades back if you leave', 'Page entrance animations no longer keep a transform after they end']
    },
    {
        version: '0.63.1',
        date: '2026-10-18',
        title: 'Better period panel, soft colours and a custom colour',
        items: ['Period panel: shows the days now in view on top, then each preset with the dates it covers (so "Last month" or "12 months" is never a guess), a check on the active one, and a From / To custom range with an Apply button', 'Colour panel: 8 new soft colours (mist grey, sage and mint greens, baby blue, lavender, peach, butter, blush) kept apart from the vivid ones, plus a custom colour: pick it on the colour wheel or type a hex code; text on light colours stays dark and readable, in light and dark mode', 'Translated into French, Spanish, Japanese and Arabic']
    },
    {
        version: '0.63.0',
        date: '2026-10-18',
        title: 'Shared pipeline board, equal-card mega menu, more colours, search suggestions',
        items: ['New shared Pipeline board used by Leads, team tasks and project tasks: frosted columns with a coloured dot, count and drop highlight, coloured tiles (date, title, line under it, label and people) that are dealt in, lift on hover and tilt while dragged; the same data and saving as before', 'Mega menu: each section is a card of the same size that scrolls inside, with a count; the panel springs open, the cards and their rows come in one after the other', 'The colour picker now has 16 colours and really paints the new design (warm tiles, dark card, mesh, buttons); text on light colours switches to dark so it stays readable, in light and dark mode', 'Dock: the Period, Currency and Colour panels open centred on their button with an arrow, sliding out of the dock like the Settings menu (they were mispositioned by the dock blur); the Settings menu slides in too', 'Fixed the long empty space under pages (the menu tokens also gave every floating menu a full-screen height) and the revenue chart that could keep growing', 'Search: with an empty box it now suggests the pages you visited lately and the ones most used, each with its short description', 'Translated into French, Spanish, Japanese and Arabic']
    },
    {
        version: '0.62.2',
        date: '2026-10-18',
        title: 'Dev copy: own database seeded with three years of demo data',
        items: ['A dev copy of trtCRM (branch dev, its own address) can start from an empty database: with DEMO_SEED=1 the container creates the tables, the admin login, the demo team and about three years of demo clients, leads, projects, tasks, tickets, invoices, payments and expenses (DEMO_YEARS changes the span). Nothing changes where the variable is not set, so staging is untouched', 'scripts/seed-crm-demo.mjs takes --years N (1 to 5) to spread the history over several years']
    },
    {
        version: '0.62.1',
        date: '2026-10-18',
        title: 'Rapport menus: mega menu with icons and descriptions, magnetic hover, dock Settings menu',
        items: ['Top menu panels redone: every entry is one row with an icon tile, the title and a short description, an arrow that slides in, a glow that follows the mouse and an icon that pops and tilts on hover; wide sections use two columns and a panel never leaves the window', 'Dock: buttons, the profile picture, bell, language and logo now lean toward the mouse like in the Rapport template, and their icons pop on hover; the Settings menu opens beside the dock (right in English, left in Arabic) with the same rich rows instead of dropping below it', 'Descriptions translated into French, Spanish, Japanese and Arabic', 'Our own Rapport files now carry the TRT Digital copyright header; the notices of the licensed Rapport component stay untouched on its files, as the licence requires']
    },
    {
        version: '0.62.0',
        date: '2026-10-18',
        title: 'Dashboard exactly like the Rapport Overview, filters in the dock',
        items: ['The Dashboard now is the template\'s Overview, with its own motion (GSAP): the title rises, the three figures file in and count up, the cards land one after the other, the revenue curve draws itself and morphs between Collected and Invoiced, the "Money waiting" tiles are dealt like cards, the Collection ring sweeps, the status bars and client meters fill, tasks and activity file in. Arabic and Japanese titles fade in whole instead of letter by letter', 'New "Money waiting" panel: the biggest unpaid or overdue invoices and the open estimates, with their due dates and clients; each tile opens the document', 'Period, currency (with ALL and its no-rate warning) and colour pickers moved to the left dock, each showing its current value under the icon; on a phone they stay in the toolbar under the header', 'The other dashboard blocks (leads, tasks, clients, finance) stay below the Overview, unchanged', 'Texts translated into French, Spanish, Japanese and Arabic']
    },
    {
        version: '0.61.0',
        date: '2026-10-18',
        title: 'Rapport look, step 1: design tokens, dock, pill navigation, Dashboard',
        items: ['New default layout "Rapport" (Rapport design reference): a slow warm mesh of colour behind frosted cards, a dark dock at the edge of the screen (search, team dashboard, calendar, chat, reports, AI, settings, light/dark), and a pill navigation at the top (Dashboard, then the CRM groups you may open, the rest under More; the dark pill slides to the page you are on and each pill opens a panel with its links). Period, currency and colour pickers sit in a toolbar under it', 'Everything mirrors in Arabic (dock and logo on the right, pills right to left); on a phone the dock and pills fold into the usual menu drawer; light and dark mode both follow the new tokens', 'Dashboard: big page title that rises letter by letter (whole-word for Arabic and Japanese, which must not be split), sections that land one after the other, frosted figure cards; all cards in this layout get the frosted pane look', 'Reduced-motion is respected (no mesh drift, no entrances). The old layouts are still in the theme panel (Rapport, Collapsible, Stacked, Top bar...); people who still had the old default move to Rapport once and can switch back there', 'Design source stays out of the repo: the licensed .168-rapport folder is ignored; the next steps (Leads pipeline, Clients grid, Calendar, Reports) will follow page by page']
    },
    {
        version: '0.60.2',
        date: '2026-10-18',
        title: 'No shipping address on clients',
        items: ['The shipping address is gone from the client edit page and from the client overview, since you do not ship; the client page keeps only the address and the optional different billing address (existing shipping data is left untouched, just not shown)']
    },
    {
        version: '0.60.1',
        date: '2026-10-18',
        title: 'Client page: compact addresses',
        items: ['The client edit page now shows only the Address card. At its top right two switches, both off by default, reveal a separate Billing address and Shipping address; while a switch is off, that address is simply the one above (it is saved as a copy, so documents print it)', 'A client whose billing or shipping address already differs opens with the matching switch on; turning a switch on starts from a copy of the address, with a button to copy it again']
    },
    {
        version: '0.60.0',
        date: '2026-10-18',
        title: 'Banks tab, and a new top for documents',
        items: ['Settings → Banks (under Billing) and Setup → Finance → Bank accounts: add the bank accounts used on your documents; the bank pickers on clients, invoices, estimates and purchase orders list exactly these accounts (the card moved out of Company)', 'Invoices, estimates, purchase orders and proposals (PDF, print view and client page): the logo now sits on the left with the company details under it; on the right are the document title and number and, right under them, the client\'s details (bill to) and the dates. The "swap" PDF setting now puts the client under the logo and the company on the right. Contracts: logo on the left, title on the right', 'On a phone the two sides stack']
    },
    {
        version: '0.59.0',
        date: '2026-10-18',
        title: 'Bank accounts per client and per document, reminder switch on the page, client languages',
        items: ['Bank accounts: Settings → Company → Bank accounts lists as many accounts as you need (name, bank, holder, RIB/IBAN, SWIFT, one default). The account printed on a document is chosen in this order: the document\'s own ("Bank account on the document" in the invoice, estimate and purchase order editors), then its client\'s ("Bank account on its documents" on the client edit page), then the default one. It fills {company_bank}, {company_rib}, {company_swift} and the new {company_bank_holder} in the PDFs, the public pages and the emails. Your existing single bank (Bank / RIB / SWIFT) becomes the first, default account on update, so nothing changes until you add another', 'The "send reminders to the client" switch is now also on the invoice, estimate, proposal and contract pages (a card with an On/Off switch that saves at once), not only at the bottom of the editor', 'Client edit page: Default language is now a list of the languages switched on in Settings → Localization (it was free text), next to the new bank account choice', 'Only one account can be the default: choosing a new default clears the old one (also for currencies)']
    },
    {
        version: '0.58.2',
        date: '2026-10-18',
        title: 'Fix: HTML showing inside invoice items',
        items: ['Item descriptions, client notes, terms and internal notes that came from the old system as HTML (or as escaped HTML like &lt;p&gt;) were shown with their tags on the invoice, estimate, proposal and purchase order pages; they now show as formatted text (paragraphs, bold, lists, links), and the item title as plain text', 'Safe by design: only harmless tags are kept, scripts, styles, attributes and unknown tags are dropped; the editors show the same text without tags and keep the original until you change a line', 'The PDFs and public pages already cleaned these texts; nothing changes there']
    },
    {
        version: '0.58.1',
        date: '2026-10-18',
        title: 'Cron: a switch on each card, and who/how much in the preview',
        items: ['Each Cron job card (Invoices, Estimates, Proposals, Contracts, Expenses, Tasks, Tickets, and a new Cleanup card) has its own On/Off switch at the top right, instead of one separate list of switches; a card switched off is dimmed and its category is skipped', 'The preview now shows, under every invoice, estimate, proposal and contract line: the client name, the email address(es) it would go to (or a red "No email address: it would fail"), the amount (amount still due for invoices), the date and how many days overdue or left; still read-only, nothing is created or sent']
    },
    {
        version: '0.58.0',
        date: '2026-10-18',
        title: 'Cron job: switch each category on or off',
        items: ['Settings → Cron job → "Which tasks run": one switch per category (Invoices, Estimates, Proposals, Contracts, Expenses, Tasks, Tickets, Cleanup), all on by default; a category switched off is skipped by the schedule and by "Run manually", and Preview lists it under "Turned off"', 'Handy to keep, for example, only invoice reminders running while the rest is tested']
    },
    {
        version: '0.57.2',
        date: '2026-10-18',
        title: 'Cron command shows the address you are using',
        items: ['Settings → Cron job: the command and the crontab line now use the address you opened the CRM on (for example app.trtcrm.com), instead of the PUBLIC_URL setting of the server, which still named the old staging address after the domain change', 'The server settings that still decide the address in emails, short links, the client portal and sign-in are PUBLIC_URL, AUTH_URL, NEXTAUTH_URL and TRTAGENCY_REDIRECT_URI; they must name https://app.trtcrm.com (see docs/DEPLOY-COOLIFY.md)']
    },
    {
        version: '0.57.1',
        date: '2026-10-18',
        title: 'Cron preview and run result, clear and linked',
        items: ['The result of "Preview what would happen" and "Run cron manually" is now laid out instead of plain text: a summary on top (Preview or Run finished, with the counts to do / done / skipped / failed), one card per task (Invoices, Estimates, Proposals, Contracts, Tasks, Tickets...) with a coloured icon and a Will happen / Done / Skipped / Failed tag on every line, and the tasks with nothing to do gathered in one line', 'Every invoice, estimate, proposal, contract, task and ticket named in the result is a link that opens it', 'Long lists scroll inside their card; "every 1 days" now reads "every 1 day"']
    },
    {
        version: '0.57.0',
        date: '2026-10-18',
        title: 'Cron job schedule: every N minutes, hours or days',
        items: ['Settings → Cron job has a new Schedule card: choose who runs the automatic tasks (the CRM itself, or an external scheduler that calls the command), then "Run every" a number of minutes, hours or days (for days, also the hour of the day)', 'The CRM can now run its automatic tasks by itself: with "The CRM itself" chosen and "Run the automatic tasks" turned on, it wakes up on your schedule, with nothing to set up on the server; every run appears in Recent runs as "scheduler"', 'With an external scheduler, the crontab line shown below the command now matches your choice (for example */5 * * * * for every 5 minutes, 0 9 * * * for every day at 9)', 'Nothing changes until you turn "Run the automatic tasks" on: it stays off by default; each task still works once a day at the hour of its own card']
    },
    {
        version: '0.56.0',
        date: '2026-10-18',
        title: 'Client reminders: a switch on each document',
        items: ['Invoices have a "Send overdue reminders to the client" switch, on by default: when it is off, the automatic overdue reminder email is never sent for that invoice (the switch is the invoice\'s "cancel overdue reminders" flag, now visible in the editor)', 'The same kind of switch, on by default, on estimates, proposals and contracts for their automatic expiry reminder / expiration notice email; off means nothing is emailed to that client automatically', 'Emails you send yourself (Send, Send reminder from the document or the Mails page) are not blocked: the switch only stops the scheduled ones', 'Reminder emails stay off while the scheduled job is off (staging); nothing changes there']
    },
    {
        version: '0.55.0',
        date: '2026-10-18',
        title: 'Compact currency and colour pickers, and an ALL currencies view',
        items: ['The top bar is lighter: the currency switch and the colour dots now show only the chosen one (a small coin icon with the currency, a palette icon with the colour); rest the pointer on it (or tap it) and the others slide out, including ALL for currencies', 'ALL adds every currency together in the base currency: Dashboard, Invoices, Payments, Estimates, Proposals, Purchase orders, Expenses, Reports and a client\'s billing all follow it, cards and charts included', 'Settings → Currencies has a new "Rate to the base currency" (1 unit of this currency = how many base units): ALL uses it. A currency without a rate is left out of ALL, never guessed, and the ALL button shows an amber dot with the names while it is missing one', 'Expenses totals are now added in the base currency with those rates too (before, amounts of different currencies were added as if they were the same)']
    },
    {
        version: '0.54.0',
        date: '2026-10-18',
        title: 'New figure cards, with animation',
        items: ['One new card design for every figure card in the CRM (Dashboard, Team dashboard, Scrum board, Time report, AI insights, Reports, client billing, projects and the tiles on Invoices, Payments, Estimates, Proposals, Purchase orders, Expenses and Clients): the name on the left, the icon in a soft rounded square on the right, the figure big underneath, the +/- percentage and the note below it, and the small chart along the bottom', 'Animations: cards slide in one after the other, the figure counts up to its value (and again when it changes), the card lifts and the icon pops on hover, a soft glow breathes behind the icon, the chart fades in; people who asked their device to reduce motion get none of it', 'Same look in light and dark mode and on a phone']
    },
    {
        version: '0.53.1',
        date: '2026-10-18',
        title: 'Percent on every money card',
        items: ['A card whose previous period had nothing now shows "+100%" instead of the word "new" (and everywhere the comparison said "no earlier data"), so every card shows a percentage', 'Money cards on the lists now show the percentage too, last 30 days against the 30 days before, counted with the same rule as the figure: Invoices (invoiced, paid, outstanding, overdue), Payments (received), Estimates and Proposals (waiting for an answer, accepted), Purchase orders (all orders, to deliver, not invoiced yet) and Expenses (total spent, to invoice, invoiced); a rise in outstanding, overdue or expenses is red and a fall is green', 'AI insights, Yearly income: invoiced, collected and expenses show the last 12 months against the 12 months before']
    },
    {
        version: '0.53.0',
        date: '2026-10-18',
        title: 'Cards compared with the previous period (+23% / -33%)',
        items: ['The cards now show how they moved: a green "+23%" or a red "-33%" with an arrow (for figures where less is better, like overdue, outstanding, open tasks and tickets, a fall is green). Dashboard: invoiced, collected, new leads, projects, estimates and open tasks and tickets against the previous period of the same length; outstanding, overdue and clients against the day the period began. Time report: time logged, billable, entries and per working day against the previous 7, 30 or 90 days. Team dashboard: tasks completed, finished on time and average time to finish against the previous period', 'Cards that are a live count with no history (for example "my open tasks today") keep showing the number only, since the CRM does not store what the count was yesterday']
    },
    {
        version: '0.52.3',
        date: '2026-10-18',
        title: 'Roles audit: announcements, leave, activity log, lead setup',
        items: ['Every screen was checked against Roles. New rows: Announcements (View, Create, Edit, Delete) and Attendance & leave (leave requests and days off, with View own for each person); the Activity log page now follows the Activity log row instead of Settings. Everybody keeps what they had: whoever had Settings, or Tasks for leave, gets the matching rows once on update', 'Security fix: any team member could add, edit or delete lead sources, lead statuses, web-to-lead forms and the lead email integration (the automatic "create/edit leads" right covered them); those setup items now need Settings → Edit, while everyone who may see leads can still pick them in a lead', 'Documented and unchanged on purpose: AI insights (super administrator only), notes, to-dos, reminders, notifications and files attached to a record (personal or follow the record), the newsfeed and tags (shared by the whole team)']
    },
    {
        version: '0.52.2',
        date: '2026-10-18',
        title: 'Roles: Departments',
        items: ['Roles & permissions (and each member\'s access) now has its own "Departments" row with View, Create, Edit and Delete, in the Administration group; before, departments hid under Settings and had no row of their own', 'Nobody loses anything on update: whoever could see Settings gets Departments → View and whoever could edit Settings gets Create, Edit and Delete; the Admin and Super Admin roles have it']
    },
    {
        version: '0.52.1',
        date: '2026-10-18',
        title: 'Fix: Admin-role members could not add departments (or any setup item)',
        items: ['Settings and Email templates only offer View and Edit in Roles, but adding and deleting (departments, currencies, taxes, payment modes, ticket statuses and priorities, services, predefined replies, custom fields...) asked for Create and Delete, which nobody could be given: only the Super Admin saw the "New" buttons. Edit now covers adding and deleting for those two, so every member whose role has Settings → Edit can add departments and the other setup items', 'Same gap closed for Checklist templates (Roles offers Create and Delete only): Create now also lets the person open and edit them', 'A test now walks every feature the screens use and fails if an action cannot be granted in Roles']
    },
    {
        version: '0.52.0',
        date: '2026-10-18',
        title: 'Roles: Calendar, Team chat and File manager',
        items: ['Roles & permissions (and each member\'s access) now has a "Tools" group with Calendar, Team chat and File manager: until now anybody signed in could use them; switching one off hides its menu entry, page and chat bubble and the server refuses the request too', 'Nobody loses anything on update: every existing role and member gets the three switched on once, and all standard roles include them; switch them off where you want', 'Audit result: every other function already has its permission (customers, leads, invoices, tasks, projects, tickets, vault, reports, settings, mails, goals, surveys...); the AI page stays for the super administrator only, and notes, to-dos, reminders and notifications are personal to each person']
    },
    {
        version: '0.51.1',
        date: '2026-10-17',
        title: 'Claude keys that belong to no workspace',
        items: ['Settings → AI → Claude: new optional "Workspace id" field. Anthropic answers "This API key is not scoped to a workspace" for keys created outside a workspace; paste the workspace id (console.anthropic.com → Settings → Workspaces) and it is sent with every request, for the test, the model list, the analyses and the chat', 'Provider error messages are no longer cut short']
    },
    {
        version: '0.51.0',
        date: '2026-10-17',
        title: 'AI chat about your figures',
        items: ['The AI page now opens on a Chat: ask anything about your leads, clients and yearly income and keep the conversation going (follow-up questions, "compare with last year", "who do I call first?"), pick the provider and model above the chat, copy any answer, start a new chat; the analyses stay on the other tabs', 'Same privacy as the analyses: the assistant sees only totals, rates and company names, answers only from those figures, the figures are refreshed every few minutes, every use is in the activity log, 60 messages an hour per person, super administrator only']
    },
    {
        version: '0.50.1',
        date: '2026-10-17',
        title: 'AI: the real error is shown, Claude Sonnet is the default model',
        items: ['When Claude, ChatGPT, DeepSeek or OpenRouter refuses a request (wrong model, key without credit, rate limit...), the screen showed only "Request failed (502)" because the server in front of the app replaces 502 answers with its own page; the AI errors now use a status that passes through, so the real message appears (for example that the model is not known to the account or that the key has no credit left)', 'Claude\'s suggested models now start with Sonnet, the usual choice, instead of the largest one']
    },
    {
        version: '0.50.0',
        date: '2026-10-17',
        title: 'AI insights: leads, clients and yearly income',
        items: ['Settings → AI: for the super administrator only, add the API key of Claude (Anthropic), ChatGPT (OpenAI), DeepSeek or OpenRouter (keys are stored encrypted and never shown again), pick the model in a dropdown (suggested models, the ones the key can use, or type any model id), test the connection, choose the default provider and add a few words about your company', 'New AI insights page (Utilities, super administrator only) with three analyses: Leads (conversion, days to convert, sources, owners, trend, leads needing attention), Clients (top clients, concentration, overdue, dormant, growth) and Yearly income over the whole life of the company (invoiced, collected, expenses, growth year by year, this year against the same months of last year); each shows its figures and charts and the AI writes the reading: summary, what stands out, risks and actions, in your language, with an optional question', 'Privacy and control: only totals, rates and company names are sent (never emails, phone numbers or addresses), the AI may use only those figures, every use is in the activity log, 30 analyses an hour per person, amounts are never converted between currencies', 'See docs/ai-insights.md; scripts/fake-ai.mjs lets you try it without a key and npm test covers the providers']
    },
    {
        version: '0.49.0',
        date: '2026-10-17',
        title: 'Sign in with Google and GitHub, working',
        items: ['The Google and GitHub buttons come back on the sign-in page, next to trtAgency and the password, and each one shows only when its keys are set (GOOGLE_AUTH_CLIENT_ID / _SECRET, GITHUB_AUTH_CLIENT_ID / _SECRET); before, they were set up but did nothing and a login would have produced a broken session', 'The session is the CRM user\'s own: the account is the user with the same verified email (Google says if the email is verified, GitHub gives its verified email); nobody gets an account just by having a Google or GitHub login, an administrator adds the person first; unverified email, no email, no account and deactivated members go back to the sign-in page with a clear message', 'Callback addresses to register: /api/auth/callback/google and /api/auth/callback/github on the CRM address; see docs/trtagency-signin.md']
    },
    {
        version: '0.48.0',
        date: '2026-10-16',
        title: 'Sign in with trtAgency (OpenID Connect)',
        items: ['New "Sign in with trtAgency" button on the sign-in page (shown only when the server is set up for it): authorization code + PKCE, state and nonce kept on the server, the ID token verified against the provider\'s keys (signature, issuer, audience, expiry, nonce); the normal session is then created, so everything else works as with a password', 'The account is found by the stable trtAgency identity, else attached to the existing account with the same verified email, else created (a team member who only has the access every member has; an administrator gives the role); deactivated members are refused; creation and email linking can be switched off with TRTAGENCY_AUTO_CREATE and TRTAGENCY_LINK_BY_EMAIL', 'Friendly messages when the person cancels, the link is old or reused, the token cannot be verified, no account exists or the account is disabled', 'Settings are environment variables (TRTAGENCY_ISSUER, TRTAGENCY_CLIENT_ID, TRTAGENCY_CLIENT_SECRET, TRTAGENCY_REDIRECT_URI), nothing secret is stored in the code; see docs/trtagency-signin.md; a fake provider (scripts/fake-trtagency.mjs) and 28 tests (npm test) cover the whole flow']
    },
    {
        version: '0.47.1',
        date: '2026-10-16',
        title: 'Task cards in one compact row',
        items: ['The cards above My tasks and Team tasks are smaller and sit in a single row (two rows of four on a phone): the figure, a small icon and the name, with the details in the tooltip']
    },
    {
        version: '0.47.0',
        date: '2026-10-16',
        title: 'Cards on My tasks and Team tasks',
        items: ['A row of small cards above the task lists: Due today (done / total), Overdue, Tomorrow, This week (done / total), In progress, Waiting (testing and awaiting feedback), Done today (Unassigned on the team list) and Time today, which becomes a Timer running card with the task name while a timer is on; each card opens the matching list with one click, the active one is highlighted and a pill removes the filter', 'The figures come from a new summary of the task API and refresh whenever the list changes, so ticking a task off updates them; the overdue reminder now uses the same figure', 'The task list also filters by status groups and by unassigned tasks']
    },
    {
        version: '0.46.2',
        date: '2026-10-16',
        title: 'Task lists open on today, with a reminder of what is still unfinished',
        items: ['My tasks and Team tasks now open on Today (the tasks due today, finished or not); the other periods are one click away, and project task lists keep showing all dates', 'A small amber reminder under the date chips says how many unfinished tasks are overdue, with a Show them link that opens the Overdue period; it disappears when there are none', 'Adding a task while on Today gives it today\'s date, so it appears in the list you are looking at']
    },
    {
        version: '0.46.1',
        date: '2026-10-16',
        title: 'Date filter on tasks',
        items: ['My tasks, Team tasks and the project task lists: one-click periods for the daily follow-up (All dates, Today, Tomorrow, This week, Overdue, No date, Done today) and a Custom range on the due date, the start date or the completion date; a range also shows the tasks already finished that day', 'A link can open the list on a period (for example /crm/my-tasks?period=today); new dashboard shortcut "Tasks due today" with the number due', 'Behind it, the task list accepts dateField, from, to, overdue and noDate, and only counts tasks that really have a date']
    },
    {
        version: '0.46.0',
        date: '2026-10-16',
        title: 'Shortcuts on the team dashboard',
        items: ['New Shortcuts row at the top of the Team dashboard: one click to the pages used every day (My tasks, Leads to follow up, Team tasks, Scrum board, Timeline, Time report, Tickets, Issues, Projects, Clients, Calendar, Chat, Notifications, Invoices, Estimates, Expenses, Help center, File manager, Password vault, Reports), each with a live figure where it makes sense (open and overdue tasks, leads to follow up, my tickets, today\'s events)', 'Customize: everybody ticks the pages they want and the choice follows them to any browser; only the pages the person may open are offered, and "Back to the default set" returns to My tasks, Leads, Team tasks, Scrum board, Tickets and Calendar']
    },
    {
        version: '0.45.1',
        date: '2026-10-16',
        title: 'Fix: searching a company in a client field crashed the page',
        items: ['Typing in a search field that looks up records (the Client field of the password vault, the client filter, and every similar picker in the forms) blanked the whole page; the search now lists the matching records']
    },
    {
        version: '0.45.0',
        date: '2026-10-16',
        title: 'Settings that did nothing now work (29), the rest are labelled',
        items: ['Tasks: new tasks follow the defaults of Settings → Tasks (priority, status, billable) and can assign and follow the creator automatically; one timer at a time, a timer can move the task to In progress, timers are rounded up / down / to the nearest N minutes, forgotten timers are stopped after N hours (daily cron), comments can only be removed during the first hour, boards show a limited number of cards per column with "Show more"', 'Calendar: only my tasks, and reminders on the calendar for the kinds of record you choose, optionally hidden once notified', 'Support: newest replies first, files per message and allowed extensions, the first person who replies becomes the assignee (on by default), members only see the tickets of their departments, members who can edit tickets may delete tickets and replies when the switch is on', 'Leads and clients: the lead owner becomes the client administrator on conversion, the lock after conversion and the board limit and order really apply now (they were silently ignored), order direction on the pipeline, VAT / ICE number can be made compulsory', 'Sales: the person who creates an invoice or estimate becomes its sale agent; staff with "view own" see invoices and proposals assigned to them only when the switch is on (on by default)', 'Interface: rows per page of every table starts from Settings → General, the language selector can be hidden for members', 'Settings that need an outside account (Google, Microsoft, reCAPTCHA, Pusher, AI) now say "Needs keys" instead of "Soon": the fields are ready for your keys; the 43 others still marked Soon are not built yet', 'Fixed: the Settings → Leads options (board limit, order, lock after conversion) were read the wrong way and never applied']
    },
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

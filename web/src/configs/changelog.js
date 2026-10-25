// trtCRM versions. Add a new entry at the TOP for every change we make; the first entry is the running version
// shown in the sidebar footer. Format: MAJOR.MINOR.PATCH (new feature = minor, fix = patch).
export const CHANGELOG = [
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

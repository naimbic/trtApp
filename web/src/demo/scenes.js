// The guided tour of trtCRM used to record the presentation video (dev.trtcrm.com only).
// Each scene = a page + what the cursor does there + the English voiceover. The voiceover is the MASTER text:
// the downloaded pack asks an AI to translate it to Arabic and then French, scene by scene, within the same duration.
//
// Step types (all optional):
//   { move: T }            glide the dot to T            { click: T }   glide, then click
//   { scroll: N | 'top' }  scroll the page (px)          { wait: ms }   pause
//   { key: 'Escape' }      press a key (closes a popup)  { type: [T, 'text'] } type in a field
// T = a CSS selector, or 'text:Label' (the visible control showing that text). A target that is not on the page is skipped,
// so a missing record never stops the tour.

export const SCENES = [
    {
        id: 'welcome', title: 'Welcome', path: '/dashboard',
        say: 'Welcome to trtCRM, the all-in-one workspace for your agency. Clients, sales, projects, tasks, support and your team, all in one place, in the language and currency you work with. Let us take a quick tour.',
        steps: [{ wait: 1200 }, { move: '.rp-pills' }, { wait: 800 }, { scroll: 420 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'dashboard', title: 'Dashboard', path: '/dashboard',
        say: 'The dashboard gives the owner the full picture at a glance: revenue, unpaid and overdue invoices, expenses, new clients and leads. Everything is shown in your main currency, and you choose the period.',
        steps: [{ move: 'text:Dashboard' }, { wait: 900 }, { scroll: 380 }, { wait: 1200 }, { scroll: 800 }, { wait: 1200 }, { scroll: 'top' }],
    },
    {
        id: 'team-dashboard', title: 'Team dashboard', path: '/team-dashboard',
        say: 'Every team member lands on a personal dashboard with their own tasks, reminders and what needs attention today. No noise, only what matters to them.',
        steps: [{ wait: 1000 }, { scroll: 360 }, { wait: 1200 }, { scroll: 'top' }],
    },
    {
        id: 'clients', title: 'Clients', path: '/crm/clients',
        say: 'All your clients in one clean grid. Search, filter and open any client in one click. Each client keeps its own currency, bank account, language and contacts.',
        steps: [{ wait: 1000 }, { move: 'input[placeholder*="earch"]' }, { wait: 900 }, { scroll: 320 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'client-page', title: 'A client file', path: '/crm/clients',
        say: 'A client file brings the whole relationship together: the journey from lead to client, invoices and payments, projects, tickets, contracts and notes. Contacts can be given access to their own client area in one click.',
        steps: [{ click: '.cx-card' }, { wait: 2200 }, { scroll: 420 }, { wait: 1200 }, { scroll: 900 }, { wait: 1200 }, { scroll: 'top' }],
    },
    {
        id: 'leads', title: 'Leads pipeline', path: '/crm/leads',
        say: 'The leads pipeline is a visual board. Drag a lead from one stage to the next, see its source and its next step on the card, and convert it into a client when the deal is won.',
        steps: [{ wait: 1400 }, { move: '.rp-face' }, { wait: 1000 }, { move: '.rp-pl-col:nth-child(3)' }, { wait: 1000 }],
    },
    {
        id: 'lead-popup', title: 'Inside a lead', path: '/crm/leads',
        say: 'Open a lead and everything is there: tasks with several assignees, the mails you exchanged, meetings with their report and reminders that also show in the calendar, notes, related documents and a full activity history.',
        steps: [{ click: '.rp-face' }, { wait: 1800 }, { click: 'text:Tasks' }, { wait: 1500 }, { click: 'text:Mails' }, { wait: 1500 }, { click: 'text:Meetings' }, { wait: 1500 }, { click: 'text:Notes' }, { wait: 1500 }, { key: 'Escape' }, { wait: 600 }],
    },
    {
        id: 'invoices', title: 'Invoices', path: '/crm/invoices',
        say: 'Invoicing made simple. Create, send and follow every invoice. Statuses, balances and overdue amounts are always clear, numbers follow your own format, and payments are matched to invoices.',
        steps: [{ wait: 1200 }, { move: '.cx-card, table, [role=table]' }, { wait: 900 }, { scroll: 360 }, { wait: 1000 }, { scroll: 'top' }],
    },
    {
        id: 'invoice-view', title: 'An invoice', path: '/crm/invoices',
        say: 'An invoice shows the client, the items with their taxes, the amounts in the right currency and the bank account to pay into. Print it as a PDF, email it, or send a public link. You can also clone it in one click.',
        steps: [{ click: 'tbody tr' }, { wait: 2400 }, { scroll: 380 }, { wait: 1300 }, { scroll: 'top' }],
    },
    {
        id: 'estimates', title: 'Estimates', path: '/crm/estimates',
        say: 'Estimates and quotes go out professionally, and your client can accept them online. An accepted estimate turns into an invoice without retyping anything.',
        steps: [{ wait: 1200 }, { scroll: 340 }, { wait: 1000 }, { scroll: 'top' }],
    },
    {
        id: 'proposals', title: 'Proposals', path: '/crm/proposals',
        say: 'Proposals let you present your offer with a rich document and send it to a lead or a client, then follow whether it was opened and accepted.',
        steps: [{ wait: 1200 }, { scroll: 300 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'contracts', title: 'Contracts', path: '/crm/contracts',
        say: 'Contracts are written, sent and signed online. You always know which contracts are signed, which are waiting, and when they expire.',
        steps: [{ wait: 1200 }, { scroll: 300 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'purchase-orders', title: 'Purchase orders', path: '/crm/purchase-orders',
        say: 'Purchase orders keep your supplier side organised, with the same clean documents and printing.',
        steps: [{ wait: 1200 }, { scroll: 280 }, { wait: 800 }, { scroll: 'top' }],
    },
    {
        id: 'payments', title: 'Payments', path: '/crm/payments',
        say: 'Every payment you receive is recorded against its invoice, with the payment method and the bank account. Payment methods carry their own bank details, and you can reorder them by dragging.',
        steps: [{ wait: 1200 }, { scroll: 320 }, { wait: 1000 }, { scroll: 'top' }],
    },
    {
        id: 'expenses', title: 'Expenses', path: '/crm/expenses',
        say: 'Track your expenses by category, attach the receipt or the supplier invoice as a PDF or an image, make an expense billable to a client, or repeat it every month for subscriptions and rent.',
        steps: [{ wait: 1200 }, { move: 'text:New expense' }, { wait: 900 }, { scroll: 380 }, { wait: 1000 }, { scroll: 'top' }],
    },
    {
        id: 'freelancers', title: 'Freelancers', path: '/crm/freelancers',
        say: 'Freelance jobs have their own board. Price a job with line items, quantities and taxes, track what is paid, and keep it outside your company income when it is personal work.',
        steps: [{ wait: 1400 }, { move: '.rp-face' }, { wait: 900 }],
    },
    {
        id: 'tasks', title: 'Tasks board', path: '/crm/tasks',
        say: 'The tasks board shows work by status. Each card shows the client or project as a tag, the priority in colour, the people on it and the number of comments. Drag a card to change its status.',
        steps: [{ wait: 1600 }, { move: '.rp-face' }, { wait: 900 }, { move: '.rp-face-tag' }, { wait: 900 }, { move: '.rp-pl-col:nth-child(3)' }, { wait: 900 }],
    },
    {
        id: 'task-popup', title: 'Inside a task', path: '/crm/tasks',
        say: 'Inside a task you plan the dates, assign people and followers, build a checklist where each step can have its own person and date, discuss in comments with mentions, attach files and log the time spent.',
        steps: [{ click: '.rp-face' }, { wait: 1800 }, { click: 'text:Checklist' }, { wait: 1400 }, { click: 'text:Comments' }, { wait: 1400 }, { click: 'text:Files' }, { wait: 1300 }, { click: 'text:Time' }, { wait: 1300 }, { key: 'Escape' }, { wait: 600 }],
    },
    {
        id: 'projects', title: 'Projects', path: '/crm/projects',
        say: 'Projects bring tasks, milestones, files and billing for a client together, with a scrum board when the team works in sprints.',
        steps: [{ wait: 1300 }, { scroll: 320 }, { wait: 1000 }, { scroll: 'top' }],
    },
    {
        id: 'calendar', title: 'Calendar', path: '/calendar',
        say: 'The calendar shows meetings, task deadlines and reminders in a day, week or month view. Meetings added to a lead appear here automatically, with their link and reminder.',
        steps: [{ wait: 1800 }, { move: 'text:Week' }, { wait: 900 }, { move: 'text:Month' }, { wait: 900 }],
    },
    {
        id: 'support', title: 'Support tickets', path: '/crm/tickets',
        say: 'Support tickets keep every client request in one thread, with departments, priorities and replies, so nothing is forgotten and your clients can follow their requests from their own area.',
        steps: [{ wait: 1300 }, { scroll: 300 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'chat', title: 'Team chat', path: '/crm/chat',
        say: 'A built-in team chat with direct messages and mentions, so decisions stay next to the work instead of getting lost in other apps.',
        steps: [{ wait: 1600 }, { move: 'input, textarea' }, { wait: 900 }],
    },
    {
        id: 'knowledge', title: 'Knowledge base', path: '/crm/knowledge-base',
        say: 'The knowledge base holds your procedures and answers, for your team and for your clients.',
        steps: [{ wait: 1300 }, { scroll: 280 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'reports', title: 'Reports', path: '/crm/reports',
        say: 'Reports turn your data into decisions: sales, profit and expenses, leads, support and the work done by the team.',
        steps: [{ wait: 1500 }, { scroll: 360 }, { wait: 1100 }, { scroll: 'top' }],
    },
    {
        id: 'files', title: 'Files', path: '/crm/file-manager',
        say: 'All your files live in one place, with folders, previews and sharing. Images are optimised automatically, and files can be attached to any client, task or expense.',
        steps: [{ wait: 1500 }, { scroll: 260 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'team', title: 'Team members', path: '/crm/staff',
        say: 'Manage your team: each member has a profile, a role and their own working hours. The administrator can also open the CRM as any member to give support, and go back in one click.',
        steps: [{ wait: 1400 }, { scroll: 280 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'roles', title: 'Roles & permissions', path: '/crm/roles',
        say: 'You decide who can see and do what. Create roles, switch permissions on or off feature by feature, and even choose who may edit the notes, mails and meetings of others.',
        steps: [{ wait: 1500 }, { scroll: 420 }, { wait: 1300 }, { scroll: 900 }, { wait: 1100 }, { scroll: 'top' }],
    },
    {
        id: 'settings', title: 'Settings', path: '/crm/settings',
        say: 'Everything can be adjusted to your company: currencies, taxes, numbering, email, payment methods, task statuses, languages and more. trtCRM speaks English, French, Spanish, Japanese and Arabic.',
        steps: [{ wait: 1500 }, { scroll: 360 }, { wait: 1100 }, { scroll: 'top' }],
    },
    {
        id: 'activity', title: 'Activity & notifications', path: '/crm/all-activity',
        say: 'A full activity log tells the administrator who did what and when, and notifications keep each person informed about what concerns them.',
        steps: [{ wait: 1400 }, { scroll: 300 }, { wait: 900 }, { scroll: 'top' }],
    },
    {
        id: 'outro', title: 'Thank you', path: '/dashboard',
        say: 'That was trtCRM: one place to manage clients, sell, deliver and get paid, with a client area for your customers and full control for you. Ask for a live demo, and let us set it up for your agency.',
        steps: [{ wait: 1000 }, { move: '.rp-pills' }, { wait: 1200 }],
    },
]

/** Words per second of a calm voiceover, used to size every scene so the narration fits. */
export const WORDS_PER_SECOND = 2.3
export const wordsOf = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length
/** Planned length of a scene in seconds: long enough for its voiceover and for its cursor steps. */
export const plannedSeconds = (s) => Math.max(6, Math.ceil(wordsOf(s.say) / WORDS_PER_SECOND + 1.2))

// trtCRM versions. Add a new entry at the TOP for every change we make; the first entry is the running version
// shown in the sidebar footer. Format: MAJOR.MINOR.PATCH (new feature = minor, fix = patch).
export const CHANGELOG = [
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

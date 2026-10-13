// trtCRM versions. Add a new entry at the TOP for every change we make; the first entry is the running version
// shown in the sidebar footer. Format: MAJOR.MINOR.PATCH (new feature = minor, fix = patch).
export const CHANGELOG = [
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

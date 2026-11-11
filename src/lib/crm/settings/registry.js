/**
 * Platform settings, modelled on Perfex "Setup → Settings". Every value is one row of the options table (name → string),
 * so existing Perfex data keeps working. The same registry drives the API validation and the settings screens.
 *
 * Field types: text, number, textarea, html, switch, select, password (write-only), image, taxes, csv
 * `soon: true` = saved now, used by a screen/feature that is not built yet (shown with a "Soon" chip).
 * `soon: 'account'` = needs an outside account (Google, Microsoft, reCAPTCHA, Pusher, AI keys): the fields are ready, enter the keys when you have them.
 */
const f = (key, label, type = 'text', o = {}) => ({ key, label, type, ...o })
const yes = (key, label, o = {}) => f(key, label, 'switch', o)
const sel = (key, label, options, o = {}) => f(key, label, 'select', { options: options.map((x) => (Array.isArray(x) ? { value: x[0], label: x[1] } : { value: x, label: x })), ...o })

export const DATE_FORMATS = [['d/m/Y|%d/%m/%Y', '31/12/2026 (day/month/year)'], ['m/d/Y|%m/%d/%Y', '12/31/2026 (month/day/year)'], ['Y-m-d|%Y-%m-%d', '2026-12-31'], ['d-m-Y|%d-%m-%Y', '31-12-2026'], ['d.m.Y|%d.%m.%Y', '31.12.2026'], ['d M Y|%d %b %Y', '31 Dec 2026'], ['M d, Y|%b %d, %Y', 'Dec 31, 2026']]
export const NUMBER_FORMATS = [['1', 'Number only: PREFIX0012'], ['2', 'Number / year: PREFIX0012/2026'], ['3', 'Year / number: PREFIX2026/0012'], ['4', 'Number / month / year: PREFIX0012/12/2026']]
export const LANGUAGES = ['english', 'french', 'arabic', 'spanish', 'german', 'italian', 'portuguese', 'dutch', 'turkish', 'russian', 'japanese']
export const RESET = [['never', 'Never (one running number)'], ['yearly', 'Every year (back to 1 on 1 January)'], ['monthly', 'Every month (back to 1 on the 1st)']]
export const PAGE_FORMATS = ['A4-PORTRAIT', 'A4-LANDSCAPE', 'A5-PORTRAIT', 'LETTER-PORTRAIT', 'LETTER-LANDSCAPE'].map((v) => [v, v.replace('-', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())])
export const PDF_FONTS = [['freesans', 'Sans-serif (clean)'], ['helvetica', 'Helvetica'], ['dejavusans', 'DejaVu Sans'], ['times', 'Serif (Times)'], ['courier', 'Monospace']]

// Reusable blocks for Invoice / Estimate / Proposal / Purchase order / Credit note numbering
const numbering = (name, prefixKey, prefixDefault, nextKey, formatKey, resetKey, delKey, decKey) => ({
    title: 'Numbering',
    desc: `How ${name} numbers look and count.`,
    fields: [
        f(prefixKey, 'Prefix', 'text', { ph: prefixDefault, hint: 'Shown before the number, for example "FA -"', max: 20 }),
        sel(formatKey, 'Number format', NUMBER_FORMATS, { default: '1' }),
        f(nextKey, 'Next number', 'number', { min: 1, hint: 'The number given to the next one. Change it to start again from 1.' }),
        sel(resetKey, 'Start again from 1', RESET, { default: 'never', hint: 'Applied automatically when a new one is created.' }),
        yes(delKey, 'Allow deleting only the last one', { hint: 'Prevents holes in the numbering.' }),
        yes(decKey, 'Take the number back when the last one is deleted', { hint: 'The next number goes back by one (only when the deleted one was the last).' }),
    ],
})

export const SECTIONS = [
    { section: 'General', groups: ['general', 'company', 'localization', 'email'] },
    { section: 'Billing', groups: ['sales_general', 'invoices', 'estimates', 'proposals', 'purchase_orders', 'credit_notes'] },
    { section: 'Configure features', groups: ['clients', 'tasks', 'tickets', 'leads'] },
    { section: 'Integrations', groups: ['signin', 'messaging'] },
    { section: 'More', groups: ['calendar', 'ai', 'pdf', 'e_sign'] },
    { section: 'Automation', groups: ['cronjob'] },
]

export const GROUPS = {
    general: {
        label: 'General', icon: 'TbAdjustmentsHorizontal', desc: 'Name, logos and files of the platform',
        cards: [
            { title: 'Working hours and notification hours', desc: 'The CRM only disturbs people during the notification hours (company time zone, Settings → Localization): pushes on phones and computers, Telegram / WhatsApp messages and the reminders. What happens outside them waits and is sent when the hours open (a long wait becomes one message: "you have N notifications waiting"). The bell always shows everything. The working day sets the time given to "due today" items instead of midnight.', fields: [
                yes('notify_hours_on', 'Notify only during the notification hours', { default: '1', cardToggle: true }),
                f('notify_hours_from', 'Notify from (hour)', 'number', { min: 0, max: 23, default: '10' }),
                f('notify_hours_to', 'Notify until (hour)', 'number', { min: 1, max: 24, default: '17', hint: '17 = until 17:00.' }),
                f('work_hours_from', 'Working day starts (hour)', 'number', { min: 0, max: 23, default: '9' }),
                f('work_hours_to', 'Working day ends (hour)', 'number', { min: 1, max: 24, default: '18' }),
                f('digest_hour', 'Daily summary email at (hour)', 'number', { min: 0, max: 23, default: '8', hint: 'For the team members who chose "One summary a day" in their profile (Notifications): one email at this hour of the company clock, only when there is something to tell.' }),
            ] },
            { title: 'Platform', desc: 'Shown in the menu, on the sign-in page and in the browser tab.', fields: [
                f('platform_name', 'Platform name', 'text', { max: 60, ph: 'trtCRM', hint: 'Shown in the browser tab and on the sign-in page.' }),
                f('companyname', 'Company brand name', 'text', { max: 80, hint: 'Used in emails and documents: {companyname}.' }),
                f('main_domain', 'Main website', 'text', { ph: 'https://', url: true }),
                f('platform_logo', 'Platform logo', 'image', { hint: 'Menu and sign-in page, on light backgrounds.' }),
                f('platform_logo_dark', 'Platform logo (dark mode)', 'image', { hint: 'A light version for dark backgrounds. Optional.' }),
                f('favicon', 'Favicon', 'image', { hint: 'The small icon in the browser tab. Square works best.', preset: 'favicon' }),
            ] },
            { title: 'Document logos', desc: 'Printed on invoices, estimates and the other documents. Leave a specific logo empty to use the documents logo.', fields: [
                f('company_logo_url', 'Documents logo', 'image', { hint: 'Used everywhere unless a document has its own below.' }),
                f('invoice_logo_url', 'Invoice logo', 'image'),
                f('estimate_logo_url', 'Estimate logo', 'image'),
                f('proposal_logo_url', 'Proposal logo', 'image'),
                f('contract_logo_url', 'Contract logo', 'image'),
                f('purchase_order_logo_url', 'Purchase order logo', 'image'),
                f('credit_note_logo_url', 'Credit note logo', 'image'),
                f('company_signature_url', 'Signature', 'image', { preset: 'signature', hint: 'For documents that show a signature (see PDF settings).' }),
            ] },
            { title: 'Uploads: file types and sizes', desc: 'What people can upload anywhere in the CRM (tickets, tasks, chat, notes, library, client portal). Pictures are always optimised to WebP. Dangerous types (programs, scripts) stay blocked whatever you write.', fields: [
                f('allowed_files', 'Allowed file types', 'text', { hint: 'Extensions separated by commas, for example .pdf,.docx,.png,.jpg. Empty = every supported type: images, PDF, Word/Excel/PowerPoint and OpenDocument, CSV, TXT, RTF, ZIP/RAR/7Z, MP4/MOV/WEBM, MP3/WAV/M4A.', ph: '.png,.jpg,.pdf,.docx' }),
                f('media_max_image_size_upload', 'Largest picture (MB)', 'number', { min: 1, max: 100, default: '20' }),
                f('media_max_file_size_upload', 'Largest document or archive (MB)', 'number', { min: 1, max: 200, default: '50' }),
                f('media_max_video_size_upload', 'Largest video or audio (MB)', 'number', { min: 1, max: 500, default: '50', hint: 'Empty = same as documents. Keep it low: files are sent through the server.' }),
            ] },
            { title: 'Interface', fields: [
                f('tables_pagination_limit', 'Rows per page in tables', 'number', { min: 5, max: 200 }),
                f('delete_activity_log_older_then', 'Delete the activity log after (months)', 'number', { min: 0, max: 120, hint: '0 keeps everything. Cleaned by the daily cron job.' }),
            ] },
            { title: 'Lists managed from the menu', desc: 'Tags and countries are managed from the menu, Setup.', links: [['Tags', '/crm/tags'], ['Countries', '/crm/countries']] },
        ],
    },
    company: {
        label: 'Company information', icon: 'TbBuilding', desc: 'Your details, and merge terms to reuse them anywhere',
        cards: [
            { title: 'Company', desc: 'Used on documents and emails.', fields: [
                f('invoice_company_name', 'Company name', 'text', { token: 'company_name' }),
                f('invoice_company_address', 'Address', 'text', { token: 'address' }),
                f('invoice_company_city', 'City', 'text', { token: 'city' }),
                f('company_state', 'State / region', 'text', { token: 'state' }),
                f('invoice_company_postal_code', 'Postal code', 'text', { token: 'zip_code' }),
                f('invoice_company_country_code', 'Country code', 'text', { token: 'country_code', ph: 'MA', max: 3 }),
                f('invoice_company_phonenumber', 'Phone', 'text', { token: 'phone' }),
                f('company_email', 'Email', 'text', { token: 'email' }),
                f('company_vat', 'VAT / tax number', 'text', { token: 'vat_number' }),
            ] },
            { title: 'Legal identifiers', desc: 'Morocco and more. Add the ones you use; empty ones stay out of the merge terms.', fields: [
                f('company_ice', 'ICE', 'text', { token: 'company_ice' }),
                f('company_if', 'IF (identifiant fiscal)', 'text', { token: 'company_if' }),
                f('company_rc', 'RC', 'text', { token: 'company_rc' }),
                f('company_patente', 'Patente / TP', 'text', { token: 'company_patente' }),
                f('company_cnss', 'CNSS', 'text', { token: 'company_cnss' }),
                f('company_capital', 'Share capital', 'text', { token: 'company_capital', ph: '100 000 MAD' }),
                f('company_bank', 'Bank', 'text', { token: 'company_bank' }),
                f('company_rib', 'RIB / IBAN', 'text', { token: 'company_rib' }),
                f('company_swift', 'SWIFT / BIC', 'text', { token: 'company_swift' }),
            ] },
            { title: 'Company block on documents', desc: 'Free text printed at the top of invoices, estimates and other documents. Use merge terms; click one to insert it.', panel: 'companyFormat', fields: [
                f('company_info_format', 'Company information format', 'html', { rows: 8 }),
            ] },
        ],
    },
    localization: {
        label: 'Localization', icon: 'TbWorld', desc: 'Date, time, language and time zone',
        cards: [
            { title: 'Format', fields: [
                sel('dateformat', 'Date format', DATE_FORMATS, { default: 'd/m/Y|%d/%m/%Y' }),
                sel('time_format', 'Time format', [['24', '24 hours (14:30)'], ['12', '12 hours (2:30 PM)']], { default: '24' }),
                f('default_timezone', 'Default time zone', 'timezone'),
            ] },
            { title: 'Working hours', desc: 'The working week the Work hours page measures against: hours per day, without the break. The time is the company clock above.', fields: [
                f('work_start', 'Day starts at', 'text', { default: '09:00', hint: 'HH:MM, for example 09:00. Opening the CRM after this time plus the grace below counts as late.' }),
                f('work_late_after', 'Grace before late (minutes)', 'number', { default: 15, min: 0, max: 240 }),
                f('work_hours_mon', 'Monday (hours)', 'number', { default: 8, min: 0, max: 24 }),
                f('work_hours_tue', 'Tuesday (hours)', 'number', { default: 8, min: 0, max: 24 }),
                f('work_hours_wed', 'Wednesday (hours)', 'number', { default: 8, min: 0, max: 24 }),
                f('work_hours_thu', 'Thursday (hours)', 'number', { default: 8, min: 0, max: 24 }),
                f('work_hours_fri', 'Friday (hours)', 'number', { default: 8, min: 0, max: 24 }),
                f('work_hours_sat', 'Saturday (hours)', 'number', { default: 4, min: 0, max: 24 }),
                f('work_hours_sun', 'Sunday (hours)', 'number', { default: 0, min: 0, max: 24 }),
            ] },
            { title: 'Language', fields: [
                f('active_languages', 'Languages in use', 'languages', { default: 'english,french,spanish,japanese,arabic', options: LANGUAGES.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) })), hint: 'Email templates exist in these languages only. Add a language and its templates are created from the English ones, ready to translate.' }),
                sel('active_language', 'Default language', LANGUAGES.map((l) => [l, l[0].toUpperCase() + l.slice(1)]), { default: 'english' }),
                yes('disable_language', 'Disable language selection for users'),
                yes('output_client_pdfs_from_admin_area_in_client_language', 'Print client documents in the client language', { hint: 'When a client has a default language, their documents use it.' }),
            ] },
        ],
    },
    email: {
        label: 'Email', icon: 'TbMail', desc: 'How the platform sends email',
        cards: [
            { title: 'Mail server', panel: 'smtp' },
            { title: 'Sending options', fields: [
                sel('email_protocol', 'Send with', [['smtp', 'SMTP server'], ['sendmail', 'Sendmail on the server']], { default: 'smtp' }),
                yes('mail_tracking', 'Tell me when a mail to a lead or a customer is opened or a link is clicked', { default: '1', hint: 'A tiny invisible picture and tracked links are added to the mails sent from a lead or a customer. The sender (and the team of a lead) is notified the first time. Mail apps that block pictures, or load them by themselves, make an open uncertain; a click is a sure sign.' }),
                f('smtp_email_charset', 'Charset', 'text', { default: 'utf-8' }),
                f('bcc_emails', 'Copy every email to (BCC)', 'text', { hint: 'One address, or several separated by commas.', emails: true }),
                f('lead_mail_senders', 'Other "send from" addresses (lead mails)', 'text', { hint: 'Addresses a lead mail can be sent from, besides hello@trtmaroc.com (always first, the default) and the staff member\'s own email. Your mail server must allow them. Separate several with commas.', emails: true }),
            ] },
            { title: 'Signature & design', desc: 'Added to every email. The design replaces the header/footer around each message.', panel: 'emailDesign', fields: [
                f('email_signature', 'Signature (HTML)', 'html', { rows: 4 }),
                f('email_header', 'Header (HTML)', 'html', { rows: 8 }),
                f('email_footer', 'Footer (HTML)', 'html', { rows: 8 }),
            ] },
        ],
    },
    signin: {
        label: 'Sign-in & API', icon: 'TbPlugConnected', desc: 'Google and GitHub sign-in, API keys and the apps that sign in with this CRM',
        cards: [
            { title: 'Sign in with Google or GitHub', desc: 'Team members who already have an account here can sign in with the Google or GitHub account that uses the same email. The keys are server settings, not saved here.', panel: 'signInProviders' },
            { title: 'Two-step sign-in', desc: 'Make the second step (authenticator app or email code) compulsory. Someone the rule covers who has not turned it on can only open their profile, Security, until they do. Everybody can always turn it on themselves.', fields: [
                sel('require_2fa', 'Required for', [['', 'Nobody (optional for everyone)'], ['admins', 'Administrators'], ['sensitive', 'Administrators and people who see the vault, payments or payroll']], { default: '' }),
            ] },
            { title: 'Account requests', desc: 'When someone signs in with Google or GitHub and has no account, they can ask for one. The administrators are told and approve or refuse each request in Team. Nobody gets access before approval.', fields: [
                yes('social_signup_requests', 'Let people ask for an account with Google or GitHub', { default: '1' }),
            ] },
            { title: 'API, webhooks and sign-in apps', desc: 'Keys for other apps (Meet, forms, automations), webhooks, and the apps that sign in with this CRM.', links: [['API and webhooks', '/crm/api']] },
        ],
    },
    messaging: {
        label: 'WhatsApp & Telegram', icon: 'TbBrandWhatsapp', desc: 'Send notifications by WhatsApp and Telegram, next to email',
        cards: [
            { title: 'Telegram', desc: 'Create a bot with @BotFather and paste its token. Each person then sends /start to the bot and enters their chat id (for example from @userinfobot) in their profile.', fields: [
                yes('telegram_enabled', 'Send notifications by Telegram'),
                f('telegram_bot_token', 'Bot token', 'password'),
            ] },
            { title: 'WhatsApp (Cloud API)', desc: 'From Meta for Developers → WhatsApp → API setup: the phone number ID and a permanent access token (the App ID and App Secret are optional: they let the CRM check and renew the token). Outside a 24 hour conversation WhatsApp only delivers approved templates: give the name of a template with one body variable and its language, or leave it empty for plain messages.', fields: [
                yes('whatsapp_enabled', 'Send notifications by WhatsApp'),
                f('whatsapp_phone_number_id', 'Phone number ID', 'text'),
                f('whatsapp_waba_id', 'WhatsApp Business Account ID (optional)', 'text', { hint: 'Meta for Developers → WhatsApp → API setup, under the phone number. Lets the CRM list your approved templates and check the one below.' }),
                f('whatsapp_access_token', 'Access token', 'password'),
                f('whatsapp_app_id', 'App ID (optional)', 'text', { hint: 'Meta for Developers → your app → App settings → Basic. Not needed to send. With the App Secret it lets the CRM check the token and renew it (a 24-hour test token becomes a 60-day one).' }),
                f('whatsapp_app_secret', 'App Secret (optional)', 'password'),
                f('whatsapp_template', 'Template name (optional)', 'text'),
                f('whatsapp_template_lang', 'Template language', 'text', { default: 'en', hint: 'For example en, fr, es, ja, ar.' }),
            ] },
            { title: 'Push notifications on phones and computers', desc: 'Everybody can install the app on their phone (Android: Install; iPhone: Share → Add to Home Screen) and switch notifications on from the profile menu → Install the app. Each bell notification and each private chat message then appears on the screen of the phone, even when the app is closed. Off stops all of them.', fields: [
                yes('push_notifications', 'Send push notifications to phones and computers', { default: '1' }),
            ] },
            { title: 'Test', panel: 'channelsTest' },
        ],
    },
    sales_general: {
        label: 'General', icon: 'TbReceipt2', desc: 'Money format, taxes and totals for all documents',
        cards: [
            { title: 'Numbers & money', fields: [
                sel('decimal_separator', 'Decimal separator', [[',', 'Comma (1 234,50)'], ['.', 'Dot (1,234.50)']], { default: ',' }),
                sel('thousand_separator', 'Thousands separator', [[' ', 'Space (1 234)'], [',', 'Comma (1,234)'], ['.', 'Dot (1.234)'], ["'", "Apostrophe (1'234)"], ['', 'None (1234)']], { default: ' ' }),
                f('number_padding_prefixes', 'Zeros in document numbers', 'number', { min: 1, max: 9, default: '3', hint: '3 gives 005 or 025' }),
                yes('remove_decimals_on_zero', 'Hide decimals when they are zero', { hint: '2.00 becomes 2, 2.25 stays 2.25' }),
            ] },
            { title: 'Views by the team', desc: 'When a team member opens the public page of an invoice, estimate, proposal or contract (signed in, or from an address a team member used lately, even in a private window), it is not recorded as the client having seen it, so no "Client opened a proposal" notification.', fields: [
                yes('ignore_team_views', 'Do not count the team opening the public pages', { default: '1' }),
            ] },
            { title: 'Currencies, taxes and payment methods', desc: 'These lists are managed from the menu, Setup → Finance, so the whole team can use them.', links: [['Currencies', '/crm/currencies'], ['Taxes', '/crm/taxes'], ['Payment methods and bank accounts', '/crm/payment-modes']] },
            { title: 'Taxes', fields: [
                f('default_tax', 'Default taxes', 'taxes', { hint: 'Added to new document lines automatically.' }),
                yes('show_tax_per_item', 'Show tax per line item'),
                yes('remove_tax_name_from_item_table', 'Hide the tax name in the items table'),
                yes('items_table_amounts_exclude_currency_symbol', 'Hide the currency symbol in the items table'),
            ] },
                        { title: 'Total in words', desc: 'Prints the total in letters on documents ("Mille deux cents dirhams").', fields: [
                yes('total_to_words_enabled', 'Show the total in words'),
                yes('total_to_words_lowercase', 'Use lowercase letters'),
            ] },
            { title: 'Payroll', fields: [
                yes('payroll_in_arrears', 'Salaries are paid after the month', { default: '1', hint: 'A month shows as due from the 1st of the next month and is paid on the pay day of that month (October on 1 November, paid on the 10th). Turn off to pay and show the current month.' }),
            ] },
            { title: 'Payroll and expenses', desc: 'Salaries, advances and bonuses recorded in Payroll can also appear as expenses (category "Payroll"), so expense and profit reports include the team cost. Do not turn this on if you already enter salaries as expenses yourself.', fields: [
                yes('payroll_to_expenses', 'Record payroll payments as expenses', { hint: 'New, edited and deleted payments update their expense. Existing payments are added with the button below.' }),
            ] },
            { title: 'Existing payroll payments', desc: 'Turn the switch above on and save first. Then create the expenses of the payments already recorded in Payroll (only those that have none yet).', panel: 'payrollExpensesApply' },
            { title: 'Sales agent', fields: [yes('automatically_set_logged_in_staff_sales_agent', 'Set the signed-in person as sale agent', { default: '1' })] },
        ],
    },
    invoices: {
        label: 'Invoices', icon: 'TbFileInvoice', desc: 'Numbering, defaults and what clients see',
        cards: [
            numbering('invoice', 'invoice_prefix', 'FA -', 'next_invoice_number', 'invoice_number_format', 'invoice_number_reset', 'delete_only_on_last_invoice', 'invoice_number_decrement_on_delete'),
            { title: 'Existing invoices', desc: 'Save the numbering above first. Then give every invoice the same prefix and number format, so they all read alike (for example FA - 101 - 10 - 2026). The numbers themselves do not change.', panel: 'invoiceFormatApply' },
            { title: 'Defaults for new invoices', fields: [
                f('invoice_due_after', 'Due after (days)', 'number', { min: 0, max: 365, default: '7', hint: 'The due date a new invoice starts with: the day it is created plus these days.' }),
                f('predefined_clientnote_invoice', 'Client note', 'textarea', { rows: 3 }),
                f('predefined_terms_invoice', 'Terms & conditions', 'textarea', { rows: 8 }),
            ] },
            { title: 'On the invoice', fields: [
                yes('show_sale_agent_on_invoices', 'Show the sale agent'),
                yes('show_project_on_invoice', 'Show the project name'),
                yes('show_total_paid_on_invoice', 'Show the total paid'),
                yes('show_amount_due_on_invoice', 'Show the amount due'),
                yes('attach_invoice_to_payment_receipt_email', 'Attach the invoice PDF to payment receipt emails'),
            ] },
            { title: 'Client access', fields: [
                yes('exclude_invoice_from_client_area_with_draft_status', 'Hide draft invoices from clients', { hint: 'Always on for the public invoice link.' }),
                yes('allow_staff_view_invoices_assigned', 'Staff can see invoices they are assigned to', { default: '1' }),
            ] },
        ],
    },
    estimates: {
        label: 'Estimates', icon: 'TbFileDescription', desc: 'Numbering, defaults and client answers',
        cards: [
            numbering('estimate', 'estimate_prefix', 'DE -', 'next_estimate_number', 'estimate_number_format', 'estimate_number_reset', 'delete_only_on_last_estimate', 'estimate_number_decrement_on_delete'),
            { title: 'Defaults for new estimates', fields: [
                f('estimate_due_after', 'Valid for (days)', 'number', { min: 0, max: 365, default: '7', hint: 'The “valid until” date a new estimate starts with: the day it is created plus these days.' }),
                f('predefined_clientnote_estimate', 'Client note', 'textarea', { rows: 3 }),
                f('predefined_terms_estimate', 'Terms & conditions', 'textarea', { rows: 6 }),
            ] },
            { title: 'Client answers', fields: [
                yes('estimate_auto_convert_to_invoice_on_client_accept', 'Create the invoice automatically when the client accepts', { hint: 'A draft-free, unpaid invoice with the same lines.' }),
                yes('exclude_estimate_from_client_area_with_draft_status', 'Hide draft estimates from clients'),
                yes('show_sale_agent_on_estimates', 'Show the sale agent on the document'),
                yes('show_project_on_estimate', 'Show the project name on the document'),
            ] },
        ],
    },
    proposals: {
        label: 'Proposals', icon: 'TbPresentation', desc: 'Offers sent to clients and leads',
        cards: [
            { title: 'Numbering', fields: [
                f('proposal_number_prefix', 'Prefix', 'text', { max: 20, hint: 'The proposal number is its running number after this prefix.' }),
            ] },
            { title: 'Defaults', fields: [
                f('proposal_due_after', 'Open for (days)', 'number', { min: 0, max: 365, default: '7', hint: 'The “open until” date a new proposal starts with: the day it is created plus these days.' }),
            ] },
            { title: 'Client answers', fields: [
                yes('proposal_auto_convert_to_invoice_on_client_accept', 'Create an invoice automatically when the client accepts', { hint: 'Only for proposals made for a client (not a lead).' }),
                yes('exclude_proposal_from_client_area_with_draft_status', 'Hide draft proposals from clients'),
                yes('show_project_on_proposal', 'Show the project name on the document'),
                yes('allow_staff_view_proposals_assigned', 'Staff can see proposals they are assigned to', { default: '1' }),
            ] },
        ],
    },
    purchase_orders: {
        label: 'Purchase orders', icon: 'TbShoppingCart', desc: 'Bon de commande: numbering and defaults',
        cards: [
            numbering('purchase order', 'purchase_order_prefix', 'BC -', 'next_purchase_order_number', 'purchase_order_number_format', 'purchase_order_number_reset', 'delete_only_on_last_purchase_order', 'purchase_order_number_decrement_on_delete'),
            { title: 'Defaults for new purchase orders', fields: [
                f('purchase_order_due_after', 'Delivery expected after (days)', 'number', { min: 0, max: 365 }),
                f('predefined_clientnote_purchase_order', 'Note', 'textarea', { rows: 3 }),
                f('predefined_terms_purchase_order', 'Terms & conditions', 'textarea', { rows: 6 }),
            ] },
        ],
    },
    credit_notes: {
        label: 'Credit notes', icon: 'TbReceiptRefund', desc: 'Numbering and defaults',
        cards: [
            numbering('credit note', 'credit_note_prefix', 'CN-', 'next_credit_note_number', 'credit_note_number_format', 'credit_note_number_reset', 'delete_only_on_last_credit_note', 'credit_note_number_decrement_on_delete'),
            { title: 'Defaults', fields: [
                f('predefined_clientnote_credit_note', 'Client note', 'textarea', { rows: 3 }),
                f('predefined_terms_credit_note', 'Terms & conditions', 'textarea', { rows: 5 }),
                yes('show_project_on_credit_note', 'Show the project name'),
            ] },
        ],
    },
    clients: {
        label: 'Clients', icon: 'TbUsers', desc: 'Client information, access and custom fields',
        cards: [
            { title: 'Client block on documents', desc: 'How the client appears on invoices and estimates. Click a merge term to insert it.', panel: 'customerFormat', fields: [f('customer_info_format', 'Client information format', 'html', { rows: 7 })] },
            { title: 'Client area', desc: 'The sections clients see after signing in. Each client can also be limited on its own (open the client, Edit → Client area access).', fields: [
                yes('portal_section_invoices', 'Invoices', { default: '1' }), yes('portal_section_estimates', 'Estimates', { default: '1' }), yes('portal_section_proposals', 'Proposals', { default: '1' }),
                yes('portal_section_contracts', 'Contracts', { default: '1' }), yes('portal_section_projects', 'Projects', { default: '1' }), yes('portal_section_support', 'Support', { default: '1' }), yes('portal_section_ideas', 'Ideas', { default: '1', hint: 'The ideas the team proposes to the client, with its answer.' }), yes('portal_section_requests', 'Requests', { default: '1', hint: 'The errors, integrations and changes the client asks for, and how they are followed.' }), yes('portal_section_reports', 'Reports & Strategies', { default: '1', hint: 'The reports and strategies the team shares with the client, with its answer.' }),
            ] },
            { title: 'Idea categories', desc: 'The categories of the ideas proposed to clients (Grow the business, Save money...) are managed from the menu, Customers.', links: [['Idea categories', '/crm/idea-categories']] },
            { title: 'Rules', fields: [
                yes('company_is_required', 'Company name is required'),
                yes('company_requires_vat_number_field', 'The VAT / ICE field is required'),
            ] },
            { title: 'Permissions & authorisations', panel: 'clientPermissions' },
            { title: 'Custom fields', desc: 'Extra fields on clients. Each one has a merge term you can use in documents, for example {cf_1}.', panel: 'customFields' },
        ],
    },
    tasks: {
        label: 'Tasks', icon: 'TbChecklist', desc: 'Defaults and timers',
        cards: [
            { title: 'New tasks', fields: [
                yes('new_task_auto_assign_current_member', 'Assign the creator automatically', { default: '1' }),
                yes('new_task_auto_follower_current_member', 'Add the creator as a follower'),
                yes('new_task_follow_super_admin', 'Add the Super Admin(s) as followers', { default: '1' }),
                yes('task_biillable_checked_on_creation', 'Billable by default'),
                sel('default_task_priority', 'Default priority', [['1', 'Low'], ['2', 'Medium'], ['3', 'High'], ['4', 'Urgent']], { default: '2' }),
            ] },
            { title: 'Statuses', desc: 'The columns of the Tasks board and the names you see on every task are managed from the menu.', links: [['Task statuses', '/crm/task-statuses']] },
            { title: 'Timers', fields: [
                yes('auto_stop_tasks_timers_on_new_timer', 'Stop other timers when one starts'),
                yes('timer_started_change_status_in_progress', 'Move the task to In progress when a timer starts', { default: '1' }),
                sel('round_off_task_timer_option', 'Round timers', [['0', 'Up'], ['1', 'Down'], ['2', 'Nearest']], { default: '2' }),
                f('round_off_task_timer_time', 'Round to (minutes)', 'number', { min: 0 }),
            ] },
            { title: 'Team growth: monthly prime for certificates', desc: 'In one calendar month a member who passes 1 or 2 certificates earns the first amount, 3 or more the second amount, and nobody earns more than the ceiling (the prime and the trophy prizes together). Only certificates and language exams count, approved by a manager before the exam, with the proof attached and verified by another manager; the same certificate counts once.', fields: [
                f('grow_prime_tier1', 'Prime for 1 to 2 certificates in a month (MAD)', 'number', { min: 0, max: 100000, default: '200' }),
                f('grow_prime_tier2_from', 'Certificates needed for the second amount', 'number', { min: 2, max: 50, default: '3' }),
                f('grow_prime_tier2', 'Prime from that number of certificates (MAD)', 'number', { min: 0, max: 100000, default: '500' }),
                f('grow_prime_cap', 'Most one person can earn in a month (MAD)', 'number', { min: 0, max: 100000, default: '500', hint: 'The prime and the trophy prizes together. A prize above the ceiling waits for the next month.' }),
                f('grow_prime_max_count', 'Certificates counted per month, at most', 'number', { min: 1, max: 50, default: '5' }),
                f('grow_prime_min_days', 'Days between creating a goal and its result, at least', 'number', { min: 0, max: 365, default: '7', hint: 'A goal added and passed the same day is not a certificate someone studied for.' }),
            ] },
            { title: 'Access', fields: [
                yes('client_staff_add_edit_delete_task_comments_first_hour', 'Comments can only be changed during the first hour'),
                f('tasks_kanban_limit', 'Cards per column on the board', 'number', { min: 5 }),
            ] },
        ],
    },
    tickets: {
        label: 'Support', icon: 'TbLifebuoy', desc: 'Tickets, statuses and rules',
        cards: [
            { title: 'Ticket rules', fields: [
                yes('services', 'Use services on tickets', { soon: true }),
                yes('automatically_assign_ticket_to_first_staff_responding', 'Assign to the first person who replies', { default: '1' }),
                yes('staff_access_only_assigned_departments', 'Staff only see tickets of their departments'),
                yes('ticket_replies_order', 'Newest replies first'),
            ] },
            { title: 'Permissions', fields: [
                yes('allow_non_admin_members_to_delete_tickets_and_replies', 'Staff can delete tickets and replies'),
            ] },
            { title: 'Attachments & email', fields: [
                f('maximum_allowed_ticket_attachments', 'Attachments per ticket', 'number', { min: 0, max: 20 }),
                f('ticket_attachments_file_extensions', 'Allowed extensions', 'text'),
            ] },
            { title: 'Ticket lists', desc: 'Statuses, priorities, departments, predefined replies and spam filters are managed from the menu, Support.', links: [['Ticket statuses', '/crm/ticket-statuses'], ['Priorities', '/crm/ticket-priorities'], ['Departments', '/crm/departments'], ['Predefined replies', '/crm/predefined-replies'], ['Spam filters', '/crm/spam-filters']] },
        ],
    },
    leads: {
        label: 'Leads', icon: 'TbFilter', desc: 'Statuses, sources and follow-up',
        cards: [
            { title: 'Pipeline lists', desc: 'Statuses, sources and web forms are managed from the menu, Leads.', links: [['Lead statuses', '/crm/lead-statuses'], ['Lead sources', '/crm/lead-sources'], ['Web-to-lead forms', '/crm/web-to-lead']] },
            { title: 'Rules & follow-up', fields: [
                yes('auto_assign_customer_admin_after_lead_convert', 'Make the lead owner the client admin when converted'),
                yes('lead_checklist_plain', 'Keep lead checklist items as plain lines (no task is created for each item)', { hint: 'Off: every item added in the Tasks tab of a lead becomes a real task, linked to the lead, that shows on the task board. On: items stay in the lead only.' }),
                f('leads_kanban_limit', 'Cards per column on the board', 'number', { min: 5, default: '50' }),
                sel('default_leads_kanban_sort', 'Default board order', [['dateadded', 'Date added'], ['leadorder', 'Manual'], ['lastcontact', 'Last contact']], { default: 'leadorder' }),
                sel('default_leads_kanban_sort_type', 'Order direction', [['asc', 'Ascending'], ['desc', 'Descending']], { default: 'asc' }),
            ] },
        ],
    },
    calendar: {
        label: 'Calendar', icon: 'TbCalendar', desc: 'What shows on the calendar',
        cards: [
            { title: 'Booking page: days and hours', desc: 'When visitors can book a meeting on the Meet booking page. Times are in the company time zone (Settings → Localization). Closed days and holidays are managed from the Calendar page, and are never offered.', fields: [
                f('booking_schedule', 'Weekly schedule: who takes meetings, which days and hours', 'schedule', { default: '', hint: 'Tick the days people can book, set the hours of each day (10-13,14-17 = 10:00 to 13:00 and 14:00 to 17:00, 24-hour clock) and choose the team members who take the meetings that day. A visitor is offered a time only when at least one of them is free, and the meeting is given to the one who is free. No one chosen = the team members below.' }),
                sel('booking_slot_minutes', 'Default length of a meeting', [['30', '30 minutes'], ['45', '45 minutes'], ['60', '1 hour'], ['90', '1 hour 30'], ['120', '2 hours']], { default: '60' }),
                f('appointment_min_notice_days', 'Earliest day a visitor can book, from today (days)', 'number', { min: 0, max: 30, default: '2', hint: '2 = today and tomorrow cannot be booked (nobody books the day before). 1 = from tomorrow. 0 = no limit.' }),
                f('booking_horizon_days', 'How far ahead people can book (days)', 'number', { min: 7, max: 365, default: '56' }),
            ], links: [['Closed days (holidays, one-off)', '/calendar?closed=1']] },
            { title: 'Who takes appointments and hosts meetings', desc: 'Who is told when a visitor asks for a meeting, and who may host a room on Meet. Anyone can still be invited to a meeting as a guest.', fields: [
                f('appointment_staff', 'Default team for the meetings', 'staffs', { default: '', hint: 'Used for a day with nobody chosen in the weekly schedule. They are told about each request and can accept or refuse it. Empty = every administrator.' }),
                sel('meeting_host_policy', 'Who can host or start a meeting on Meet', [['all', 'Every team member'], ['managers', 'Administrators and managers only'], ['admins', 'Administrators only']], { default: 'all', hint: 'Managers = a team member whose role is named "Manager". Others can still join with the room link as a guest or a team member.' }),
                f('meeting_host_staff', 'Also allow these team members to host', 'staffs', { default: '', hint: 'Only used when the choice above is not "Every team member".' }),
            ] },
            { title: 'View', fields: [
                sel('default_view_calendar', 'Default view', [['dayGridMonth', 'Month'], ['timeGridWeek', 'Week'], ['timeGridDay', 'Day']], { default: 'dayGridMonth' }),
                sel('calendar_first_day', 'Week starts on', [['1', 'Monday'], ['0', 'Sunday'], ['6', 'Saturday']], { default: '1' }),
                f('calendar_events_limit', 'Events per day before "+ more"', 'number', { min: 1, max: 20, default: '3' }),
            ] },
            { title: 'Show on the calendar', fields: [
                yes('show_tasks_on_calendar', 'Tasks', { default: '1' }),
                yes('show_invoices_on_calendar', 'Invoices (due dates)', { default: '1' }),
                yes('show_estimates_on_calendar', 'Estimates (expiry)', { default: '1' }),
                yes('show_proposals_on_calendar', 'Proposals (open until)', { default: '1' }),
                yes('show_contracts_on_calendar', 'Contracts (end dates)', { default: '1' }),
                yes('show_projects_on_calendar', 'Projects (deadlines)', { default: '1' }),
                yes('calendar_only_assigned_tasks', 'Only my tasks'),
            ] },
            { title: 'Reminders on the calendar', fields: [
                yes('hide_notified_reminders_from_calendar', 'Hide reminders once notified'),
                ...['lead', 'customer', 'estimate', 'invoice', 'proposal', 'expense', 'task', 'credit_note', 'ticket'].map((k) => yes(`show_${k}_reminders_on_calendar`, `${k.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())} reminders`)),
            ] },
        ],
    },
    ai: {
        label: 'AI', icon: 'TbSparkles', desc: 'API keys and models for the AI analyses (super administrator only)',
        cards: [{ title: 'AI providers', desc: 'Claude, ChatGPT, DeepSeek and OpenRouter. Keys are stored encrypted and never shown again.', panel: 'ai' }],
    },
    pdf: {
        label: 'PDF', icon: 'TbFileTypePdf', desc: 'How documents look when printed',
        cards: [
            { title: 'Layout', fields: [
                sel('pdf_font', 'Font', PDF_FONTS, { default: 'freesans' }),
                f('pdf_font_size', 'Font size', 'number', { min: 7, max: 16, default: '10' }),
                f('pdf_logo_width', 'Logo width (px)', 'number', { min: 60, max: 600, default: '220' }),
                f('pdf_table_heading_color', 'Table heading colour', 'color', { default: '#323a45' }),
                f('pdf_table_heading_text_color', 'Table heading text colour', 'color', { default: '#ffffff' }),
                yes('swap_pdf_info', 'Company details on the right, client on the left'),
                yes('show_page_number_on_pdf', 'Page numbers'),
            ] },
            { title: 'Page size', fields: ['invoice', 'estimate', 'proposal', 'payment', 'credit_note', 'contract', 'statement'].map((k) => sel(`pdf_format_${k}`, `${k.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}`, PAGE_FORMATS, { default: 'A4-PORTRAIT' })) },
            { title: 'On invoices', fields: [
                yes('show_transactions_on_invoice_pdf', 'List the payments received'),
                yes('show_status_on_pdf_ei', 'Show the status (invoices and estimates)'),
            ] },
            { title: 'Signature', desc: 'Prints the signature from General → Document logos. On: it prints once an invoice is paid or a contract is signed, never before. Off: it prints on no PDF.', fields: [yes('show_pdf_signature_invoice', 'Show the signature on invoices', { default: '1' }), yes('show_pdf_signature_contract', 'Show the signature on contracts', { default: '1' })] },
        ],
    },
    e_sign: {
        label: 'E-signature', icon: 'TbSignature', desc: 'Signing invoices, estimates, proposals and contracts',
        cards: [{ title: 'Signing', fields: [
            yes('estimate_accept_identity_confirmation', 'Estimates: ask for name, email and signature to accept'),
            yes('proposal_accept_identity_confirmation', 'Proposals: ask for name, email and signature to accept', { default: '1' }),
            f('e_sign_legal_text', 'Legal text next to the signature', 'textarea', { rows: 4, hint: 'Shown to the client when they sign.' }),
        ] }],
    },
    cronjob: {
        label: 'Cron job', icon: 'TbClockPlay', desc: 'Automatic reminders and recurring work',
        cards: [
            { title: 'Automatic tasks', section: 'Run and schedule', desc: 'Nothing is sent or changed automatically until you turn this on. Use Preview in the command section first to see what would happen.', fields: [
                yes('cron_enabled', 'Run the automatic tasks when the cron job is called', { default: '0' }),
            ] },
            { title: 'Schedule', section: 'Run and schedule', desc: 'How often the automatic tasks wake up. Each task still does its work once a day at the hour set in its own card below (tickets every time).', fields: [
                sel('cron_mode', 'Who runs it', [['built_in', 'The CRM itself (nothing to set up on the server)'], ['external', 'An external scheduler that calls the command below']], { default: 'external' }),
                f('cron_every', 'Run every', 'number', { min: 1, max: 59, default: '15', hint: 'Minutes up to 59, hours up to 23, days up to 30.' }),
                sel('cron_unit', 'Unit', [['minute', 'Minutes'], ['hour', 'Hours'], ['day', 'Days']], { default: 'minute' }),
                f('cron_at_hour', 'At (hour of day, 0–23)', 'number', { min: 0, max: 23, default: '9', hint: 'Only used when the unit is days.' }),
            ] },
            { title: 'Backups', section: 'Safety and upkeep', desc: 'Every night after 02:00 (company time) the whole database is saved to the file storage: the last 14 days and one a week for 12 weeks. It does not need the automatic tasks to be on.', fields: [
                yes('cron_job_backup', 'Back up the database every night', { default: '1', cardToggle: true }),
            ] },
            { title: 'Backup files', section: 'Safety and upkeep', panel: 'backups' },
            { title: 'Alerts', section: 'Safety and upkeep', desc: 'The administrators are told (bell, email, Telegram / WhatsApp) when a backup fails or is late, when the automatic tasks stop or report errors, and when the CRM returns a burst of server errors. The same alert is sent once an hour at most.', fields: [
                yes('alerts_enabled', 'Send alerts to the administrators', { default: '1' }),
            ] },
            { title: 'Command', section: 'Run and schedule', panel: 'cronCommand' },
            { title: 'Invoices', section: 'Money documents', desc: 'Overdue and due-soon reminders, and recurring invoices.', fields: [
                yes('cron_job_invoices', 'Run the invoice tasks', { default: '1', cardToggle: true }),
                f('invoice_auto_operations_hour', 'Run at (hour of day, 0–23)', 'number', { min: 0, max: 23, default: '9' }),
                f('invoice_due_notice_before', 'Remind this many days before the due date', 'number', { min: 0, max: 60, default: '0', hint: '0 = no reminder before the due date.' }),
                f('invoice_due_notice_resend_after', 'Remind again after (days)', 'number', { min: 0, max: 60, default: '0' }),
                f('automatically_send_invoice_overdue_reminder_after', 'First overdue reminder after (days)', 'number', { min: 0, max: 90, default: '0', hint: '0 = no overdue reminders.' }),
                f('automatically_resend_invoice_overdue_reminder_after', 'Remind again after (days)', 'number', { min: 0, max: 90, default: '0' }),
                yes('create_invoice_from_recurring_only_on_paid_invoices', 'Create the next recurring invoice only if the last one is paid'),
                sel('new_recurring_invoice_action', 'New recurring invoice', [['generate_and_send', 'Create it and email it to the client'], ['generate_unpaid', 'Create it as unpaid'], ['generate_draft', 'Create it as a draft']], { default: 'generate_unpaid' }),
            ] },
            { title: 'Estimates', section: 'Money documents', fields: [
                yes('cron_job_estimates', 'Run the estimate tasks', { default: '1', cardToggle: true }),
                f('estimates_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('send_estimate_expiry_reminder_before', 'Expiry reminder, days before', 'number', { min: 0, max: 60, default: '0', hint: '0 = no reminder.' }),
            ] },
            { title: 'Proposals', section: 'Money documents', fields: [
                yes('cron_job_proposals', 'Run the proposal tasks', { default: '1', cardToggle: true }),
                f('proposals_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('send_proposal_expiry_reminder_before', 'Expiry reminder, days before', 'number', { min: 0, max: 60, default: '0', hint: '0 = no reminder.' }),
            ] },
            { title: 'Expenses', section: 'Money documents', desc: 'Recurring expenses.', fields: [
                yes('cron_job_expenses', 'Run the expense tasks', { default: '1', cardToggle: true }),
                f('expenses_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
            ] },
            { title: 'Freelance jobs', section: 'Money documents', desc: 'Repeating freelance jobs: the next one is created when it is due.', fields: [
                yes('cron_job_freelance', 'Run the freelance tasks', { default: '1', cardToggle: true }),
                f('freelance_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
            ] },
            { title: 'Contracts', section: 'Money documents', fields: [
                yes('cron_job_contracts', 'Run the contract tasks', { default: '1', cardToggle: true }),
                f('contracts_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('contract_expiration_before', 'Expiry notice, days before', 'number', { min: 0, max: 120, default: '0', hint: '0 = no notice.' }),
            ] },
            { title: 'Tasks', section: 'Work and support', fields: [
                yes('cron_job_tasks', 'Run the task tasks', { default: '1', cardToggle: true }),
                f('tasks_reminder_notification_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('tasks_reminder_notification_before', 'Deadline reminder, days before', 'number', { min: 0, max: 30, default: '0', hint: '0 = no reminder.' }),
                f('automatically_stop_task_timer_after_hours', 'Stop forgotten timers after (hours)', 'number', { min: 0, max: 72, default: '0' }),
            ] },
            { title: 'Tickets', section: 'Work and support', fields: [
                yes('cron_job_tickets', 'Run the ticket tasks', { default: '1', cardToggle: true }),
                f('autoclose_tickets_after', 'Close tickets after no answer for (hours)', 'number', { min: 0, max: 8760, default: '0', hint: '0 = never.' }),
            ] },
            { title: 'Lead emails', section: 'Leads and growth', desc: 'Reads the mailboxes set up in Leads → Lead email integration and turns contact-form emails into leads (each mailbox has its own check interval).', fields: [
                yes('cron_job_leadmail', 'Read the lead mailboxes', { default: '1', cardToggle: true }),
            ] },
            { title: 'Note and ticket reminders', section: 'Work and support', desc: 'A note with "Remind me at" tells its owner on the bell, by email and on Telegram / WhatsApp (if set in their profile) at the first run after that time, so the automatic tasks must run often (for example every 5 minutes).', fields: [
                yes('cron_job_notereminders', 'Send the note reminders', { default: '1', cardToggle: true }),
            ] },
            { title: 'Calendar event reminders', section: 'Work and support', desc: 'At the time chosen on an event ("30 minutes before"), tells the team members of the event on the bell and on Telegram / WhatsApp, and emails the client, the lead and the guests when "Also remind the client" is on. The automatic tasks must run often (for example every 5 minutes).', fields: [
                yes('cron_job_eventreminders', 'Send the calendar event reminders', { default: '1', cardToggle: true }),
            ] },
            { title: 'Scheduled chat messages', section: 'Work and support', desc: 'Posts the messages written in Scheduled messages (once or repeating) in the team chat or as private messages, at the first run after their time, so the automatic tasks must run often (for example every 5 minutes).', fields: [
                yes('cron_job_chatschedule', 'Send the scheduled chat messages', { default: '1', cardToggle: true }),
            ] },
            { title: 'Grow routine', section: 'Leads and growth', desc: 'Once a day (and once a week, once a month) writes the ideas and advice of Grow: from the figures of the CRM, and from the AI with a search of what is new when an AI key is set. Choose what it does in Grow → Routine.', fields: [
                yes('cron_job_grow', 'Run the Grow routine', { default: '1', cardToggle: true }),
            ] },
            { title: 'Monthly team review (AI)', section: 'Leads and growth', desc: 'On the 8th of every month at 08:00 the AI reads what each team member did last month (tasks done and late, tasks made without a deadline or a supervisor, tasks closed alone, time tracked) and sends a short personal review with advice to their own chat conversation "My monthly review". Needs an AI key in Settings → AI. Send it now from Settings → AI.', fields: [
                yes('cron_job_coach', 'Send the monthly team review', { default: '1', cardToggle: true }),
            ] },
            { title: 'Scheduled lead mails', section: 'Leads and growth', desc: 'Sends the lead mail drafts that have a date and time to send automatically (Lead popup → Mails). A draft goes out at the first run after its time, so the automatic tasks must run often (for example every 5 minutes).', fields: [
                yes('cron_job_leadmailsend', 'Send the scheduled lead mails', { default: '1', cardToggle: true }),
            ] },
            { title: 'Cleanup', section: 'Safety and upkeep', desc: 'Deletes old activity log entries once a day (how old is set in Settings → General).', fields: [
                yes('cron_job_cleanup', 'Run the cleanup', { default: '1', cardToggle: true }),
            ] },
            { title: 'Recent runs', section: 'Recent runs', panel: 'cronLog' },
        ],
    },
}

export const GROUP_KEYS = Object.keys(GROUPS)

/** Every field of a group (flattened), with its card. */
export const fieldsOf = (group) => (GROUPS[group]?.cards || []).flatMap((c) => c.fields || [])
export const fieldMap = (group) => Object.fromEntries(fieldsOf(group).map((x) => [x.key, x]))
/** All keys the settings API may touch (everything else in the options table is off limits). */
export const ALL_FIELDS = Object.fromEntries(GROUP_KEYS.flatMap((g) => fieldsOf(g).map((x) => [x.key, { ...x, group: g }])))

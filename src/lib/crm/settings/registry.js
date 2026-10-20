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
    { section: 'Billing', groups: ['sales_general', 'invoices', 'estimates', 'proposals', 'purchase_orders', 'credit_notes', 'subscriptions', 'banks'] },
    { section: 'Configure features', groups: ['clients', 'tasks', 'tickets', 'leads'] },
    { section: 'Integrations', groups: ['google', 'pusher'] },
    { section: 'More', groups: ['calendar', 'ai', 'pdf', 'e_sign', 'tags'] },
    { section: 'Automation', groups: ['cronjob'] },
]

export const GROUPS = {
    general: {
        label: 'General', icon: 'TbAdjustmentsHorizontal', desc: 'Name, logos and files of the platform',
        cards: [
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
            { title: 'Files', fields: [
                f('allowed_files', 'Allowed file types', 'text', { hint: 'Extensions separated by commas, for example .pdf,.docx,.png. Anything dangerous stays blocked anyway.', ph: '.png,.jpg,.pdf,.docx' }),
                f('media_max_file_size_upload', 'Largest upload (MB)', 'number', { min: 1, max: 200, default: '50' }),
            ] },
            { title: 'Interface', fields: [
                yes('rtl_support_admin', 'Right-to-left layout in the admin area', { soon: true }),
                yes('rtl_support_client', 'Right-to-left layout in the client area', { soon: true }),
                f('tables_pagination_limit', 'Rows per page in tables', 'number', { min: 5, max: 200 }),
                f('delete_activity_log_older_then', 'Delete the activity log after (months)', 'number', { min: 0, max: 120, hint: '0 keeps everything. Cleaned by the daily cron job.' }),
            ] },
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
    banks: {
        label: 'Banks', icon: 'TbBuildingBank', desc: 'The bank accounts printed on invoices, estimates and purchase orders',
        cards: [
            { title: 'Bank accounts', desc: 'Add every account you use (name, bank, holder, RIB / IBAN, SWIFT). The default one is printed unless a client or a document has its own: choose it on the client page, or on the document itself. They fill the merge terms company_bank, company_rib, company_swift and company_bank_holder. The single Bank / RIB / SWIFT fields in Company are only used while no account exists here.', panel: 'bankAccounts' },
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
                f('smtp_email_charset', 'Charset', 'text', { default: 'utf-8' }),
                f('bcc_emails', 'Copy every email to (BCC)', 'text', { hint: 'One address, or several separated by commas.', emails: true }),
                yes('email_queue_enabled', 'Send through a queue', { soon: true }),
                yes('email_queue_skip_with_attachments', 'Do not queue emails with attachments', { soon: true }),
            ] },
            { title: 'Signature & design', desc: 'Added to every email. The design replaces the header/footer around each message.', panel: 'emailDesign', fields: [
                f('email_signature', 'Signature (HTML)', 'html', { rows: 4 }),
                f('email_header', 'Header (HTML)', 'html', { rows: 8 }),
                f('email_footer', 'Footer (HTML)', 'html', { rows: 8 }),
            ] },
            { title: 'Sign in with Google or Microsoft to send', desc: 'Send from a Gmail or Microsoft 365 mailbox instead of SMTP.', fields: [
                f('google_mail_client_id', 'Google client ID', 'text', { soon: 'account' }),
                f('google_mail_client_secret', 'Google client secret', 'password', { soon: 'account' }),
                f('microsoft_mail_client_id', 'Microsoft client ID', 'text', { soon: 'account' }),
                f('microsoft_mail_client_secret', 'Microsoft client secret', 'password', { soon: 'account' }),
                f('microsoft_mail_azure_tenant_id', 'Microsoft tenant ID', 'text', { soon: 'account' }),
            ] },
        ],
    },
    messaging: {
        label: 'WhatsApp & Telegram', icon: 'TbBrandWhatsapp', desc: 'Send notifications by WhatsApp and Telegram, next to email',
        cards: [
            { title: 'Telegram', desc: 'Create a bot with @BotFather and paste its token. Each person then sends /start to the bot and enters their chat id (for example from @userinfobot) in their profile.', fields: [
                yes('telegram_enabled', 'Send notifications by Telegram'),
                f('telegram_bot_token', 'Bot token', 'password'),
            ] },
            { title: 'WhatsApp (Cloud API)', desc: 'From Meta for Developers → WhatsApp → API setup: the phone number ID and a permanent access token. Outside a 24 hour conversation WhatsApp only delivers approved templates: give the name of a template with one body variable and its language, or leave it empty for plain messages.', fields: [
                yes('whatsapp_enabled', 'Send notifications by WhatsApp'),
                f('whatsapp_phone_number_id', 'Phone number ID', 'text'),
                f('whatsapp_access_token', 'Access token', 'password'),
                f('whatsapp_template', 'Template name (optional)', 'text'),
                f('whatsapp_template_lang', 'Template language', 'text', { default: 'en', hint: 'For example en, fr, es, ja, ar.' }),
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
            { title: 'Currencies', desc: 'Currency symbol, and whether it goes before or after the amount (prefix / suffix).', panel: 'currencies' },
            { title: 'Taxes', fields: [
                f('default_tax', 'Default taxes', 'taxes', { hint: 'Added to new document lines automatically.' }),
                yes('show_tax_per_item', 'Show tax per line item'),
                yes('remove_tax_name_from_item_table', 'Hide the tax name in the items table'),
                yes('items_table_amounts_exclude_currency_symbol', 'Hide the currency symbol in the items table'),
            ] },
            { title: 'Taxes list', panel: 'taxes' },
            { title: 'Total in words', desc: 'Prints the total in letters on documents ("Mille deux cents dirhams").', fields: [
                yes('total_to_words_enabled', 'Show the total in words'),
                yes('total_to_words_lowercase', 'Use lowercase letters'),
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
                f('invoice_due_after', 'Due after (days)', 'number', { min: 0, max: 365, hint: 'The due date a new invoice starts with.' }),
                f('predefined_clientnote_invoice', 'Client note', 'textarea', { rows: 3 }),
                f('predefined_terms_invoice', 'Terms & conditions', 'textarea', { rows: 8 }),
            ] },
            { title: 'On the invoice', fields: [
                yes('show_sale_agent_on_invoices', 'Show the sale agent'),
                yes('show_project_on_invoice', 'Show the project name'),
                yes('show_total_paid_on_invoice', 'Show the total paid'),
                yes('show_credits_applied_on_invoice', 'Show credits applied', { soon: true }),
                yes('show_amount_due_on_invoice', 'Show the amount due'),
                yes('attach_invoice_to_payment_receipt_email', 'Attach the invoice PDF to payment receipt emails'),
            ] },
            { title: 'Client access', fields: [
                yes('view_invoice_only_logged_in', 'Clients must be signed in to see an invoice', { soon: true, hint: 'Needs the client portal, which is not built yet. Links with the secret key work for now.' }),
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
                f('estimate_due_after', 'Valid for (days)', 'number', { min: 0, max: 365 }),
                f('predefined_clientnote_estimate', 'Client note', 'textarea', { rows: 3 }),
                f('predefined_terms_estimate', 'Terms & conditions', 'textarea', { rows: 6 }),
                f('estimates_pipeline_limit', 'Pipeline limit per status', 'number', { min: 1, soon: true }),
            ] },
            { title: 'Client answers', fields: [
                yes('estimate_auto_convert_to_invoice_on_client_accept', 'Create the invoice automatically when the client accepts', { hint: 'A draft-free, unpaid invoice with the same lines.' }),
                yes('view_estimate_only_logged_in', 'Clients must be signed in to see an estimate', { soon: true }),
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
                f('proposal_due_after', 'Open for (days)', 'number', { min: 0, max: 365 }),
                f('proposal_info_format', 'Proposal details block (PDF and page)', 'textarea', { rows: 6, soon: true }),
                f('proposals_pipeline_limit', 'Pipeline limit per status', 'number', { min: 1, soon: true }),
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
    subscriptions: {
        label: 'Subscriptions', icon: 'TbRepeat', desc: 'Recurring billing display',
        cards: [{ title: 'Subscriptions', fields: [
            yes('show_subscriptions_in_customers_area', 'Show subscriptions in the client area', { soon: true }),
            sel('after_subscription_payment_captured', 'After a payment is captured', [['nothing', 'Do nothing'], ['mark_paid', 'Mark the invoice as paid']], { default: 'mark_paid', soon: true }),
        ] }],
    },
    clients: {
        label: 'Clients', icon: 'TbUsers', desc: 'Client information, access and custom fields',
        cards: [
            { title: 'Client block on documents', desc: 'How the client appears on invoices and estimates. Click a merge term to insert it.', panel: 'customerFormat', fields: [f('customer_info_format', 'Client information format', 'html', { rows: 7 })] },
            { title: 'Client area', desc: 'The sections clients see after signing in. Each client can also be limited on its own (open the client, Edit → Client area access).', fields: [
                yes('portal_section_invoices', 'Invoices', { default: '1' }), yes('portal_section_estimates', 'Estimates', { default: '1' }), yes('portal_section_proposals', 'Proposals', { default: '1' }),
                yes('portal_section_contracts', 'Contracts', { default: '1' }), yes('portal_section_projects', 'Projects', { default: '1' }), yes('portal_section_support', 'Support', { default: '1' }),
            ] },
            { title: 'Rules', fields: [
                yes('company_is_required', 'Company name is required'),
                yes('company_requires_vat_number_field', 'The VAT / ICE field is required'),
                yes('allow_primary_contact_to_manage_other_contacts', 'The primary contact manages the other contacts', { soon: true }),
                yes('allow_primary_contact_to_view_edit_billing_and_shipping', 'The primary contact edits billing and shipping details', { soon: true }),
                yes('only_own_files_contacts', 'Contacts only see the files they uploaded', { soon: true }),
                yes('allow_contact_to_delete_files', 'Contacts can delete their own files', { soon: true }),
            ] },
            { title: 'Registration', fields: [
                yes('allow_registration', 'Let clients register themselves', { soon: true }),
                yes('customers_register_require_confirmation', 'An administrator must confirm new registrations', { soon: true }),
                yes('enable_honeypot_spam_validation', 'Spam protection on forms (honeypot)', { soon: true }),
            ] },
            { title: 'Knowledge base', fields: [yes('use_knowledge_base', 'Use the knowledge base', { soon: true }), yes('knowledge_base_without_registration', 'Visible without signing in', { soon: true })] },
            { title: 'Permissions & authorisations', panel: 'clientPermissions' },
            { title: 'Custom fields', desc: 'Extra fields on clients. Each one has a merge term you can use in documents, for example {cf_1}.', panel: 'customFields' },
        ],
    },
    tasks: {
        label: 'Tasks', icon: 'TbChecklist', desc: 'Defaults and timers',
        cards: [
            { title: 'New tasks', fields: [
                yes('new_task_auto_assign_current_member', 'Assign the creator automatically'),
                yes('new_task_auto_follower_current_member', 'Add the creator as a follower'),
                yes('task_biillable_checked_on_creation', 'Billable by default'),
                sel('default_task_priority', 'Default priority', [['1', 'Low'], ['2', 'Medium'], ['3', 'High'], ['4', 'Urgent']], { default: '2' }),
                sel('default_task_status', 'Default status', [['1', 'Not started'], ['4', 'In progress'], ['3', 'Testing'], ['2', 'Awaiting feedback'], ['5', 'Complete']], { default: '1' }),
            ] },
            { title: 'Timers', fields: [
                yes('auto_stop_tasks_timers_on_new_timer', 'Stop other timers when one starts'),
                yes('timer_started_change_status_in_progress', 'Move the task to In progress when a timer starts', { default: '1' }),
                sel('round_off_task_timer_option', 'Round timers', [['0', 'Up'], ['1', 'Down'], ['2', 'Nearest']], { default: '2' }),
                f('round_off_task_timer_time', 'Round to (minutes)', 'number', { min: 0 }),
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
                yes('staff_related_ticket_notification_to_assignee_only', 'Notify only the assignee', { soon: true }),
                yes('receive_notification_on_new_ticket', 'Notify me about new tickets', { soon: true }),
                yes('receive_notification_on_new_ticket_replies', 'Notify me about client replies', { soon: true }),
                yes('staff_members_open_tickets_to_all_contacts', 'Staff can open tickets for any contact', { soon: true }),
                yes('ticket_replies_order', 'Newest replies first'),
                yes('enable_support_menu_badges', 'Show a badge on the support menu', { soon: true }),
            ] },
            { title: 'Permissions', fields: [
                yes('allow_non_admin_staff_to_delete_ticket_attachments', 'Staff can delete attachments', { soon: true }),
                yes('allow_non_admin_members_to_delete_tickets_and_replies', 'Staff can delete tickets and replies'),
                yes('allow_non_admin_members_to_edit_ticket_messages', 'Staff can edit messages', { soon: true }),
                yes('allow_customer_to_change_ticket_status', 'Clients can change the status', { soon: true }),
                yes('only_show_contact_tickets', 'Contacts only see their own tickets', { soon: true }),
                yes('disable_ticket_public_url', 'Disable the public ticket link', { soon: true }),
                yes('access_tickets_to_none_staff_members', 'Non-staff users can access tickets', { soon: true }),
            ] },
            { title: 'Attachments & email', fields: [
                f('maximum_allowed_ticket_attachments', 'Attachments per ticket', 'number', { min: 0, max: 20 }),
                f('ticket_attachments_file_extensions', 'Allowed extensions', 'text'),
                yes('email_piping_only_registered', 'Email piping: registered users only', { soon: true }),
                yes('email_piping_only_replies', 'Email piping: replies only', { soon: true }),
                yes('ticket_import_reply_only', 'Import only the new part of a reply', { soon: true }),
            ] },
            { title: 'Statuses', panel: 'ticketStatuses' },
            { title: 'Priorities', panel: 'ticketPriorities' },
            { title: 'Departments', panel: 'departments' },
            { title: 'Predefined replies', panel: 'predefinedReplies' },
            { title: 'Spam filters', panel: 'spamFilters' },
        ],
    },
    leads: {
        label: 'Leads', icon: 'TbFilter', desc: 'Statuses, sources and follow-up',
        cards: [
            { title: 'Statuses', desc: 'The columns of the lead pipeline.', panel: 'leadStatuses' },
            { title: 'Sources', desc: 'Where leads come from.', panel: 'leadSources' },
            { title: 'Rules & follow-up', fields: [
                yes('auto_assign_customer_admin_after_lead_convert', 'Make the lead owner the client admin when converted'),
                yes('lead_lock_after_convert_to_customer', 'Lock a lead after it becomes a client'),
                yes('allow_non_admin_members_to_import_leads', 'Staff can import leads', { soon: true }),
                f('leads_kanban_limit', 'Cards per column on the board', 'number', { min: 5, default: '50' }),
                sel('default_leads_kanban_sort', 'Default board order', [['dateadded', 'Date added'], ['leadorder', 'Manual'], ['lastcontact', 'Last contact']], { default: 'leadorder' }),
                sel('default_leads_kanban_sort_type', 'Order direction', [['asc', 'Ascending'], ['desc', 'Descending']], { default: 'asc' }),
            ] },
            { title: 'Web-to-lead forms', desc: 'Capture leads from your website. Automations (assign, status, notify) are set on each form.', panel: 'webToLead' },
        ],
    },
    google: {
        label: 'Google', icon: 'TbBrandGoogle', desc: 'Maps, reCAPTCHA and Calendar',
        cards: [
            { title: 'Google APIs', fields: [
                f('google_api_key', 'API key', 'password', { soon: 'account' }),
                f('google_client_id', 'Client ID', 'text', { soon: 'account' }),
                yes('enable_google_picker', 'Google Picker', { soon: 'account' }),
                f('google_calendar_main_calendar', 'Calendar ID', 'text', { soon: 'account', hint: 'The Google calendar events are shared with.' }),
            ] },
            { title: 'reCAPTCHA', fields: [
                f('recaptcha_site_key', 'Site key', 'text', { soon: 'account' }),
                f('recaptcha_secret_key', 'Secret key', 'password', { soon: 'account' }),
                f('recaptcha_ignore_ips', 'Ignored IP addresses', 'textarea', { rows: 2, soon: 'account' }),
                yes('use_recaptcha_customers_area', 'Protect client sign-in and registration', { soon: 'account' }),
            ] },
        ],
    },
    pusher: {
        label: 'Pusher.com', icon: 'TbBellRinging', desc: 'Real-time notifications',
        cards: [{ title: 'Pusher', fields: [
            f('pusher_app_id', 'App ID', 'text', { soon: 'account' }),
            f('pusher_app_key', 'App key', 'text', { soon: 'account' }),
            f('pusher_app_secret', 'App secret', 'password', { soon: 'account' }),
            yes('pusher_realtime_notifications', 'Real-time notifications', { soon: 'account' }),
            yes('desktop_notifications', 'Desktop notifications', { soon: 'account' }),
            f('auto_dismiss_desktop_notifications_after', 'Dismiss desktop notifications after (seconds)', 'number', { min: 0, soon: 'account', hint: '0 keeps them until closed.' }),
        ] }],
    },
    calendar: {
        label: 'Calendar', icon: 'TbCalendar', desc: 'What shows on the calendar',
        cards: [
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
                yes('show_pay_link_to_invoice_pdf', 'Show a "Pay online" link', { soon: true }),
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
            yes('contract_sign_identity_confirmation', 'Contracts: ask for name, email and signature to sign', { soon: true, default: '1' }),
            yes('invoice_accept_identity_confirmation', 'Invoices: ask for a signature on acknowledgement', { soon: true }),
            f('e_sign_legal_text', 'Legal text next to the signature', 'textarea', { rows: 4, hint: 'Shown to the client when they sign.' }),
        ] }],
    },
    tags: {
        label: 'Tags', icon: 'TbTags', desc: 'Labels used across the platform',
        cards: [{ title: 'Tags', panel: 'tags' }],
    },
    cronjob: {
        label: 'Cron job', icon: 'TbClockPlay', desc: 'Automatic reminders and recurring work',
        cards: [
            { title: 'Automatic tasks', desc: 'Nothing is sent or changed automatically until you turn this on. Use Preview in the command section first to see what would happen.', fields: [
                yes('cron_enabled', 'Run the automatic tasks when the cron job is called', { default: '0' }),
            ] },
            { title: 'Schedule', desc: 'How often the automatic tasks wake up. Each task still does its work once a day at the hour set in its own card below (tickets every time).', fields: [
                sel('cron_mode', 'Who runs it', [['built_in', 'The CRM itself (nothing to set up on the server)'], ['external', 'An external scheduler that calls the command below']], { default: 'external' }),
                f('cron_every', 'Run every', 'number', { min: 1, max: 59, default: '15', hint: 'Minutes up to 59, hours up to 23, days up to 30.' }),
                sel('cron_unit', 'Unit', [['minute', 'Minutes'], ['hour', 'Hours'], ['day', 'Days']], { default: 'minute' }),
                f('cron_at_hour', 'At (hour of day, 0–23)', 'number', { min: 0, max: 23, default: '9', hint: 'Only used when the unit is days.' }),
            ] },
            { title: 'Command', panel: 'cronCommand' },
            { title: 'Invoices', desc: 'Overdue and due-soon reminders, and recurring invoices.', fields: [
                yes('cron_job_invoices', 'Run the invoice tasks', { default: '1', cardToggle: true }),
                f('invoice_auto_operations_hour', 'Run at (hour of day, 0–23)', 'number', { min: 0, max: 23, default: '9' }),
                f('invoice_due_notice_before', 'Remind this many days before the due date', 'number', { min: 0, max: 60, default: '0', hint: '0 = no reminder before the due date.' }),
                f('invoice_due_notice_resend_after', 'Remind again after (days)', 'number', { min: 0, max: 60, default: '0' }),
                f('automatically_send_invoice_overdue_reminder_after', 'First overdue reminder after (days)', 'number', { min: 0, max: 90, default: '0', hint: '0 = no overdue reminders.' }),
                f('automatically_resend_invoice_overdue_reminder_after', 'Remind again after (days)', 'number', { min: 0, max: 90, default: '0' }),
                yes('create_invoice_from_recurring_only_on_paid_invoices', 'Create the next recurring invoice only if the last one is paid'),
                sel('new_recurring_invoice_action', 'New recurring invoice', [['generate_and_send', 'Create it and email it to the client'], ['generate_unpaid', 'Create it as unpaid'], ['generate_draft', 'Create it as a draft']], { default: 'generate_unpaid' }),
            ] },
            { title: 'Estimates', fields: [
                yes('cron_job_estimates', 'Run the estimate tasks', { default: '1', cardToggle: true }),
                f('estimates_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('send_estimate_expiry_reminder_before', 'Expiry reminder, days before', 'number', { min: 0, max: 60, default: '0', hint: '0 = no reminder.' }),
            ] },
            { title: 'Proposals', fields: [
                yes('cron_job_proposals', 'Run the proposal tasks', { default: '1', cardToggle: true }),
                f('proposals_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('send_proposal_expiry_reminder_before', 'Expiry reminder, days before', 'number', { min: 0, max: 60, default: '0', hint: '0 = no reminder.' }),
            ] },
            { title: 'Expenses', desc: 'Recurring expenses.', fields: [
                yes('cron_job_expenses', 'Run the expense tasks', { default: '1', cardToggle: true }),
                f('expenses_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
            ] },
            { title: 'Contracts', fields: [
                yes('cron_job_contracts', 'Run the contract tasks', { default: '1', cardToggle: true }),
                f('contracts_auto_operations_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('contract_expiration_before', 'Expiry notice, days before', 'number', { min: 0, max: 120, default: '0', hint: '0 = no notice.' }),
                f('contract_sign_reminder_every_days', 'Remind unsigned contracts every (days)', 'number', { min: 0, max: 60, default: '0', soon: true }),
            ] },
            { title: 'Tasks', fields: [
                yes('cron_job_tasks', 'Run the task tasks', { default: '1', cardToggle: true }),
                f('tasks_reminder_notification_hour', 'Run at (hour of day)', 'number', { min: 0, max: 23, default: '9' }),
                f('tasks_reminder_notification_before', 'Deadline reminder, days before', 'number', { min: 0, max: 30, default: '0', hint: '0 = no reminder.' }),
                f('automatically_stop_task_timer_after_hours', 'Stop forgotten timers after (hours)', 'number', { min: 0, max: 72, default: '0' }),
                yes('reminder_for_completed_but_not_billed_tasks', 'Remind about completed tasks that are not billed', { soon: true }),
            ] },
            { title: 'Tickets', fields: [
                yes('cron_job_tickets', 'Run the ticket tasks', { default: '1', cardToggle: true }),
                f('autoclose_tickets_after', 'Close tickets after no answer for (hours)', 'number', { min: 0, max: 8760, default: '0', hint: '0 = never.' }),
            ] },
            { title: 'Cleanup', desc: 'Deletes old activity log entries once a day (how old is set in Settings → General).', fields: [
                yes('cron_job_cleanup', 'Run the cleanup', { default: '1', cardToggle: true }),
            ] },
            { title: 'Recent runs', panel: 'cronLog' },
        ],
    },
}

export const GROUP_KEYS = Object.keys(GROUPS)

/** Every field of a group (flattened), with its card. */
export const fieldsOf = (group) => (GROUPS[group]?.cards || []).flatMap((c) => c.fields || [])
export const fieldMap = (group) => Object.fromEntries(fieldsOf(group).map((x) => [x.key, x]))
/** All keys the settings API may touch (everything else in the options table is off limits). */
export const ALL_FIELDS = Object.fromEntries(GROUP_KEYS.flatMap((g) => fieldsOf(g).map((x) => [x.key, { ...x, group: g }])))

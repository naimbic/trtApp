// Resource configs for the sales domain (see docs/perfex/ARCHITECTURE.md).
// Every key below exists on the matching Prisma model in prisma/schema/crm-sales.prisma.
// Purchasing (pur_*) tables are not typed (CrmLegacyRow), so no Purchases resources yet.

const G = 'Sales'

const sel = (pairs) => pairs.map(([value, label]) => ({ value: String(value), label }))

const INVOICE_STATUS = sel([[1, 'Unpaid'], [2, 'Paid'], [3, 'Partially paid'], [4, 'Overdue'], [5, 'Cancelled'], [6, 'Draft']])
const ESTIMATE_STATUS = sel([[1, 'Draft'], [2, 'Sent'], [3, 'Declined'], [4, 'Accepted'], [5, 'Expired']])
const PROPOSAL_STATUS = sel([[1, 'Open'], [2, 'Declined'], [3, 'Accepted'], [4, 'Sent'], [5, 'Revised'], [6, 'Draft']])
const CREDIT_NOTE_STATUS = sel([[1, 'Open'], [2, 'Closed'], [3, 'Void']])
const SUBSCRIPTION_STATUS = sel([
    ['future', 'Future'], ['active', 'Active'], ['past_due', 'Past due'], ['unpaid', 'Unpaid'],
    ['incomplete', 'Incomplete'], ['canceled', 'Cancelled'], ['incomplete_expired', 'Incomplete expired'],
])
const DISCOUNT_TYPE = sel([['before_tax', 'Before tax'], ['after_tax', 'After tax']])
const SHOW_QTY = sel([[1, 'Qty'], [2, 'Hours'], [3, 'Qty/Hours']])
const RECURRING_TYPE = sel([['day', 'Day(s)'], ['week', 'Week(s)'], ['month', 'Month(s)'], ['year', 'Year(s)']])

const statusColors = {
    invoices: { 1: 'red', 2: 'green', 3: 'orange', 4: 'red', 5: 'gray', 6: 'gray' },
    estimates: { 1: 'gray', 2: 'blue', 3: 'red', 4: 'green', 5: 'orange' },
    proposals: { 1: 'blue', 2: 'red', 3: 'green', 4: 'cyan', 5: 'orange', 6: 'gray' },
    creditNotes: { 1: 'red', 2: 'green', 3: 'gray' },
    subscriptions: { future: 'gray', active: 'green', past_due: 'orange', unpaid: 'red', incomplete: 'orange', canceled: 'gray', incomplete_expired: 'gray' },
}

const client = { key: 'clientId', label: 'Customer', type: 'relation', resource: 'clients' }
const currency = { key: 'currencyId', label: 'Currency', type: 'relation', resource: 'currencies' }
const project = { key: 'projectId', label: 'Project', type: 'relation', resource: 'projects' }
const addedFrom = { key: 'addedFrom', label: 'Added by', type: 'relation', resource: 'staff' }
const saleAgent = { key: 'saleAgentId', label: 'Sale agent', type: 'relation', resource: 'staff' }

const address = (prefix, label) =>
    ['Street', 'City', 'State', 'Zip'].map((p) => ({
        key: `${prefix}${p}`, label: `${label} ${p.toLowerCase()}`, type: p === 'Street' ? 'textarea' : 'text', section: `${label} address`,
    }))

const moneyTotals = [
    { key: 'subtotal', label: 'Subtotal', type: 'money', section: 'Totals' },
    { key: 'discountPercent', label: 'Discount %', type: 'number', section: 'Totals' },
    { key: 'discountTotal', label: 'Discount total', type: 'money', section: 'Totals' },
    { key: 'discountType', label: 'Discount type', type: 'select', options: DISCOUNT_TYPE, section: 'Totals' },
    { key: 'totalTax', label: 'Total tax', type: 'money', section: 'Totals' },
    { key: 'adjustment', label: 'Adjustment', type: 'money', section: 'Totals' },
    { key: 'total', label: 'Total', type: 'money', section: 'Totals' },
]

const numberFields = [
    { key: 'prefix', label: 'Prefix', type: 'text', section: 'Number' },
    { key: 'number', label: 'Number', type: 'number', required: true, section: 'Number' },
    { key: 'numberFormat', label: 'Number format', type: 'select', options: sel([[1, 'Number based'], [2, 'Year based']]), section: 'Number' },
]

const resources = [
    // ------------------------------------------------------------------ items
    {
        key: 'item-groups', lookup: {}, model: 'crmItemGroup', label: 'Item group', plural: 'Item groups', group: G, icon: 'TbCategory',
        feature: 'items', titleField: 'name', search: ['name'], defaultSort: { name: 'asc' },
        columns: [{ key: 'name', label: 'Name', type: 'text', link: true }],
        fields: [{ key: 'name', label: 'Name', type: 'text', required: true, section: 'General' }],
        children: [{ resource: 'items', fk: 'groupId', label: 'Items' }],
    },
    {
        key: 'items', model: 'crmItem', label: 'Item', plural: 'Items', group: G, icon: 'TbPackage',
        feature: 'items', titleField: 'description', search: ['description', 'longDescription', 'unit'],
        defaultSort: { description: 'asc' },
        columns: [
            { key: 'description', label: 'Name', type: 'text', link: true },
            { key: 'longDescription', label: 'Description', type: 'text' },
            { key: 'rate', label: 'Rate', type: 'money' },
            { key: 'taxId', label: 'Tax 1', type: 'relation', resource: 'taxes' },
            { key: 'tax2Id', label: 'Tax 2', type: 'relation', resource: 'taxes' },
            { key: 'unit', label: 'Unit', type: 'text' },
            { key: 'groupId', label: 'Group', type: 'relation', resource: 'item-groups' },
        ],
        fields: [
            { key: 'description', label: 'Name', type: 'text', required: true, section: 'General' },
            { key: 'longDescription', label: 'Long description', type: 'textarea', section: 'General' },
            { key: 'rate', label: 'Rate', type: 'money', required: true, section: 'Pricing' },
            { key: 'taxId', label: 'Tax 1', type: 'relation', resource: 'taxes', section: 'Pricing' },
            { key: 'tax2Id', label: 'Tax 2', type: 'relation', resource: 'taxes', section: 'Pricing' },
            { key: 'unit', label: 'Unit', type: 'text', section: 'Pricing' },
            { key: 'groupId', label: 'Item group', type: 'relation', resource: 'item-groups', section: 'General' },
        ],
        filters: [{ key: 'groupId', label: 'Group', type: 'relation', resource: 'item-groups' }],
    },

    // --------------------------------------------------------------- invoices
    {
        key: 'invoices', model: 'crmInvoice', label: 'Invoice', plural: 'Invoices', group: G, icon: 'TbFileInvoice',
        feature: 'invoices', titleField: 'number', search: ['prefix', 'clientNote', 'adminNote', 'deletedCustomerName', 'hash'],
        defaultSort: { date: 'desc' }, statusField: 'status', statusColors: statusColors.invoices,
        columns: [
            { key: 'number', label: 'Number', type: 'text', link: true, format: 'documentNumber' },
            { key: 'total', label: 'Amount', type: 'money' },
            { key: 'totalTax', label: 'Total tax', type: 'money' },
            { key: 'date', label: 'Date', type: 'date' },
            client,
            project,
            { key: 'dueDate', label: 'Due date', type: 'date' },
            { key: 'status', label: 'Status', type: 'select', options: INVOICE_STATUS },
            currency,
        ],
        fields: [
            client,
            { ...project, section: 'General' },
            ...numberFields,
            { key: 'date', label: 'Invoice date', type: 'date', required: true, section: 'General' },
            { key: 'dueDate', label: 'Due date', type: 'date', section: 'General' },
            { ...currency, section: 'General' },
            { key: 'status', label: 'Status', type: 'select', options: INVOICE_STATUS, section: 'General' },
            { ...saleAgent, section: 'General' },
            { key: 'allowedPaymentModes', label: 'Allowed payment modes (raw)', type: 'text', section: 'General' },
            ...moneyTotals,
            { key: 'showQuantityAs', label: 'Show quantity as', type: 'select', options: SHOW_QTY, section: 'Display' },
            { key: 'clientNote', label: 'Client note', type: 'textarea', section: 'Notes' },
            { key: 'adminNote', label: 'Admin note', type: 'textarea', section: 'Notes' },
            { key: 'terms', label: 'Terms & conditions', type: 'textarea', section: 'Notes' },
            { key: 'recurring', label: 'Repeat every', type: 'number', section: 'Recurring' },
            { key: 'recurringType', label: 'Repeat unit', type: 'select', options: RECURRING_TYPE, section: 'Recurring' },
            { key: 'customRecurring', label: 'Custom recurring', type: 'boolean', section: 'Recurring' },
            { key: 'cycles', label: 'Cycles (0 = infinite)', type: 'number', section: 'Recurring' },
            { key: 'totalCycles', label: 'Cycles done', type: 'number', section: 'Recurring' },
            { key: 'lastRecurringDate', label: 'Last recurring date', type: 'date', section: 'Recurring' },
            { key: 'isRecurringFrom', label: 'Recurred from invoice', type: 'relation', resource: 'invoices', section: 'Recurring' },
            ...address('billing', 'Billing'),
            ...address('shipping', 'Shipping'),
            { key: 'includeShipping', label: 'Include shipping', type: 'boolean', section: 'Shipping address' },
            { key: 'showShippingOnInvoice', label: 'Show shipping on invoice', type: 'boolean', section: 'Shipping address' },
            { key: 'sent', label: 'Sent', type: 'boolean', section: 'Status' },
            { key: 'dateSend', label: 'Date sent', type: 'datetime', section: 'Status' },
            { key: 'cancelOverdueReminders', label: 'Cancel overdue reminders', type: 'boolean', section: 'Status' },
            { key: 'subscriptionId', label: 'Subscription', type: 'relation', resource: 'subscriptions', section: 'Status' },
        ],
        filters: [
            { key: 'status', label: 'Status', type: 'select', options: INVOICE_STATUS },
            client, currency, project,
            { key: 'date', label: 'Date', type: 'date' },
        ],
        children: [{ resource: 'payments', fk: 'invoiceId', label: 'Payments' }],
        actions: [
            { key: 'mark-paid', label: 'Mark as paid', confirm: true },
            { key: 'record-payment', label: 'Record payment' },
            { key: 'send', label: 'Send to customer' },
            { key: 'duplicate', label: 'Copy' },
            { key: 'cancel', label: 'Cancel invoice', confirm: true },
        ],
    },
    {
        key: 'payments', model: 'crmPayment', label: 'Payment', plural: 'Payments', group: G, icon: 'TbCash',
        feature: 'payments', titleField: 'transactionId', search: ['transactionId', 'note', 'paymentMethod'],
        defaultSort: { paymentDate: 'desc' },
        columns: [
            { key: 'invoiceId', label: 'Invoice', type: 'relation', resource: 'invoices', link: true },
            { key: 'paymentModeId', label: 'Payment mode', type: 'relation', resource: 'payment-modes' },
            { key: 'transactionId', label: 'Transaction ID', type: 'text' },
            { key: 'amount', label: 'Amount', type: 'money' },
            { key: 'paymentDate', label: 'Date', type: 'date' },
        ],
        fields: [
            { key: 'invoiceId', label: 'Invoice', type: 'relation', resource: 'invoices', required: true, section: 'General' },
            { key: 'amount', label: 'Amount received', type: 'money', required: true, section: 'General' },
            { key: 'paymentDate', label: 'Payment date', type: 'date', required: true, section: 'General' },
            { key: 'paymentModeId', label: 'Payment mode', type: 'relation', resource: 'payment-modes', section: 'General' },
            { key: 'paymentMethod', label: 'Payment method', type: 'text', section: 'General' },
            { key: 'transactionId', label: 'Transaction ID', type: 'text', section: 'General' },
            { key: 'note', label: 'Note', type: 'textarea', section: 'General' },
        ],
        filters: [
            { key: 'paymentModeId', label: 'Payment mode', type: 'relation', resource: 'payment-modes' },
            { key: 'invoiceId', label: 'Invoice', type: 'relation', resource: 'invoices' },
        ],
    },

    // -------------------------------------------------------------- estimates
    {
        key: 'estimates', model: 'crmEstimate', label: 'Estimate', plural: 'Estimates', group: G, icon: 'TbFileDescription',
        feature: 'estimates', titleField: 'number', search: ['prefix', 'referenceNo', 'clientNote', 'adminNote', 'deletedCustomerName'],
        defaultSort: { date: 'desc' }, statusField: 'status', statusColors: statusColors.estimates,
        columns: [
            { key: 'number', label: 'Number', type: 'text', link: true, format: 'documentNumber' },
            { key: 'total', label: 'Amount', type: 'money' },
            { key: 'totalTax', label: 'Total tax', type: 'money' },
            client, project,
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry date', type: 'date' },
            { key: 'referenceNo', label: 'Reference #', type: 'text' },
            { key: 'status', label: 'Status', type: 'select', options: ESTIMATE_STATUS },
        ],
        fields: [
            { key: 'remindClient', label: 'Send reminders to the client', type: 'boolean', section: 'Status' },
            client,
            { ...project, section: 'General' },
            ...numberFields,
            { key: 'date', label: 'Estimate date', type: 'date', required: true, section: 'General' },
            { key: 'expiryDate', label: 'Expiry date', type: 'date', section: 'General' },
            { ...currency, section: 'General' },
            { key: 'status', label: 'Status', type: 'select', options: ESTIMATE_STATUS, section: 'General' },
            { key: 'referenceNo', label: 'Reference #', type: 'text', section: 'General' },
            { ...saleAgent, section: 'General' },
            ...moneyTotals,
            { key: 'showQuantityAs', label: 'Show quantity as', type: 'select', options: SHOW_QTY, section: 'Display' },
            { key: 'clientNote', label: 'Client note', type: 'textarea', section: 'Notes' },
            { key: 'adminNote', label: 'Admin note', type: 'textarea', section: 'Notes' },
            { key: 'terms', label: 'Terms & conditions', type: 'textarea', section: 'Notes' },
            ...address('billing', 'Billing'),
            ...address('shipping', 'Shipping'),
            { key: 'includeShipping', label: 'Include shipping', type: 'boolean', section: 'Shipping address' },
            { key: 'invoiceId', label: 'Converted to invoice', type: 'relation', resource: 'invoices', section: 'Status' },
            { key: 'invoicedDate', label: 'Invoiced date', type: 'datetime', section: 'Status' },
            { key: 'sent', label: 'Sent', type: 'boolean', section: 'Status' },
            { key: 'dateSend', label: 'Date sent', type: 'datetime', section: 'Status' },
            { key: 'acceptanceFirstname', label: 'Accepted by (first name)', type: 'text', section: 'Acceptance' },
            { key: 'acceptanceLastname', label: 'Accepted by (last name)', type: 'text', section: 'Acceptance' },
            { key: 'acceptanceEmail', label: 'Acceptance email', type: 'email', section: 'Acceptance' },
            { key: 'acceptanceDate', label: 'Acceptance date', type: 'datetime', section: 'Acceptance' },
        ],
        filters: [{ key: 'status', label: 'Status', type: 'select', options: ESTIMATE_STATUS }, client, currency],
        actions: [
            { key: 'send', label: 'Send to customer' },
            { key: 'convert-to-invoice', label: 'Convert to invoice', confirm: true },
            { key: 'duplicate', label: 'Copy' },
        ],
    },

    // -------------------------------------------------------------- proposals
    {
        key: 'proposals', model: 'crmProposal', label: 'Proposal', plural: 'Proposals', group: G, icon: 'TbFileText',
        feature: 'proposals', titleField: 'subject', search: ['subject', 'proposalTo', 'email', 'phone'],
        defaultSort: { date: 'desc' }, statusField: 'status', statusColors: statusColors.proposals,
        columns: [
            { key: 'subject', label: 'Subject', type: 'text', link: true },
            { key: 'proposalTo', label: 'To', type: 'text' },
            { key: 'total', label: 'Total', type: 'money' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'openTill', label: 'Open till', type: 'date' },
            { key: 'assignedId', label: 'Assigned', type: 'relation', resource: 'staff' },
            { key: 'status', label: 'Status', type: 'select', options: PROPOSAL_STATUS },
        ],
        fields: [
            { key: 'remindClient', label: 'Send reminders to the client', type: 'boolean', section: 'Status' },
            { key: 'subject', label: 'Subject', type: 'text', required: true, section: 'General' },
            { key: 'relType', label: 'Related', type: 'select', options: sel([['customer', 'Customer'], ['lead', 'Lead']]), required: true, section: 'General' },
            { key: 'relId', label: 'Related record', type: 'relation', resource: 'clients', section: 'General' },
            { key: 'status', label: 'Status', type: 'select', options: PROPOSAL_STATUS, section: 'General' },
            { key: 'date', label: 'Date', type: 'date', required: true, section: 'General' },
            { key: 'openTill', label: 'Open till', type: 'date', section: 'General' },
            { ...currency, section: 'General' },
            { key: 'assignedId', label: 'Assigned', type: 'relation', resource: 'staff', section: 'General' },
            { key: 'allowComments', label: 'Allow comments', type: 'boolean', section: 'General' },
            ...moneyTotals,
            { key: 'showQuantityAs', label: 'Show quantity as', type: 'select', options: SHOW_QTY, section: 'Display' },
            { key: 'proposalTo', label: 'To', type: 'text', section: 'Recipient' },
            { key: 'email', label: 'Email', type: 'email', section: 'Recipient' },
            { key: 'phone', label: 'Phone', type: 'text', section: 'Recipient' },
            { key: 'address', label: 'Address', type: 'textarea', section: 'Recipient' },
            { key: 'city', label: 'City', type: 'text', section: 'Recipient' },
            { key: 'state', label: 'State', type: 'text', section: 'Recipient' },
            { key: 'zip', label: 'Zip', type: 'text', section: 'Recipient' },
            { key: 'content', label: 'Content', type: 'richtext', section: 'Content' },
            { key: 'estimateId', label: 'Converted to estimate', type: 'relation', resource: 'estimates', section: 'Conversion' },
            { key: 'invoiceId', label: 'Converted to invoice', type: 'relation', resource: 'invoices', section: 'Conversion' },
            { key: 'dateConverted', label: 'Date converted', type: 'datetime', section: 'Conversion' },
        ],
        filters: [{ key: 'status', label: 'Status', type: 'select', options: PROPOSAL_STATUS }, { key: 'assignedId', label: 'Assigned', type: 'relation', resource: 'staff' }],
        children: [{ resource: 'proposal-comments', fk: 'proposalId', label: 'Comments' }],
        actions: [
            { key: 'send', label: 'Send to recipient' },
            { key: 'convert-to-estimate', label: 'Convert to estimate', confirm: true },
            { key: 'convert-to-invoice', label: 'Convert to invoice', confirm: true },
            { key: 'duplicate', label: 'Copy' },
        ],
    },
    {
        key: 'proposal-comments', model: 'crmProposalComment', label: 'Proposal comment', plural: 'Proposal comments', group: G, icon: 'TbMessage',
        feature: 'proposals', titleField: 'content', search: ['content'], defaultSort: { createdAt: 'desc' },
        columns: [
            { key: 'content', label: 'Comment', type: 'text' },
            { key: 'staffId', label: 'Staff', type: 'relation', resource: 'staff' },
            { key: 'createdAt', label: 'Date', type: 'datetime' },
        ],
        fields: [
            { key: 'proposalId', label: 'Proposal', type: 'relation', resource: 'proposals', required: true, section: 'General' },
            { key: 'content', label: 'Comment', type: 'textarea', required: true, section: 'General' },
        ],
        hidden: true, // only shown as a child tab of proposals
    },

    // -------------------------------------------------------------- contracts
    {
        key: 'contract-types', lookup: { orderField: 'typeOrder', colorField: 'color' }, exclusive: 'isDefault', usage: { model: 'crmContract', field: 'contractTypeId', by: 'id' },
        model: 'crmContractType', label: 'Contract type', plural: 'Contract types', group: G, icon: 'TbTags',
        feature: 'contracts', titleField: 'name', search: ['name'], defaultSort: { typeOrder: 'asc' },
        columns: [
            { key: 'name', label: 'Name', type: 'text', link: true },
            { key: 'color', label: 'Color', type: 'color' },
            { key: 'defaultMonths', label: 'Length (months)', type: 'number' },
            { key: 'isDefault', label: 'Default', type: 'boolean' },
            { key: 'isActive', label: 'Active', type: 'boolean', defaultOn: true },
        ],
        fields: [
            { key: 'name', label: 'Name', type: 'text', required: true, section: 'General' },
            { key: 'color', label: 'Color', type: 'color', section: 'General' },
            { key: 'defaultMonths', label: 'Length (months)', type: 'number', section: 'General' },
            { key: 'typeOrder', label: 'Order', type: 'number', section: 'General' },
            { key: 'isDefault', label: 'Default', type: 'boolean', section: 'General' },
            { key: 'isActive', label: 'Active', type: 'boolean', defaultOn: true, section: 'General' },
            { key: 'description', label: 'Description', type: 'textarea', section: 'General' },
        ],
        children: [{ resource: 'contracts', fk: 'contractTypeId', label: 'Contracts' }],
    },
    {
        key: 'contracts', model: 'crmContract', label: 'Contract', plural: 'Contracts', group: G, icon: 'TbFileCertificate',
        // a signed contract is final: no edit, no delete from the generic screens either
        lock: (row) => (row.signed || row.markedAsSigned ? 'A signed contract cannot be edited or deleted' : null),
        feature: 'contracts', titleField: 'subject', search: ['subject', 'description'],
        defaultSort: { dateStart: 'desc' },
        columns: [
            { key: 'subject', label: 'Subject', type: 'text', link: true },
            { key: 'clientId', label: 'Customer', type: 'relation', resource: 'clients' },
            { key: 'contractValue', label: 'Value', type: 'money' },
            { key: 'contractTypeId', label: 'Type', type: 'relation', resource: 'contract-types' },
            { key: 'dateStart', label: 'Start date', type: 'date' },
            { key: 'dateEnd', label: 'End date', type: 'date' },
            { key: 'signed', label: 'Signed', type: 'boolean' },
        ],
        fields: [
            { key: 'remindClient', label: 'Send reminders to the client', type: 'boolean', section: 'Status' },
            { key: 'subject', label: 'Subject', type: 'text', required: true, section: 'General' },
            { ...client, section: 'General' },
            { key: 'projectId', label: 'Project', type: 'relation', resource: 'projects', section: 'General' },
            { key: 'contractTypeId', label: 'Contract type', type: 'relation', resource: 'contract-types', section: 'General' },
            { key: 'contractValue', label: 'Contract value', type: 'money', section: 'General' },
            { key: 'dateStart', label: 'Start date', type: 'date', required: true, section: 'General' },
            { key: 'dateEnd', label: 'End date', type: 'date', section: 'General' },
            { key: 'description', label: 'Description', type: 'textarea', section: 'General' },
            { key: 'notVisibleToClient', label: 'Not visible to client', type: 'boolean', section: 'General' },
            { key: 'trash', label: 'Trashed', type: 'boolean', section: 'General' },
            { key: 'content', label: 'Content', type: 'richtext', section: 'Content' },
            { key: 'signed', label: 'Signed', type: 'boolean', section: 'Signature' },
            { key: 'markedAsSigned', label: 'Marked as signed', type: 'boolean', section: 'Signature' },
            { key: 'acceptanceFirstname', label: 'Signed by (first name)', type: 'text', section: 'Signature' },
            { key: 'acceptanceLastname', label: 'Signed by (last name)', type: 'text', section: 'Signature' },
            { key: 'acceptanceEmail', label: 'Signature email', type: 'email', section: 'Signature' },
            { key: 'acceptanceDate', label: 'Signature date', type: 'datetime', section: 'Signature' },
        ],
        filters: [
            { key: 'contractTypeId', label: 'Type', type: 'relation', resource: 'contract-types' },
            client,
            { key: 'signed', label: 'Signed', type: 'select', options: sel([['true', 'Signed'], ['false', 'Not signed']]) },
        ],
        actions: [
            { key: 'send', label: 'Send to customer' },
            { key: 'renew', label: 'Renew contract' },
            { key: 'mark-signed', label: 'Mark as signed', confirm: true },
            { key: 'duplicate', label: 'Copy' },
        ],
    },

    // ----------------------------------------------------------- credit notes
    {
        key: 'credit-notes', model: 'crmCreditNote', label: 'Credit note', plural: 'Credit notes', group: G, icon: 'TbReceiptRefund',
        feature: 'credit_notes', titleField: 'number', search: ['prefix', 'referenceNo', 'clientNote', 'adminNote', 'deletedCustomerName'],
        defaultSort: { date: 'desc' }, statusField: 'status', statusColors: statusColors.creditNotes,
        columns: [
            { key: 'number', label: 'Number', type: 'text', link: true, format: 'documentNumber' },
            { key: 'date', label: 'Date', type: 'date' },
            client, project,
            { key: 'referenceNo', label: 'Reference #', type: 'text' },
            { key: 'total', label: 'Amount', type: 'money' },
            { key: 'status', label: 'Status', type: 'select', options: CREDIT_NOTE_STATUS },
        ],
        fields: [
            client,
            { ...project, section: 'General' },
            ...numberFields,
            { key: 'date', label: 'Credit note date', type: 'date', required: true, section: 'General' },
            { ...currency, section: 'General' },
            { key: 'status', label: 'Status', type: 'select', options: CREDIT_NOTE_STATUS, section: 'General' },
            { key: 'referenceNo', label: 'Reference #', type: 'text', section: 'General' },
            ...moneyTotals,
            { key: 'showQuantityAs', label: 'Show quantity as', type: 'select', options: SHOW_QTY, section: 'Display' },
            { key: 'clientNote', label: 'Client note', type: 'textarea', section: 'Notes' },
            { key: 'adminNote', label: 'Admin note', type: 'textarea', section: 'Notes' },
            { key: 'terms', label: 'Terms & conditions', type: 'textarea', section: 'Notes' },
            ...address('billing', 'Billing'),
            ...address('shipping', 'Shipping'),
            { key: 'includeShipping', label: 'Include shipping', type: 'boolean', section: 'Shipping address' },
        ],
        filters: [{ key: 'status', label: 'Status', type: 'select', options: CREDIT_NOTE_STATUS }, client],
        actions: [
            { key: 'apply-to-invoice', label: 'Apply to invoice' },
            { key: 'refund', label: 'Refund' },
            { key: 'send', label: 'Send to customer' },
            { key: 'void', label: 'Void', confirm: true },
        ],
    },

    // --------------------------------------------------------------- expenses
    {
        key: 'expense-categories', lookup: {}, model: 'crmExpenseCategory', label: 'Expense category', plural: 'Expense categories', group: G, icon: 'TbCategory2',
        feature: 'expenses', titleField: 'name', search: ['name', 'description'], defaultSort: { name: 'asc' },
        columns: [{ key: 'name', label: 'Name', type: 'text', link: true }, { key: 'description', label: 'Description', type: 'text' }],
        fields: [
            { key: 'name', label: 'Name', type: 'text', required: true, section: 'General' },
            { key: 'description', label: 'Description', type: 'textarea', section: 'General' },
        ],
        children: [{ resource: 'expenses', fk: 'categoryId', label: 'Expenses' }],
    },
    {
        key: 'expenses', model: 'crmExpense', label: 'Expense', plural: 'Expenses', group: G, icon: 'TbReportMoney',
        feature: 'expenses', titleField: 'expenseName', search: ['expenseName', 'note', 'referenceNo'],
        defaultSort: { date: 'desc' },
        columns: [
            { key: 'categoryId', label: 'Category', type: 'relation', resource: 'expense-categories' },
            { key: 'amount', label: 'Amount', type: 'money' },
            { key: 'expenseName', label: 'Name', type: 'text', link: true },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'clientId', label: 'Customer', type: 'relation', resource: 'clients' },
            { key: 'projectId', label: 'Project', type: 'relation', resource: 'projects' },
            { key: 'billable', label: 'Billable', type: 'boolean' },
            { key: 'invoiceId', label: 'Invoice', type: 'relation', resource: 'invoices' },
            { key: 'referenceNo', label: 'Reference #', type: 'text' },
            { key: 'paymentModeId', label: 'Payment mode', type: 'relation', resource: 'payment-modes' },
        ],
        fields: [
            { key: 'expenseName', label: 'Name', type: 'text', section: 'General' },
            { key: 'categoryId', label: 'Category', type: 'relation', resource: 'expense-categories', required: true, section: 'General' },
            { key: 'note', label: 'Note', type: 'textarea', section: 'General' },
            { key: 'date', label: 'Expense date', type: 'date', required: true, section: 'General' },
            { key: 'amount', label: 'Amount', type: 'money', required: true, section: 'General' },
            { ...currency, section: 'General' },
            { key: 'taxId', label: 'Tax 1', type: 'relation', resource: 'taxes', section: 'General' },
            { key: 'tax2Id', label: 'Tax 2', type: 'relation', resource: 'taxes', section: 'General' },
            { key: 'paymentModeId', label: 'Payment mode', type: 'relation', resource: 'payment-modes', section: 'General' },
            { key: 'referenceNo', label: 'Reference #', type: 'text', section: 'General' },
            { ...client, section: 'Billing' },
            { ...project, section: 'Billing' },
            { key: 'billable', label: 'Billable', type: 'boolean', section: 'Billing' },
            { key: 'invoiceId', label: 'Invoice', type: 'relation', resource: 'invoices', section: 'Billing' },
            { key: 'recurring', label: 'Recurring', type: 'boolean', section: 'Recurring' },
            { key: 'repeatEvery', label: 'Repeat every', type: 'number', section: 'Recurring' },
            { key: 'recurringType', label: 'Repeat unit', type: 'select', options: RECURRING_TYPE, section: 'Recurring' },
            { key: 'cycles', label: 'Cycles (0 = infinite)', type: 'number', section: 'Recurring' },
            { key: 'createInvoiceBillable', label: 'Create invoice when billable', type: 'boolean', section: 'Recurring' },
            { key: 'sendInvoiceToCustomer', label: 'Send invoice to customer', type: 'boolean', section: 'Recurring' },
        ],
        filters: [
            { key: 'categoryId', label: 'Category', type: 'relation', resource: 'expense-categories' },
            client, currency,
            { key: 'billable', label: 'Billable', type: 'select', options: sel([['true', 'Billable'], ['false', 'Non billable']]) },
            { key: 'date', label: 'Date', type: 'date' },
        ],
        actions: [{ key: 'convert-to-invoice', label: 'Convert to invoice', confirm: true }, { key: 'duplicate', label: 'Copy' }],
    },

    // ----------------------------------------------------------- subscriptions
    {
        key: 'subscriptions', model: 'crmSubscription', label: 'Subscription', plural: 'Subscriptions', group: G, icon: 'TbRepeat',
        feature: 'subscriptions', titleField: 'name', search: ['name', 'description', 'stripeSubscriptionId'],
        defaultSort: { createdAt: 'desc' }, statusField: 'status', statusColors: statusColors.subscriptions,
        columns: [
            { key: 'name', label: 'Name', type: 'text', link: true },
            client,
            { key: 'status', label: 'Status', type: 'select', options: SUBSCRIPTION_STATUS },
            { key: 'quantity', label: 'Quantity', type: 'number' },
            { key: 'date', label: 'Start date', type: 'date' },
            { key: 'dateSubscribed', label: 'Date subscribed', type: 'datetime' },
        ],
        fields: [
            { key: 'name', label: 'Name', type: 'text', required: true, section: 'General' },
            { key: 'description', label: 'Description', type: 'textarea', section: 'General' },
            { key: 'descriptionInItem', label: 'Description in invoice item', type: 'boolean', section: 'General' },
            { ...client, required: true, section: 'General' },
            { ...project, section: 'General' },
            { ...currency, section: 'General' },
            { key: 'status', label: 'Status', type: 'select', options: SUBSCRIPTION_STATUS, section: 'General' },
            { key: 'quantity', label: 'Quantity', type: 'number', section: 'General' },
            { key: 'date', label: 'First billing date', type: 'date', section: 'General' },
            { key: 'taxId', label: 'Tax 1', type: 'relation', resource: 'taxes', section: 'Tax' },
            { key: 'tax2Id', label: 'Tax 2', type: 'relation', resource: 'taxes', section: 'Tax' },
            { key: 'terms', label: 'Terms', type: 'textarea', section: 'General' },
            { key: 'stripePlanId', label: 'Stripe plan ID', type: 'text', section: 'Stripe' },
            { key: 'stripeSubscriptionId', label: 'Stripe subscription ID', type: 'text', section: 'Stripe' },
            { key: 'inTestEnvironment', label: 'Test environment', type: 'boolean', section: 'Stripe' },
            { key: 'dateSubscribed', label: 'Date subscribed', type: 'datetime', section: 'Stripe' },
            { key: 'lastSentInvoiceDate', label: 'Last sent invoice date', type: 'datetime', section: 'Stripe' },
        ],
        filters: [{ key: 'status', label: 'Status', type: 'select', options: SUBSCRIPTION_STATUS }, client],
        children: [{ resource: 'invoices', fk: 'subscriptionId', label: 'Invoices' }],
        actions: [{ key: 'cancel', label: 'Cancel subscription', confirm: true }, { key: 'resume', label: 'Resume subscription' }],
    },
]

export default resources

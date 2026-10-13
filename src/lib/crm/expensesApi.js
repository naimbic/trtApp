import prisma from '@/lib/prisma'
import { requirePermission, viewScope, getStaffId, hasCap } from '@/lib/crm/permissions'
import { getOptions } from '@/lib/crm/mailer'
import { saveInvoice } from '@/server/actions/crm/sales/invoices'
import { round2 } from '@/lib/crm/sales/calc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const NONE = '000000000000000000000000'
const nz = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
const UNITS = ['day', 'week', 'month', 'year']

async function access(session) {
    const authority = session.user.authority || []
    return { authority, scope: viewScope(authority, 'expenses'), staffId: await getStaffId(session), session, can: (cap) => hasCap(authority, 'expenses', cap) }
}
const visible = (a) => (a.scope === 'all' ? {} : a.staffId ? { addedFrom: a.staffId } : { id: NONE })
const withTax = (e, taxes) => { const r1 = taxes[e.taxId]?.rate || 0, r2 = taxes[e.tax2Id]?.rate || 0; return { tax: round2((e.amount * (r1 + r2)) / 100), total: round2(e.amount * (1 + (r1 + r2) / 100)) } }

async function lookups() {
    const [categories, taxes, modes, currencies] = await Promise.all([
        prisma.crmExpenseCategory.findMany({ orderBy: { name: 'asc' } }), prisma.crmTax.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmPaymentMode.findMany({ orderBy: { name: 'asc' } }), prisma.crmCurrency.findMany(),
    ])
    return {
        categories: categories.map((c) => ({ id: c.id, name: c.name })), taxes: taxes.map((t) => ({ id: t.id, name: t.name, rate: t.taxRate })),
        paymentModes: modes.map((m) => ({ id: m.id, name: m.name })), currencies: currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, placement: c.placement, isDefault: !!c.isDefault })),
    }
}
export async function expenseLookups() { await requirePermission('expenses', 'view'); return lookups() }

export async function listExpenses(q = {}) {
    const session = await requirePermission('expenses', 'view')
    const a = await access(session)
    const and = [await visible(a)]
    if (oid(q.categoryId)) and.push({ categoryId: q.categoryId })
    if (oid(q.clientId)) and.push({ clientId: q.clientId })
    if (oid(q.projectId)) and.push({ projectId: q.projectId })
    if (q.state === 'billable') and.push({ billable: true, invoiceId: null })
    else if (q.state === 'nonbillable') and.push({ billable: false })
    else if (q.state === 'invoiced') and.push({ invoiceId: { not: null } })
    else if (q.state === 'recurring') and.push({ recurring: true })
    if (q.from || q.to) and.push({ date: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to}T23:59:59Z`) } : {}) } })
    if (q.query) { const c = { contains: q.query, mode: 'insensitive' }; and.push({ OR: [{ expenseName: c }, { note: c }, { referenceNo: c }] }) }
    const where = { AND: and }
    const page = Math.max(parseInt(q.pageIndex, 10) || 1, 1), size = Math.min(Math.max(parseInt(q.pageSize, 10) || 20, 5), 100)
    const sortMap = { date: { date: q.order === 'asc' ? 'asc' : 'desc' }, amount: { amount: q.order === 'asc' ? 'asc' : 'desc' }, name: { expenseName: q.order === 'asc' ? 'asc' : 'desc' } }
    const [rows, total, lk, all] = await Promise.all([
        prisma.crmExpense.findMany({ where, orderBy: sortMap[q.sortKey] || sortMap.date, skip: (page - 1) * size, take: size }),
        prisma.crmExpense.count({ where }), lookups(),
        prisma.crmExpense.findMany({ where, select: { amount: true, taxId: true, tax2Id: true, billable: true, invoiceId: true, categoryId: true, date: true, currencyId: true } }),
    ])
    const tx = Object.fromEntries(lk.taxes.map((t) => [t.id, t])), cat = Object.fromEntries(lk.categories.map((c) => [c.id, c.name])), mode = Object.fromEntries(lk.paymentModes.map((m) => [m.id, m.name]))
    const [clients, projects, invoices] = await Promise.all([
        prisma.crmClient.findMany({ where: { id: { in: rows.map((r) => r.clientId).filter(Boolean) } }, select: { id: true, company: true } }),
        prisma.crmProject.findMany({ where: { id: { in: rows.map((r) => r.projectId).filter(Boolean) } }, select: { id: true, name: true } }),
        prisma.crmInvoice.findMany({ where: { id: { in: rows.map((r) => r.invoiceId).filter(Boolean) } }, select: { id: true, number: true, prefix: true } }),
    ])
    const cMap = Object.fromEntries(clients.map((c) => [c.id, c.company])), pMap = Object.fromEntries(projects.map((p) => [p.id, p.name])), iMap = Object.fromEntries(invoices.map((i) => [i.id, `${i.prefix || ''}${i.number}`]))
    // totals of everything the filters match (not just this page), per currency, plus category and month breakdowns
    const stats = { total: 0, tax: 0, billable: 0, invoiced: 0, count: all.length }
    const byCat = {}, byMonth = {}
    for (const e of all) {
        const t = withTax(e, tx)
        stats.total = round2(stats.total + t.total); stats.tax = round2(stats.tax + t.tax)
        if (e.billable && !e.invoiceId) stats.billable = round2(stats.billable + t.total)
        if (e.invoiceId) stats.invoiced = round2(stats.invoiced + t.total)
        byCat[e.categoryId || 'none'] = round2((byCat[e.categoryId || 'none'] || 0) + t.total)
        if (e.date) { const k = new Date(e.date).toISOString().slice(0, 7); byMonth[k] = round2((byMonth[k] || 0) + t.total) }
    }
    return {
        list: rows.map((e) => ({ id: e.id, number: e.legacyId, name: e.expenseName || cat[e.categoryId] || 'Expense', category: cat[e.categoryId] || '', categoryId: e.categoryId, amount: e.amount, ...withTax(e, tx), currencyId: e.currencyId, date: e.date, reference: e.referenceNo, paymentMode: mode[e.paymentModeId] || '', client: e.clientId ? { id: e.clientId, name: cMap[e.clientId] || '' } : null, project: e.projectId ? { id: e.projectId, name: pMap[e.projectId] || '' } : null, billable: e.billable, invoice: e.invoiceId ? { id: e.invoiceId, number: iMap[e.invoiceId] || '' } : null, recurring: e.recurring, repeated: !!e.recurringFrom, note: e.note })),
        total, pageIndex: page, pageSize: size, stats,
        topCategories: Object.entries(byCat).map(([id, v]) => ({ id, name: cat[id] || 'Uncategorised', value: v })).sort((x, y) => y.value - x.value).slice(0, 6),
        months: Object.entries(byMonth).sort(([x], [y]) => x.localeCompare(y)).slice(-12).map(([month, value]) => ({ month, value })),
        lookups: lk, can: { create: a.can('create'), edit: a.can('edit'), delete: a.can('delete'), invoice: hasCap(a.authority, 'invoices', 'create') },
    }
}

async function loadOne(id, a) {
    if (!oid(id)) throw fail('Expense not found', 404)
    const e = await prisma.crmExpense.findFirst({ where: { AND: [{ id }, visible(a)] } })
    if (!e) throw fail('Expense not found', 404)
    return e
}

export async function getExpense(id) {
    const session = await requirePermission('expenses', 'view')
    const a = await access(session)
    const e = await loadOne(id, a)
    const [lk, client, project, invoice, by] = await Promise.all([lookups(), e.clientId ? prisma.crmClient.findUnique({ where: { id: e.clientId }, select: { id: true, company: true } }) : null, e.projectId ? prisma.crmProject.findUnique({ where: { id: e.projectId }, select: { id: true, name: true } }) : null, e.invoiceId ? prisma.crmInvoice.findUnique({ where: { id: e.invoiceId }, select: { id: true, number: true, prefix: true } }) : null, e.addedFrom ? prisma.crmStaff.findUnique({ where: { id: e.addedFrom }, select: { firstName: true, lastName: true } }) : null])
    const tx = Object.fromEntries(lk.taxes.map((t) => [t.id, t]))
    return { expense: { id: e.id, number: e.legacyId, name: e.expenseName || '', categoryId: e.categoryId, amount: e.amount, taxId: e.taxId, tax2Id: e.tax2Id, ...withTax(e, tx), currencyId: e.currencyId, date: e.date, reference: e.referenceNo || '', paymentModeId: e.paymentModeId, clientId: e.clientId, projectId: e.projectId, billable: e.billable, note: e.note || '', recurring: e.recurring, repeatEvery: e.repeatEvery || 1, recurringType: e.recurringType || 'month', cyclesLimit: e.cycles || 0, cyclesDone: e.totalCycles || 0, lastRecurringDate: e.lastRecurringDate, createInvoiceBillable: e.createInvoiceBillable, sendInvoiceToCustomer: e.sendInvoiceToCustomer, recurringFrom: e.recurringFrom, client, project, invoice: invoice ? { id: invoice.id, number: `${invoice.prefix || ''}${invoice.number}` } : null, addedBy: by ? [by.firstName, by.lastName].filter(Boolean).join(' ') : null, createdAt: e.createdAt }, lookups: lk, can: { edit: a.can('edit') && !e.invoiceId, delete: a.can('delete') && !e.invoiceId, invoice: hasCap(a.authority, 'invoices', 'create') && e.billable && !e.invoiceId && !!e.clientId } }
}

export async function saveExpense(body, id) {
    const session = await requirePermission('expenses', id ? 'edit' : 'create')
    const a = await access(session)
    const amount = Number(body.amount)
    if (!(amount > 0)) throw fail('Enter the amount')
    if (!oid(body.categoryId)) throw fail('Choose a category')
    if (!body.date) throw fail('Choose the date')
    const billable = !!body.billable
    if (billable && !oid(body.clientId)) throw fail('A billable expense needs a client')
    const recurring = !!body.recurring
    const data = {
        categoryId: oid(body.categoryId), expenseName: nz(body.name), amount: round2(amount), taxId: oid(body.taxId), tax2Id: oid(body.tax2Id), currencyId: oid(body.currencyId), date: new Date(body.date),
        referenceNo: nz(body.reference), paymentModeId: oid(body.paymentModeId), clientId: oid(body.clientId), projectId: oid(body.projectId), billable, note: nz(body.note),
        recurring, recurringType: recurring ? (UNITS.includes(body.recurringType) ? body.recurringType : 'month') : null, repeatEvery: recurring ? Math.max(parseInt(body.repeatEvery, 10) || 1, 1) : 0, cycles: recurring ? Math.max(parseInt(body.cyclesLimit, 10) || 0, 0) : 0,
        createInvoiceBillable: recurring && billable && !!body.createInvoiceBillable, sendInvoiceToCustomer: recurring && billable && !!body.createInvoiceBillable && !!body.sendInvoiceToCustomer,
    }
    if (id) {
        const prev = await loadOne(id, a)
        if (prev.invoiceId) throw fail('This expense was invoiced and can no longer be edited')
        await prisma.crmExpense.update({ where: { id }, data })
        return { success: true, id }
    }
    const last = await prisma.crmExpense.findFirst({ where: { legacyId: { not: null } }, orderBy: { legacyId: 'desc' }, select: { legacyId: true } })
    const e = await prisma.crmExpense.create({ data: { ...data, legacyId: (last?.legacyId || 0) + 1, addedFrom: a.staffId, invoiceId: null, totalCycles: 0 } })
    return { success: true, id: e.id }
}

export async function deleteExpense(id) {
    const session = await requirePermission('expenses', 'delete')
    const a = await access(session)
    const e = await loadOne(id, a)
    if (e.invoiceId) throw fail('This expense is on an invoice. Delete or cancel the invoice first.')
    await prisma.crmFile.deleteMany({ where: { relType: 'expense', relId: id } }).catch(() => {})
    await prisma.crmExpense.delete({ where: { id } })
    return { success: true }
}

/** Perfex "Convert to invoice": one line with the expense, its taxes, for the client. */
export async function expenseToInvoice(id) {
    const session = await requirePermission('expenses', 'view')
    await requirePermission('invoices', 'create')
    const a = await access(session)
    const e = await loadOne(id, a)
    if (e.invoiceId) throw fail('This expense is already invoiced')
    if (!e.billable || !e.clientId) throw fail('Only billable expenses with a client can be invoiced')
    const lk = await lookups()
    const taxes = [e.taxId, e.tax2Id].map((t) => lk.taxes.find((x) => x.id === t)).filter(Boolean).map((t) => ({ name: t.name, rate: t.rate }))
    const cat = lk.categories.find((c) => c.id === e.categoryId)?.name || 'Expense'
    const o = await getOptions(['invoice_due_after'])
    const today = new Date(), due = new Date(Date.now() + (parseInt(o.invoice_due_after, 10) || 30) * 86400000)
    const r = await saveInvoice({ clientId: e.clientId, currencyId: e.currencyId, date: today, dueDate: due, items: [{ description: e.expenseName || cat, longDescription: [e.referenceNo && `Ref. ${e.referenceNo}`, e.note].filter(Boolean).join(' · ') || null, qty: 1, rate: e.amount, taxes }] })
    if (!r.success) throw fail(r.message || 'Could not create the invoice')
    await prisma.crmExpense.update({ where: { id }, data: { invoiceId: r.id } })
    return { success: true, invoiceId: r.id }
}

export async function createCategory(name) {
    await requirePermission('expenses', 'create')
    const n = nz(name)
    if (!n) throw fail('Name the category')
    if (await prisma.crmExpenseCategory.findFirst({ where: { name: { equals: n, mode: 'insensitive' } } })) throw fail('That category already exists')
    const c = await prisma.crmExpenseCategory.create({ data: { name: n } })
    return { success: true, id: c.id, name: c.name }
}

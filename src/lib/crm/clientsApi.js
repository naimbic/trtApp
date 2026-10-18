import prisma from '@/lib/prisma'
import { readSettings } from '@/lib/crm/appSettings'
import { requirePermission, viewScope, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'
import { toBase, ALL } from '@/lib/crm/rates'
import { loadRates } from '@/lib/crm/ratesDb'
import { activeLanguages } from '@/lib/crm/templateLanguages'

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })
const str = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())
const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** Clients the user may see: everything, or only the clients they are admin of (view_own). */
export async function scope(session) {
    const s = viewScope(session.user.authority || [], 'customers')
    if (s === 'all') return {}
    const staffId = await getStaffId(session)
    const ids = staffId ? (await prisma.crmCustomerAdmin.findMany({ where: { staffId }, select: { clientId: true } })).map((a) => a.clientId) : []
    return { id: { in: ids.length ? ids : ['000000000000000000000000'] } }
}

const contactName = (c) => (c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '' : '')

/** Per-client money summary per currency, from invoices (draft/cancelled ignored) and their payments. */
async function moneyFor(clientIds, withAll = false) {
    const out = {}
    if (!clientIds.length) return out
    const rt = withAll ? await loadRates() : null
    const invoices = await prisma.crmInvoice.findMany({
        where: { clientId: { in: clientIds }, status: { notIn: [5, 6] } },
        select: { id: true, clientId: true, currencyId: true, total: true, dueDate: true },
    })
    const payments = await prisma.crmPayment.findMany({ where: { invoiceId: { in: invoices.map((i) => i.id) } }, select: { invoiceId: true, amount: true } })
    const paid = {}
    payments.forEach((p) => (paid[p.invoiceId] = round2((paid[p.invoiceId] || 0) + (p.amount || 0))))
    const today = new Date()
    for (const i of invoices) {
        const cur = (out[i.clientId] ||= {})
        const p = paid[i.id] || 0
        const due = round2(i.total - p)
        // its own currency and, for the detail page, ALL (converted with the saved rate; no rate: left out of ALL)
        const k = rt ? toBase(1, i.currencyId, rt) : null
        for (const [key, f] of [[i.currencyId || 'none', 1], ...(k === null ? [] : [[ALL, k]])]) {
            const b = (cur[key] ||= { invoiced: 0, paid: 0, outstanding: 0, overdue: 0, invoices: 0 })
            b.invoices += 1
            b.invoiced = round2(b.invoiced + i.total * f)
            b.paid = round2(b.paid + p * f)
            if (due > 0) {
                b.outstanding = round2(b.outstanding + due * f)
                if (i.dueDate && new Date(i.dueDate) < today) b.overdue = round2(b.overdue + due * f)
            }
        }
    }
    return out
}

export async function clientLookups() {
    await requirePermission('customers', 'view')
    const [countries, currencies, groups, staff] = await Promise.all([
        prisma.crmCountry.findMany({ orderBy: { shortName: 'asc' } }),
        prisma.crmCurrency.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmCustomerGroup.findMany({ orderBy: { name: 'asc' } }),
        prisma.crmStaff.findMany({ where: { active: true }, orderBy: { firstName: 'asc' } }),
    ])
    return {
        numberPadding: await numberPadding(),
        countries: countries.filter((c) => c.legacyId != null).map((c) => ({ value: c.legacyId, label: c.shortName || c.longName || c.iso2 })),
        currencies: currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, placement: c.placement, isDefault: c.isDefault })),
        languages: await activeLanguages(), // the languages switched on in Settings → Localization
        groups: groups.map((g) => ({ id: g.id, name: g.name })),
        staff: staff.map((s) => ({ id: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email })),
    }
}

export async function listClients({ query = '', pageIndex = 1, pageSize = 10, sortKey, order, status, groupId } = {}) {
    const session = await requirePermission('customers', 'view')
    const sc = await scope(session)
    const and = [sc]
    if (status === 'active') and.push({ active: true })
    if (status === 'inactive') and.push({ active: false })
    if (query) {
        const contactMatches = await prisma.crmContact.findMany({ where: { OR: ['firstName', 'lastName', 'email', 'phoneNumber'].map((f) => ({ [f]: { contains: query, mode: 'insensitive' } })) }, select: { clientId: true }, take: 500 })
        and.push({ OR: [...['company', 'vat', 'phoneNumber', 'city', 'website'].map((f) => ({ [f]: { contains: query, mode: 'insensitive' } })), { id: { in: [...new Set(contactMatches.map((c) => c.clientId))] } }] })
    }
    if (groupId) {
        const links = await prisma.crmCustomerGroupLink.findMany({ where: { groupId }, select: { clientId: true } })
        and.push({ id: { in: links.map((l) => l.clientId) } })
    }
    const where = { AND: and }
    const sortable = ['company', 'city', 'createdAt', 'active', 'phoneNumber']
    const orderBy = sortKey && sortable.includes(sortKey) ? { [sortKey]: order === 'desc' ? 'desc' : 'asc' } : { company: 'asc' }
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1)
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 200)
    const [rows, total, all] = await Promise.all([
        prisma.crmClient.findMany({ where, orderBy, skip: (page - 1) * size, take: size, include: { contacts: true, groupLinks: { include: { group: true } } } }),
        prisma.crmClient.count({ where }),
        prisma.crmClient.findMany({ where: sc, select: { active: true } }),
    ])
    const money = await moneyFor(rows.map((r) => r.id))
    const contactCount = await prisma.crmContact.count({})
    const activeContacts = await prisma.crmContact.count({ where: { active: true } })
    return {
        list: rows.map((c) => {
            const primary = c.contacts.find((x) => x.isPrimary) || c.contacts[0]
            return {
                id: c.id, company: c.company || '(no name)', vat: c.vat, phone: c.phoneNumber, city: c.city, website: c.website, logoUrl: c.logoUrl, active: c.active, createdAt: c.createdAt,
                primaryContact: primary ? { name: contactName(primary), email: primary.email, phone: primary.phoneNumber } : null,
                contactsCount: c.contacts.length,
                groups: c.groupLinks.map((l) => ({ id: l.groupId, name: l.group?.name || '' })),
                money: money[c.id] || {},
            }
        }),
        total, pageIndex: page, pageSize: size,
        stats: { total: all.length, active: all.filter((a) => a.active).length, inactive: all.filter((a) => !a.active).length, contacts: contactCount, activeContacts },
    }
}

export async function getClientDetail(id) {
    const session = await requirePermission('customers', 'view')
    const sc = await scope(session)
    const c = await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] }, include: { contacts: { orderBy: { isPrimary: 'desc' } }, groupLinks: { include: { group: true } }, admins: true } })
    if (!c) throw httpError('Client not found', 404)
    const countries = await prisma.crmCountry.findMany({ where: { legacyId: { in: [c.country, c.billingCountry, c.shippingCountry].filter((x) => x != null) } } })
    const cname = Object.fromEntries(countries.map((x) => [x.legacyId, x.shortName || x.longName]))
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: c.admins.map((a) => a.staffId) } } })
    const rel = { relId: id }
    const [invoices, estimates, proposals, contracts, projects, tickets, notes, files] = await Promise.all([
        prisma.crmInvoice.count({ where: { clientId: id } }),
        prisma.crmEstimate.count({ where: { clientId: id } }),
        prisma.crmProposal.count({ where: { relType: 'customer', ...rel } }),
        prisma.crmContract.count({ where: { clientId: id } }),
        prisma.crmProject.count({ where: { clientId: id } }),
        prisma.crmTicket.count({ where: { clientId: id } }),
        prisma.crmNote.count({ where: { relType: 'customer', ...rel } }),
        prisma.crmFile.count({ where: { relType: 'customer', ...rel } }),
    ])
    const money = (await moneyFor([id], true))[id] || {}
    return {
        id: c.id, company: c.company, vat: c.vat, phone: c.phoneNumber, website: c.website, logoUrl: c.logoUrl, industry: c.industry, active: c.active, language: c.defaultLanguage, currencyId: c.defaultCurrencyId, bankAccountId: c.bankAccountId || null,
        address: c.address, city: c.city, state: c.state, zip: c.zip, country: c.country, countryName: cname[c.country] || '',
        billing: { street: c.billingStreet, city: c.billingCity, state: c.billingState, zip: c.billingZip, country: c.billingCountry, countryName: cname[c.billingCountry] || '' },
        shipping: { street: c.shippingStreet, city: c.shippingCity, state: c.shippingState, zip: c.shippingZip, country: c.shippingCountry, countryName: cname[c.shippingCountry] || '' },
        showPrimaryContact: c.showPrimaryContact, createdAt: c.createdAt,
        groups: c.groupLinks.map((l) => ({ id: l.groupId, name: l.group?.name || '' })),
        admins: staff.map((s) => ({ id: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() })),
        contacts: c.contacts.map((x) => ({ id: x.id, name: contactName(x), email: x.email, phone: x.phoneNumber, title: x.title, isPrimary: x.isPrimary, active: x.active, lastLogin: x.lastLogin })),
        money,
        counts: { contacts: c.contacts.length, invoices, estimates, proposals, contracts, projects, tickets, notes, files },
    }
}

const fieldsFrom = (b) => {
    const d = {}
    const set = (k, v) => v !== undefined && (d[k] = v)
    if (b.company !== undefined) { if (!str(b.company)) throw httpError('Company name is required'); set('company', str(b.company)) }
    set('vat', b.vat === undefined ? undefined : str(b.vat))
    set('phoneNumber', b.phone === undefined ? undefined : str(b.phone))
    set('website', b.website === undefined ? undefined : str(b.website))
    set('industry', b.industry === undefined ? undefined : str(b.industry))
    set('address', b.address === undefined ? undefined : str(b.address))
    set('city', b.city === undefined ? undefined : str(b.city))
    set('state', b.state === undefined ? undefined : str(b.state))
    set('zip', b.zip === undefined ? undefined : str(b.zip))
    set('country', b.country === undefined ? undefined : num(b.country))
    set('defaultLanguage', b.language === undefined ? undefined : str(b.language))
    set('defaultCurrencyId', b.currencyId === undefined ? undefined : b.currencyId || null)
    set('bankAccountId', b.bankAccountId === undefined ? undefined : b.bankAccountId || null)
    if (b.active !== undefined) d.active = !!b.active
    for (const [k, p] of [['billing', 'billing'], ['shipping', 'shipping']]) {
        const a = b[k]
        if (!a) continue
        set(`${p}Street`, str(a.street)); set(`${p}City`, str(a.city)); set(`${p}State`, str(a.state)); set(`${p}Zip`, str(a.zip)); set(`${p}Country`, num(a.country))
    }
    return d
}

/** Settings → Clients: the VAT / ICE number can be made compulsory. */
async function requireVat(vat) {
    if (!str(vat) && (await readSettings(['company_requires_vat_number_field'])).on('company_requires_vat_number_field')) throw httpError('The VAT / ICE number is required')
}

async function setGroups(clientId, ids) {
    await prisma.crmCustomerGroupLink.deleteMany({ where: { clientId } })
    const unique = [...new Set(ids || [])].filter(Boolean)
    if (unique.length) await prisma.crmCustomerGroupLink.createMany({ data: unique.map((groupId) => ({ clientId, groupId })) })
}
async function setAdmins(clientId, ids) {
    await prisma.crmCustomerAdmin.deleteMany({ where: { clientId } })
    const unique = [...new Set(ids || [])].filter(Boolean)
    if (unique.length) await prisma.crmCustomerAdmin.createMany({ data: unique.map((staffId) => ({ clientId, staffId, dateAssigned: new Date() })) })
}

/** body: client fields + groupIds + adminIds + (create only) contact {firstName,lastName,email,phone,title} */
export async function createClient(body) {
    const session = await requirePermission('customers', 'create')
    if (!str(body.company)) throw httpError('Company name is required')
    await requireVat(body.vat)
    const staffId = await getStaffId(session)
    const c = await prisma.crmClient.create({ data: { ...fieldsFrom(body), active: body.active !== false, addedFrom: staffId || undefined } })
    if (Array.isArray(body.groupIds)) await setGroups(c.id, body.groupIds)
    if (Array.isArray(body.adminIds)) await setAdmins(c.id, body.adminIds)
    const k = body.contact
    if (k && (str(k.firstName) || str(k.lastName) || str(k.email))) {
        await prisma.crmContact.create({ data: { clientId: c.id, isPrimary: true, firstName: str(k.firstName), lastName: str(k.lastName), email: str(k.email), phoneNumber: str(k.phone), title: str(k.title), active: true } })
    }
    return { id: c.id }
}

export async function updateClient(id, body) {
    const session = await requirePermission('customers', 'edit')
    const sc = await scope(session)
    if (!(await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] }, select: { id: true } }))) throw httpError('Client not found', 404)
    if (body.vat !== undefined) await requireVat(body.vat)
    const data = fieldsFrom(body)
    if (Object.keys(data).length) await prisma.crmClient.update({ where: { id }, data })
    if (Array.isArray(body.groupIds)) await setGroups(id, body.groupIds)
    if (Array.isArray(body.adminIds)) await setAdmins(id, body.adminIds)
    return { id }
}

/** Refuses when the client still owns business records (Perfex would cascade-delete them). */
export async function deleteClient(id) {
    const session = await requirePermission('customers', 'delete')
    const sc = await scope(session)
    if (!(await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] }, select: { id: true } }))) throw httpError('Client not found', 404)
    const [inv, est, con, prj, tkt] = await Promise.all([
        prisma.crmInvoice.count({ where: { clientId: id } }), prisma.crmEstimate.count({ where: { clientId: id } }),
        prisma.crmContract.count({ where: { clientId: id } }), prisma.crmProject.count({ where: { clientId: id } }), prisma.crmTicket.count({ where: { clientId: id } }),
    ])
    const used = [inv && `${inv} invoice${inv > 1 ? 's' : ''}`, est && `${est} estimate${est > 1 ? 's' : ''}`, con && `${con} contract${con > 1 ? 's' : ''}`, prj && `${prj} project${prj > 1 ? 's' : ''}`, tkt && `${tkt} ticket${tkt > 1 ? 's' : ''}`].filter(Boolean)
    if (used.length) throw httpError(`This client still has ${used.join(', ')}. Delete or reassign them first, or deactivate the client instead.`, 409)
    await prisma.crmContact.deleteMany({ where: { clientId: id } })
    await prisma.crmCustomerGroupLink.deleteMany({ where: { clientId: id } })
    await prisma.crmCustomerAdmin.deleteMany({ where: { clientId: id } })
    await prisma.crmNote.deleteMany({ where: { relType: 'customer', relId: id } })
    await prisma.crmClient.delete({ where: { id } })
    return { success: true }
}

/** Payments received for a client's invoices. */
export async function clientPayments(id, { pageIndex = 1, pageSize = 10, query = '', mode: modeId = '', from = '', to = '' } = {}) {
    const session = await requirePermission('payments', 'view')
    await requirePermission('customers', 'view')
    const sc = await scope(session)
    if (!(await prisma.crmClient.findFirst({ where: { AND: [{ id }, sc] }, select: { id: true } }))) throw httpError('Client not found', 404)
    const invs = await prisma.crmInvoice.findMany({ where: { clientId: id }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, currencyId: true } })
    const padding = await numberPadding()
    const byId = Object.fromEntries(invs.map((i) => [i.id, i]))
    const labelOf = (i) => docNumberOf(i, padding)
    const q = String(query || '').trim().toLowerCase()
    const matching = q ? invs.filter((i) => labelOf(i).toLowerCase().includes(q)).map((i) => i.id) : null
    const where = { invoiceId: { in: invs.map((i) => i.id) } }
    if (modeId) where.paymentModeId = modeId
    if (from || to) where.paymentDate = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) }
    if (q) where.OR = [{ transactionId: { contains: q, mode: 'insensitive' } }, ...(matching.length ? [{ invoiceId: { in: matching } }] : [])]
    const page = Math.max(parseInt(pageIndex, 10) || 1, 1)
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 200)
    const [rows, total, modes] = await Promise.all([
        prisma.crmPayment.findMany({ where, orderBy: { paymentDate: 'desc' }, skip: (page - 1) * size, take: size }),
        prisma.crmPayment.count({ where }),
        prisma.crmPaymentMode.findMany(),
    ])
    const mode = Object.fromEntries(modes.map((m) => [m.id, m.name]))
    return {
        list: rows.map((p) => {
            const i = byId[p.invoiceId]
            return { id: p.id, amount: p.amount, paymentDate: p.paymentDate, mode: mode[p.paymentModeId] || p.paymentMethod || '', transactionId: p.transactionId, invoiceId: p.invoiceId, invoiceNumber: i ? docNumberOf(i, padding) : '', currencyId: i?.currencyId || null }
        }),
        total, pageIndex: page, pageSize: size, modes: modes.map((m) => ({ value: m.id, label: m.name })),
    }
}

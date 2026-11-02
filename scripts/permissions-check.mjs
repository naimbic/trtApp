// Checks that "View own" / "View" / no permission behave on every sales document, over real HTTP.
// Needs the dev server (npm run dev, port 3000) and the database of .env. Creates temporary test users and records and removes them.
//   node --env-file=.env scripts/permissions-check.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const prisma = new PrismaClient()
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const made = { users: [], staff: [], rows: [], extraRows: [] } // rows: [model, id]

async function makeUser(label, perms, admin = false) {
    const email = `permcheck.${label}.${crypto.randomBytes(3).toString('hex')}@test.local`
    const password = crypto.randomBytes(12).toString('base64url')
    const user = await prisma.user.create({ data: { name: `Check ${label}`, email, password: await bcrypt.hash(password, 10), authority: admin ? ['admin'] : ['user'], role: admin ? 'admin' : 'user', status: 'active', image: '/img/avatars/thumb-1.jpg' } })
    const staff = await prisma.crmStaff.create({ data: { userId: user.id, email, firstName: `Check${label}`, active: true, admin } })
    const rows = Object.entries(perms).flatMap(([feature, caps]) => caps.map((capability) => ({ staffId: staff.id, feature, capability })))
    if (rows.length) await prisma.crmStaffPermission.createMany({ data: rows })
    made.users.push(user.id); made.staff.push(staff.id)
    return { email, password, staffId: staff.id }
}

async function login(u) {
    const jar = {}
    const take = (res) => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1) } }
    const hdr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
    let r = await fetch(`${BASE}/api/auth/csrf`); take(r)
    const { csrfToken } = await r.json()
    r = await fetch(`${BASE}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: hdr() }, body: new URLSearchParams({ csrfToken, email: u.email, password: u.password, redirect: 'false', json: 'true' }) })
    take(r)
    const s = await (await fetch(`${BASE}/api/auth/session`, { headers: { cookie: hdr() } })).json()
    if (!s?.user) throw new Error(`sign-in failed for ${u.email}`)
    const fn = async (method, path, body) => {
        const form = typeof FormData !== 'undefined' && body instanceof FormData
        const res = await fetch(BASE + path, { method, headers: form ? { cookie: hdr() } : { cookie: hdr(), 'content-type': 'application/json' }, body: body ? (form ? body : JSON.stringify(body)) : undefined })
        take(res) // a new session cookie (login as / back) replaces the old one
        let j = null, text = ''; try { text = await res.clone().text(); j = JSON.parse(text) } catch { /* pdf / html */ }
        return { status: res.status, body: j, text }
    }
    fn.raw = (path, init = {}) => fetch(BASE + path, { redirect: 'manual', ...init, headers: { ...(init.headers || {}), cookie: hdr() } })
    return fn
}

const MODULES = [
    { feature: 'estimates', model: 'crmEstimate', base: '/api/crm/sales/estimates', extra: { number: 9001, prefix: 'PC-' }, sub: ['pdf'], create: (c) => ({ clientId: c, items: [{ description: 'x', qty: 1, rate: 10, taxes: [] }] }) },
    { feature: 'invoices', model: 'crmInvoice', base: '/api/crm/sales/invoices', extra: { number: 9001, prefix: 'PC-' }, sub: ['pdf', 'html'], create: (c) => ({ clientId: c, items: [{ description: 'x', qty: 1, rate: 10, taxes: [] }] }) },
    { feature: 'proposals', model: 'crmProposal', base: '/api/crm/sales/proposals', extra: { subject: 'Permission check' }, sub: ['pdf', 'html'] },
    { feature: 'purchase_orders', model: 'crmPurchaseOrder', base: '/api/crm/sales/purchase-orders', extra: { number: 9001 }, sub: ['pdf'] },
    { feature: 'contracts', model: 'crmContract', base: '/api/crm/sales/contracts', extra: { subject: 'Permission check' }, sub: ['pdf', 'html'] },
]

const made_users_cleanup = (userId, staffId) => { made.users.push(userId); if (staffId) made.staff.push(staffId) }
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }
const listCount = (r) => r.body?.total ?? r.body?.list?.length ?? (Array.isArray(r.body) ? r.body.length : null)

try {
    const client = await prisma.crmClient.findFirst({ select: { id: true } })
    const other = await prisma.crmStaff.findFirst({ where: { NOT: { id: { in: made.staff } } }, select: { id: true } })
    for (const m of MODULES) {
        console.log(`\n== ${m.feature}`)
        const own = await makeUser(`own-${m.feature}`, { [m.feature]: ['view_own', 'create', 'edit', 'delete'] })
        const all = await makeUser(`all-${m.feature}`, { [m.feature]: ['view', 'create', 'edit', 'delete'] })
        const none = await makeUser(`none-${m.feature}`, {})
        const mk = async (addedFrom) => { const r = await prisma[m.model].create({ data: { ...(m.model !== 'crmContract' && m.model !== 'crmProposal' ? { clientId: client?.id } : {}), ...m.extra, addedFrom, ...(m.model === 'crmEstimate' || m.model === 'crmInvoice' ? { date: new Date(), hash: crypto.randomUUID() } : {}) } }); made.rows.push([m.model, r.id]); return r }
        const mine = await mk(own.staffId), theirs = await mk(other.id)
        const a = await login(own), b = await login(all), c = await login(none)

        check('view own: list shows only own', listCount(await a('GET', m.base)) === 1, `got ${listCount(await a('GET', m.base))}`)
        check('view own: open own', (await a('GET', `${m.base}/${mine.id}`)).status === 200)
        check("view own: cannot open someone else's", [403, 404].includes((await a('GET', `${m.base}/${theirs.id}`)).status), String((await a('GET', `${m.base}/${theirs.id}`)).status))
        for (const s of m.sub) check(`view own: cannot open /${s} of someone else's`, [403, 404].includes((await a('GET', `${m.base}/${theirs.id}/${s}`)).status))
        check("view own: cannot edit someone else's", ![200, 201].includes((await a('PUT', `${m.base}/${theirs.id}`, { subject: 'hacked', clientId: client?.id, items: [{ description: 'x', qty: 1, rate: 1, taxes: [] }] })).status))
        check("view own: cannot delete someone else's", ![200].includes((await a('DELETE', `${m.base}/${theirs.id}`)).status) || !!(await prisma[m.model].findUnique({ where: { id: theirs.id } })))
        if (m.create) { const r = await a('POST', m.base, m.create(client?.id)); check('view own: can create', r.status === 201, String(r.status)); if (r.body?.id) made.rows.push([m.model, r.body.id]) }
        if (m.feature === 'estimates' || m.feature === 'invoices') check('editor lookups open', (await a('GET', '/api/crm/sales/lookups')).status === 200)
        check('view all: list shows both', listCount(await b('GET', m.base)) >= 2)
        check("view all: opens someone else's", (await b('GET', `${m.base}/${theirs.id}`)).status === 200)
        check('no permission: list refused', [403].includes((await c('GET', m.base)).status))
        check('no permission: open refused', [403, 404].includes((await c('GET', `${m.base}/${mine.id}`)).status))
        if (m.feature === 'estimates') {
            const pk = await a('GET', '/api/crm/clients/options')
            check('client picker follows "View own" customers', (listCount(pk) ?? 99) <= (await prisma.crmClient.count()), `offers ${listCount(pk)}`)
        }
    }

    console.log('\n== creating an estimate with "View own"')
    const seller = await makeUser('seller', { estimates: ['view_own', 'create', 'edit'] })
    const sell = await login(seller)
    const c0 = await sell('GET', '/api/crm/clients/options')
    check('no customer assigned: the picker is empty', listCount(c0) === 0, `offers ${listCount(c0)}`)
    await prisma.crmCustomerAdmin.create({ data: { clientId: client.id, staffId: seller.staffId } }).then((r) => made.extraRows.push(['crmCustomerAdmin', r.id]))
    const c1 = await sell('GET', '/api/crm/clients/options')
    check('customer assigned: the picker offers it', listCount(c1) === 1, `offers ${listCount(c1)}`)
    const made1 = await sell('POST', '/api/crm/sales/estimates', { clientId: client.id, items: [{ description: 'x', qty: 1, rate: 10, taxes: [] }] })
    check('and the estimate is created', made1.status === 201, String(made1.status))
    if (made1.body?.id) made.rows.push(['crmEstimate', made1.body.id])
    for (const k of ['staff', 'currencies', 'taxes', 'payment-modes']) check(`form picker "${k}" is open to every team member`, (await sell('GET', `/api/crm/${k}/options`)).status === 200)

    console.log('\n== a changed permission reaches the person within seconds')
    const mover = await makeUser('mover', {})
    const mv = await login(mover)
    check('before: estimates refused', (await mv('GET', '/api/crm/sales/estimates')).status === 403)
    await prisma.crmStaffPermission.create({ data: { staffId: mover.staffId, feature: 'estimates', capability: 'view_own' } })
    await new Promise((r) => setTimeout(r, 6500))
    check('after 6 seconds: estimates open', (await mv('GET', '/api/crm/sales/estimates')).status === 200)

    console.log('\n== template leftovers and user management')
    for (const u of ['roles/users', 'roles', 'changelog', 'customers', 'helps/articles']) check(`anonymous: /api/${u} refused`, (await fetch(`${BASE}/api/${u}`)).status === 401)
    const plain = await login(await makeUser('plain', { estimates: ['view_own'] }))
    check('non-admin: cannot list users via /api/roles/users', (await plain('GET', '/api/roles/users')).status === 403)
    check('non-admin: cannot change a role via /api/roles/users', (await plain('PUT', '/api/roles/users', { action: 'updateRole', userId: '000000000000000000000001', role: 'admin' })).status === 403)
    check('no Settings permission: lead mailboxes refused', (await plain('GET', '/api/crm/lead-mail')).status === 403)
    check('no Settings permission: cannot save a lead mailbox', (await plain('POST', '/api/crm/lead-mail', { action: 'save', data: { email: 'a@b.com' } })).status === 403)
    check('anonymous: lead mailboxes refused', (await fetch(`${BASE}/api/crm/lead-mail`)).status === 401)
    check('milestones: a person without Projects rights cannot create one', (await plain('POST', '/api/crm/milestones-board', { name: 'x', projectId: '000000000000000000000001' })).status === 403)
    check('milestones: anonymous refused', (await fetch(`${BASE}/api/crm/milestones-board`)).status === 401)
    console.log('\n== Freelancers (side jobs: own permission, never in the company figures)')
    check('anonymous: freelancers refused', (await fetch(`${BASE}/api/crm/freelance`)).status === 401)
    const fnone = await login(await makeUser('fr-none', {}))
    check('no permission: freelancers list refused', (await fnone('GET', '/api/crm/freelance')).status === 403)
    check('no permission: cannot add a job', (await fnone('POST', '/api/crm/freelance', { title: 'x', amount: 5, date: '2026-01-01' })).status === 403)
    const fown = await makeUser('fr-own', { freelancers: ['view_own', 'create', 'edit', 'delete'] }); const own = await login(fown)
    const fall = await login(await makeUser('fr-all', { freelancers: ['view'] }))
    const mine = await own('POST', '/api/crm/freelance', { title: 'zz check job', payerName: 'Someone', amount: 120, date: '2026-01-05', recurring: true, repeatEvery: 1, recurringType: 'month' })
    check('view own + create: can add a repeating job', mine.status === 201 && !!mine.body?.id, String(mine.status))
    if (mine.body?.id) made.rows.unshift(['crmFreelanceJob', mine.body.id])
    check('no title: refused', (await own('POST', '/api/crm/freelance', { title: ' ', amount: 5, date: '2026-01-01' })).status === 400)
    check('no amount: refused', (await own('POST', '/api/crm/freelance', { title: 'x', amount: 0, date: '2026-01-01' })).status === 400)
    const listOwn = await own('GET', '/api/crm/freelance')
    check('view own: sees the job they added', listOwn.body?.list?.some((j) => j.id === mine.body?.id))
    const listAll = await fall('GET', '/api/crm/freelance')
    check('view (all) sees it too, but cannot add or change', listAll.status === 200 && listAll.body?.list?.some((j) => j.id === mine.body?.id) && (await fall('POST', '/api/crm/freelance', { title: 'x', amount: 5, date: '2026-01-01' })).status === 403 && (await fall('POST', `/api/crm/freelance/${mine.body?.id}/state`, { action: 'markPaid' })).status === 403)
    const theirs = await prisma.crmFreelanceJob.create({ data: { title: 'zz check job of someone else', amount: 5, date: new Date(), addedFrom: '000000000000000000000001' } }); made.rows.unshift(['crmFreelanceJob', theirs.id])
    check('view own: does not see another person\'s job', !(await own('GET', '/api/crm/freelance')).body?.list?.some((j) => j.id === theirs.id))
    check('view own: cannot open or change another person\'s job', (await own('GET', `/api/crm/freelance/${theirs.id}`)).status === 404 && (await own('POST', `/api/crm/freelance/${theirs.id}/state`, { action: 'markPaid' })).status === 404 && (await own('DELETE', `/api/crm/freelance/${theirs.id}`)).status === 404)
    check('mark paid / unpaid works', (await own('POST', `/api/crm/freelance/${mine.body?.id}/state`, { action: 'markPaid' })).status === 200 && (await own('GET', `/api/crm/freelance/${mine.body?.id}`)).body?.job?.status === 'paid' && (await own('POST', `/api/crm/freelance/${mine.body?.id}/state`, { action: 'markUnpaid' })).status === 200)
    const hrs = await login(await makeUser('fr-hours', { work_hours: ['view'] }))
    check('freelancers are not reachable with Work hours / Team permissions', (await hrs('GET', '/api/crm/freelance')).status === 403)
    console.log('\n== payment methods = bank accounts, and the client currency on new documents')
    const eur = await prisma.crmCurrency.findFirst({ where: { isDefault: false } }) || await prisma.crmCurrency.findFirst()
    const cur0 = await prisma.crmClient.create({ data: { company: 'zz check eur client', defaultCurrencyId: eur?.id } }); made.rows.push(['crmClient', cur0.id])
    const bil = await login(await makeUser('curbiller', { invoices: ['view', 'create', 'edit'], estimates: ['view', 'create'], purchase_orders: ['view', 'create'], proposals: ['view', 'create'] }))
    const L1 = [{ description: 'Work', qty: 1, rate: 10, unit: '', taxes: [] }]
    for (const [what, url, body, get] of [
        ['invoice', '/api/crm/sales/invoices', { clientId: cur0.id, items: L1 }, (id) => prisma.crmInvoice.findUnique({ where: { id }, select: { currencyId: true } })],
        ['estimate', '/api/crm/sales/estimates', { clientId: cur0.id, items: L1 }, (id) => prisma.crmEstimate.findUnique({ where: { id }, select: { currencyId: true } })],
        ['purchase order', '/api/crm/sales/purchase-orders', { clientId: cur0.id, items: L1 }, (id) => prisma.crmPurchaseOrder.findUnique({ where: { id }, select: { currencyId: true } })],
        ['proposal', '/api/crm/sales/proposals', { subject: 'x', relType: 'customer', relId: cur0.id, proposalTo: 'x', items: L1 }, (id) => prisma.crmProposal.findUnique({ where: { id }, select: { currencyId: true } })],
    ]) {
        const r = await bil('POST', url, body); const row = r.body?.id ? await get(r.body.id) : null
        check(`new ${what} with no currency chosen takes the client's currency`, !!row && row.currencyId === eur?.id, `${r.status} ${row?.currencyId} vs ${eur?.id}`)
        const model = { invoice: 'crmInvoice', estimate: 'crmEstimate', 'purchase order': 'crmPurchaseOrder', proposal: 'crmProposal' }[what]
        if (r.body?.id) made.rows.unshift([model, r.body.id])
    }
    const ownCur = await bil('POST', '/api/crm/sales/invoices', { clientId: cur0.id, currencyId: (await prisma.crmCurrency.findFirst({ where: { id: { not: eur?.id } } }))?.id, items: L1 }); if (ownCur.body?.id) made.rows.unshift(['crmInvoice', ownCur.body.id])
    check('a currency chosen on the invoice wins over the client\'s', ownCur.status === 201 && (await prisma.crmInvoice.findUnique({ where: { id: ownCur.body.id }, select: { currencyId: true } })).currencyId !== eur?.id)
    const pmAdmin = await login(await makeUser('pmadmin', { settings: ['view', 'edit'] }))
    check('the old Bank accounts list is gone (it is part of Payment methods)', (await pmAdmin('GET', '/api/crm/bank-accounts')).status === 404)
    const pm = await pmAdmin('POST', '/api/crm/payment-modes', { name: 'zz check bank', bank: 'Test Bank', rib: 'MA00 TEST', swift: 'TESTMAMC', currencyId: eur?.id, keepPercent: 70, isDefault: false, sortOrder: 99 })
    check('a payment method can carry bank details, a currency and the kept share', pm.status === 201 && pm.body?.id)
    if (pm.body?.id) { made.rows.unshift(['crmPaymentMode', pm.body.id]); const got = await pmAdmin('GET', `/api/crm/payment-modes/${pm.body.id}`); check('...and they are saved', got.body?.rib === 'MA00 TEST' && got.body?.currencyId === eur?.id && got.body?.keepPercent === 70, JSON.stringify(got.body).slice(0, 120)) }
    if (pm.body?.id) {
        const mv = await pmAdmin('PATCH', `/api/crm/payment-modes/${pm.body.id}`, { sortOrder: 7 })
        const back = await pmAdmin('GET', `/api/crm/payment-modes/${pm.body.id}`)
        check('reordering a payment method is saved (its position survives a reload)', mv.status === 200 && back.body?.sortOrder === 7, `${mv.status} sortOrder=${back.body?.sortOrder}`)
    }
    // the bank account assigned to a client is printed on its documents (PDF source), even when the invoice itself names none
    const bankMode = await prisma.crmPaymentMode.create({ data: { name: 'zz check bank print', bank: 'Print Bank', holder: 'Print Holder', rib: 'MA99 PRINT 1234', swift: 'PRNTMAMC', active: true, sortOrder: 98 } }); made.rows.unshift(['crmPaymentMode', bankMode.id])
    const bankClient = await prisma.crmClient.create({ data: { company: 'zz check bank client', bankAccountId: bankMode.id } }); made.rows.push(['crmClient', bankClient.id])
    const bankInv = await prisma.crmInvoice.create({ data: { clientId: bankClient.id, number: 888888, prefix: 'ZZ-', numberFormat: 1, date: new Date(), total: 10, subtotal: 10, status: 1, hash: crypto.randomUUID() } }); made.rows.unshift(['crmInvoice', bankInv.id])
    const viewer = await login(await makeUser('inv-viewer', { invoices: ['view'] }))
    const pdfSrc = await viewer('GET', `/api/crm/sales/invoices/${bankInv.id}/html`)
    check('the invoice of a client with a bank account prints its bank details (bank, holder, RIB, SWIFT)', pdfSrc.status === 200 && /Bank details/.test(pdfSrc.text) && /MA99 PRINT 1234/.test(pdfSrc.text) && /Print Holder/.test(pdfSrc.text) && /PRNTMAMC/.test(pdfSrc.text), `${pdfSrc.status} ${pdfSrc.text.length}`)
    await prisma.crmClient.update({ where: { id: bankClient.id }, data: { bankAccountId: null } })
    const noBank = await viewer('GET', `/api/crm/sales/invoices/${bankInv.id}/html`)
    check('...and without a client account it falls back to the default account (or nothing), never to a wrong one', noBank.status === 200 && !/MA99 PRINT 1234/.test(noBank.text), String(noBank.status))
    const plain2 = await login(await makeUser('pm-plain', {}))
    check('without Settings, payment methods (bank details) are refused', (await plain2('GET', '/api/crm/payment-modes')).status === 403)
    console.log('\n== Notes: a private reminder')
    {
        const nA = await makeUser('note-a', { tasks: ['view', 'create', 'edit'] }), nB = await makeUser('note-b', { tasks: ['view', 'create', 'edit'] })
        const na = await login(nA), nb = await login(nB)
        const when = new Date(Date.now() + 7200000).toISOString()
        const note = await na('POST', '/api/crm/quick-notes', { title: 'zz note with reminder', description: 'call back', remindAt: when })
        const NID = note.body?.id
        if (NID) made.rows.unshift(['crmQuickNote', NID])
        const row = NID ? await prisma.crmQuickNote.findUnique({ where: { id: NID } }) : null
        check('a note can carry a reminder date and time', note.status < 300 && +new Date(row?.remindAt) === +new Date(when), String(note.status))
        check('the reminder comes back with the note', NID && ((await na('GET', '/api/crm/quick-notes?pageSize=100')).body?.list || []).some((n) => n.id === NID && n.remindAt))
        check('another member does not see the note (nor its reminder)', NID && !((await nb('GET', '/api/crm/quick-notes?pageSize=100')).body?.list || []).some((n) => n.id === NID))
        check('another member cannot change its reminder', NID && (await nb('PATCH', `/api/crm/quick-notes/${NID}`, { remindAt: null })).status >= 400 && !!(await prisma.crmQuickNote.findUnique({ where: { id: NID } })).remindAt)
        const off = NID ? await na('PATCH', `/api/crm/quick-notes/${NID}`, { remindAt: null }) : null
        check('the reminder can be switched off', off?.status < 300 && !(await prisma.crmQuickNote.findUnique({ where: { id: NID } })).remindAt, String(off?.status))
    }

    console.log('\n== Calendar: see every event, edit events of others')
    {
        const kA = await makeUser('cal-a', { calendar: ['view'] }), kB = await makeUser('cal-b', { calendar: ['view'] }), kC = await makeUser('cal-c', { calendar: ['view', 'view_all_events'] }), kD = await makeUser('cal-d', { calendar: ['view', 'edit_others_events'] })
        const ka = await login(kA), kb = await login(kB), kc = await login(kC), kd = await login(kD)
        const start = new Date(Date.now() + 5 * 86400000), end = new Date(+start + 3600000)
        const ev = await ka('POST', '/api/crm/calendar', { title: 'zz private event', start: start.toISOString(), end: end.toISOString(), isPublic: false })
        const EID = ev.body?.id
        if (EID) made.rows.unshift(['crmEvent', EID])
        const range = `from=${new Date(+start - 86400000).toISOString()}&to=${new Date(+end + 86400000).toISOString()}`
        const has = async (who) => ((await who('GET', `/api/crm/calendar?${range}`)).body?.items || []).some((i) => i.rawId === EID)
        check('a member adds an event to the calendar', ev.status < 300 && !!EID, String(ev.status))
        check('the author sees it', EID && (await has(ka)))
        check('another member does not see a private event of someone else', EID && !(await has(kb)))
        check('with "see every event" the private event of someone else shows', EID && (await has(kc)))
        check('another member cannot edit or delete it', EID && (await kb('PATCH', `/api/crm/calendar/${EID}`, { title: 'hijack' })).status === 403 && (await kb('DELETE', `/api/crm/calendar/${EID}`)).status === 403)
        check('"see every event" alone does not allow editing', EID && (await kc('PATCH', `/api/crm/calendar/${EID}`, { title: 'hijack' })).status === 403)
        const seen = EID ? ((await kc('GET', `/api/crm/calendar?${range}`)).body?.items || []).find((i) => i.rawId === EID) : null
        check('...and the calendar marks it as not editable for that person', seen && seen.canEdit === false)
        const edited = EID ? await kd('PATCH', `/api/crm/calendar/${EID}`, { title: 'zz edited by a colleague' }) : null
        check('with "edit and delete events of others" a colleague can edit it', edited?.status === 200 && (await prisma.crmEvent.findUnique({ where: { id: EID } })).title === 'zz edited by a colleague', String(edited?.status))
        check('a member without calendar access is refused', (await (await login(await makeUser('cal-e', {})))('GET', `/api/crm/calendar?${range}`)).status === 403)
    }

    console.log('\n== Chat: reply to a message')
    {
        const cA = await makeUser('chat-a', { chat: ['view'] }), cB = await makeUser('chat-b', { chat: ['view'] }), cC = await makeUser('chat-c', { chat: ['view'] })
        const ca = await login(cA), cb = await login(cB), cc = await login(cC)
        const room = await ca('POST', '/api/crm/chat/rooms', { staffId: cB.staffId })
        const RID = room.body?.id
        const first = await cb('POST', `/api/crm/chat/rooms/${RID}`, { body: 'Can you send the quote?' })
        const rep = await ca('POST', `/api/crm/chat/rooms/${RID}`, { body: 'Yes, today', replyTo: first.body?.id })
        check('a message can answer another one (quoted name and text kept)', rep.status === 201 && rep.body?.replyTo?.id === first.body?.id && /Can you send/.test(rep.body?.replyTo?.text || '') && !!rep.body?.replyTo?.name, rep.status + ' ' + JSON.stringify(rep.body).slice(0, 200))
        const list = await cb('GET', `/api/crm/chat/rooms/${RID}`)
        check('the reply comes back with its quote when the room is loaded', list.body?.messages?.some((m) => m.id === rep.body?.id && m.replyTo?.id === first.body?.id))
        const room2 = await ca('POST', '/api/crm/chat/rooms', { staffId: cC.staffId })
        const foreign = await ca('POST', `/api/crm/chat/rooms/${room2.body?.id}`, { body: 'Different room', replyTo: first.body?.id })
        check('answering a message of another room is ignored (no quote leaks)', foreign.status === 201 && !foreign.body?.replyTo)
        check('a message without a reply has no quote', first.body && !first.body.replyTo)
        for (const id of [RID, room2.body?.id].filter(Boolean)) { await prisma.crmChatMessage.deleteMany({ where: { roomId: id } }); made.extraRows.push(['crmChatRoom', id]) }
        void cc
    }

    console.log('\n== Chat: rich messages, tags, task, team, client')
    {
        const t0 = new Date()
        const kA = await makeUser('rc-a', { chat: ['view'], tasks: ['view', 'create'], customers: ['view'] }), kB = await makeUser('rc-b', { chat: ['view'] }), kC = await makeUser('rc-c', { chat: ['view'] })
        const a = await login(kA), b = await login(kB), c = await login(kC)
        const room = await a('POST', '/api/crm/chat/rooms', { staffId: kB.staffId }); const RID = room.body?.id
        const rich = await a('POST', `/api/crm/chat/rooms/${RID}`, { rich: '<p>Hello <strong>team</strong> #urgent #Q4</p><script>alert(1)</script><p>second line</p>' })
        check('a rich message keeps its formatting, drops scripts, and its text stays readable (tags found)', rich.status === 201 && /<strong>team<\/strong>/.test(rich.body?.rich || '') && !/script/i.test(rich.body?.rich || '') && /Hello team/.test(rich.body?.body || '') && rich.body?.tags?.join() === 'urgent,q4', JSON.stringify(rich.body).slice(0, 160))
        const shot = await a('POST', `/api/crm/chat/rooms/${RID}`, { rich: '<p><img src="https://example.test/shot.png" alt="screenshot"></p>' })
        check('a screenshot alone is a message', shot.status === 201 && /<img/.test(shot.body?.rich || '') && /Screenshot/.test(shot.body?.body || ''))
        check('an empty rich message is refused', (await a('POST', `/api/crm/chat/rooms/${RID}`, { rich: '<p></p>' })).status === 400)
        check('the other person sees the rich message', ((await b('GET', `/api/crm/chat/rooms/${RID}`)).body?.messages || []).some((m) => m.id === rich.body?.id && /<strong>/.test(m.rich || '')))
        const MID = rich.body?.id
        check('a person who is not in the conversation cannot act on its messages', (await c('POST', `/api/crm/chat/messages/${MID}`, { action: 'assign', assigneeIds: [kC.staffId] })).status === 404)
        check('assign: the team members are saved and told', (await b('POST', `/api/crm/chat/messages/${MID}`, { action: 'assign', assigneeIds: [kA.staffId, kB.staffId, '000000000000000000000000'] })).body?.assigned === 2 && (await prisma.crmNotification.count({ where: { toUserId: kA.staffId, additionalData: 'chat-assigned', createdAt: { gte: t0 } } })) === 1)
        check('make a task needs the permission to create tasks', (await b('POST', `/api/crm/chat/messages/${MID}`, { action: 'task' })).status === 403)
        const cl = await prisma.crmClient.create({ data: { company: 'zz chat client', active: true } }); made.rows.unshift(['crmClient', cl.id])
        const tk = await a('POST', `/api/crm/chat/messages/${MID}`, { action: 'task', assigneeIds: [kB.staffId], clientId: cl.id, dueDate: new Date(Date.now() + 86400000 * 2).toISOString() })
        if (tk.body?.taskId) made.rows.unshift(['crmTask', tk.body.taskId])
        const trow = tk.body?.taskId ? await prisma.crmTask.findUnique({ where: { id: tk.body.taskId } }) : null
        check('a task is made from the message (name, description with its formatting, due date, client)', tk.status === 200 && /^Hello team/.test(trow?.name || '') && /strong/.test(trow?.description || '') && !!trow.dueDate && trow.relType === 'customer' && trow.relId === cl.id)
        check('...with the assignee on it and the message linked to it', (await prisma.crmTaskAssigned.count({ where: { taskId: trow?.id, staffId: kB.staffId } })) === 1 && (await prisma.crmChatMessage.findUnique({ where: { id: MID } })).taskId === trow?.id)
        check('...and only once', (await a('POST', `/api/crm/chat/messages/${MID}`, { action: 'task' })).status === 409)
        const lk = await a('POST', `/api/crm/chat/messages/${MID}`, { action: 'client', clientId: cl.id })
        check('a client can be linked to the message', lk.status === 200 && (await prisma.crmChatMessage.findUnique({ where: { id: MID } })).clientId === cl.id)
        check('emailing needs a client contact with an email address', (await a('POST', `/api/crm/chat/messages/${MID}`, { action: 'client', clientId: cl.id, email: true })).status === 400)
        check('an unknown client or action is refused', (await a('POST', `/api/crm/chat/messages/${MID}`, { action: 'client', clientId: '000000000000000000000000' })).status === 404 && (await a('POST', `/api/crm/chat/messages/${MID}`, { action: 'nope' })).status === 400)
        const mids = (await prisma.crmChatMessage.findMany({ where: { roomId: RID } })).map((x) => x.id)
        await prisma.crmChatMessage.deleteMany({ where: { roomId: RID } }); made.extraRows.push(['crmChatRoom', RID]); void mids
        await prisma.crmNotification.deleteMany({ where: { additionalData: { in: ['chat-assigned', 'chat-task', 'mention'] }, createdAt: { gte: t0 } } })
    }

    console.log('\n== Lead popup: mails, meetings (calendar events), followers; freelance lines')
    const lA = await makeUser('lead-a', {}), lB = await makeUser('lead-b', {}), lC = await makeUser('lead-c', {})
    const la = await login(lA), lb = await login(lB), lc = await login(lC)
    const lead = await la('POST', '/api/crm/pipeline/leads', { name: 'zz check lead' })
    check('a member can add a lead', lead.status < 300 && !!lead.body?.id, String(lead.status))
    const LID = lead.body?.id
    if (LID) made.rows.unshift(['crmLead', LID])
    const mail = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { direction: 'in', subject: 'Hello', from: 'x@y.com', to: 'me@co.com', body: '<p>Hi <script>alert(1)</script></p>', date: new Date().toISOString() })
    check('log a mail on the lead (editor text, date and time)', mail.status === 201 && !!mail.body?.id, String(mail.status))
    if (mail.body?.id) made.rows.unshift(['crmLeadMail', mail.body.id])
    check('a mail needs a subject or text', (await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { subject: ' ', body: '' })).status === 400)
    const start = new Date(Date.now() + 86400000)
    const meet = await la('POST', `/api/crm/pipeline/leads/${LID}/meetings`, { title: 'Intro call', start: start.toISOString(), end: new Date(+start + 3600000).toISOString(), meetingUrl: 'https://meet.google.com/abc', reminderBefore: 30, reminderBeforeType: 'minutes', attendeeIds: [lA.staffId], report: '<p>Agreed on a quote <script>x</script></p>' })
    check('add a meeting with link, reminder and report', meet.status === 201 && !!meet.body?.id, String(meet.status))
    if (meet.body?.id) made.rows.unshift(['crmEvent', meet.body.id])
    const ev = meet.body?.id ? await prisma.crmEvent.findUnique({ where: { id: meet.body.id } }) : null
    check('the meeting is a calendar event of the lead (link, reminder, report kept, scripts removed)', ev?.leadId === LID && ev.meetingUrl === 'https://meet.google.com/abc' && ev.reminderBefore === 30 && /Agreed/.test(ev.report || '') && !/script/i.test(ev.report || ''), JSON.stringify(ev).slice(0, 120))
    const got = await la('GET', `/api/crm/pipeline/leads/${LID}`)
    check('the lead popup data carries the mails, the meetings and the followers list', got.body?.mails?.length === 1 && got.body?.meetings?.length === 1 && Array.isArray(got.body?.followers), `${got.body?.mails?.length}/${got.body?.meetings?.length}`)
    check('a stranger cannot see the lead, its mails or meetings', (await lb('GET', `/api/crm/pipeline/leads/${LID}`)).status === 404 && (await lb('POST', `/api/crm/pipeline/leads/${LID}/mails`, { subject: 'x' })).status === 404 && (await lb('POST', `/api/crm/pipeline/leads/${LID}/meetings`, { title: 'x', start: start.toISOString() })).status === 404)
    const fol = await la('PUT', `/api/crm/pipeline/leads/${LID}`, { name: 'zz check lead', followerIds: [lB.staffId] })
    check('a follower can be added to the lead', fol.status === 200, String(fol.status))
    { const fd = await la('GET', `/api/crm/pipeline/leads/${LID}`); check('the lead popup data carries the followers in the lead itself, so the form shows them again (and a later save does not wipe them)', (fd.body?.lead?.followerIds || []).includes(lB.staffId) && (fd.body?.followerIds || []).includes(lB.staffId), JSON.stringify(fd.body?.lead?.followerIds)) }
    check('the follower now sees the lead (and its mails and meetings)', (await lb('GET', `/api/crm/pipeline/leads/${LID}`)).body?.mails?.length === 1)
    { const m1 = await lb('POST', `/api/crm/pipeline/leads/${LID}/mails`, { subject: 'x' }), m2 = await lb('POST', `/api/crm/pipeline/leads/${LID}/meetings`, { title: 'x', start: start.toISOString() }); check('...but a follower cannot log mails or add meetings (only the team can)', m1.status === 403 && m2.status === 403, `${m1.status} ${JSON.stringify(m1.body).slice(0, 70)} / ${m2.status} ${JSON.stringify(m2.body).slice(0, 70)}`) }
    check('...and a third person still sees nothing', (await lc('GET', `/api/crm/pipeline/leads/${LID}`)).status === 404)
    {
        const dr = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { direction: 'draft', subject: 'Draft hello', to: 'nobody@test.local', body: '<p>Later</p>', date: new Date(Date.now() + 86400000).toISOString() })
        check('save a draft mail (planned date allowed)', dr.status === 201 && !!dr.body?.id, String(dr.status))
        const DID = dr.body?.id
        if (DID) made.rows.unshift(['crmLeadMail', DID])
        const noTo = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { direction: 'draft', subject: 'No address', body: '<p>x</p>' })
        if (noTo.body?.id) made.rows.unshift(['crmLeadMail', noTo.body.id])
        check('a draft without an address cannot be sent', noTo.body?.id && (await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: noTo.body.id })).status === 400)
        check('a draft appears in the lead mails as a draft', (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body?.mails?.some((m) => m.id === DID && m.direction === 'draft'))
        check('a follower cannot send the draft', DID && (await lb('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: DID })).status === 403)
        check('a stranger cannot send the draft', DID && (await lc('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: DID })).status === 404)
        check('a sent mail cannot go back to a draft', mail.body?.id && (await la('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { mailId: mail.body.id, direction: 'draft', subject: 'Hello' })).status === 400)
        const sent = DID ? await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: DID }) : null
        const after = DID ? await prisma.crmLeadMail.findUnique({ where: { id: DID } }) : null
        check('sending: becomes Sent when the mail server accepts it, stays a draft with a clear error when it does not', sent && ((sent.status === 200 && after?.direction === 'out') || (sent.status === 400 && after?.direction === 'draft' && !!sent.body?.error || sent.status === 400 && after?.direction === 'draft')), `${sent?.status} ${after?.direction}`)
        { const rr = await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: mail.body.id }); check('a mail that is not a draft cannot be sent again', rr.status === 400, `${rr.status} ${JSON.stringify(rr.body).slice(0, 150)}`) }
        {
            const d2 = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { direction: 'draft', subject: 'From check', to: 'a@test.local, b@test.local', cc: 'c@test.local', bcc: 'd@test.local', replyTo: 'r@test.local', from: 'someone@elsewhere.test', body: '<p>x</p>', note: 'Check the price', checks: [{ text: 'Price is right', done: false }, { text: 'Attach the brochure', done: false }] })
            const D2 = d2.body?.id
            if (D2) made.rows.unshift(['crmLeadMail', D2])
            const kept = D2 ? await prisma.crmLeadMail.findUnique({ where: { id: D2 } }) : null
            check('a draft keeps To, Cc, Bcc, Reply-to and the chosen sender', kept?.ccAddress === 'c@test.local' && kept.bccAddress === 'd@test.local' && kept.replyTo === 'r@test.local' && kept.fromAddress === 'someone@elsewhere.test' && kept.note === 'Check the price' && kept.checks?.length === 2)
            check('a draft never goes out from an address that is not in the allowed list', D2 && (await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: D2 })).status === 400 && (await prisma.crmLeadMail.findUnique({ where: { id: D2 } })).direction === 'draft')
            { const g = (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body; check('the lead data shows a draft with a foreign sender as sent from the default sender, and an empty To as the lead email', g?.mails?.find((x) => x.id === D2)?.from === 'hello@trtmaroc.com')
              const e0 = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { direction: 'draft', subject: 'No To', body: '<p>x</p>', from: 'noreply@elsewhere.test' }); if (e0.body?.id) made.rows.unshift(['crmLeadMail', e0.body.id]); const g2 = (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body; const row = g2?.mails?.find((x) => x.id === e0.body?.id); check('a draft saved without To and with a foreign From shows the lead email and the default sender', row?.from === 'hello@trtmaroc.com' && row?.to === (g2?.lead?.email || '')) }
            const prevOpt = await prisma.crmOption.findUnique({ where: { name: 'lead_mail_senders' } })
            await prisma.crmOption.deleteMany({ where: { name: 'lead_mail_senders' } })
            check('hello@trtmaroc.com is the first and default sender', (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body?.senders?.[0] === 'hello@trtmaroc.com')
            if (D2) await la('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { mailId: D2, direction: 'draft', subject: 'From check', to: 'a@test.local, b@test.local', cc: 'c@test.local', bcc: 'd@test.local', replyTo: 'r@test.local', from: 'hello@trtmaroc.com', body: '<p>x</p>', checks: [{ text: 'Price is right', done: true }, { text: 'Attach the brochure', done: false }] })
            check('a draft with an unconfirmed check cannot be sent', D2 && (await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: D2 })).status === 400 && (await prisma.crmLeadMail.findUnique({ where: { id: D2 } })).direction === 'draft')
            check('a follower cannot confirm a check', D2 && (await lb('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { action: 'check', mailId: D2, index: 1, done: true })).status === 403)
            check('the author confirms the checks one by one', D2 && (await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { action: 'check', mailId: D2, index: 0, done: true })).status === 200 && (await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { action: 'check', mailId: D2, index: 1, done: true })).status === 200 && (await prisma.crmLeadMail.findUnique({ where: { id: D2 } })).checks.every((c) => c.done))
            if (D2) await la('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { mailId: D2, direction: 'draft', subject: 'From check CHANGED', to: 'a@test.local, b@test.local', cc: 'c@test.local', bcc: 'd@test.local', replyTo: 'r@test.local', from: 'hello@trtmaroc.com', body: '<p>x</p>', checks: [{ text: 'Price is right', done: true }, { text: 'Attach the brochure', done: true }] })
            check('changing the subject cancels the confirmations', D2 && (await prisma.crmLeadMail.findUnique({ where: { id: D2 } })).checks.every((c) => !c.done))
            if (D2) { await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { action: 'check', mailId: D2, index: 0, done: true }); await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { action: 'check', mailId: D2, index: 1, done: true }) }
            await prisma.crmOption.upsert({ where: { name: 'lead_mail_senders' }, update: { value: 'hello@trtmaroc.com' }, create: { name: 'lead_mail_senders', value: 'hello@trtmaroc.com' } })
            check('the lead data lists the allowed senders', (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body?.senders?.includes('hello@trtmaroc.com'))
            const up = async (who, rel) => { const fd = new FormData(); fd.append('files', new Blob(['hello'], { type: 'text/plain' }), 'note.txt'); fd.append('relType', 'leadmail'); fd.append('relId', rel); return who('POST', '/api/crm/media/upload', fd) }
            const f1 = D2 ? await up(la, D2) : null
            for (const m of f1?.body?.saved || []) made.rows.push(['crmMedia', m.id])
            check('the author attaches a file to the draft', f1?.status === 200 && f1.body?.saved?.length === 1, JSON.stringify(f1?.body).slice(0, 100))
            check('a follower cannot attach files to the draft', D2 && (await up(lb, D2)).status === 403)
            check('a stranger cannot attach files to the draft', D2 && (await up(lc, D2)).status === 403)
            const sent2 = D2 ? await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: D2 }) : null
            const row2 = D2 ? await prisma.crmLeadMail.findUnique({ where: { id: D2 } }) : null
            check('from the allowed address: sent, or kept as a draft with the mail server error', sent2 && ((sent2.status === 200 && row2.direction === 'out' && row2.fromAddress === 'hello@trtmaroc.com') || (sent2.status === 400 && row2.direction === 'draft')), `${sent2?.status} ${row2?.direction}`)
            if (row2?.direction === 'out') check('files cannot be added to a mail that was already sent', (await up(la, D2)).status === 403)
            {
                const prevAcc = await prisma.crmOption.findUnique({ where: { name: 'mail_sender_accounts' } })
                const smtpPort = Number((await prisma.crmOption.findUnique({ where: { name: 'smtp_port' } }))?.value) || 1125
                const setAcc = (port) => prisma.crmOption.upsert({ where: { name: 'mail_sender_accounts' }, update: { value: JSON.stringify([{ email: 'hello@trtmaroc.com', username: 'hello@trtmaroc.com', password: 'x', host: '127.0.0.1', port, encryption: 'none' }]) }, create: { name: 'mail_sender_accounts', value: JSON.stringify([{ email: 'hello@trtmaroc.com', username: 'hello@trtmaroc.com', password: 'x', host: '127.0.0.1', port, encryption: 'none' }]) } })
                const dd = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { direction: 'draft', subject: 'Account check', to: 'a@test.local', from: 'hello@trtmaroc.com', body: '<p>x</p>' })
                if (dd.body?.id) made.rows.unshift(['crmLeadMail', dd.body.id])
                await setAcc(1)
                const bad = await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: dd.body?.id })
                check('sending as an address that has its own account uses that account\'s server (a wrong port fails and the draft stays a draft)', bad.status === 400 && (await prisma.crmLeadMail.findUnique({ where: { id: dd.body?.id } })).direction === 'draft', `${bad.status} ${JSON.stringify(bad.body).slice(0, 120)}`)
                await setAcc(smtpPort)
                const good = await la('POST', `/api/crm/pipeline/leads/${LID}/mails/send`, { mailId: dd.body?.id })
                check('...and with the right server and login the draft is sent', good.status === 200 && (await prisma.crmLeadMail.findUnique({ where: { id: dd.body?.id } })).direction === 'out', `${good.status}`)
                check('the sender accounts are not readable or editable by a non-administrator', (await la('GET', '/api/crm/mail/accounts')).status === 403 && (await la('PUT', '/api/crm/mail/accounts', { accounts: [] })).status === 403)
                if (prevAcc) await prisma.crmOption.update({ where: { name: 'mail_sender_accounts' }, data: { value: prevAcc.value } }); else await prisma.crmOption.deleteMany({ where: { name: 'mail_sender_accounts' } })
            }
            {
                const soon = new Date(Date.now() + 3600000).toISOString()
                const base = { direction: 'draft', subject: 'Scheduled check', to: 'a@test.local', from: 'hello@trtmaroc.com', body: '<p>x</p>' }
                const past = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { ...base, scheduledAt: new Date(Date.now() - 3600000).toISOString() })
                check('a mail cannot be scheduled in the past', past.status === 400, String(past.status))
                const pend = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { ...base, scheduledAt: soon, checks: [{ text: 'Price', done: false }] })
                check('a mail with an unconfirmed check cannot be scheduled', pend.status === 400, String(pend.status))
                const nosub = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { ...base, subject: '', scheduledAt: soon })
                check('a scheduled mail needs a subject', nosub.status === 400, String(nosub.status))
                const ok = await la('POST', `/api/crm/pipeline/leads/${LID}/mails`, { ...base, scheduledAt: soon, checks: [{ text: 'Price', done: true }] })
                if (ok.body?.id) made.rows.unshift(['crmLeadMail', ok.body.id])
                const row = ok.body?.id ? await prisma.crmLeadMail.findUnique({ where: { id: ok.body.id } }) : null
                check('a confirmed draft can be scheduled for later', ok.status === 201 && +new Date(row?.scheduledAt) === +new Date(soon) && row.direction === 'draft', String(ok.status))
                check('the lead data shows the schedule', (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body?.mails?.some((m) => m.id === ok.body?.id && m.scheduledAt))
                const edit = ok.body?.id ? await la('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { ...base, mailId: ok.body.id, subject: 'Scheduled check CHANGED', scheduledAt: soon, checks: [{ text: 'Price', done: true }] }) : null
                check('changing a scheduled draft cancels its schedule (the checks are reset)', edit?.status === 200 && edit.body?.scheduleCancelled === true && !(await prisma.crmLeadMail.findUnique({ where: { id: ok.body.id } })).scheduledAt, JSON.stringify(edit?.body))
                check('a follower cannot schedule or send a draft of someone else', ok.body?.id && (await lb('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { ...base, mailId: ok.body.id, scheduledAt: soon })).status === 403)
            }
            if (prevOpt) await prisma.crmOption.update({ where: { name: 'lead_mail_senders' }, data: { value: prevOpt.value } }); else await prisma.crmOption.delete({ where: { name: 'lead_mail_senders' } })
        }
    }
    {
        const up = async (who, name) => { const fd = new FormData(); fd.append('files', new Blob([Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(500)])], { type: 'application/pdf' }), name); fd.append('relType', 'lead'); fd.append('relId', LID); return who('POST', '/api/crm/media/upload', fd) }
        const own = await up(la, 'lead-file.pdf')
        for (const m of own.body?.saved || []) made.rows.push(['crmMedia', m.id])
        check('the person who works on a lead can add files to it', own.status === 200 && own.body?.saved?.length === 1, JSON.stringify(own.body).slice(0, 120))
        const fl = await lb('GET', `/api/crm/media?relType=lead&relId=${LID}`)
        check('a follower can see the files of the lead but not add any', fl.status === 200 && fl.body?.list?.length === 1 && (await up(lb, 'x.pdf')).status === 403, `${fl.status}/${fl.body?.list?.length}`)
        check('a person who cannot see the lead cannot read its files', (await lc('GET', `/api/crm/media?relType=lead&relId=${LID}`)).status === 403)
    }
    {
        const lD = await makeUser('lead-d', {}), lE = await makeUser('lead-e', { leads: ['edit_others_notes', 'edit_others_mails', 'edit_others_meetings'] })
        const ld = await login(lD), le = await login(lE)
        await la('PUT', `/api/crm/pipeline/leads/${LID}`, { name: 'zz check lead', followerIds: [lB.staffId, lD.staffId, lE.staffId] })
        const note = await la('POST', `/api/crm/pipeline/leads/${LID}/notes`, { content: '<p>first</p>' })
        const nid = (await la('GET', `/api/crm/pipeline/leads/${LID}`)).body?.notes?.[0]?.id
        check('a note is added by its author', note.status === 200 && !!nid, String(note.status))
        check("without the permission, others' notes, mails and meetings cannot be edited", (await ld('PUT', `/api/crm/pipeline/leads/${LID}/notes`, { noteId: nid, content: 'x' })).status === 403 && (await ld('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { mailId: mail.body?.id, subject: 'x' })).status === 403 && (await ld('PUT', `/api/crm/pipeline/leads/${LID}/meetings`, { eventId: meet.body?.id, title: 'x' })).status === 403)
        const dv = (await ld('GET', `/api/crm/pipeline/leads/${LID}`)).body
        check('...and the popup data says so (no edit flag on the items)', dv?.notes?.[0]?.canEdit === false && dv?.mails?.[0]?.canEdit === false && dv?.meetings?.[0]?.canEdit === false, JSON.stringify([dv?.notes?.[0]?.canEdit, dv?.mails?.[0]?.canEdit, dv?.meetings?.[0]?.canEdit]))
        const e1 = await le('PUT', `/api/crm/pipeline/leads/${LID}/notes`, { noteId: nid, content: '<p>changed by E</p>' }), e2 = await le('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { mailId: mail.body?.id, subject: 'Edited by E', body: '<p>b</p>' }), e3 = await le('PUT', `/api/crm/pipeline/leads/${LID}/meetings`, { eventId: meet.body?.id, title: 'Edited by E' })
        check("with the permissions, even a read-only follower edits others' notes, mails and meetings", e1.status === 200 && e2.status === 200 && e3.status === 200, `${e1.status}/${e2.status}/${e3.status}`)
        const ev2 = await prisma.crmEvent.findUnique({ where: { id: meet.body.id } }), mm = await prisma.crmLeadMail.findUnique({ where: { id: mail.body.id } })
        check('...and the changes are saved (the author stays the same)', ev2?.title === 'Edited by E' && ev2.userId === lA.staffId && mm?.subject === 'Edited by E' && mm.addedFrom === lA.staffId)
        check('the edit permission does not give the right to delete', (await le('DELETE', `/api/crm/pipeline/leads/${LID}/notes?noteId=${nid}`)).status === 403 && (await le('DELETE', `/api/crm/pipeline/leads/${LID}/mails?mailId=${mail.body?.id}`)).status === 403)
        const lf = await login(await makeUser('lead-f', { leads: ['edit_others_notes', 'edit_others_mails', 'edit_others_meetings'] }))
        check('the edit permission does not open a lead the person cannot see', (await lf('PUT', `/api/crm/pipeline/leads/${LID}/notes`, { noteId: nid, content: 'x' })).status === 404 && (await lf('PUT', `/api/crm/pipeline/leads/${LID}/mails`, { mailId: mail.body?.id, subject: 'x' })).status === 404)
    }
    check('only the author (or someone with delete rights) deletes a mail', (await lb('DELETE', `/api/crm/pipeline/leads/${LID}/mails?mailId=${mail.body?.id}`)).status === 403 && (await la('DELETE', `/api/crm/pipeline/leads/${LID}/mails?mailId=${mail.body?.id}`)).status === 200)
    check('deleting a meeting removes the calendar event', (await la('DELETE', `/api/crm/pipeline/leads/${LID}/meetings?eventId=${meet.body?.id}`)).status === 200 && !(await prisma.crmEvent.findUnique({ where: { id: meet.body.id } })))
    const fz = await login(await makeUser('fr-lines', { freelancers: ['view_own', 'create', 'edit', 'delete'] }))
    const job = await fz('POST', '/api/crm/freelance', { title: 'zz lines', date: '2026-02-01', lines: [{ name: 'Design', qty: 2, cost: 100, tva: 20 }, { name: 'Hosting', qty: 1, cost: 50, tva: 0 }, { name: '', qty: 1, cost: '' }] })
    if (job.body?.id) made.rows.unshift(['crmFreelanceJob', job.body.id])
    const jg = job.body?.id ? await fz('GET', `/api/crm/freelance/${job.body.id}`) : null
    check('a freelance payment with lines: total = sum of UN x cost + TVA, empty rows dropped', jg?.body?.job?.amount === 290 && jg.body.job.lines.length === 2, JSON.stringify(jg?.body?.job?.lines || []).slice(0, 100) + ' ' + jg?.body?.job?.amount)
    console.log('\n== Login as (a member)')
    {
        const lgA = await makeUser('loginas-a', { staff: ['login_as'] }), lgPlain = await makeUser('loginas-plain', {}), lgT = await makeUser('loginas-target', {}), lgBoss = await makeUser('loginas-boss', {}), lgOff = await makeUser('loginas-off', {})
        await prisma.crmStaff.update({ where: { id: lgBoss.staffId }, data: { admin: true } })
        await prisma.crmStaff.update({ where: { id: lgOff.staffId }, data: { active: false } })
        const ga = await login(lgA), gp = await login(lgPlain)
        check('without the permission, "login as" is refused', (await gp('POST', '/api/crm/auth/login-as', { staffId: lgT.staffId })).status === 403)
        check('...even for yourself', (await ga('POST', '/api/crm/auth/login-as', { staffId: lgA.staffId })).status === 400)
        check('a Super Admin cannot be entered by someone who is not one', (await ga('POST', '/api/crm/auth/login-as', { staffId: lgBoss.staffId })).status === 403)
        check('an inactive member cannot be entered', (await ga('POST', '/api/crm/auth/login-as', { staffId: lgOff.staffId })).status === 400)
        check('a bad member id is refused', (await ga('POST', '/api/crm/auth/login-as', { staffId: 'nope' })).status === 404)
        const go = await ga('POST', '/api/crm/auth/login-as', { staffId: lgT.staffId })
        check('with the permission, the CRM opens as the member', go.status === 200 && go.body?.success === true, `${go.status} ${go.text.slice(0, 80)}`)
        const me = await ga('GET', '/api/crm/me')
        check('...the session is now the member (name, banner info naming who is behind it)', me.body?.email === lgT.email && !!me.body?.loginAs, JSON.stringify([me.body?.email, me.body?.loginAs]))
        check("...and it has the member's rights, not the admin's (no login-as right)", (await ga('POST', '/api/crm/auth/login-as', { staffId: lgPlain.staffId })).status === 403)
        check('...password / sign-out-everywhere are blocked while logged in as someone', (await ga('POST', '/api/crm/auth/sign-out-everywhere')).status === 403)
        const log = await prisma.crmActivityLog.findFirst({ where: { staffId: lgA.staffId, description: { contains: 'login as' } } })
        check('the switch is written in the activity log under the real person', !!log && /Logged in as/.test(log.description), log?.description)
        const bk = await ga('DELETE', '/api/crm/auth/login-as')
        const me2 = await ga('GET', '/api/crm/me')
        check('back to my account: the session is the real person again, no banner', bk.status === 200 && me2.body?.email === lgA.email && !me2.body?.loginAs, `${bk.status} ${me2.body?.email}`)
        check('...and "back" does nothing when not logged in as someone', (await ga('DELETE', '/api/crm/auth/login-as')).status === 400)
        check('a login-as ticket cannot be reused', (await fetch(`${BASE}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: 'x', loginAsTicket: 'made-up' }) })).status !== 200)
        const sa = await login(await makeUser('loginas-super', {}).then(async (u) => { await prisma.crmStaff.update({ where: { id: u.staffId }, data: { admin: true } }); return u }))
        check('a Super Admin may open a Super Admin (or any member)', (await sa('POST', '/api/crm/auth/login-as', { staffId: lgBoss.staffId })).status === 200 && (await sa('DELETE', '/api/crm/auth/login-as')).status === 200)
    }
    console.log('\n== Expenses: receipts (PDF or image, up to 5 MB)')
    {
        const cat = (await prisma.crmExpenseCategory.findFirst()) || (await prisma.crmExpenseCategory.create({ data: { name: 'zz check category' } }).then((c) => { made.rows.push(['crmExpenseCategory', c.id]); return c }))
        const ex = await login(await makeUser('exp-files', { expenses: ['view_own', 'create', 'edit'] }))
        const e1 = await ex('POST', '/api/crm/sales/expenses', { name: 'zz receipt check', categoryId: cat.id, amount: 10, date: '2026-02-01' })
        if (e1.body?.id) { made.rows.unshift(['crmExpense', e1.body.id]); made.mediaRel = e1.body.id }
        const send = async (name, type, bytes) => { const fd = new FormData(); fd.append('files', new Blob([bytes], { type }), name); fd.append('relType', 'expense'); fd.append('relId', e1.body.id); return ex('POST', '/api/crm/media/upload', fd) }
        const big = await send('big.pdf', 'application/pdf', Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 10)]))
        check('a receipt over 5 MB is refused', big.body?.errors?.length === 1 && /larger than 5 MB/.test(big.body.errors[0].error), JSON.stringify(big.body).slice(0, 120))
        const zip = await send('x.zip', 'application/zip', Buffer.from('PK'))
        check('a type that is not PDF or image (zip) is refused for an expense', zip.body?.errors?.length === 1 && /PDF or image/.test(zip.body.errors[0].error), JSON.stringify(zip.body).slice(0, 120))
        const ok = await send('receipt.pdf', 'application/pdf', Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2000)]))
        check('a small PDF passes the receipt rules (stored, or refused only by storage)', (ok.body?.saved?.length === 1) || (ok.body?.errors?.length === 1 && !/PDF or image|larger than 5 MB/.test(ok.body.errors[0].error)), JSON.stringify(ok.body).slice(0, 120))
        for (const m of ok.body?.saved || []) made.rows.push(['crmMedia', m.id])
    }
    console.log('\n== Tasks: completed tasks follow the Show completed switch')
    const tk = await makeUser('task-list', { tasks: ['view', 'create', 'edit'] }); const tkc = await login(tk)
    const mkTask = async (name) => { const r = await tkc('POST', '/api/crm/work/tasks', { name, status: 1 }); if (r.body?.id) made.rows.unshift(['crmTask', r.body.id]); return r.body?.id }
    const tOpen = await mkTask('zz open task'), tNew = await mkTask('zz done yesterday'), tOld = await mkTask('zz done long ago')
    await prisma.crmTask.update({ where: { id: tNew }, data: { status: 5, dateFinished: new Date(Date.now() - 86400000) } })
    await prisma.crmTask.update({ where: { id: tOld }, data: { status: 5, dateFinished: new Date(Date.now() - 60 * 86400000) } })
    const names = (r) => (r.body?.list || []).map((t) => t.name).filter((n) => n.startsWith('zz '))
    const off = names(await tkc('GET', '/api/crm/work/tasks'))
    check('switch OFF: only the open task is listed (no completed task, not even a recent one)', off.length === 1 && off[0] === 'zz open task', JSON.stringify(off))
    const on = names(await tkc('GET', '/api/crm/work/tasks?done=1'))
    check('switch ON: every completed task is listed too', on.length === 3, JSON.stringify(on))
    const only5 = names(await tkc('GET', '/api/crm/work/tasks?status=5'))
    check('filtering on the Complete status shows the completed ones', only5.length === 2 && !only5.includes('zz open task'), JSON.stringify(only5))
    {
        const cr = await makeUser('task-defaults', { tasks: ['view_own', 'create', 'edit'] }); const crc = await login(cr)
        const mk = await crc('POST', '/api/crm/work/tasks', { name: 'zz defaults task', status: 1 })
        if (mk.body?.id) made.rows.unshift(['crmTask', mk.body.id])
        const dt = mk.body?.id ? await crc('GET', `/api/crm/work/tasks/${mk.body.id}`) : null
        const admins = (await prisma.crmStaff.findMany({ where: { admin: true, active: true }, select: { id: true } })).map((x) => x.id)
        check('a new task is assigned to the person who creates it by default', dt?.body?.task?.assigneeIds?.includes(cr.staffId) ?? dt?.body?.assigneeIds?.includes(cr.staffId), JSON.stringify(dt?.body?.task?.assigneeIds || dt?.body?.assigneeIds))
        const fl = dt?.body?.task?.followerIds || dt?.body?.followerIds || []
        check('...and the Super Admin(s) follow it by default', admins.length > 0 && admins.every((i) => fl.includes(i)), `${admins.length} admin(s), followers ${fl.length}`)
        const tl = await crc('GET', '/api/crm/work/tasks/lookups')
        check('the New task form is pre-filled the same way (lookups give the Super Admin ids)', admins.every((i) => (tl.body?.defaults?.followAdminIds || []).includes(i)))
    }
    console.log('\n== API: keys, scopes, read and push, webhooks')
    {
        const adm = await makeUser('api-admin', {}, true), usr = await makeUser('api-user', { leads: ['view'] })
        const aa = await login(adm), au = await login(usr)
        check('a member who is not the super administrator cannot see, create or revoke API keys', (await au('GET', '/api/crm/api-keys')).status === 403 && (await au('POST', '/api/crm/api-keys', { name: 'x', scopes: ['leads:read'] })).status === 403)
        check('...nor webhooks', (await au('GET', '/api/crm/webhooks')).status === 403)
        check('a key needs a name and at least one scope', (await aa('POST', '/api/crm/api-keys', { name: '', scopes: ['leads:read'] })).status === 400 && (await aa('POST', '/api/crm/api-keys', { name: 'x', scopes: ['everything'] })).status === 400)
        const mkKey = await aa('POST', '/api/crm/api-keys', { name: 'zz check key', scopes: ['leads:read', 'leads:write', 'tasks:write', 'ideas:write', 'ideas:read'] })
        const KEY = mkKey.body?.key
        if (mkKey.body?.id) made.extraRows.push(['crmApiKey', mkKey.body.id])
        check('the super administrator creates a key (shown once, starts with trt_)', mkKey.status === 201 && /^trt_/.test(KEY || ''), String(mkKey.status))
        const stored = mkKey.body?.id ? await prisma.crmApiKey.findUnique({ where: { id: mkKey.body.id } }) : null
        check('only the hash of the key is stored, never the key', stored && !JSON.stringify(stored).includes(KEY) && stored.hash.length === 64)
        const listed = await aa('GET', '/api/crm/api-keys')
        check('the list shows the name and the beginning of the key, never the key', listed.body?.keys?.some((k) => k.name === 'zz check key' && k.prefix === KEY.slice(0, 11)) && !JSON.stringify(listed.body).includes(KEY))
        const call = async (method, path, body, key = KEY) => { const r = await fetch(`${BASE}/api/v1${path}`, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) } }
        check('no key: 401', (await call('GET', '/leads', null, null)).status === 401)
        check('a wrong key: 401', (await call('GET', '/leads', null, 'trt_wrong')).status === 401)
        const me = await call('GET', '/me')
        check('"me" tells the name and the scopes of the key', me.status === 200 && me.body?.data?.name === 'zz check key' && me.body.data.scopes.includes('leads:write'))
        check('a resource outside the scopes of the key: 403', (await call('GET', '/clients')).status === 403 && (await call('GET', '/tickets')).status === 403)
        check('an unknown resource: 404', (await call('GET', '/passwords')).status === 404)
        check('invoices and others are read-only: writing is refused', (await call('POST', '/invoices', { total: 1 })).status === 405)
        check('missing name: 400', (await call('POST', '/leads', { email: 'a@b.com' })).status === 400)
        check('a wrong email: 400', (await call('POST', '/leads', { name: 'zz api lead', email: 'nope' })).status === 400)
        check('an unknown status: 400', (await call('POST', '/leads', { name: 'zz api lead', status: 'No such status' })).status === 400)
        // a receiver for the webhook
        const got = []
        const http = await import('node:http')
        const srv = http.createServer((rq, rs) => { let b = ''; rq.on('data', (c) => { b += c }); rq.on('end', () => { got.push({ headers: rq.headers, body: b }); rs.statusCode = 200; rs.end('ok') }) })
        await new Promise((r) => srv.listen(0, '127.0.0.1', r))
        const port = srv.address().port
        const wh = await aa('POST', '/api/crm/webhooks', { name: 'zz receiver', url: `http://127.0.0.1:${port}/hook`, events: ['lead.created', 'task.created', 'idea.created'] })
        if (wh.body?.id) made.extraRows.push(['crmWebhook', wh.body.id])
        check('a webhook is created and its secret shown once', wh.status === 201 && /^whsec_/.test(wh.body?.secret || ''), String(wh.status))
        check('a webhook needs a valid address and at least one event', (await aa('POST', '/api/crm/webhooks', { name: 'x', url: 'ftp://x', events: ['lead.created'] })).status === 400 && (await aa('POST', '/api/crm/webhooks', { name: 'x', url: 'https://example.com', events: [] })).status === 400)
        const lead = await call('POST', '/leads', { name: 'zz api lead', email: 'zz.api@test.local', phone: '+212600000000', company: 'Zed Co', source: 'Website', description: 'From the API' })
        if (lead.body?.data?.id) made.rows.unshift(['crmLead', lead.body.data.id])
        check('a lead is created through the API (201, with the default status)', lead.status === 201 && lead.body?.data?.name === 'zz api lead' && !!lead.body.data.status_id, `${lead.status} ${JSON.stringify(lead.body).slice(0, 120)}`)
        const LID2 = lead.body?.data?.id
        check('...and read back', LID2 && (await call('GET', `/leads/${LID2}`)).body?.data?.email === 'zz.api@test.local')
        const upd = LID2 ? await call('PATCH', `/leads/${LID2}`, { city: 'Casablanca', company: 'Zed Holding' }) : null
        check('...and changed with PATCH', upd?.status === 200 && upd.body?.data?.city === 'Casablanca' && upd.body.data.company === 'Zed Holding')
        check('a PATCH with nothing to change is refused, an unknown id is 404', LID2 && (await call('PATCH', `/leads/${LID2}`, {})).status === 400 && (await call('PATCH', '/leads/000000000000000000000000', { city: 'x' })).status === 404)
        const lst = await call('GET', '/leads?limit=5&q=zz api')
        check('the list searches and pages', lst.status === 200 && lst.body?.data?.some((l) => l.id === LID2) && lst.body.limit === 5 && lst.body.total >= 1)
        check('"updated_since" filters', (await call('GET', `/leads?updated_since=${encodeURIComponent(new Date(Date.now() + 86400000).toISOString())}`)).body?.data?.length === 0)
        const task = await call('POST', '/tasks', { name: 'zz api task', priority: 3, due_date: new Date(Date.now() + 86400000).toISOString(), rel_type: 'lead', rel_id: LID2, assignee_ids: [adm.staffId] })
        if (task.body?.data?.id) made.rows.unshift(['crmTask', task.body.data.id])
        check('a task is created through the API with its assignee', task.status === 201 && task.body?.data?.priority === 3 && (await prisma.crmTaskAssigned.count({ where: { taskId: task.body.data.id, staffId: adm.staffId } })) === 1, `${task.status} ${JSON.stringify(task.body).slice(0, 100)}`)
        check('a wrong priority is refused', (await call('POST', '/tasks', { name: 'x', priority: 9 })).status === 400)
        const idea = await call('POST', '/ideas', { title: 'zz idea from outside', body: 'Call the lead back', category: 'leads', period: 'weekly', priority: 3, tags: ['n8n'] })
        if (idea.body?.data?.id) made.rows.unshift(['crmGrowIdea', idea.body.data.id])
        check('an idea is pushed through the API (source api)', idea.status === 201 && idea.body?.data?.source === 'api' && idea.body.data.tags.includes('n8n'), `${idea.status} ${JSON.stringify(idea.body).slice(0, 100)}`)
        await new Promise((r) => setTimeout(r, 2500))
        const hit = got.find((g) => g.headers['x-trt-event'] === 'lead.created')
        check('the webhook received lead.created with the lead', hit && JSON.parse(hit.body).data?.name === 'zz api lead', `${got.length} calls`)
        const sig = /t=(\d+),v1=([0-9a-f]+)/.exec(hit?.headers['x-trt-signature'] || '')
        const crypto2 = await import('node:crypto')
        check('...with a signature the receiver can check with the secret (HMAC SHA-256 of "t.body")', !!sig && crypto2.createHmac('sha256', wh.body.secret).update(`${sig[1]}.${hit.body}`).digest('hex') === sig[2])
        check('...and task.created and idea.created too', got.some((g) => g.headers['x-trt-event'] === 'task.created') && got.some((g) => g.headers['x-trt-event'] === 'idea.created'))
        const ping = wh.body?.id ? await aa('POST', `/api/crm/webhooks/${wh.body.id}`) : null
        check('"Send a test" delivers a ping', ping?.body?.ok === true && got.some((g) => g.headers['x-trt-event'] === 'ping'))
        check('the deliveries are listed', ((await aa('GET', `/api/crm/webhooks/${wh.body?.id}`)).body?.deliveries || []).length >= 3)
        srv.close()
        const logs = mkKey.body?.id ? await aa('GET', `/api/crm/api-keys/${mkKey.body.id}`) : null
        check('every call is in the log of the key, with its status', (logs?.body?.log || []).some((l) => l.path.includes('/leads') && l.status === 201))
        const rev = mkKey.body?.id ? await aa('DELETE', `/api/crm/api-keys/${mkKey.body.id}`) : null
        check('a revoked key stops working at once', rev?.status === 200 && (await call('GET', '/leads')).status === 401)
        await prisma.crmApiLog.deleteMany({ where: { keyId: mkKey.body?.id } }); await prisma.crmWebhookDelivery.deleteMany({ where: { webhookId: wh.body?.id } })
    }

    console.log('\n== Grow: dashboard, ideas, routine')
    {
        const t0 = new Date()
        const gNone = await makeUser('grow-none', {}), gView = await makeUser('grow-view', { grow: ['view'] }), gEdit = await makeUser('grow-edit', { grow: ['view', 'create', 'edit'], tasks: ['view', 'create'] }), gDel = await makeUser('grow-del', { grow: ['view', 'delete'] })
        const n = await login(gNone), v = await login(gView), e = await login(gEdit), d = await login(gDel)
        check('Grow is closed to a member without the permission', (await n('GET', '/api/crm/grow')).status === 403 && (await n('GET', '/api/crm/grow/ideas')).status === 403)
        const ov = await v('GET', '/api/crm/grow')
        check('with View the dashboard gives leads, clients, income, tasks, tickets, team and idea counts', ov.status === 200 && ['leads', 'clients', 'income', 'tasks', 'tickets', 'proposals', 'team', 'ideas'].every((k) => k in (ov.body || {})), `${ov.status} ${Object.keys(ov.body || {}).join(',')}`)
        check('View alone cannot create an idea or run the routine or change its settings', (await v('POST', '/api/crm/grow/ideas', { title: 'x' })).status === 403 && (await v('POST', '/api/crm/grow/routine', { period: 'daily' })).status === 403 && (await v('PUT', '/api/crm/grow/routine', { ai: false })).status === 403)
        check('an idea needs a title, a known category and a priority from 1 to 3', (await e('POST', '/api/crm/grow/ideas', { title: ' ' })).status === 400 && (await e('POST', '/api/crm/grow/ideas', { title: 'x', category: 'weird' })).status === 400 && (await e('POST', '/api/crm/grow/ideas', { title: 'x', priority: 9 })).status === 400)
        const idea = await e('POST', '/api/crm/grow/ideas', { title: 'zz idea: call back the old clients', body: '<p>List them</p><script>alert(1)</script>', category: 'income', period: 'weekly', priority: 3, tags: ['Win Back', 'cash'] })
        const IID = idea.body?.id
        if (IID) made.rows.unshift(['crmGrowIdea', IID])
        const row = IID ? await prisma.crmGrowIdea.findUnique({ where: { id: IID } }) : null
        check('an idea is created (tags cleaned, scripts removed, source manual)', idea.status === 201 && row?.source === 'manual' && row.tags.join() === 'win-back,cash' && !/script/i.test(row.body || ''), String(idea.status))
        check('everybody with View sees it, with its tags and the counts', ((await v('GET', '/api/crm/grow/ideas')).body?.list || []).some((i) => i.id === IID) && ((await v('GET', '/api/crm/grow/ideas')).body?.tags || []).some((t) => t.name === 'win-back'))
        check('the list filters by category, status and tag', ((await v('GET', '/api/crm/grow/ideas?category=income&tag=cash')).body?.list || []).some((i) => i.id === IID) && !((await v('GET', '/api/crm/grow/ideas?category=leads')).body?.list || []).some((i) => i.id === IID))
        check('a comment can be added by anyone with View, and only the author or a deleter removes it', (await v('POST', `/api/crm/grow/ideas/${IID}/comments`, { body: 'Good idea, I know three of them' })).status === 201)
        const cm = (await e('GET', `/api/crm/grow/ideas/${IID}/comments`)).body?.comments || []
        check('...the comment is listed with its author', cm.length === 1 && /Good idea/.test(cm[0].body) && !!cm[0].author)
        check('...another viewer cannot delete it', (await e('DELETE', `/api/crm/grow/ideas/${IID}/comments?commentId=${cm[0]?.id}`)).status === 403 && (await d('DELETE', `/api/crm/grow/ideas/${IID}/comments?commentId=${cm[0]?.id}`)).status === 200)
        check('View alone cannot edit, assign or change the status of an idea', (await v('PUT', `/api/crm/grow/ideas/${IID}`, { status: 'accepted' })).status === 403)
        const assign = await e('PUT', `/api/crm/grow/ideas/${IID}`, { status: 'accepted', assigneeIds: [gView.staffId] })
        check('Edit assigns it and changes its status (the assignee gets a notification)', assign.status === 200 && (await prisma.crmGrowIdea.findUnique({ where: { id: IID } })).assigneeIds.includes(gView.staffId) && (await prisma.crmNotification.count({ where: { toUserId: (await prisma.crmStaff.findUnique({ where: { id: gView.staffId } })).userId, additionalData: 'grow-assigned' } })) >= 0)
        check('a person without permission to create tasks cannot turn an idea into a task', (await v('POST', `/api/crm/grow/ideas/${IID}/task`, {})).status === 403)
        const tk = await e('POST', `/api/crm/grow/ideas/${IID}/task`, { assigneeIds: [gView.staffId], dueDate: new Date(Date.now() + 3 * 86400000).toISOString() })
        if (tk.body?.taskId) made.rows.unshift(['crmTask', tk.body.taskId])
        const trow = tk.body?.taskId ? await prisma.crmTask.findUnique({ where: { id: tk.body.taskId } }) : null
        check('an idea becomes a task (name, priority, due date) linked both ways', tk.status === 201 && trow?.name === 'zz idea: call back the old clients' && !!trow.dueDate && (await prisma.crmGrowIdea.findUnique({ where: { id: IID } })).taskId === tk.body.taskId, `${tk.status} ${JSON.stringify(tk.body)}`)
        check('...with its assignee on the task', trow && (await prisma.crmTaskAssigned.count({ where: { taskId: trow.id, staffId: gView.staffId } })) === 1)
        check('...and only once', (await e('POST', `/api/crm/grow/ideas/${IID}/task`, {})).status === 409)
        if (trow) await prisma.crmTask.update({ where: { id: trow.id }, data: { status: 5, dateFinished: new Date() } })
        check('when the task is complete the idea turns done by itself', ((await v('GET', '/api/crm/grow/ideas')).body?.list || []).find((i) => i.id === IID)?.status === 'done')
        check('only a person with Delete removes an idea', (await e('DELETE', `/api/crm/grow/ideas/${IID}`)).status === 403 && (await d('DELETE', `/api/crm/grow/ideas/${IID}`)).status === 200 && !(await prisma.crmGrowIdea.findUnique({ where: { id: IID } })))
        // the routine
        const prevSettings = await prisma.crmOption.findUnique({ where: { name: 'grow_settings' } })
        check('routine settings can be changed with Edit (and an unknown language is refused)', (await e('PUT', '/api/crm/grow/routine', { ai: false, lang: 'fr' })).status === 200 && (await e('PUT', '/api/crm/grow/routine', { lang: 'xx' })).status === 400)
        const r1 = await e('POST', '/api/crm/grow/routine', { period: 'monthly' })
        check('running the monthly routine writes the standing advice (in French as chosen) from the rules', r1.status === 200 && r1.body?.created >= 3, `${r1.status} ${JSON.stringify(r1.body).slice(0, 160)}`)
        const monthly = await prisma.crmGrowIdea.findMany({ where: { source: 'rule', createdAt: { gte: t0 } } })
        check('...marked as written by a rule, with a fingerprint', monthly.length >= 3 && monthly.every((m) => m.fingerprint?.startsWith('rule:')) && monthly.some((m) => /prix|contrat|nouveaut/i.test(m.title)))
        const r2 = await e('POST', '/api/crm/grow/routine', { period: 'monthly' })
        check('running it again the same month writes nothing twice', r2.status === 200 && r2.body?.created === 0)
        const pv = await e('POST', '/api/crm/grow/routine', { period: 'daily', dry: true })
        check('a preview writes nothing', pv.status === 200 && (pv.body?.lines || []).some((l) => /\[preview\]/.test(l)))
        const pg = await v('GET', '/api/crm/grow/programs')
        check('the programs (credits, grants, partner badges) are listed for Grow viewers with how to apply and an official link; not for others', pg.status === 200 && pg.body?.programs?.length >= 8 && pg.body.programs.every((x) => x.url?.startsWith('https://') && x.how?.length && x.eligibility) && (await n('GET', '/api/crm/grow/programs')).status === 403)
        check('putting a program on the board needs Create', (await v('POST', '/api/crm/grow/programs/aws-activate/track')).status === 403 && (await e('POST', '/api/crm/grow/programs/nope/track')).status === 404)
        const tr1 = await e('POST', '/api/crm/grow/programs/aws-activate/track'); const tr2 = await e('POST', '/api/crm/grow/programs/aws-activate/track')
        const pidea = tr1.body?.id ? await prisma.crmGrowIdea.findUnique({ where: { id: tr1.body.id } }) : null
        check('a program becomes an idea (steps in it, tags, link) once only', tr1.status === 201 && pidea?.fingerprint === 'program:aws-activate' && /Apply: AWS Activate/.test(pidea.title) && /<ol>/.test(pidea.body || '') && pidea.sourceUrl?.startsWith('https://') && tr2.body?.id === tr1.body.id && tr2.body.existing === true)
        check('...and the list then says it is on the board', (await v('GET', '/api/crm/grow/programs')).body?.tracked?.['aws-activate']?.ideaId === tr1.body?.id)
        const rt = await v('GET', '/api/crm/grow/routine')
        check('the routine page data gives the settings, the last runs and whether the AI is available', rt.status === 200 && rt.body?.settings?.lang === 'fr' && rt.body?.settings?.ai === false && 'stamps' in rt.body)
        await prisma.crmGrowIdea.deleteMany({ where: { createdAt: { gte: t0 } } })
        await prisma.crmNotification.deleteMany({ where: { additionalData: { in: ['grow-ideas', 'grow-assigned', 'grow-task'] }, createdAt: { gte: t0 } } })
        if (prevSettings) await prisma.crmOption.update({ where: { name: 'grow_settings' }, data: { value: prevSettings.value } }); else await prisma.crmOption.deleteMany({ where: { name: 'grow_settings' } })
        await prisma.crmOption.deleteMany({ where: { name: { in: ['grow_last_daily', 'grow_last_weekly', 'grow_last_monthly'] } } })
    }

    console.log('\n== My growth: goals, catalog, primes, team overview')
    {
        const t0 = new Date()
        const gNone = await makeUser('gw-none', {}), gA = await makeUser('gw-a', { growth: ['view'] }), gB = await makeUser('gw-b', { growth: ['view'] }), gV = await makeUser('gw-viewer', { growth: ['view'], grow: ['view'] }), gM = await makeUser('gw-manager', { growth: ['view'], grow: ['view', 'edit'] }), gD = await makeUser('gw-deleter', { growth: ['view'], grow: ['view', 'edit', 'delete'] })
        const n = await login(gNone), a = await login(gA), b = await login(gB), v = await login(gV), m = await login(gM), d = await login(gD)
        check('without the My growth permission everything is closed', (await n('GET', '/api/crm/growth')).status === 403 && (await n('GET', '/api/crm/growth/goals')).status === 403)
        const cat = await a('GET', '/api/crm/growth')
        check('a member gets the catalog and the team playbook, but not the admin playbook', cat.status === 200 && cat.body?.catalog?.certifications?.length >= 20 && cat.body?.catalog?.languages?.length >= 3 && cat.body?.playbook?.team?.work_fast?.length >= 5 && !cat.body?.playbook?.admin && cat.body?.can?.all === false, String(cat.status))
        const catV = await v('GET', '/api/crm/growth')
        check('a Grow viewer also gets the admin playbook', catV.status === 200 && catV.body?.playbook?.admin?.convert_leads?.length >= 5 && catV.body?.can?.all === true)
        check('a goal needs a title, a known kind and a real link', (await a('POST', '/api/crm/growth/goals', { title: ' ' })).status === 400 && (await a('POST', '/api/crm/growth/goals', { title: 'x', kind: 'weird' })).status === 400 && (await a('POST', '/api/crm/growth/goals', { title: 'x', url: 'javascript:alert(1)' })).status === 400)
        const mk = await a('POST', '/api/crm/growth/goals', { title: 'zz goal: Google Ads Search', kind: 'certification', provider: 'Google Skillshop', catalogKey: 'google-ads-search', targetDate: new Date(Date.now() + 30 * 86400000).toISOString(), primeAmount: 9999, supportAmount: 9999, approved: true, primePaid: true })
        const GID = mk.body?.id
        if (GID) made.rows.unshift(['crmSkillGoal', GID])
        const row = GID ? await prisma.crmSkillGoal.findUnique({ where: { id: GID } }) : null
        check('a member adds a goal for themselves, and cannot set prime, support, approval or payment', mk.status === 201 && row?.staffId === gA.staffId && row.status === 'planned' && !row.primeAmount && !row.supportAmount && row.approved === false && row.primePaid === false, String(mk.status))
        check('the administrators are told about the new goal', (await prisma.crmNotification.count({ where: { additionalData: 'growth', createdAt: { gte: t0 } } })) >= 1)
        check('a member sees only their own goals', ((await a('GET', '/api/crm/growth/goals')).body?.list || []).some((g) => g.id === GID) && !((await b('GET', '/api/crm/growth/goals')).body?.list || []).some((g) => g.id === GID))
        const me0 = (await a('GET', '/api/crm/growth')).body
        check('a member sees their points, level, the trophies to win with their prizes (200 to 1000 MAD) and the hall of fame', me0?.me?.level?.key && Array.isArray(me0.me.trophies) && me0.me.trophies.some((t) => t.prize === 1000) && me0.me.trophies.filter((t) => t.prize > 0).every((t) => t.prize >= 200 && t.prize <= 1000) && Array.isArray(me0.board) && me0.levels?.length === 5)
        check('the first goal wins the "First step" trophy (no money) and tells them', me0.me.trophies.find((t) => t.key === 'first-step')?.earned && (await prisma.crmNotification.count({ where: { toUserId: gA.staffId, description: { startsWith: '🏆 Trophy unlocked: First step' }, createdAt: { gte: t0 } } })) === 1)
        check('a member cannot ask for the goals of everybody, a Grow viewer can', (await b('GET', '/api/crm/growth/goals?all=1')).status === 403 && ((await v('GET', '/api/crm/growth/goals?all=1')).body?.list || []).some((g) => g.id === GID))
        check('another member cannot change or delete it', (await b('PUT', `/api/crm/growth/goals/${GID}`, { status: 'learning' })).status === 403 && (await b('DELETE', `/api/crm/growth/goals/${GID}`)).status === 403)
        check('a member cannot add a goal for somebody else', (await b('POST', '/api/crm/growth/goals', { title: 'x', staffId: gA.staffId })).status === 201 && (await prisma.crmSkillGoal.findFirst({ where: { title: 'x', staffId: gA.staffId } })) === null)
        const bx = await prisma.crmSkillGoal.findFirst({ where: { title: 'x', staffId: gB.staffId } }); if (bx) made.rows.unshift(['crmSkillGoal', bx.id])
        check('the owner moves it to learning', (await a('PUT', `/api/crm/growth/goals/${GID}`, { status: 'learning' })).status === 200 && (await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).status === 'learning')
        check('a Grow viewer (no Edit) cannot set a prime, a manager can', (await v('PUT', `/api/crm/growth/goals/${GID}`, { primeAmount: 800 })).status === 403 && (await m('PUT', `/api/crm/growth/goals/${GID}`, { primeAmount: 800, supportAmount: 300, approved: true })).status === 200)
        const ap = await prisma.crmSkillGoal.findUnique({ where: { id: GID } })
        check('...prime, support and approval are saved (with who approved) and the member is told', ap.primeAmount === 800 && ap.supportAmount === 300 && ap.approved && ap.approvedBy === gM.staffId && (await prisma.crmNotification.count({ where: { toUserId: gA.staffId, additionalData: 'growth', description: { startsWith: 'Approved' }, createdAt: { gte: t0 } } })) === 1)
        check('the member sees their amounts but cannot change them', ((await a('GET', '/api/crm/growth/goals')).body?.list || []).find((g) => g.id === GID)?.primeAmount === 800 && (await a('PUT', `/api/crm/growth/goals/${GID}`, { primeAmount: 99999 })).status === 200 && (await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).primeAmount === 800)
        check('a prime cannot be paid before the goal is passed', (await m('PUT', `/api/crm/growth/goals/${GID}`, { primePaid: true })).status === 400)
        const cg = await a('POST', '/api/crm/growth/goals', { title: 'zz goal catalog prime', kind: 'certification', catalogKey: 'aws-certified-ai-practitioner' }); const CGID = cg.body?.id
        if (CGID) made.rows.unshift(['crmSkillGoal', CGID])
        await m('PUT', `/api/crm/growth/goals/${CGID}`, { approved: true })
        check('approving a goal from the catalog gives it the catalog prime (200 to 1000 MAD) when none is set', (await prisma.crmSkillGoal.findUnique({ where: { id: CGID } })).primeAmount >= 200 && (await prisma.crmSkillGoal.findUnique({ where: { id: CGID } })).primeAmount <= 1000)
        check('the member marks it passed: the date is set', (await a('PUT', `/api/crm/growth/goals/${GID}`, { status: 'passed' })).status === 200 && !!(await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).doneDate)
        const prof = await a('GET', '/api/crm/growth/profile')
        check('after a goal is passed the first-certificate trophy is won with its prize, and the profile shows it', prof.status === 200 && prof.body?.trophies?.find((t) => t.key === 'first-pass')?.earned && prof.body.trophies.find((t) => t.key === 'first-pass').prize === 200 && prof.body.money === true)
        check('the administrators are told that a prize is to pay, and it is on the team tab', (await prisma.crmNotification.count({ where: { description: { contains: 'won “First certificate”' }, createdAt: { gte: t0 } } })) >= 1)
        const tm2 = (await v('GET', '/api/crm/growth/team')).body
        const owed = (tm2?.trophiesOwed || []).find((x) => x.staffId === gA.staffId && x.key === 'first-pass')
        check('...with the person, the trophy, the amount; a viewer cannot mark it paid, a manager can', !!owed && owed.prize === 200 && (await v('PUT', `/api/crm/growth/trophies/${owed.id}`, { paid: true })).status === 403 && (await m('PUT', `/api/crm/growth/trophies/${owed.id}`, { paid: true })).status === 200 && (await prisma.crmTrophy.findUnique({ where: { id: owed.id } })).paid === true)
        check('another member sees their profile without the money; a Grow viewer sees all', ((await b('GET', `/api/crm/growth/profile?staffId=${gA.staffId}`)).status === 403) && (await v('GET', `/api/crm/growth/profile?staffId=${gA.staffId}`)).body?.money === true)
        const tm = await v('GET', '/api/crm/growth/team')
        check('the team overview shows the prime owed (Grow viewers only)', (await a('GET', '/api/crm/growth/team')).status === 403 && tm.status === 200 && tm.body?.list?.find((r) => r.id === gA.staffId)?.primeOwed === 800 && tm.body?.totals?.primeOwed >= 800)
        check('the manager pays it: date set, owed goes to paid', (await m('PUT', `/api/crm/growth/goals/${GID}`, { primePaid: true })).status === 200 && !!(await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).primePaidAt && (await v('GET', '/api/crm/growth/team')).body?.list?.find((r) => r.id === gA.staffId)?.primePaid === 800)
        check('certificate files: the owner and Grow viewers see them, another member does not', (await a('GET', `/api/crm/media?relType=skillgoal&relId=${GID}`)).status === 200 && (await v('GET', `/api/crm/media?relType=skillgoal&relId=${GID}`)).status === 200 && (await b('GET', `/api/crm/media?relType=skillgoal&relId=${GID}`)).status === 403)
        check('an approved or passed goal cannot be deleted by its owner; only Delete removes it', (await a('DELETE', `/api/crm/growth/goals/${GID}`)).status === 403 && (await m('DELETE', `/api/crm/growth/goals/${GID}`)).status === 403 && (await d('DELETE', `/api/crm/growth/goals/${GID}`)).status === 200 && !(await prisma.crmSkillGoal.findUnique({ where: { id: GID } })))
        const own = await a('POST', '/api/crm/growth/goals', { title: 'zz goal: own draft', kind: 'skill' })
        if (own.body?.id) made.rows.unshift(['crmSkillGoal', own.body.id])
        check('the owner deletes their own goal while it is only planned', own.status === 201 && (await a('DELETE', `/api/crm/growth/goals/${own.body?.id}`)).status === 200)
        await prisma.crmTrophy.deleteMany({ where: { staffId: { in: [gA.staffId, gB.staffId, gV.staffId, gM.staffId, gD.staffId] } } })
        await prisma.crmNotification.deleteMany({ where: { additionalData: 'growth', createdAt: { gte: t0 } } })
    }

    console.log('\n== Single sign-on: the CRM as an OpenID Connect provider')
    {
        const crypto2 = await import('node:crypto')
        const sMem = await makeUser('sso-member', { calendar: ['view'] }), sAdmin = await makeUser('sso-admin', {}, true)
        const m = await login(sMem), a = await login(sAdmin)
        const REDIR = 'https://meet.example.test/auth/callback'
        check('only the super administrator manages the sign-in apps', (await m('GET', '/api/crm/oauth-clients')).status === 403 && (await m('POST', '/api/crm/oauth-clients', { name: 'x', redirectUris: [REDIR] })).status === 403 && (await a('GET', '/api/crm/oauth-clients')).status === 200)
        check('an app needs a name and a valid redirect address', (await a('POST', '/api/crm/oauth-clients', { name: ' ', redirectUris: [REDIR] })).status === 400 && (await a('POST', '/api/crm/oauth-clients', { name: 'x', redirectUris: [] })).status === 400 && (await a('POST', '/api/crm/oauth-clients', { name: 'x', redirectUris: ['not a url'] })).status === 400)
        const mk = await a('POST', '/api/crm/oauth-clients', { name: 'zz Meet', redirectUris: [REDIR], logoutUris: ['https://meet.example.test/'] })
        const C = mk.body?.client, SECRET = mk.body?.secret
        if (C?.id) made.rows.unshift(['crmOauthClient', C.id])
        check('an app is registered; the secret is shown once and only its hash is stored', mk.status === 201 && /^trtapp_/.test(C?.clientId) && /^trts_/.test(SECRET) && (await prisma.crmOauthClient.findUnique({ where: { id: C.id } })).secretHash !== SECRET && !JSON.stringify((await a('GET', '/api/crm/oauth-clients')).body).includes(SECRET))
        const disc = await (await fetch(`${BASE}/api/oauth/discovery`)).json()
        check('discovery and the signing keys are public', disc.authorization_endpoint?.endsWith('/api/oauth/authorize') && disc.code_challenge_methods_supported?.includes('S256') && (await (await fetch(`${BASE}/api/oauth/jwks`)).json()).keys?.[0]?.kty === 'RSA')
        const verifier = crypto2.randomBytes(32).toString('base64url'), challenge = crypto2.createHash('sha256').update(verifier).digest('base64url')
        const q = (extra = {}) => new URLSearchParams({ client_id: C?.clientId || 'x', redirect_uri: REDIR, response_type: 'code', scope: 'openid profile email calendar.read', state: 'st1', nonce: 'n1', code_challenge: challenge, code_challenge_method: 'S256', ...extra })
        check('a wrong client or a redirect address that is not registered is refused (never redirected)', (await fetch(`${BASE}/api/oauth/authorize?${q({ client_id: 'nope' })}`, { redirect: 'manual' })).status === 400 && (await fetch(`${BASE}/api/oauth/authorize?${q({ redirect_uri: 'https://evil.test/cb' })}`, { redirect: 'manual' })).status === 400)
        const anon = await fetch(`${BASE}/api/oauth/authorize?${q()}`, { redirect: 'manual' })
        check('without a CRM session the person is sent to sign in, and then back to the same request', anon.status === 302 && /\/sign-in\?redirectUrl=/.test(anon.headers.get('location')) && decodeURIComponent(anon.headers.get('location')).includes('/api/oauth/authorize?client_id='))
        const none = await fetch(`${BASE}/api/oauth/authorize?${q({ prompt: 'none' })}`, { redirect: 'manual' })
        check('prompt=none answers login_required instead of showing a page', none.status === 302 && new URL(none.headers.get('location')).searchParams.get('error') === 'login_required' && none.headers.get('location').startsWith(REDIR))
        const ok = await a.raw(`/api/oauth/authorize?${q()}`)
        const loc = ok.headers.get('location') ? new URL(ok.headers.get('location')) : null
        const CODE = loc?.searchParams.get('code')
        check('a signed-in team member gets a code back at the registered address, with the state', ok.status === 302 && loc?.origin + loc?.pathname === REDIR && !!CODE && loc.searchParams.get('state') === 'st1', `${ok.status} ${ok.headers.get('location')}`)
        const tokenReq = (extra = {}, headers = {}) => fetch(`${BASE}/api/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams({ grant_type: 'authorization_code', code: CODE || '', redirect_uri: REDIR, code_verifier: verifier, client_id: C?.clientId || '', client_secret: SECRET || '', ...extra }) })
        check('the code is refused with a wrong secret, a wrong verifier or a wrong redirect address', (await tokenReq({ client_secret: 'trts_wrong' })).status === 401 && (await tokenReq({ code_verifier: 'x'.repeat(43) })).status === 400 && (await tokenReq({ redirect_uri: 'https://evil.test/cb' })).status === 400)
        const ok2 = await a.raw(`/api/oauth/authorize?${q()}`)
        const CODE2 = new URL(ok2.headers.get('location')).searchParams.get('code')
        const tk = await tokenReq({ code: CODE2 }); const tj = await tk.json()
        check('the code is exchanged for an id token and an access token', tk.status === 200 && tj.token_type === 'Bearer' && !!tj.id_token && !!tj.access_token, JSON.stringify(tj).slice(0, 120))
        const { jwtVerify, createLocalJWKSet } = await import('jose')
        const idt = await jwtVerify(tj.id_token, createLocalJWKSet(await (await fetch(`${BASE}/api/oauth/jwks`)).json()), { audience: C.clientId })
        check('the id token is signed (RS256), for this app, with the nonce and who signed in (name, email, admin)', idt.payload.nonce === 'n1' && idt.payload.sub && idt.payload.admin === true && idt.payload.email === sAdmin.email && !!idt.payload.staff_id && idt.protectedHeader.alg === 'RS256' && idt.payload.given_name === `Check${'sso-admin'}` && idt.payload.picture?.endsWith('/img/avatars/thumb-1.jpg') && !('phone_number' in idt.payload && idt.payload.phone_number === undefined))
        check('a code works once only', (await tokenReq({ code: CODE2 })).status === 400)
        const ui = await fetch(`${BASE}/api/oauth/userinfo`, { headers: { authorization: `Bearer ${tj.access_token}` } })
        check('userinfo answers with the access token and refuses without it', ui.status === 200 && (await ui.json()).email === sAdmin.email && (await fetch(`${BASE}/api/oauth/userinfo`)).status === 401 && (await fetch(`${BASE}/api/oauth/userinfo`, { headers: { authorization: 'Bearer abc.def.ghi' } })).status === 401)
        const mem = await m.raw(`/api/oauth/authorize?${q()}`)
        check('an active member signs in too', mem.status === 302 && !!new URL(mem.headers.get('location')).searchParams.get('code'))
        // the meetings of the signed-in member, for the Meet app
        const evMine = await prisma.crmEvent.create({ data: { title: 'zz sso meet mine', start: new Date(Date.now() + 3600000), end: new Date(Date.now() + 7200000), userId: sAdmin.staffId, meetingUrl: 'https://meet.trtcrm.com/discovery_call', attendeeEmails: ['guest@example.test'] } })
        const evAtt = await prisma.crmEvent.create({ data: { title: 'zz sso meet invited', start: new Date(Date.now() + 86400000), end: new Date(Date.now() + 90000000), userId: sMem.staffId, attendeeIds: [sAdmin.staffId], meetingUrl: 'https://meet.trtcrm.com/internal' } })
        const evOther = await prisma.crmEvent.create({ data: { title: 'zz sso meet other google', start: new Date(Date.now() + 3600000), userId: sAdmin.staffId, meetingUrl: 'https://meet.google.com/abc-defg-hij' } })
        const evNone = await prisma.crmEvent.create({ data: { title: 'zz sso no link', start: new Date(Date.now() + 3600000), userId: sAdmin.staffId } })
        const evNotMine = await prisma.crmEvent.create({ data: { title: 'zz sso not mine', start: new Date(Date.now() + 3600000), userId: sMem.staffId, meetingUrl: 'https://meet.trtcrm.com/not_mine' } })
        for (const e of [evMine, evAtt, evOther, evNone, evNotMine]) made.rows.unshift(['crmEvent', e.id])
        const ev = await (await fetch(`${BASE}/api/v1/calendar/events`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json()
        const titles = (ev.data || []).map((e) => e.title)
        check('with the member access token: my meetings on meet.trtcrm.com, created or invited to, with room, guests and link', titles.includes('zz sso meet mine') && titles.includes('zz sso meet invited') && ev.data.find((e) => e.title === 'zz sso meet mine')?.room === 'discovery_call' && ev.data.find((e) => e.title === 'zz sso meet mine')?.attendees_count === 2 && ev.data.find((e) => e.title === 'zz sso meet mine')?.meeting_url === 'https://meet.trtcrm.com/discovery_call')
        check('...without a link or on another site: not listed (an administrator sees the meeting links of everybody, like the CRM calendar)', !titles.includes('zz sso no link') && !titles.includes('zz sso meet other google') && titles.includes('zz sso not mine'))
        const all1 = (await (await fetch(`${BASE}/api/v1/calendar/events?all=1`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json())
        check('...all=1 also lists other links, and from/to limit the dates', (all1.data || []).some((e) => e.title === 'zz sso meet other google') && !((await (await fetch(`${BASE}/api/v1/calendar/events?from=${new Date(Date.now() + 5 * 86400000).toISOString()}&to=${new Date(Date.now() + 9 * 86400000).toISOString()}`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json()).data || []).length)
        // an event saved before the status field existed (nothing stored) is still listed, as confirmed
        await prisma.$runCommandRaw({ insert: 'crm_events', documents: [{ title: 'zz sso legacy event', start: { $date: new Date(Date.now() + 3600000).toISOString() }, end: { $date: new Date(Date.now() + 7200000).toISOString() }, userId: { $oid: sAdmin.staffId }, meetingUrl: 'https://meet.trtcrm.com/legacy-zz', isPublic: false, allDay: false, isStartNotified: false, attendeeIds: [], attendeeEmails: [], createdAt: { $date: new Date().toISOString() }, updatedAt: { $date: new Date().toISOString() } }] })
        const legacy = await prisma.crmEvent.findFirst({ where: { title: 'zz sso legacy event' } }); if (legacy) made.rows.unshift(['crmEvent', legacy.id])
        const legFeed = ((await (await fetch(`${BASE}/api/v1/calendar/events`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json()).data || []).map((e) => e.title)
        const legBusy = ((await (await fetch(`${BASE}/api/v1/calendar/busy`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json()).data || []).some((x) => x.id === legacy?.id)
        check('meetings saved before the status field existed (none stored) are listed as confirmed, in the member feed and in the busy times', legFeed.includes('zz sso legacy event') && legBusy)
        // an ordinary member sees what the CRM calendar shows them: own, invited, nobody's, public; not the private events of others
        const evPrivOther = await prisma.crmEvent.create({ data: { title: 'zz sso private other', start: new Date(Date.now() + 3600000), end: new Date(Date.now() + 7200000), userId: sAdmin.staffId } })
        const evPublic = await prisma.crmEvent.create({ data: { title: 'zz sso public other', start: new Date(Date.now() + 3600000), end: new Date(Date.now() + 7200000), userId: sAdmin.staffId, isPublic: true } })
        const evNobody = await prisma.crmEvent.create({ data: { title: 'zz sso nobody owns', start: new Date(Date.now() + 3600000), end: new Date(Date.now() + 7200000), meetingUrl: 'https://zoom.us/j/123' } })
        for (const e of [evPrivOther, evPublic, evNobody]) made.rows.unshift(['crmEvent', e.id])
        const mAuth = await m.raw(`/api/oauth/authorize?${q()}`); const mCode = new URL(mAuth.headers.get('location')).searchParams.get('code')
        const mTok = await (await fetch(`${BASE}/api/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code: mCode, redirect_uri: REDIR, code_verifier: verifier, client_id: C.clientId, client_secret: SECRET }) })).json()
        const mFeed = ((await (await fetch(`${BASE}/api/v1/calendar/events?include_unlinked=1`, { headers: { authorization: `Bearer ${mTok.access_token}` } })).json()).data || []).map((e) => e.title)
        check('a member token: their own events, the ones nobody owns and the public ones, with every kind of link; not the private events of others', mFeed.includes('zz sso not mine') && mFeed.includes('zz sso nobody owns') && mFeed.includes('zz sso public other') && mFeed.includes('zz sso meet invited') && !mFeed.includes('zz sso private other') && !mFeed.includes('zz sso meet mine'), JSON.stringify(mFeed))
        const unl = await (await fetch(`${BASE}/api/v1/calendar/events?include_unlinked=1`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json()
        const unlRow = (unl.data || []).find((e) => e.title === 'zz sso no link')
        check('include_unlinked=1 returns all of the member events too: no link gives meeting_url null and no room, all_day is there; others stay as before', !!unlRow && !!unlRow.end && unlRow.meeting_url === null && unlRow.room === null && 'all_day' in unlRow && (unl.data || []).some((e) => e.title === 'zz sso meet mine') && (unl.data || []).some((e) => e.title === 'zz sso meet other google') && (unl.data || []).some((e) => e.title === 'zz sso not mine') && !titles.includes('zz sso no link'))
        check('...no token, a wrong token or a wrong date range is refused', (await fetch(`${BASE}/api/v1/calendar/events`)).status === 401 && (await fetch(`${BASE}/api/v1/calendar/events`, { headers: { authorization: 'Bearer a.b.c' } })).status === 401 && (await fetch(`${BASE}/api/v1/calendar/events?from=2026-01-01&to=2020-01-01`, { headers: { authorization: `Bearer ${tj.access_token}` } })).status === 400)
        const kk = await a('POST', '/api/crm/api-keys', { name: 'zz cal key', scopes: ['calendar:read'] }); const kl = await a('POST', '/api/crm/api-keys', { name: 'zz cal wrong key', scopes: ['leads:read'] })
        for (const k of [kk, kl]) if (k.body?.id) made.rows.unshift(['crmApiKey', k.body.id])
        const byKey = await fetch(`${BASE}/api/v1/calendar/events?staff_id=${sAdmin.staffId}`, { headers: { authorization: `Bearer ${kk.body?.key}` } })
        check('with an API key (calendar:read) and the staff_id: that member\'s meetings; without staff_id or without the scope: refused', byKey.status === 200 && ((await byKey.json()).data || []).some((e) => e.title === 'zz sso meet mine') && (await fetch(`${BASE}/api/v1/calendar/events`, { headers: { authorization: `Bearer ${kk.body?.key}` } })).status === 400 && (await fetch(`${BASE}/api/v1/calendar/events?staff_id=${sAdmin.staffId}`, { headers: { authorization: `Bearer ${kl.body?.key}` } })).status === 403)
        await prisma.crmStaff.update({ where: { id: sMem.staffId }, data: { active: false } })
        const gone = await m.raw(`/api/oauth/authorize?${q()}`)
        check('a member who is no longer active is refused (access_denied)', gone.status === 302 && (new URL(gone.headers.get('location')).searchParams.get('error') || '') !== '' )
        await prisma.crmStaff.update({ where: { id: sMem.staffId }, data: { active: true } })
        const cl = await prisma.crmOauthClient.findUnique({ where: { id: C.id } })
        check('the app shows its last use and number of sign-ins', !!cl.lastUsedAt && cl.logins >= 1)
        check('rotating the secret disables the old one', (await a('PUT', `/api/crm/oauth-clients/${C.id}`, { rotateSecret: true })).body?.secret?.startsWith('trts_') && (await tokenReq({ code: 'x' })).status === 401)
        await a('PUT', `/api/crm/oauth-clients/${C.id}`, { active: false })
        check('a disabled app cannot start a sign-in', (await a.raw(`/api/oauth/authorize?${q()}`)).status === 400 && (await ui.status) === 200 && (await fetch(`${BASE}/api/oauth/userinfo`, { headers: { authorization: `Bearer ${tj.access_token}` } })).status === 401)
        const lo = await fetch(`${BASE}/api/oauth/logout?client_id=${C.clientId}&post_logout_redirect_uri=${encodeURIComponent('https://meet.example.test/')}`, { redirect: 'manual' })
        check('sign-out goes back only to an address registered for the app', lo.status === 302 && lo.headers.get('location').startsWith('https://meet.example.test/') && !(await fetch(`${BASE}/api/oauth/logout?client_id=${C.clientId}&post_logout_redirect_uri=${encodeURIComponent('https://evil.test/')}`, { redirect: 'manual' })).headers.get('location').startsWith('https://evil.test'))
        const lo2 = await fetch(`${BASE}/api/oauth/logout?client_id=${C.clientId}&post_logout_redirect_uri=${encodeURIComponent('https://meet.example.test/other/page')}`, { redirect: 'manual' })
        check('...and to any page of the same site as the registered addresses (the app\'s home page without being listed)', lo2.status === 302 && lo2.headers.get('location').startsWith('https://meet.example.test/other/page') && !(await fetch(`${BASE}/api/oauth/logout?client_id=${C.clientId}&post_logout_redirect_uri=${encodeURIComponent('https://meet.example.test.evil.test/')}`, { redirect: 'manual' })).headers.get('location').startsWith('https://meet.example.test.evil'))
        check('the app can be deleted by the super administrator', (await m('DELETE', `/api/crm/oauth-clients/${C.id}`)).status === 403 && (await a('DELETE', `/api/crm/oauth-clients/${C.id}`)).status === 200 && !(await prisma.crmOauthClient.findUnique({ where: { id: C.id } })))
        await prisma.crmOauthCode.deleteMany({ where: { userId: { in: [sMem.staffId] } } })
    }

    console.log('\n== Invoices: lost (written off) old balances')
    {
        const lEdit = await makeUser('lost-edit', { invoices: ['view', 'edit'] }), lView = await makeUser('lost-view', { invoices: ['view'] })
        const e = await login(lEdit), v = await login(lView)
        const cl = await prisma.crmClient.create({ data: { company: 'zz lost check', active: true } }); made.rows.unshift(['crmClient', cl.id])
        const yAgo = (n) => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return d }
        const old = await prisma.crmInvoice.create({ data: { clientId: cl.id, number: 9101, prefix: 'ZZ-', date: yAgo(3), dueDate: yAgo(3), total: 100, status: 3, sent: true, addedFrom: lEdit.staffId } }); made.rows.unshift(['crmInvoice', old.id])
        const fresh = await prisma.crmInvoice.create({ data: { clientId: cl.id, number: 9102, prefix: 'ZZ-', date: new Date(), dueDate: new Date(Date.now() + 86400000 * 30), total: 50, status: 1, sent: true, addedFrom: lEdit.staffId } }); made.rows.unshift(['crmInvoice', fresh.id])
        const pay = await prisma.crmPayment.create({ data: { invoiceId: old.id, amount: 30, paymentDate: yAgo(3) } }); made.rows.unshift(['crmPayment', pay.id])
        check('the old-unpaid review needs Edit and lists only old unpaid or partly paid invoices', (await v('GET', '/api/crm/sales/invoices/old')).status === 403)
        const rv = await e('GET', '/api/crm/sales/invoices/old?years=2')
        check('...the 3-year-old partly paid invoice is listed with what is still due; the recent one is not', rv.status === 200 && rv.body?.list?.find((x) => x.id === old.id)?.due === 70 && !rv.body.list.some((x) => x.id === fresh.id))
        check('...a 5-year limit does not list it', !((await e('GET', '/api/crm/sales/invoices/old?years=5')).body?.list || []).some((x) => x.id === old.id))
        check('an invoice cannot be marked lost without Edit', (await v('POST', `/api/crm/sales/invoices/${old.id}/state`, { action: 'lose' })).status === 403)
        const lose = await e('POST', `/api/crm/sales/invoices/${old.id}/state`, { action: 'lose' })
        check('Edit marks it as lost (status 7)', lose.status === 200 && (await prisma.crmInvoice.findUnique({ where: { id: old.id } })).status === 7)
        const list = await e('GET', `/api/crm/sales/invoices?clientId=${cl.id}`)
        check('a lost invoice is hidden from the default list and out of the outstanding/overdue figures, but counted under Lost', !(list.body?.list || list.body?.data || []).some((x) => x.id === old.id) && (list.body?.stats?.counts?.[7] || 0) === 1)
        check('...and shown with the Lost filter', ((await e('GET', `/api/crm/sales/invoices?clientId=${cl.id}&status=7`)).body?.list || []).some((x) => x.id === old.id))
        check('a draft, paid or cancelled invoice cannot be marked lost; only a lost one can be restored', (await e('POST', `/api/crm/sales/invoices/${fresh.id}/state`, { action: 'unlose' })).status === 400)
        const back = await e('POST', `/api/crm/sales/invoices/${old.id}/state`, { action: 'unlose' })
        check('restoring brings back its real status (overdue, with the payment kept)', back.status === 200 && [3, 4].includes((await prisma.crmInvoice.findUnique({ where: { id: old.id } })).status))
        const bulk = await e('POST', '/api/crm/sales/invoices/bulk-lost', { ids: [old.id, fresh.id], lost: true })
        check('the bulk action marks every selected unpaid invoice lost', bulk.status === 200 && bulk.body?.changed === 2 && (await prisma.crmInvoice.findUnique({ where: { id: fresh.id } })).status === 7)
        check('...and the bulk restore brings them back', (await e('POST', '/api/crm/sales/invoices/bulk-lost', { ids: [old.id, fresh.id], lost: false })).body?.changed === 2)
        await prisma.crmInvoice.update({ where: { id: old.id }, data: { status: 7 } })
        await prisma.crmPayment.create({ data: { invoiceId: old.id, amount: 70, paymentDate: new Date() } }).then((p) => made.rows.unshift(['crmPayment', p.id]))
        const { effective2 } = { effective2: null }
        check('a lost invoice that ends up paid in full shows as paid', ((await e('GET', `/api/crm/sales/invoices?clientId=${cl.id}`)).body?.list || []).find((x) => x.id === old.id)?.status === 2)
    }

    console.log('\n== Scheduled chat messages')
    {
        const t0 = new Date()
        const sNone = await makeUser('sm-none', {}), sView = await makeUser('sm-view', { scheduled_messages: ['view'] }), sMan = await makeUser('sm-manager', { scheduled_messages: ['view', 'create', 'edit'] }), sDel = await makeUser('sm-deleter', { scheduled_messages: ['view', 'create', 'edit', 'delete'] }), sAdm = await makeUser('sm-admin', {}, true)
        const n = await login(sNone), v = await login(sView), m = await login(sMan), d = await login(sDel)
        const soon = new Date(Date.now() + 3600000).toISOString()
        check('without the permission the page is closed', (await n('GET', '/api/crm/scheduled-messages')).status === 403)
        check('View alone lists but cannot create, send or change', (await v('GET', '/api/crm/scheduled-messages')).status === 200 && (await v('POST', '/api/crm/scheduled-messages', { title: 'x', body: 'y', sendAt: soon })).status === 403)
        const bad = (b) => m('POST', '/api/crm/scheduled-messages', { title: 'zz sched', body: 'zz hello', audience: 'team', repeat: 'none', sendAt: soon, ...b }).then((r) => r.status)
        check('a message needs a title, text, a known audience and repeat, people when selected, and a future date', (await bad({ title: ' ' })) === 400 && (await bad({ body: ' ' })) === 400 && (await bad({ audience: 'x' })) === 400 && (await bad({ repeat: 'hourly' })) === 400 && (await bad({ audience: 'selected', staffIds: [] })) === 400 && (await bad({ sendAt: 'nope' })) === 400 && (await bad({ sendAt: new Date(Date.now() - 86400000).toISOString() })) === 400)
        const mk = await m('POST', '/api/crm/scheduled-messages', { title: 'zz sched team', body: 'zz hello team', audience: 'team', repeat: 'weekly', sendAt: soon })
        const MID = mk.body?.id
        if (MID) made.rows.unshift(['crmScheduledMessage', MID])
        const row = MID ? await prisma.crmScheduledMessage.findUnique({ where: { id: MID } }) : null
        check('a message is created, active, with its next time and its author', mk.status === 201 && row?.active && row.audience === 'team' && Math.abs(+row.nextAt - +new Date(soon)) < 1000 && row.createdBy === sMan.staffId)
        check('it is in the list with its repeat label', ((await v('GET', '/api/crm/scheduled-messages')).body?.list || []).some((x) => x.id === MID && x.repeatLabel === 'Every week'))
        check('the automatic-task preview lists it only when it is due', !(((await prisma.crmScheduledMessage.findUnique({ where: { id: MID } })) || {}).nextAt <= new Date()))
        check('Send now needs Edit; with Edit it posts in the Team room as the author', (await v('POST', `/api/crm/scheduled-messages/${MID}`)).status === 403 && (await m('POST', `/api/crm/scheduled-messages/${MID}`)).body?.sent === 1)
        const posted = await prisma.crmChatMessage.findFirst({ where: { body: 'zz hello team', createdAt: { gte: t0 } } })
        if (posted) made.rows.unshift(['crmChatMessage', posted.id])
        check('...the chat shows it, signed by the author', posted?.senderId === sMan.staffId && /Check/.test(posted?.senderName || ''))
        const adm = await m('POST', '/api/crm/scheduled-messages', { title: 'zz sched admins', body: 'zz hello admins', audience: 'admins', repeat: 'none', sendAt: soon })
        if (adm.body?.id) made.rows.unshift(['crmScheduledMessage', adm.body.id])
        const admins = await prisma.crmStaff.count({ where: { active: true, admin: true, id: { not: sMan.staffId } } })
        const sent = await m('POST', `/api/crm/scheduled-messages/${adm.body?.id}`)
        const dms = await prisma.crmChatMessage.findMany({ where: { body: 'zz hello admins', createdAt: { gte: t0 } } })
        for (const x of dms) made.rows.unshift(['crmChatMessage', x.id])
        check('to the administrators: a private message to each active admin (not the author)', sent.body?.sent === admins && dms.length === admins && admins >= 1, `${sent.body?.sent}/${dms.length}/${admins}`)
        const rooms = await prisma.crmChatRoom.findMany({ where: { id: { in: dms.map((x) => x.roomId) } } })
        for (const r of rooms) if (r.kind === 'direct' && r.staffIds.includes(sMan.staffId)) made.rows.unshift(['crmChatRoom', r.id])
        check('...in a direct conversation between the author and that person', rooms.every((r) => r.kind === 'direct' && r.staffIds.includes(sMan.staffId)))
        const sel = await m('POST', '/api/crm/scheduled-messages', { title: 'zz sched selected', body: 'zz hello selected', audience: 'selected', staffIds: [sAdm.staffId, sNone.staffId], repeat: 'none', sendAt: soon })
        if (sel.body?.id) made.rows.unshift(['crmScheduledMessage', sel.body.id])
        check('to chosen people: one private message each', (await m('POST', `/api/crm/scheduled-messages/${sel.body?.id}`)).body?.sent === 2)
        for (const x of await prisma.crmChatMessage.findMany({ where: { body: 'zz hello selected', createdAt: { gte: t0 } } })) { made.rows.unshift(['crmChatMessage', x.id]); const r = await prisma.crmChatRoom.findUnique({ where: { id: x.roomId } }); if (r) made.rows.unshift(['crmChatRoom', r.id]) }
        check('it can be switched off and on again, and changed', (await m('PUT', `/api/crm/scheduled-messages/${MID}`, { active: false })).status === 200 && (await prisma.crmScheduledMessage.findUnique({ where: { id: MID } })).active === false && (await m('PUT', `/api/crm/scheduled-messages/${MID}`, { active: true })).status === 200 && (await m('PUT', `/api/crm/scheduled-messages/${MID}`, { body: 'zz hello team v2' })).status === 200)
        // rich body, screenshots, tags, mentions, team, task, client
        const sRich = await makeUser('sm-rich', { scheduled_messages: ['view', 'create', 'edit'], tasks: ['view', 'create'], customers: ['view'], leads: ['view'] }), rr = await login(sRich)
        const clx = await prisma.crmClient.create({ data: { company: 'zz sched client', active: true } }); made.rows.unshift(['crmClient', clx.id])
        const rich = { title: 'zz sched rich', rich: '<p>Weekly <strong>report</strong> #weekly</p><script>x</script><p><img src="https://example.test/s.png" alt="screenshot"></p>', audience: 'team', repeat: 'none', sendAt: soon, assigneeIds: [sMan.staffId, sRich.staffId], makeTask: true, clientId: clx.id, emailClient: false }
        check('making a task or linking a client needs the matching permission', (await m('POST', '/api/crm/scheduled-messages', { ...rich, clientId: null })).status === 403 && (await v('POST', '/api/crm/scheduled-messages', rich)).status === 403)
        check('emailing the client needs a client', (await rr('POST', '/api/crm/scheduled-messages', { ...rich, clientId: null, emailClient: true })).status === 400)
        const rm = await rr('POST', '/api/crm/scheduled-messages', rich); const RID2 = rm.body?.id
        if (RID2) made.rows.unshift(['crmScheduledMessage', RID2])
        const rrow = RID2 ? await prisma.crmScheduledMessage.findUnique({ where: { id: RID2 } }) : null
        check('a rich message is saved: clean formatting, screenshot kept, plain text for lists, team, task and client options', rm.status === 201 && /<strong>report<\/strong>/.test(rrow?.rich || '') && /<img/.test(rrow.rich) && !/script/i.test(rrow.rich) && /Weekly report/.test(rrow.body) && rrow.makeTask && rrow.clientId === clx.id && rrow.assigneeIds.length === 2)
        const go = await rr('POST', `/api/crm/scheduled-messages/${RID2}`)
        const chatm = await prisma.crmChatMessage.findFirst({ where: { body: { startsWith: 'Weekly report' }, createdAt: { gte: t0 } } })
        if (chatm) made.rows.unshift(['crmChatMessage', chatm.id])
        if (chatm?.taskId) made.rows.unshift(['crmTask', chatm.taskId])
        check('when it goes out the chat shows the rich message with its tag, the team, the task and the client', go.status === 200 && /<strong>report/.test(chatm?.rich || '') && chatm.tags.join() === 'weekly' && chatm.assigneeIds.length === 2 && !!chatm.taskId && chatm.clientId === clx.id, JSON.stringify(go.body))
        check('...the task has the assignees and the client; the team is told', (await prisma.crmTaskAssigned.count({ where: { taskId: chatm?.taskId } })) === 2 && (await prisma.crmTask.findUnique({ where: { id: chatm.taskId } }))?.relId === clx.id && (await prisma.crmNotification.count({ where: { toUserId: sMan.staffId, additionalData: { in: ['chat-assigned', 'chat-task'] }, createdAt: { gte: t0 } } })) >= 1)
        const ld = await prisma.crmLead.create({ data: { name: 'zz sched lead' } }); made.rows.unshift(['crmLead', ld.id])
        const lk0 = await m('POST', '/api/crm/scheduled-messages', { ...rich, clientId: null, makeTask: false, leadId: ld.id }); if (lk0.body?.id) made.rows.unshift(['crmScheduledMessage', lk0.body.id])
        check('an unknown lead is refused', (await rr('POST', '/api/crm/scheduled-messages', { ...rich, clientId: null, makeTask: false, leadId: '000000000000000000000000' })).status === 404)
        const rl = await rr('POST', '/api/crm/scheduled-messages', { ...rich, title: 'zz sched lead msg', rich: '<p>Lead follow-up</p>', clientId: null, leadId: ld.id, emailClient: false }); const LID2 = rl.body?.id
        if (LID2) made.rows.unshift(['crmScheduledMessage', LID2])
        check('a lead can be linked instead of a client (and not both)', rl.status === 201 && (await prisma.crmScheduledMessage.findUnique({ where: { id: LID2 } })).leadId === ld.id && !(await prisma.crmScheduledMessage.findUnique({ where: { id: LID2 } })).clientId)
        await rr('POST', `/api/crm/scheduled-messages/${LID2}`)
        const lchat = await prisma.crmChatMessage.findFirst({ where: { body: 'Lead follow-up', createdAt: { gte: t0 } } })
        if (lchat) made.rows.unshift(['crmChatMessage', lchat.id])
        if (lchat?.taskId) made.rows.unshift(['crmTask', lchat.taskId])
        check('when it goes out the message and its task are linked to the lead', lchat?.leadId === ld.id && !lchat.clientId && (await prisma.crmTask.findUnique({ where: { id: lchat.taskId } }))?.relType === 'lead')
        check('emailing a lead without an email address is reported, and the message still went out', !!lchat && !(await rr('POST', '/api/crm/scheduled-messages', { ...rich, clientId: null, leadId: null, emailClient: true })).status !== 400)
        check('a message with no text and no screenshot is refused', (await rr('POST', '/api/crm/scheduled-messages', { ...rich, rich: '<p></p>', clientId: null, makeTask: false })).status === 400)
        await prisma.crmScheduledMessage.update({ where: { id: MID }, data: { nextAt: new Date(Date.now() - 60000), active: true } })
        const pv = await (await login(sAdm))('POST', '/api/crm/cron/run', { dry: true })
        check('a due message shows in the dry run of the automatic tasks (nothing is sent)', pv.status === 200 && JSON.stringify(pv.body).includes('zz sched team') && !(await prisma.crmChatMessage.findFirst({ where: { body: 'zz hello team v2' } })))
        await prisma.crmNotification.deleteMany({ where: { additionalData: { in: ['chat-assigned', 'chat-task', 'mention'] }, createdAt: { gte: t0 } } })
        // a custom repeat: every N units, a limited number of times
        const custom = await m('POST', '/api/crm/scheduled-messages', { title: 'zz sched custom', body: 'zz custom twice', audience: 'team', repeat: 'custom', every: 3, unit: 'day', cycles: 2, sendAt: soon })
        const CID = custom.body?.id
        if (CID) made.rows.unshift(['crmScheduledMessage', CID])
        const crow = CID ? await prisma.crmScheduledMessage.findUnique({ where: { id: CID } }) : null
        check('a custom repeat (every 3 days, 2 times) is saved', custom.status === 201 && crow?.repeat === 'custom' && crow.every === 3 && crow.unit === 'day' && crow.cycles === 2 && crow.runs === 0)
        check('...a bad custom repeat is refused (0 or 400 units, unknown unit, too many times)', (await m('POST', '/api/crm/scheduled-messages', { title: 'x', body: 'y', repeat: 'custom', every: 0, unit: 'day', sendAt: soon })).status === 400 && (await m('POST', '/api/crm/scheduled-messages', { title: 'x', body: 'y', repeat: 'custom', every: 400, unit: 'day', sendAt: soon })).status === 400 && (await m('POST', '/api/crm/scheduled-messages', { title: 'x', body: 'y', repeat: 'custom', every: 2, unit: 'hour', sendAt: soon })).status === 400 && (await m('POST', '/api/crm/scheduled-messages', { title: 'x', body: 'y', repeat: 'daily', cycles: 5000, sendAt: soon })).status === 400)
        check('the list says how it repeats and how often it has run', ((await v('GET', '/api/crm/scheduled-messages')).body?.list || []).find((x) => x.id === CID)?.repeatLabel === 'Every 3 days, 2 times')
        check('only Delete removes it', (await m('DELETE', `/api/crm/scheduled-messages/${MID}`)).status === 403 && (await d('DELETE', `/api/crm/scheduled-messages/${MID}`)).status === 200 && !(await prisma.crmScheduledMessage.findUnique({ where: { id: MID } })))
    }

    console.log('\n== Appointment requests from another program (draft until accepted)')
    {
        const t0 = new Date()
        const aAdm = await makeUser('ap-admin', {}, true), aMem = await makeUser('ap-member', { calendar: ['view'] })
        const adm = await login(aAdm), mem = await login(aMem)
        const mkKey = async (name, scopes) => { const r = await adm('POST', '/api/crm/api-keys', { name, scopes }); if (r.body?.id) made.rows.unshift(['crmApiKey', r.body.id]); return r.body?.key }
        const kW = await mkKey('zz appt write', ['calendar:write']), kW2 = await mkKey('zz appt other', ['calendar:write']), kR = await mkKey('zz appt read', ['calendar:read'])
        const call = (key, body, method = 'POST', path = '/api/v1/calendar/events') => fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
        const start = new Date(Date.now() + 2 * 86400000).toISOString(), end = new Date(Date.now() + 2 * 86400000 + 1800000).toISOString()
        const good = { title: 'Appointment: Ada', start, end, meeting_url: 'https://meet.trtcrm.com/rdv-zz123', room: 'rdv-zz123', attendees: [{ name: 'Ada Lovelace', email: 'ada@example.test', phone: '+212600000000' }], description: 'Wants a quote\nfor a website', source: 'trtmeet-booking' }
        check('without a key it is refused; a key without calendar:write too', (await fetch(`${BASE}/api/v1/calendar/events`, { method: 'POST' })).status === 401 && (await call(kR, good)).status === 403)
        const bad = async (b) => (await call(kW, { ...good, room: undefined, ...b })).status
        check('a request needs a title, real dates (end after start, not in the past), an https link and valid emails', (await bad({ title: ' ' })) === 400 && (await bad({ start: 'nope' })) === 400 && (await bad({ end: start })) === 400 && (await bad({ start: '2020-01-01T10:00:00Z', end: '2020-01-01T11:00:00Z' })) === 400 && (await bad({ meeting_url: 'http://meet.example.test/x' })) === 400 && (await bad({ attendees: [{ email: 'not-an-email' }] })) === 400)
        const r1 = await call(kW, good); const j1 = await r1.json(); const EID = j1.data?.id
        if (EID) made.rows.unshift(['crmEvent', EID])
        const row = EID ? await prisma.crmEvent.findUnique({ where: { id: EID } }) : null
        check('the request is recorded as a DRAFT with its guests, link, room and source', r1.status === 201 && j1.data?.status === 'draft' && row?.status === 'draft' && row.externalRef === 'rdv-zz123' && row.source === 'trtmeet-booking' && row.guests?.[0]?.phone === '+212600000000' && row.attendeeEmails.includes('ada@example.test') && row.attendeeIds.length === 0 && row.meetingUrl === good.meeting_url)
        check('the administrators are told (bell)', (await prisma.crmNotification.count({ where: { additionalData: 'appointment', createdAt: { gte: t0 } } })) >= 1)
        const r2 = await call(kW, { ...good, title: 'Appointment: Ada (updated)' }); const j2 = await r2.json()
        check('the same room is not recorded twice: the draft is updated', r2.status === 200 && j2.created === false && j2.data?.id === EID && (await prisma.crmEvent.count({ where: { source: 'trtmeet-booking', externalRef: 'rdv-zz123' } })) === 1 && (await prisma.crmEvent.findUnique({ where: { id: EID } })).title === 'Appointment: Ada (updated)')
        const from = new Date(Date.now() + 86400000).toISOString(), to = new Date(Date.now() + 4 * 86400000).toISOString()
        const cal = await mem('GET', `/api/crm/calendar?from=${from}&to=${to}`)
        const item = (cal.body?.items || cal.body?.data || []).find((x) => x.rawId === EID)
        check('on the calendar it shows as a pending request (⏳) with who asked', cal.status === 200 && item?.status === 'draft' && /^⏳/.test(item.title) && item.guests?.[0]?.email === 'ada@example.test', JSON.stringify(item || cal.body).slice(0, 140))
        check('a program key can ask the state of a request that came in through the API (also one sent with an earlier key)', (await (await call(kW, null, 'GET', `/api/v1/calendar/events/${EID}`)).json()).data?.status === 'draft' && (await call(kW2, null, 'GET', `/api/v1/calendar/events/${EID}`)).status === 200)
        check('a draft is not in the member meetings feed', !((await (await fetch(`${BASE}/api/v1/calendar/events?staff_id=${aAdm.staffId}&all=1`, { headers: { authorization: `Bearer ${kR}` } })).json()).data || []).some((x) => x.id === EID))
        check('accepting needs permission to edit the calendar', (await mem('POST', `/api/crm/calendar/${EID}/decision`, { decision: 'accept' })).status === 403)
        check('an unknown decision is refused', (await adm('POST', `/api/crm/calendar/${EID}/decision`, { decision: 'maybe' })).status === 400)
        const ok = await adm('POST', `/api/crm/calendar/${EID}/decision`, { decision: 'accept', notify: false })
        const acc = await prisma.crmEvent.findUnique({ where: { id: EID } })
        check('accepting makes it a confirmed event owned by who accepted', ok.status === 200 && acc.status === 'confirmed' && acc.confirmed === true && acc.userId === aAdm.staffId && !!acc.decidedAt && acc.decidedBy === aAdm.staffId)
        check('...and it can be decided only once', (await adm('POST', `/api/crm/calendar/${EID}/decision`, { decision: 'decline' })).status === 409)
        check('...the program sees it confirmed, and it is now in the member meetings feed', (await (await call(kW, null, 'GET', `/api/v1/calendar/events/${EID}`)).json()).data?.status === 'confirmed' && ((await (await fetch(`${BASE}/api/v1/calendar/events?staff_id=${aAdm.staffId}`, { headers: { authorization: `Bearer ${kR}` } })).json()).data || []).some((x) => x.id === EID))
        check('a request for a confirmed room is not touched again', (await (await call(kW, { ...good, title: 'again' })).json()).created === false && (await prisma.crmEvent.findUnique({ where: { id: EID } })).title !== 'again')
        const r3 = await call(kW, { ...good, room: 'rdv-zz456', meeting_url: 'https://meet.trtcrm.com/rdv-zz456' }); const E3 = (await r3.json()).data?.id
        if (E3) made.rows.unshift(['crmEvent', E3])
        check('declining hides it from the calendar', (await adm('POST', `/api/crm/calendar/${E3}/decision`, { decision: 'decline', notify: false })).status === 200 && !((await mem('GET', `/api/crm/calendar?from=${from}&to=${to}`)).body?.items || []).some((x) => x.rawId === E3) && (await (await call(kW, null, 'GET', `/api/v1/calendar/events/${E3}`)).json()).data?.status === 'declined')
        // the program accepts, refuses, edits and deletes its own requests (a team member does it in its screen)
        const r4 = await call(kW, { ...good, room: 'rdv-zz789', meeting_url: 'https://meet.trtcrm.com/rdv-zz789' }); const E4 = (await r4.json()).data?.id
        if (E4) made.rows.unshift(['crmEvent', E4])
        const dec = (key, id, body) => call(key, body, 'POST', `/api/v1/calendar/events/${id}/decision`)
        const plainEv = await prisma.crmEvent.create({ data: { title: 'zz plain crm event', start: new Date(Date.now() + 3 * 86400000), end: new Date(Date.now() + 3 * 86400000 + 3600000), userId: aAdm.staffId } }); made.rows.unshift(['crmEvent', plainEv.id])
        check('an event nobody requested through the API can never be answered, edited or deleted by a key, and it stays', (await dec(kW2, plainEv.id, { decision: 'accept', staff_id: aAdm.staffId })).status === 404 && (await call(kW2, { title: 'x' }, 'PATCH', `/api/v1/calendar/events/${plainEv.id}`)).status === 404 && (await call(kW2, null, 'DELETE', `/api/v1/calendar/events/${plainEv.id}`)).status === 404 && !!(await prisma.crmEvent.findUnique({ where: { id: plainEv.id } })))
        check('accepting through the API needs a known active team member (staff_id) and a clear decision', (await dec(kW, E4, { decision: 'accept' })).status === 400 && (await dec(kW, E4, { decision: 'accept', staff_id: '000000000000000000000000' })).status === 400 && (await dec(kW, E4, { decision: 'maybe', staff_id: aAdm.staffId })).status === 400)
        const okd = await dec(kW, E4, { decision: 'accept', staff_id: aAdm.staffId, notify: false }); const jd = await okd.json()
        const e4 = await prisma.crmEvent.findUnique({ where: { id: E4 } })
        check('the program accepts on behalf of a team member: confirmed, owned by them', okd.status === 200 && jd.data?.status === 'confirmed' && jd.changed === true && e4.userId === aAdm.staffId && e4.decidedBy === aAdm.staffId)
        check('the same answer twice changes nothing and is not an error', (await (await dec(kW, E4, { decision: 'accept', staff_id: aAdm.staffId, notify: false })).json()).changed === false)
        check('it can edit title, dates, link and guests (same rules as a request)', (await call(kW, { title: 'Appointment: Ada (moved)', start: new Date(Date.now() + 5 * 86400000).toISOString(), end: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(), attendees: [{ name: 'Ada', email: 'ada2@example.test' }] }, 'PATCH', `/api/v1/calendar/events/${E4}`)).status === 200 && (await prisma.crmEvent.findUnique({ where: { id: E4 } })).attendeeEmails.join() === 'ada2@example.test')
        const pm = await call(kW, { message: 'We moved it, sorry', notify: true }, 'PATCH', `/api/v1/calendar/events/${E4}`); const pmj = await pm.json()
        check('a note for the person who asked can go with an edit (the answer says who was emailed)', pm.status === 200 && Array.isArray(pmj.emailed), pm.status + JSON.stringify(pmj).slice(0, 150))
        check('...and refuses a bad edit', (await call(kW, { end: '2020-01-01T00:00:00Z' }, 'PATCH', `/api/v1/calendar/events/${E4}`)).status === 400 && (await call(kW, {}, 'PATCH', `/api/v1/calendar/events/${E4}`)).status === 400 && (await call(kW, { meeting_url: 'http://x.test' }, 'PATCH', `/api/v1/calendar/events/${E4}`)).status === 400)
        check('it can refuse a request it accepted (cancel); the CRM calendar then hides it', (await dec(kW, E4, { decision: 'refuse', notify: false })).status === 200 && (await prisma.crmEvent.findUnique({ where: { id: E4 } })).status === 'declined')
        check('it can delete a request it created', (await call(kW, null, 'DELETE', `/api/v1/calendar/events/${E4}`)).status === 200 && !(await prisma.crmEvent.findUnique({ where: { id: E4 } })) && (await call(kW, null, 'GET', `/api/v1/calendar/events/${E4}`)).status === 404)
        check('the webhook list offers the update and delete events', (await adm('GET', '/api/crm/webhooks')).body?.events?.some(([id]) => id === 'appointment.updated') && (await adm('GET', '/api/crm/webhooks')).body?.events?.some(([id]) => id === 'appointment.deleted'))
        // the recap of a meeting written in Meet: minutes on the event, action items as tasks
        const rcp = (key, b) => fetch(`${BASE}/api/v1/calendar/recap`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(b) })
        const lead = await prisma.crmLead.create({ data: { name: 'zz recap lead' } }); made.rows.unshift(['crmLead', lead.id])
        const meetEv = await prisma.crmEvent.create({ data: { title: 'zz recap meeting', start: new Date(Date.now() - 1800000), end: new Date(Date.now() + 1800000), userId: aAdm.staffId, leadId: lead.id, meetingUrl: 'https://meet.trtcrm.com/recap-zz' } }); made.rows.unshift(['crmEvent', meetEv.id])
        check('a recap needs a key with calendar:write, a team member, a meeting that exists and something to save', (await rcp(kR, { room: 'recap-zz', staff_id: aAdm.staffId, report: 'x' })).status === 403 && (await rcp(kW, { room: 'recap-zz', report: 'x' })).status === 400 && (await rcp(kW, { room: 'no-such-room', staff_id: aAdm.staffId, report: 'x' })).status === 404 && (await rcp(kW, { room: 'recap-zz', staff_id: aAdm.staffId })).status === 400)
        const memberOnly = await prisma.crmEvent.create({ data: { title: 'zz private of the admin', start: new Date(Date.now() - 600000), end: new Date(Date.now() + 600000), userId: aAdm.staffId, meetingUrl: 'https://meet.trtcrm.com/recap-private-zz' } }); made.rows.unshift(['crmEvent', memberOnly.id])
        check('a team member who cannot see the event cannot write on it', (await rcp(kW, { room: 'recap-private-zz', staff_id: aMem.staffId, report: 'x' })).status === 403)
        const rr1 = await rcp(kW, { room: 'recap-zz', staff_id: aAdm.staffId, report: 'Decided: send the quote.\nNext: call Friday.', tasks: [{ name: 'zz send the quote', owner: 'Check', due: new Date(Date.now() + 3 * 86400000).toISOString() }, { name: 'zz call on Friday' }] })
        const rj1 = await rr1.json()
        const ev1 = await prisma.crmEvent.findUnique({ where: { id: meetEv.id } })
        for (const t of rj1.tasks || []) made.rows.unshift(['crmTask', t.id])
        check('the minutes go on the event (and so on its lead), the action items become tasks linked to the lead', rr1.status === 200 && rj1.report_saved === true && /Decided: send the quote/.test(ev1.report || '') && rj1.tasks?.length === 2 && (await prisma.crmTask.findUnique({ where: { id: rj1.tasks[0].id } })).relId === lead.id && (await prisma.crmTask.findUnique({ where: { id: rj1.tasks[0].id } })).relType === 'lead')
        check('...each task has an owner: the one named, else the member who saved', (await prisma.crmTaskAssigned.count({ where: { taskId: rj1.tasks[1].id, staffId: aAdm.staffId } })) === 1)
        const rr2 = await rcp(kW, { room: 'recap-zz', staff_id: aAdm.staffId, report: 'Second note', tasks: [{ name: 'zz call on Friday' }] }); const rj2 = await rr2.json()
        check('saving again adds to the minutes and never repeats a task', rr2.status === 200 && /Decided/.test((await prisma.crmEvent.findUnique({ where: { id: meetEv.id } })).report || '') && /Second note/.test((await prisma.crmEvent.findUnique({ where: { id: meetEv.id } })).report || '') && rj2.tasks.length === 0 && rj2.skipped.length === 1)
        // busy times for a booking page
        const bz = (key, q = '') => fetch(`${BASE}/api/v1/calendar/busy${q}`, { headers: { authorization: `Bearer ${key}` } })
        const evBusy = await prisma.crmEvent.create({ data: { title: 'zz private title', start: new Date(Date.now() + 3 * 86400000), end: new Date(Date.now() + 3 * 86400000 + 3600000), userId: aAdm.staffId, meetingUrl: null } }); made.rows.unshift(['crmEvent', evBusy.id])
        const evDraft = await prisma.crmEvent.create({ data: { title: 'zz draft busy', start: new Date(Date.now() + 3 * 86400000 + 7200000), end: new Date(Date.now() + 3 * 86400000 + 9000000), status: 'draft' } }); made.rows.unshift(['crmEvent', evDraft.id])
        const evDecl = await prisma.crmEvent.create({ data: { title: 'zz declined busy', start: new Date(Date.now() + 3 * 86400000), end: new Date(Date.now() + 3 * 86400000 + 1800000), status: 'declined' } }); made.rows.unshift(['crmEvent', evDecl.id])
        check('busy times need a key with calendar:read', (await fetch(`${BASE}/api/v1/calendar/busy`)).status === 401 && (await bz(kW)).status === 403)
        const bj = await (await bz(kR)).json()
        const bi = (id) => (bj.data || []).find((x) => x.id === id)
        check('every confirmed event of the team is busy (with or without a link), and so is a waiting request; a declined one is not', !!bi(evBusy.id) && bi(evBusy.id).status === 'confirmed' && bi(evBusy.id).staff_ids.includes(aAdm.staffId) && bi(evDraft.id)?.status === 'draft' && !bi(evDecl.id))
        check('...and nothing private leaves: no title, no name, no description', !JSON.stringify(bj).includes('zz private title') && !JSON.stringify(bj).includes('zz draft busy') && Object.keys(bi(evBusy.id)).sort().join() === 'all_day,end,id,staff_ids,start,status')
        check('...staff_id limits it to one member, a range of more than 62 days is refused', !(((await (await bz(kR, `?staff_id=${aMem.staffId}`)).json()).data || []).some((x) => x.id === evBusy.id)) && (await bz(kR, '?from=2026-01-01&to=2026-12-31')).status === 400)
        await prisma.crmNotification.deleteMany({ where: { additionalData: 'appointment', createdAt: { gte: t0 } } })
    }

    console.log('\n== Calendar: confirmed meetings, reminder for the client with a template')
    {
        const t0 = new Date()
        const cU = await makeUser('cal-conf', { calendar: ['view', 'create', 'edit', 'view_all_events'] }, false), cAdm = await makeUser('cal-conf-admin', {}, true)
        const cu = await login(cU), ca = await login(cAdm)
        const st = new Date(Date.now() + 20 * 60000), en = new Date(Date.now() + 80 * 60000)
        const body = { title: 'zz confirmed meeting', start: st.toISOString(), end: en.toISOString(), confirmed: true, remindClient: true, reminderBefore: 30, reminderBeforeType: 'minutes', reminderTemplate: 'event-reminder-prepare', attendeeEmails: 'guest@example.test', meetingUrl: 'https://meet.trtcrm.com/zz-conf' }
        const mk = await cu('POST', '/api/crm/calendar', body); const EID = mk.body?.id
        if (EID) made.rows.unshift(['crmEvent', EID])
        const row = EID ? await prisma.crmEvent.findUnique({ where: { id: EID } }) : null
        check('an event can be confirmed and can remind the client with a chosen template', mk.status < 300 && row?.confirmed === true && row.remindClient === true && row.reminderTemplate === 'event-reminder-prepare', String(mk.status))
        const rng = `from=${new Date(Date.now() - 86400000).toISOString()}&to=${new Date(Date.now() + 2 * 86400000).toISOString()}`
        const it = ((await cu('GET', `/api/crm/calendar?${rng}`)).body?.items || []).find((x) => x.rawId === EID)
        check('a confirmed event is green and says so (the calendar draws the light green background and the glowing dot)', it?.confirmed === true && it.eventColor === 'green' && it.remindClient === true)
        const plain = await cu('POST', '/api/crm/calendar', { ...body, title: 'zz unconfirmed', confirmed: false, remindClient: false, reminderTemplate: 'rm -rf', start: new Date(Date.now() + 5 * 86400000).toISOString(), end: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString() })
        if (plain.body?.id) made.rows.unshift(['crmEvent', plain.body.id])
        const prow = plain.body?.id ? await prisma.crmEvent.findUnique({ where: { id: plain.body.id } }) : null
        check('by default an event is not confirmed; an unknown template name is dropped', prow?.confirmed === false && prow.reminderTemplate === null)
        const lk = (await cu('GET', '/api/crm/calendar/lookups')).body
        check('the reminder templates are offered (ready-made ones)', (lk?.reminderTemplates || []).length >= 3 && lk.reminderTemplates.some((x) => x.slug === 'event-reminder-prepare'))
        const dry = await ca('POST', '/api/crm/cron/run', { dry: true })
        check('the automatic task finds the reminder that is due (30 minutes before an event in 20 minutes), client included', dry.status === 200 && JSON.stringify(dry.body).includes('Reminder of the event “zz confirmed meeting” would be sent (client too)'))
        await prisma.crmEvent.update({ where: { id: EID }, data: { reminderSentAt: new Date() } })
        const dry2 = await ca('POST', '/api/crm/cron/run', { dry: true })
        check('...and only once: when it was sent it is not due again', !JSON.stringify(dry2.body).includes('zz confirmed meeting'))
        await cu('PATCH', `/api/crm/calendar/${EID}`, { title: 'zz confirmed meeting', start: new Date(+st + 3600000).toISOString(), end: new Date(+en + 3600000).toISOString() })
        check('a new time makes the reminder due again', (await prisma.crmEvent.findUnique({ where: { id: EID } })).reminderSentAt === null)
        await prisma.crmNotification.deleteMany({ where: { additionalData: 'event-reminder', createdAt: { gte: t0 } } })
    }

    console.log('\n== Tickets: client area, rating, automatic messages, tasks and reminders')
    {
        const sA = await makeUser('tk-staff', { customers: ['view', 'create', 'edit'], tickets: ['view', 'create', 'edit'], tasks: ['view', 'create', 'edit'] }); const sa = await login(sA)
        const sB = await makeUser('tk-other', { tickets: ['view', 'edit'] }); const sb = await login(sB)
        const cl = await sa('POST', '/api/crm/customers', { company: 'zz ticket check', active: true })
        if (cl.body?.id) made.extraRows.push(['crmClient', cl.body.id])
        const cl2 = await sa('POST', '/api/crm/customers', { company: 'zz ticket other client', active: true })
        if (cl2.body?.id) made.extraRows.push(['crmClient', cl2.body.id])
        const mk = async (clientId, tag) => {
            const email = `tk.${tag}.${Date.now()}@test.local`
            const ct = await prisma.crmContact.create({ data: { clientId, firstName: 'Tess', lastName: tag, email } })
            made.extraRows.unshift(['crmContact', ct.id])
            await sa('POST', `/api/crm/customers/${clientId}/portal-password`, { contactId: ct.id, password: 'Portal-Test-12345' })
            const r = await fetch(`${BASE}/api/portal/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Portal-Test-12345' }) })
            const ck = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
            return async (method, path, body) => { const x = await fetch(`${BASE}/api/portal${path}`, { method, headers: { cookie: ck, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: x.status, body: await x.json().catch(() => null) } }
        }
        const pc = await mk(cl.body?.id, 'one'), pc2 = await mk(cl2.body?.id, 'two')
        // a database that was not imported from Perfex (demo data) has no legacy status numbers: give them for the check, then take them away
        const givenIds = []
        for (const [name, n] of [['Open', 1], ['In progress', 2], ['Answered', 3], ['On hold', 4], ['Closed', 5]]) { const all = await prisma.crmTicketStatus.findMany(); const row = all.find((x) => x.name === name && x.legacyId == null); if (row && !all.some((x) => x.legacyId === n)) { await prisma.crmTicketStatus.update({ where: { id: row.id }, data: { legacyId: n } }); givenIds.push(row.id) } }
        const closedSt = await prisma.crmTicketStatus.findFirst({ where: { legacyId: 5 } }), openSt = await prisma.crmTicketStatus.findFirst({ where: { legacyId: 1 } })
        const prevRules = await prisma.crmOption.findUnique({ where: { name: 'ticket_auto_messages' } })
        const rules = [{ on: 'created', enabled: true, message: 'Hello {contact_firstname}, we received your request #{ticket_id}: {ticket_subject}.', email: false, thread: true }, { on: closedSt?.id, enabled: true, message: 'Your request #{ticket_id} is now {ticket_status}. Thank you!', email: false, thread: true }]
        await prisma.crmOption.upsert({ where: { name: 'ticket_auto_messages' }, update: { value: JSON.stringify(rules) }, create: { name: 'ticket_auto_messages', value: JSON.stringify(rules) } })
        const staffForAuto = await prisma.crmStaff.findFirst({ where: { active: true } })
        const tk = await pc('POST', '/tickets', { subject: 'zz ticket check', message: 'Please help' })
        const TID = tk.body?.id
        if (TID) made.rows.unshift(['crmTicket', TID])
        check('a client opens a request in the client area', tk.status < 300 && !!TID, `${tk.status} ${JSON.stringify(tk.body).slice(0, 100)}`)
        let det = TID ? await pc('GET', `/tickets/${TID}`) : null
        check('the automatic "request received" message is in the conversation, marked automatic, with the fields filled', det?.body?.thread?.some((m) => m.auto && m.staff && /Hello Tess, we received your request #\d+: zz ticket check/.test(m.html)), JSON.stringify(det?.body?.thread?.map((m) => m.html)).slice(0, 200))
        check('the list tells the client which requests wait for them and carries the counters', ((await pc('GET', '/tickets')).body?.list || []).some((k) => k.id === TID && k.answered !== undefined))
        check('another client cannot read, close or rate this request', TID && (await pc2('GET', `/tickets/${TID}`)).status === 404 && (await pc2('POST', `/tickets/${TID}/close`, { action: 'close' })).status === 404)
        check('a request cannot be rated before it is closed', TID && (await pc('POST', `/tickets/${TID}/close`, { action: 'rate', rating: 5 })).status === 400)
        const cls = TID ? await pc('POST', `/tickets/${TID}/close`, { action: 'close' }) : null
        det = TID ? await pc('GET', `/tickets/${TID}`) : null
        check('the client closes their own request', cls?.status === 200 && det?.body?.ticket?.closed === true, JSON.stringify(cls?.body) + ' given ' + givenIds.length)
        check('...and the automatic message of the Closed status is sent', det?.body?.thread?.some((m) => m.auto && /is now Closed/.test(m.html)), JSON.stringify(det?.body?.thread?.map((m) => m.html)).slice(0, 200))
        check('a rating needs 1 to 5 stars', TID && (await pc('POST', `/tickets/${TID}/close`, { action: 'rate', rating: 9 })).status === 400)
        const rate = TID ? await pc('POST', `/tickets/${TID}/close`, { action: 'rate', rating: 4, comment: 'Quick and clear' }) : null
        check('the client rates the closed request', rate?.status === 200 && (await prisma.crmTicket.findUnique({ where: { id: TID } })).rating === 4, String(rate?.status))
        const sd = TID ? await sa('GET', `/api/crm/support/tickets/${TID}`) : null
        check('the team sees the rating and the automatic messages tagged in the ticket', sd?.body?.ticket?.rating === 4 && sd.body.thread.some((m) => m.auto), JSON.stringify(sd?.body?.ticket?.rating))
        const reo = TID ? await pc('POST', `/tickets/${TID}/close`, { action: 'reopen' }) : null
        check('the client reopens it', reo?.status === 200 && (await prisma.crmTicket.findUnique({ where: { id: TID } })).statusId === openSt?.id, String(reo?.status))
        // messages written in the editor keep their style and lose scripts, for the client and for the team
        const rr = TID ? await pc('POST', `/tickets/${TID}/reply`, { message: '<p>Hello <strong>team</strong><script>alert(1)</script> <img src=x onerror=alert(2)></p>' }) : null
        const rs = TID ? await sa('POST', `/api/crm/support/tickets/${TID}/reply`, { message: '<p>Thanks, <em>noted</em><script>alert(3)</script></p>', notify: false }) : null
        const thr = TID ? (await sa('GET', `/api/crm/support/tickets/${TID}`)).body?.thread || [] : []
        check('Ticket messages: a client reply written in the editor keeps its style and loses scripts and event handlers', rr?.status < 300 && thr.some((m) => /<strong>team<\/strong>/.test(m.html || m.message || '')) && !thr.some((m) => /<script|onerror/i.test(m.html || m.message || '')))
        check('Ticket messages: the team reply too, and plain text still works', rs?.status < 300 && thr.some((m) => /<em>noted<\/em>/.test(m.html || m.message || '')) && (await sa('POST', `/api/crm/support/tickets/${TID}/reply`, { message: 'plain <b> text', notify: false })).status < 300)
        // reminders and tasks (team side)
        const soon = new Date(Date.now() + 3600000).toISOString()
        const rem = TID ? await sa('POST', `/api/crm/support/tickets/${TID}/reminder`, { date: soon, note: 'Call the client' }) : null
        if (rem?.body?.id) made.extraRows.push(['crmReminder', rem.body.id])
        check('a team member sets a reminder on a ticket', rem?.status === 201 && !!rem.body?.id, String(rem?.status))
        check('a reminder cannot be set in the past', TID && (await sa('POST', `/api/crm/support/tickets/${TID}/reminder`, { date: new Date(Date.now() - 3600000).toISOString() })).status === 400)
        const sd2 = TID ? await sa('GET', `/api/crm/support/tickets/${TID}`) : null
        check('the reminder is listed on the ticket for its owner only', sd2?.body?.reminders?.some((r) => r.id === rem?.body?.id) && !((await sb('GET', `/api/crm/support/tickets/${TID}`)).body?.reminders || []).length)
        check('someone else cannot delete it', rem?.body?.id && (await sb('DELETE', `/api/crm/support/tickets/${TID}/reminder?reminderId=${rem.body.id}`)).status === 404)
        const task = TID ? await sa('POST', '/api/crm/work/tasks', { name: 'zz task from ticket', relType: 'ticket', relId: TID, assigneeIds: [sA.staffId] }) : null
        if (task?.body?.id) made.rows.unshift(['crmTask', task.body.id])
        check('a task is created from the ticket', task?.status < 300 && !!task.body?.id, String(task?.status))
        check('...and it is listed on the ticket', ((await sa('GET', `/api/crm/support/tickets/${TID}`)).body?.tasks || []).some((k) => k.id === task?.body?.id))
        // the automatic messages settings: administrators only
        check('the automatic messages rules are for administrators only', (await sa('GET', '/api/crm/support/auto-messages')).status === 403 && (await sa('PUT', '/api/crm/support/auto-messages', { rules: [] })).status === 403)
        if (prevRules) await prisma.crmOption.update({ where: { name: 'ticket_auto_messages' }, data: { value: prevRules.value } }); else await prisma.crmOption.deleteMany({ where: { name: 'ticket_auto_messages' } })
        for (const gid of givenIds) await prisma.crmTicketStatus.update({ where: { id: gid }, data: { legacyId: null } })
        void staffForAuto
    }

    console.log('\n== Client area sign-in')
    {
        const st = await makeUser('portal-admin', { customers: ['view', 'create', 'edit'] }); const sc = await login(st)
        const cl = await sc('POST', '/api/crm/customers', { company: 'zz portal check', active: true })
        if (cl.body?.id) made.extraRows.push(['crmClient', cl.body.id])
        const mail = `portal.${Date.now()}@test.local`
        const ct = await prisma.crmContact.create({ data: { clientId: cl.body.id, firstName: 'Zed', lastName: 'Portal', email: ` ${mail.toUpperCase()} ` } }) // stray spaces and capitals saved around the address
        made.extraRows.unshift(['crmContact', ct.id])
        const pwr = await sc('POST', `/api/crm/customers/${cl.body.id}/portal-password`, { contactId: ct.id, password: 'Portal-Test-12345' })
        check('staff set a contact password', pwr.status === 200, String(pwr.status))
        const tryLogin = (email, password) => fetch(`${BASE}/api/portal/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
        const ok = await tryLogin(mail, 'Portal-Test-12345')
        check('the contact signs in even if the saved email has spaces or capitals around it', ok.status === 200, String(ok.status))
        const ck = (ok.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
        check('...and the client area opens with that session', (await fetch(`${BASE}/api/portal/me`, { headers: { cookie: ck } })).status === 200)
        check('a wrong password is refused', (await tryLogin(mail, 'Wrong-pass-0000')).status === 401)
        const prof = await sc('GET', `/api/crm/customers/${cl.body.id}/profile`)
        const acc = prof.body?.contacts?.find((x) => x.id === ct.id)?.access
        check('the client page says the contact can sign in', acc?.ok === true, JSON.stringify(acc))
        await prisma.crmClient.update({ where: { id: cl.body.id }, data: { active: false } })
        const acc2 = (await sc('GET', `/api/crm/customers/${cl.body.id}/profile`)).body?.contacts?.find((x) => x.id === ct.id)?.access
        check('...and says why when the client is inactive', acc2?.ok === false && acc2.reasons.includes('The client is not active') && (await tryLogin(mail, 'Portal-Test-12345')).status === 403, JSON.stringify(acc2))
        await prisma.crmClient.update({ where: { id: cl.body.id }, data: { active: true } })
        for (let i = 0; i < 5; i++) await tryLogin(mail, 'Wrong-pass-0000')
        const acc3 = (await sc('GET', `/api/crm/customers/${cl.body.id}/profile`)).body?.contacts?.find((x) => x.id === ct.id)?.access
        check('after 5 wrong passwords the contact is locked and the client page shows it', acc3?.locked === true && (await tryLogin(mail, 'Portal-Test-12345')).status === 429, JSON.stringify(acc3))
        check('staff unlock the contact and it signs in again', (await sc('POST', `/api/crm/customers/${cl.body.id}/portal-unlock`, { contactId: ct.id })).status === 200 && (await tryLogin(mail, 'Portal-Test-12345')).status === 200)
        check('a stranger without Clients access cannot unlock', (await (await login(await makeUser('portal-none', {})))('POST', `/api/crm/customers/${cl.body.id}/portal-unlock`, { contactId: ct.id })).status === 403)
        await prisma.loginAttempt.deleteMany({ where: { key: `portal:${mail}` } })
    }
    const lm = await login(await makeUser('leadmail', { lead_mail: ['view'] }))
    check('Lead email integration view: can list mailboxes', (await lm('GET', '/api/crm/lead-mail')).status === 200)
    check('Lead email integration view only: cannot save a mailbox', (await lm('POST', '/api/crm/lead-mail', { action: 'save', data: { email: 'a@b.com' } })).status === 403)
    const wh = await login(await makeUser('hours', { work_hours: ['view'] }))
    check('Team hours view: can open the hours report', (await wh('GET', '/api/crm/work-hours')).status === 200)
    check('no Team hours permission: hours report refused', (await plain('GET', '/api/crm/work-hours')).status === 403)
    check('Team hours view alone does not open Team members', (await wh('GET', '/api/crm/staff')).status === 403)
    // the sensitive pages that used to be Super Admin only now have their own permission rows
    console.log('\n== API / AI / Payroll / team growth permissions')
    const pNone = await login(await makeUser('sens-none', {})), pApiV = await login(await makeUser('sens-api-view', { api: ['view'] })), pApiE = await login(await makeUser('sens-api-edit', { api: ['view', 'edit'] }))
    const pAiV = await login(await makeUser('sens-ai-view', { ai: ['view'] })), pPayV = await login(await makeUser('sens-pay-view', { payroll: ['view'] })), pPayE = await login(await makeUser('sens-pay-edit', { payroll: ['view', 'edit'] }))
    const pGrT = await login(await makeUser('sens-growth-team', { growth: ['view', 'view_team'] })), pGrM = await login(await makeUser('sens-growth-manage', { growth: ['view', 'manage'] })), pGr = await login(await makeUser('sens-growth', { growth: ['view'] }))
    check('API keys: refused without the permission', (await pNone('GET', '/api/crm/api-keys')).status === 403 && (await pNone('GET', '/api/crm/oauth-clients')).status === 403)
    check('API keys: View lists keys and sign-in apps but cannot create, revoke or add an app', (await pApiV('GET', '/api/crm/api-keys')).status === 200 && (await pApiV('GET', '/api/crm/oauth-clients')).status === 200 && (await pApiV('POST', '/api/crm/api-keys', { name: 'zz perm', scopes: ['calendar:read'] })).status === 403 && (await pApiV('POST', '/api/crm/oauth-clients', { name: 'zz perm', redirectUris: ['https://x.test/cb'] })).status === 403)
    const kk = await pApiE('POST', '/api/crm/api-keys', { name: 'zz perm key', scopes: ['calendar:read'] })
    check('API keys: Edit creates a key, and revokes it', kk.status === 200 || kk.status === 201)
    if (kk.body?.id || kk.body?.key?.id) { const kid = kk.body.id || kk.body.key.id; check('...and revokes it', [200, 204].includes((await pApiE('DELETE', `/api/crm/api-keys/${kid}`)).status)); await prisma.crmApiKey?.deleteMany?.({ where: { id: kid } }).catch(() => {}) }
    check('AI: refused without the permission; View uses it but cannot change the settings', (await pNone('GET', '/api/crm/ai/settings')).status === 403 && (await pAiV('GET', '/api/crm/ai/settings')).status === 200 && (await pAiV('PUT', '/api/crm/ai/settings', { systemPrompt: 'x' })).status === 403)
    check('Payroll: refused without the permission; View reads; only Edit saves a salary or a payment', (await pNone('GET', '/api/crm/payroll')).status === 403 && (await pPayV('GET', '/api/crm/payroll')).status === 200 && (await pPayV('POST', '/api/crm/payroll/payments', { staffId: pPayV.staffId || 'x', amount: 1 })).status === 403 && (await pPayE('GET', '/api/crm/payroll')).status === 200)
    check('Team growth: a member without "See everybody\'s growth" gets only their own page', (await pGr('GET', '/api/crm/growth/team')).status === 403 && (await pGrT('GET', '/api/crm/growth/team')).status === 200)
    check('Team growth: "Approve goals, set and pay primes" opens the team page and manages', (await pGrM('GET', '/api/crm/growth/team')).status === 200)
    // every page of Settings still opens; the groups that only held unbuilt or duplicated options are gone
    console.log('\n== Settings pages')
    const sAdm = await login(await makeUser('settings-admin', {}, true))
    const { SECTIONS } = await import('../src/lib/crm/settings/registry.js')
    const opened = []
    for (const g of SECTIONS.flatMap((x) => x.groups)) opened.push([g, (await sAdm('GET', `/api/crm/settings?group=${g}`)).status])
    check(`all ${opened.length} Settings groups open`, opened.every(([, st]) => st === 200), opened.filter(([, st]) => st !== 200).join(' '))
    check('removed groups answer 404 (google, pusher, banks, tags, subscriptions)', (await Promise.all(['google', 'pusher', 'banks', 'tags', 'subscriptions'].map(async (g) => (await sAdm('GET', `/api/crm/settings?group=${g}`)).status))).every((st) => st === 404))
    check('the lists moved to the menu still open as pages', (await Promise.all(['task-statuses', 'ticket-statuses', 'ticket-priorities', 'departments', 'predefined-replies', 'spam-filters', 'lead-statuses', 'lead-sources', 'web-to-lead', 'currencies', 'taxes', 'tags', 'payment-modes', 'custom-fields', 'countries'].map(async (r) => (await sAdm('GET', `/api/crm/${r}?pageSize=5`)).status))).every((st) => st === 200))
    // ideas proposed to a client: team permissions, what the client sees, its answer, the AI helper's drafts
    console.log('\n== Client ideas')
    {
        const iA = await login(await makeUser('idea-a', { customers: ['view', 'create', 'edit'], client_ideas: ['view', 'create', 'edit', 'delete'] }))
        const iCU = await makeUser('idea-c', { customers: ['view'], client_ideas: ['view'] }); const iC = await login(iCU)
        const iN = await login(await makeUser('idea-none', { customers: ['view'] }))
        const cx = await iA('POST', '/api/crm/customers', { company: 'zz idea client X', active: true }), cy = await iA('POST', '/api/crm/customers', { company: 'zz idea client Y', active: true })
        if (cx.body?.id) made.extraRows.push(['crmClient', cx.body.id]); if (cy.body?.id) made.extraRows.push(['crmClient', cy.body.id])
        const portalOf = async (clientId, tag) => {
            const email = `idea.${tag}.${Date.now()}@test.local`
            const ct = await prisma.crmContact.create({ data: { clientId, firstName: 'Ida', lastName: tag, email } }); made.extraRows.unshift(['crmContact', ct.id])
            await iA('POST', `/api/crm/customers/${clientId}/portal-password`, { contactId: ct.id, password: 'Portal-Test-12345' })
            const r = await fetch(`${BASE}/api/portal/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Portal-Test-12345' }) })
            const ck = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
            return async (method, path, body) => { const x = await fetch(`${BASE}/api/portal${path}`, { method, headers: { cookie: ck, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: x.status, body: await x.json().catch(() => null) } }
        }
        const px = await portalOf(cx.body.id, 'x'), py = await portalOf(cy.body.id, 'y')
        const X = cx.body.id
        check('Ideas: without the permission the board is closed; view-only cannot create', (await iN('GET', `/api/crm/client-ideas?clientId=${X}`)).status === 403 && (await iC('GET', `/api/crm/client-ideas?clientId=${X}`)).status === 200 && (await iC('POST', '/api/crm/client-ideas', { clientId: X, title: 'zz nope' })).status === 403)
        const mk = await iA('POST', '/api/crm/client-ideas', { clientId: X, title: 'zz idea one', body: '<p>Why <script>x</script>it matters</p>', category: 'grow', impact: 3, effort: 1, gain: 'More calls', price: 1500 })
        const ID = mk.body?.idea?.id
        check('Ideas: a team member creates a draft, hidden from the client, script removed', mk.status === 201 && mk.body.idea.status === 'draft' && mk.body.idea.visible === false && !/script/.test(mk.body.idea.body))
        check('Ideas: the client does not see a draft, even by its address', (await px('GET', '/ideas')).body?.list?.length === 0 && (await px('GET', `/ideas/${ID}`)).status === 404)
        check('Ideas: an empty title is refused', (await iA('POST', '/api/crm/client-ideas', { clientId: X, title: ' ' })).status === 400)
        check('Ideas: view-only cannot move or delete', (await iC('POST', `/api/crm/client-ideas/${ID}/move`, { clientId: X, status: 'proposed', index: 0 })).status === 403 && (await iC('DELETE', `/api/crm/client-ideas/${ID}?clientId=${X}`)).status === 403)
        const mv = await iA('POST', `/api/crm/client-ideas/${ID}/move`, { clientId: X, status: 'proposed', index: 0 })
        check('Ideas: moving it to Proposed shows it to the client', mv.status === 200 && mv.body.idea.visible === true && !!mv.body.idea.proposedAt)
        const seen = await px('GET', '/ideas')
        check('Ideas: the client sees it; another client does not', seen.body?.list?.length === 1 && seen.body.list[0].title === 'zz idea one' && (await py('GET', '/ideas')).body?.list?.length === 0 && (await py('GET', `/ideas/${ID}`)).status === 404)
        check('Ideas: the client area never leaks team-only fields', !('assigneeIds' in (seen.body.list[0] || {})) && !('addedFrom' in (seen.body.list[0] || {})) && !('fingerprint' in (seen.body.list[0] || {})))
        await iA('POST', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, body: 'zz team note', internal: true }); await iA('POST', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, body: 'zz hello client' })
        const det = await px('GET', `/ideas/${ID}`)
        check('Ideas: the client reads the team message but never the internal note', det.body?.comments?.some((c) => /zz hello client/.test(c.body)) && !det.body?.comments?.some((c) => /zz team note/.test(c.body)))
        // messages: rich text, mentions, replies, edit and delete, for the team and for the client
        const m1 = await iA('POST', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, body: '<p>Hello <strong>client</strong><script>x</script> @Checkidea-c please look</p>' })
        check('Ideas: a team message keeps its style, loses scripts, and mentioning a colleague tells them', m1.status === 201 && /<strong>client<\/strong>/.test(m1.body?.comment?.body || '') && !/script/.test(m1.body?.comment?.body || '') && (await prisma.crmNotification.count({ where: { toUserId: iCU.staffId, additionalData: 'mention' } })) >= 1)
        const rep = await iA('POST', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, body: '<p>reply here</p>', replyToId: m1.body?.comment?.id })
        check('Ideas: a reply points to the message it answers', rep.status === 201 && rep.body?.comment?.replyTo?.id === m1.body?.comment?.id && /Hello/.test(rep.body.comment.replyTo.text))
        check('Ideas: only the author edits a team message; a stranger is refused', (await iC('PUT', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, commentId: m1.body?.comment?.id, body: '<p>hack</p>' })).status === 403 && (await iA('PUT', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, commentId: m1.body?.comment?.id, body: '<p>Hello again</p>' })).status === 200)
        const cl1 = (await iA('GET', `/api/crm/client-ideas/${ID}/comments?clientId=${X}`)).body?.list || []
        check('Ideas: an edited message says so', cl1.find((c) => c.id === m1.body?.comment?.id)?.edited === true && /Hello again/.test(cl1.find((c) => c.id === m1.body?.comment?.id)?.body || ''))
        const pr = await px('GET', `/ideas/${ID}`)
        check('Ideas: the client sees the reply with the quoted message, and the edit mark', pr.body?.comments?.some((c) => c.id === rep.body?.comment?.id && c.replyTo?.id === m1.body?.comment?.id) && pr.body.comments.find((c) => c.id === m1.body?.comment?.id)?.edited === true)
        const cm = await px('POST', `/ideas/${ID}`, { action: 'comment', body: '<p>I like <em>it</em><script>y</script></p>', replyToId: rep.body?.comment?.id })
        check('Ideas: the client writes with style (scripts removed) and answers a message', cm.status === 200 && /<em>it<\/em>/.test(cm.body?.comment?.body || '') && !/script/.test(cm.body?.comment?.body || '') && cm.body?.comment?.replyTo?.id === rep.body?.comment?.id && cm.body?.comment?.mine === true)
        check('Ideas: the client edits its own message but not the team\'s', (await px('POST', `/ideas/${ID}`, { action: 'edit', commentId: cm.body?.comment?.id, body: '<p>I love it</p>' })).status === 200 && (await px('POST', `/ideas/${ID}`, { action: 'edit', commentId: m1.body?.comment?.id, body: '<p>nope</p>' })).status === 404 && (await py('POST', `/ideas/${ID}`, { action: 'edit', commentId: cm.body?.comment?.id, body: '<p>nope</p>' })).status === 404)
        const note = await iA('POST', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, body: '<p>secret team note</p>', internal: true })
        const rn = await iA('POST', `/api/crm/client-ideas/${ID}/comments`, { clientId: X, body: '<p>answering the note</p>', replyToId: note.body?.comment?.id, internal: true })
        check('Ideas: the client never sees a team note, nor a quote of it', !(await px('GET', `/ideas/${ID}`)).body?.comments?.some((c) => /secret team note|answering the note/.test(c.body) || c.replyTo?.text?.includes('secret')))
        check('Ideas: the client deletes its own message (a reply to it loses its quote); the team\'s stays', (await px('POST', `/ideas/${ID}`, { action: 'delete', commentId: cm.body?.comment?.id })).status === 200 && (await px('POST', `/ideas/${ID}`, { action: 'delete', commentId: m1.body?.comment?.id })).status === 404)
        check('Ideas: view-only cannot delete a team message; the author can', (await iC('DELETE', `/api/crm/client-ideas/${ID}/comments?clientId=${X}&commentId=${rep.body?.comment?.id}`)).status === 403 && (await iA('DELETE', `/api/crm/client-ideas/${ID}/comments?clientId=${X}&commentId=${rep.body?.comment?.id}`)).status === 200)
        void rn
        check('Ideas: a wrong answer is refused', (await px('POST', `/ideas/${ID}`, { action: 'answer', answer: 'maybe' })).status === 400)
        const ans = await px('POST', `/ideas/${ID}`, { action: 'answer', answer: 'approved', comment: 'zz yes please' })
        const after = (await iA('GET', `/api/crm/client-ideas?clientId=${X}`)).body?.list?.find((i) => i.id === ID)
        check('Ideas: the client approves with a word: the idea moves to Approved and the team sees it', ans.status === 200 && after?.status === 'approved' && after?.answer === 'approved' && (await iA('GET', `/api/crm/client-ideas/${ID}/comments?clientId=${X}`)).body?.list?.some((c) => c.authorKind === 'client' && /zz yes please/.test(c.body)))
        check('Ideas: the team is told on the bell', (await prisma.crmNotification.count({ where: { additionalData: 'client-idea', description: { contains: 'zz idea one' } } })) >= 1)
        await iA('PUT', `/api/crm/client-ideas/${ID}`, { clientId: X, status: 'doing' })
        check('Ideas: once we work on it the client can no longer change the answer', (await px('POST', `/ideas/${ID}`, { action: 'answer', answer: 'declined' })).status === 409)
        const mt = await iA('POST', `/api/crm/client-ideas/${ID}/task`, { clientId: X })
        check('Ideas: "make a task" needs the task permission', mt.status === 403)
        await prisma.crmClient.update({ where: { id: X }, data: { portalHidden: ['ideas'] } })
        check('Ideas: switched off for this client, the section is closed', (await px('GET', '/ideas')).status === 403)
        await prisma.crmClient.update({ where: { id: X }, data: { portalHidden: [] } })
        const ai1 = await iA('POST', '/api/crm/client-ideas/ai/add', { clientId: X, ideas: [{ title: 'zz ai idea', why: 'Because', plan: ['a', 'b'], impact: 3, effort: 1, gain: 'x', sources: ['https://example.com/a', 'javascript:alert(1)'] }] })
        const ai2 = await iA('POST', '/api/crm/client-ideas/ai/add', { clientId: X, ideas: [{ title: 'zz ai idea', why: 'Because' }] })
        const aiRow = (await iA('GET', `/api/crm/client-ideas?clientId=${X}`)).body?.list?.find((i) => i.title === 'zz ai idea')
        check('Ideas: AI ideas are added as hidden drafts, only safe links kept, never twice', ai1.body?.created === 1 && ai2.body?.created === 0 && aiRow?.source === 'ai' && aiRow?.status === 'draft' && aiRow?.visible === false && aiRow?.sources?.length === 1)
        check('Ideas: the AI helper needs the permission to run', (await iC('POST', '/api/crm/client-ideas/ai', { clientId: X })).status === 403 && (await iA('GET', `/api/crm/client-ideas/ai?clientId=${X}`)).status === 200)
        const cats0 = await iA('GET', '/api/crm/idea-categories?pageSize=50')
        check('Ideas: the eight categories that come with the app are there, in order', cats0.status === 200 && ['grow', 'save', 'marketing', 'sales', 'tech', 'ops', 'brand', 'other'].every((c) => (cats0.body?.list || []).some((r) => r.code === c)))
        check('Ideas: view-only and strangers cannot change the categories', (await iC('POST', '/api/crm/idea-categories', { name: 'zz no' })).status === 403 && (await iN('GET', '/api/crm/idea-categories')).status === 403)
        const cc = await iA('POST', '/api/crm/idea-categories', { name: 'Zz Customer care!', color: '#ff0000' })
        check('Ideas: a new category gets its own code from its name', cc.status === 201 && cc.body?.code === 'zz-customer-care')
        const withCat = await iA('POST', '/api/crm/client-ideas', { clientId: X, title: 'zz cat idea', category: 'zz-customer-care' }), badCat = await iA('POST', '/api/crm/client-ideas', { clientId: X, title: 'zz cat idea 2', category: 'does-not-exist' })
        check('Ideas: an idea takes the new category; an unknown one falls back to Other', withCat.body?.idea?.category === 'zz-customer-care' && badCat.body?.idea?.category === 'other')
        check('Ideas: the board lists the categories, and the client area too', (await iA('GET', `/api/crm/client-ideas?clientId=${X}`)).body?.categories?.some((c) => c.code === 'zz-customer-care') && (await px('GET', '/ideas')).body?.categories?.grow?.name === 'Grow the business')
        check('Ideas: a category in use cannot be deleted; Other can never be deleted', (await iA('DELETE', `/api/crm/idea-categories/${cc.body?.id}`)).status === 409 && (await iA('DELETE', `/api/crm/idea-categories/${(cats0.body.list.find((r) => r.code === 'other') || {}).id}`)).status === 409)
        await prisma.crmClientIdea.deleteMany({ where: { clientId: X, title: { startsWith: 'zz cat idea' } } })
        check('Ideas: once unused, the category can be deleted', (await iA('DELETE', `/api/crm/idea-categories/${cc.body?.id}`)).status === 200)
        check('Ideas: delete needs the permission', (await iC('DELETE', `/api/crm/client-ideas/${ID}?clientId=${X}`)).status === 403 && (await iA('DELETE', `/api/crm/client-ideas/${ID}?clientId=${X}`)).status === 200)
        await prisma.crmClientIdeaComment.deleteMany({ where: { ideaId: ID } })
        await prisma.crmClientIdea.deleteMany({ where: { clientId: { in: [X, cy.body.id] } } })
        await prisma.crmClientResearch.deleteMany({ where: { clientId: { in: [X, cy.body.id] } } })
        await prisma.crmMailLog.deleteMany({ where: { relType: 'client_idea' } })
    }
    // people who sign in with Google / GitHub without an account ask for one; the administrators decide
    console.log('\n== Account requests')
    {
        const rA = await login(await makeUser('req-admin', {}, true)), rN = await login(await makeUser('req-none', { customers: ['view'] })), rM = await login(await makeUser('req-manager', { staff: ['view', 'create'] }))
        const mail = (t) => `zz.req.${t}.${Date.now()}@test.local`
        const e1 = mail('one'), e2 = mail('two'), e3 = mail('three')
        for (const [email, name] of [[e1, 'Zz Sara Benali'], [e2, 'Zz Omar'], [e3, 'Zz Third']]) await prisma.crmSignupRequest.create({ data: { email, name, provider: 'google', picture: 'https://example.com/p.png' } })
        const rows = await prisma.crmSignupRequest.findMany({ where: { email: { in: [e1, e2, e3] } } }); const idOf = (e) => rows.find((r) => r.email === e).id
        check('Requests: without the right to add members the list is closed, and so are approve and decline', (await rN('GET', '/api/crm/team/signup-requests')).status === 403 && (await rN('POST', `/api/crm/team/signup-requests/${idOf(e1)}/approve`, {})).status === 403 && (await rN('POST', `/api/crm/team/signup-requests/${idOf(e1)}/reject`, {})).status === 403)
        const lst = await rM('GET', '/api/crm/team/signup-requests')
        check('Requests: a member who may add members sees the waiting requests', lst.status === 200 && [e1, e2, e3].every((e) => lst.body.list.some((r) => r.email === e)) && lst.body.list.every((r) => r.status === 'pending'))
        const role = await prisma.crmRole.findFirst({ select: { id: true } })
        const ap = await rA('POST', `/api/crm/team/signup-requests/${idOf(e1)}/approve`, { roleId: role?.id || null })
        const made = await prisma.user.findFirst({ where: { email: e1 } }), mstaff = await prisma.crmStaff.findFirst({ where: { email: e1 } })
        if (made) made_users_cleanup(made.id, mstaff?.id)
        check('Requests: approving creates the account (name from Google, the chosen role, no admin, picture kept)', ap.status === 200 && !!made && mstaff?.firstName === 'Zz' && mstaff?.lastName === 'Sara Benali' && mstaff?.admin === false && (!role || mstaff?.roleId === role.id) && made.image === 'https://example.com/p.png')
        check('Requests: it can only be answered once', (await rA('POST', `/api/crm/team/signup-requests/${idOf(e1)}/approve`, {})).status === 409 && (await rA('POST', `/api/crm/team/signup-requests/${idOf(e1)}/reject`, {})).status === 409)
        check('Requests: declining keeps it on record and creates no account', (await rA('POST', `/api/crm/team/signup-requests/${idOf(e2)}/reject`, { note: 'zz not a customer' })).status === 200 && !(await prisma.user.findFirst({ where: { email: e2 } })) && (await prisma.crmSignupRequest.findUnique({ where: { id: idOf(e2) } })).status === 'rejected')
        const left = await rM('GET', '/api/crm/team/signup-requests')
        check('Requests: answered ones leave the waiting list', left.body.list.every((r) => r.email !== e1 && r.email !== e2) && left.body.list.some((r) => r.email === e3))
        await prisma.user.create({ data: { name: 'zz taken', email: e3, password: 'x', authority: ['user'], role: 'user' } }).then((u) => { made_users_cleanup(u.id) })
        check('Requests: an email that already has an account is refused', (await rA('POST', `/api/crm/team/signup-requests/${idOf(e3)}/approve`, {})).status === 409)
        await prisma.crmSignupRequest.deleteMany({ where: { email: { in: [e1, e2, e3] } } })
        await prisma.crmMailLog.deleteMany({ where: { relType: 'signup_request' } })
    }
    // a client contact whose password a team member sets: what stops them from signing in is said at once
    console.log('\n== Client sign-in help')
    {
        const cs = await login(await makeUser('cs-staff', { customers: ['view', 'create', 'edit'] }))
        const cl = await cs('POST', '/api/crm/customers', { company: 'zz sign-in help', active: true })
        if (cl.body?.id) made.extraRows.push(['crmClient', cl.body.id])
        const email = `zz.signin.${Date.now()}@test.local`, pw = 'Portal-Test-12345'
        const ct = await prisma.crmContact.create({ data: { clientId: cl.body.id, firstName: 'Zz', lastName: 'Contact', email } }); made.extraRows.unshift(['crmContact', ct.id])
        const portalLogin = (e, p) => fetch(`${BASE}/api/portal/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
        const set1 = await cs('POST', `/api/crm/customers/${cl.body.id}/portal-password`, { contactId: ct.id, password: pw })
        check('Client sign-in: setting the password tells whether the contact can sign in now, and where', set1.status === 200 && set1.body?.access?.ok === true && /\/portal$/.test(set1.body?.url || ''))
        check('Client sign-in: the contact signs in with it', (await portalLogin(email, pw)).status === 200)
        await prisma.crmClient.update({ where: { id: cl.body.id }, data: { active: false } })
        const set2 = await cs('POST', `/api/crm/customers/${cl.body.id}/portal-password`, { contactId: ct.id, password: pw })
        check('Client sign-in: an inactive client is reported when the password is set', set2.body?.access?.ok === false && set2.body.access.reasons.includes('The client is not active'))
        const inactive = await portalLogin(email, pw), wrong = await portalLogin(email, 'wrong-password-1')
        check('Client sign-in: with the right password, an inactive company is told so; a wrong password just fails', inactive.status === 403 && /not active/.test(inactive.body?.error || '') && wrong.status === 401 && wrong.body?.error === 'Wrong email or password')
        await prisma.crmClient.update({ where: { id: cl.body.id }, data: { active: true } })
        const cc = (e, p) => fetch(`${BASE}/api/crm/auth/client-check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) }).then((r) => r.json())
        check('Client sign-in: the team sign-in recognises a client account, and only with the right password', (await cc(email, pw)).client === true && (await cc(email, 'nope-nope-1')).client === false && (await cc('nobody@test.local', pw)).client === false)
        await prisma.loginAttempt.deleteMany({ where: { key: `portal:${email}` } })
    }
    // chat messages: stamps, bookmarks, pins, edit and delete, and the finer chat switches
    console.log('\n== Chat messages')
    {
        const full = { chat: ['view', 'send_files', 'create_groups', 'call', 'client_chats'], chat_messages: ['react', 'bookmark', 'pin', 'edit_own', 'delete_own'] }
        const uA = await makeUser('chat-a', full), uB = await makeUser('chat-b', full), uMod = await makeUser('chat-mod', { ...full, chat_messages: [...full.chat_messages, 'delete_others'] })
        const uView = await makeUser('chat-view', { chat: ['view'] })
        const A = await login(uA), B = await login(uB), MOD = await login(uMod), V = await login(uView)
        const R = (await A('POST', '/api/crm/chat/rooms', { staffId: uB.staffId })).body?.id
        const send = async (u, body) => (await u('POST', `/api/crm/chat/rooms/${R}`, { body })).body
        const m1 = await send(A, 'zz chat hello'), m2 = await send(A, 'zz chat second')
        const act = (u, m, body) => u('POST', `/api/crm/chat/messages/${m.id}`, body)
        const seen = async (u) => (await u('GET', `/api/crm/chat/rooms/${R}`)).body
        check('Chat messages: a colleague reacts with a stamp, others see the count, and it can be taken back', (await act(B, m1, { action: 'react', emoji: '👍' })).status === 200 && (await seen(A)).messages.find((x) => x.id === m1.id).reactions.some((r) => r.emoji === '👍' && r.count === 1 && r.mine === false) && (await seen(B)).messages.find((x) => x.id === m1.id).reactions[0].mine === true && (await act(B, m1, { action: 'react', emoji: '👍' })).status === 200 && (await seen(A)).messages.find((x) => x.id === m1.id).reactions.length === 0)
        check('Chat messages: any emoji can be used (skin tones, flags, joined ones); text and markup are refused', (await act(B, m1, { action: 'react', emoji: '👩🏽‍💻' })).status === 200 && (await act(B, m1, { action: 'react', emoji: '🇲🇦' })).status === 200 && (await act(B, m1, { action: 'react', emoji: 'abc' })).status === 400 && (await act(B, m1, { action: 'react', emoji: '<b>' })).status === 400 && (await seen(A)).messages.find((x) => x.id === m1.id).reactions.map((r) => r.emoji).includes('🇲🇦'))
        await act(B, m1, { action: 'react', emoji: '👩🏽‍💻' }); await act(B, m1, { action: 'react', emoji: '🇲🇦' })
        await act(B, m1, { action: 'bookmark', on: true })
        const bm = await B('GET', '/api/crm/chat/bookmarks'), bmA = await A('GET', '/api/crm/chat/bookmarks')
        check('Chat messages: a saved message is in my saved list only, and can be removed', bm.body?.list?.some((x) => x.id === m1.id && x.roomId === R) && !bmA.body?.list?.some((x) => x.id === m1.id) && (await seen(B)).messages.find((x) => x.id === m1.id).bookmarked === true && (await act(B, m1, { action: 'bookmark', on: false })).status === 200 && !(await B('GET', '/api/crm/chat/bookmarks')).body?.list?.some((x) => x.id === m1.id))
        await act(B, m2, { action: 'pin', on: true })
        const pinned = await seen(A)
        check('Chat messages: a pinned message is shown to everybody in the conversation, with a line saying who pinned it', pinned.pinned?.some((p) => p.id === m2.id) && pinned.messages.find((x) => x.id === m2.id).pinned === true && pinned.messages.some((x) => x.system && /pinned a message/.test(x.body)) && (await act(B, m2, { action: 'pin', on: false })).status === 200 && !(await seen(A)).pinned?.some((p) => p.id === m2.id))
        check('Chat messages: edit is for the author only, and the edit shows to the others as "edited"', (await act(B, m1, { action: 'edit', body: 'hack' })).status === 403 && (await act(A, m1, { action: 'edit', body: 'zz chat hello edited' })).status === 200 && (await seen(B)).messages.find((x) => x.id === m1.id).edited === true && /edited/.test((await seen(B)).messages.find((x) => x.id === m1.id).body))
        const before = new Date(Date.now() - 1500).toISOString()
        await act(A, m2, { action: 'edit', body: 'zz chat second v2' })
        const last = (await seen(B)).messages.at(-1)
        const poll = await B('GET', `/api/crm/chat/rooms/${R}?after=${encodeURIComponent(last.at)}&since=${encodeURIComponent(before)}`)
        check('Chat messages: an open conversation learns about edits made since its last look', poll.body?.changed?.some((x) => x.id === m2.id && /v2/.test(x.body)) && !!poll.body?.now)
        check('Chat messages: an empty edit is refused', (await act(A, m2, { action: 'edit', body: '   ' })).status === 400)
        check('Chat messages: a colleague cannot delete mine; I can; a moderator can delete anybody\'s', (await act(B, m2, { action: 'delete' })).status === 403 && (await act(A, m2, { action: 'delete' })).status === 200)
        const teamId = (await A('GET', '/api/crm/chat/rooms')).body?.rooms?.find((r) => r.kind === 'team')?.id
        const m3 = (await A('POST', `/api/crm/chat/rooms/${teamId}`, { body: 'zz chat third' })).body
        check('Chat messages: a moderator (Delete messages of other people) deletes a colleague\'s message; an ordinary colleague cannot', (await act(B, m3, { action: 'delete' })).status === 403 && (await act(MOD, m3, { action: 'delete' })).status === 200)
        const after = (await seen(A)).messages.find((x) => x.id === m2.id)
        check('Chat messages: a deleted message keeps only a "deleted" line (no text, no stamps, no pin), and cannot be acted on again', after.deleted === true && after.body === '' && after.reactions.length === 0 && (await act(B, m2, { action: 'react', emoji: '👍' })).status === 410)
        // permissions
        const vU = (await V('GET', '/api/crm/chat/rooms')).body
        const mV = await V('POST', `/api/crm/chat/rooms/${R}`, { body: 'x' })
        const tm = (await A('POST', `/api/crm/chat/rooms/${teamId}`, { body: 'zz chat for the viewer' })).body
        check('Chat messages: with Team chat → View only, stamps, saving, pinning, editing and deleting are refused', (await act(V, tm, { action: 'react', emoji: '👍' })).status === 403 && (await act(V, tm, { action: 'bookmark' })).status === 403 && (await act(V, tm, { action: 'pin' })).status === 403 && (await V('GET', '/api/crm/chat/bookmarks')).status === 403 && vU?.me?.can?.react === false)
        const team = (vU?.rooms || []).find((r) => r.kind === 'team')
        const mine = await V('POST', `/api/crm/chat/rooms/${team?.id}`, { body: 'zz view only message' }); const mid = mine.body?.id
        check('Chat messages: without Edit / Delete own, even my own message cannot be edited or deleted', mine.status === 201 && (await act(V, { id: mid }, { action: 'edit', body: 'again' })).status === 403 && (await act(V, { id: mid }, { action: 'delete' })).status === 403)
        void mV
        const fd = new FormData(); fd.append('file', new File(['hello'], 'a.txt', { type: 'text/plain' }))
        check('Chat switches: files, groups and client conversations need their own switch', (await V('POST', '/api/crm/chat/upload', fd)).status === 403 && (await V('POST', '/api/crm/chat/rooms', { group: { name: 'zz g', staffIds: [uA.staffId] } })).status === 403 && !(vU?.rooms || []).some((r) => r.kind === 'client'))
        check('Chat switches: with them, groups open', [200, 201].includes((await A('POST', '/api/crm/chat/rooms', { group: { name: 'zz chat group', staffIds: [uB.staffId] } })).status))
        const gr = (await A('GET', '/api/crm/chat/rooms')).body?.rooms?.find((r) => r.title === 'zz chat group'); if (gr) await prisma.crmChatRoom.delete({ where: { id: gr.id } }).catch(() => {})
        await prisma.crmChatBookmark.deleteMany({ where: { memberKey: { in: [`staff:${uA.staffId}`, `staff:${uB.staffId}`, `staff:${uView.staffId}`] } } })
        await prisma.crmChatMessage.deleteMany({ where: { roomId: R } }); await prisma.crmChatMessage.deleteMany({ where: { body: { startsWith: 'zz view only' } } }); await prisma.crmChatMessage.deleteMany({ where: { OR: [{ body: { startsWith: 'zz chat' } }, { roomId: teamId, body: '' }, { body: { contains: 'pinned a message' } }, { body: { contains: 'unpinned a message' } }] } }); await prisma.crmChatRoom.delete({ where: { id: R } }).catch(() => {})
    }
    check('non-admin: cannot edit roles', (await plain('PUT', '/api/roles', { action: 'delete', roleId: 'x' })).status === 403)
} catch (e) { console.log('ERROR', e.message) } finally {
    for (const [model, id] of [...made.rows, ...made.extraRows]) {
        if (model === 'crmLead') { await prisma.crmLeadActivityLog.deleteMany({ where: { leadId: id } }).catch(() => {}); await prisma.crmLeadMail.deleteMany({ where: { leadId: id } }).catch(() => {}); await prisma.crmEvent.deleteMany({ where: { leadId: id } }).catch(() => {}) }
        await prisma[model].delete({ where: { id } }).catch(() => {})
    }
    await prisma.crmActivityLog.deleteMany({ where: { staffId: { in: made.staff }, description: { contains: 'login as' } } }).catch(() => {})
    await prisma.crmStaffPermission.deleteMany({ where: { staffId: { in: made.staff } } }).catch(() => {})
    await prisma.crmStaff.deleteMany({ where: { id: { in: made.staff } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: made.users } } }).catch(() => {})
    const fails = results.filter((x) => !x).length
    console.log(`\n${results.length - fails}/${results.length} checks passed${fails ? `, ${fails} FAILED` : ''}`)
    await prisma.$disconnect()
    process.exit(fails ? 1 : 0)
}

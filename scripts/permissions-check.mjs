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
        check('a member cannot ask for the goals of everybody, a Grow viewer can', (await b('GET', '/api/crm/growth/goals?all=1')).status === 403 && ((await v('GET', '/api/crm/growth/goals?all=1')).body?.list || []).some((g) => g.id === GID))
        check('another member cannot change or delete it', (await b('PUT', `/api/crm/growth/goals/${GID}`, { status: 'learning' })).status === 403 && (await b('DELETE', `/api/crm/growth/goals/${GID}`)).status === 403)
        check('a member cannot add a goal for somebody else', (await b('POST', '/api/crm/growth/goals', { title: 'x', staffId: gA.staffId })).status === 201 && (await prisma.crmSkillGoal.findFirst({ where: { title: 'x', staffId: gA.staffId } })) === null)
        const bx = await prisma.crmSkillGoal.findFirst({ where: { title: 'x', staffId: gB.staffId } }); if (bx) made.rows.unshift(['crmSkillGoal', bx.id])
        check('the owner moves it to learning', (await a('PUT', `/api/crm/growth/goals/${GID}`, { status: 'learning' })).status === 200 && (await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).status === 'learning')
        check('a Grow viewer (no Edit) cannot set a prime, a manager can', (await v('PUT', `/api/crm/growth/goals/${GID}`, { primeAmount: 800 })).status === 403 && (await m('PUT', `/api/crm/growth/goals/${GID}`, { primeAmount: 800, supportAmount: 300, approved: true })).status === 200)
        const ap = await prisma.crmSkillGoal.findUnique({ where: { id: GID } })
        check('...prime, support and approval are saved (with who approved) and the member is told', ap.primeAmount === 800 && ap.supportAmount === 300 && ap.approved && ap.approvedBy === gM.staffId && (await prisma.crmNotification.count({ where: { toUserId: gA.staffId, additionalData: 'growth', createdAt: { gte: t0 } } })) === 1)
        check('the member sees their amounts but cannot change them', ((await a('GET', '/api/crm/growth/goals')).body?.list || []).find((g) => g.id === GID)?.primeAmount === 800 && (await a('PUT', `/api/crm/growth/goals/${GID}`, { primeAmount: 99999 })).status === 200 && (await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).primeAmount === 800)
        check('a prime cannot be paid before the goal is passed', (await m('PUT', `/api/crm/growth/goals/${GID}`, { primePaid: true })).status === 400)
        check('the member marks it passed: the date is set', (await a('PUT', `/api/crm/growth/goals/${GID}`, { status: 'passed' })).status === 200 && !!(await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).doneDate)
        const tm = await v('GET', '/api/crm/growth/team')
        check('the team overview shows the prime owed (Grow viewers only)', (await a('GET', '/api/crm/growth/team')).status === 403 && tm.status === 200 && tm.body?.list?.find((r) => r.id === gA.staffId)?.primeOwed === 800 && tm.body?.totals?.primeOwed >= 800)
        check('the manager pays it: date set, owed goes to paid', (await m('PUT', `/api/crm/growth/goals/${GID}`, { primePaid: true })).status === 200 && !!(await prisma.crmSkillGoal.findUnique({ where: { id: GID } })).primePaidAt && (await v('GET', '/api/crm/growth/team')).body?.list?.find((r) => r.id === gA.staffId)?.primePaid === 800)
        check('certificate files: the owner and Grow viewers see them, another member does not', (await a('GET', `/api/crm/media?relType=skillgoal&relId=${GID}`)).status === 200 && (await v('GET', `/api/crm/media?relType=skillgoal&relId=${GID}`)).status === 200 && (await b('GET', `/api/crm/media?relType=skillgoal&relId=${GID}`)).status === 403)
        check('an approved or passed goal cannot be deleted by its owner; only Delete removes it', (await a('DELETE', `/api/crm/growth/goals/${GID}`)).status === 403 && (await m('DELETE', `/api/crm/growth/goals/${GID}`)).status === 403 && (await d('DELETE', `/api/crm/growth/goals/${GID}`)).status === 200 && !(await prisma.crmSkillGoal.findUnique({ where: { id: GID } })))
        const own = await a('POST', '/api/crm/growth/goals', { title: 'zz goal: own draft', kind: 'skill' })
        if (own.body?.id) made.rows.unshift(['crmSkillGoal', own.body.id])
        check('the owner deletes their own goal while it is only planned', own.status === 201 && (await a('DELETE', `/api/crm/growth/goals/${own.body?.id}`)).status === 200)
        await prisma.crmNotification.deleteMany({ where: { additionalData: 'growth', createdAt: { gte: t0 } } })
    }

    console.log('\n== Single sign-on: the CRM as an OpenID Connect provider')
    {
        const crypto2 = await import('node:crypto')
        const sMem = await makeUser('sso-member', {}), sAdmin = await makeUser('sso-admin', {}, true)
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
        check('...without a link, on another site, or of somebody else: not listed', !titles.includes('zz sso no link') && !titles.includes('zz sso meet other google') && !titles.includes('zz sso not mine'))
        const all1 = (await (await fetch(`${BASE}/api/v1/calendar/events?all=1`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json())
        check('...all=1 also lists other links, and from/to limit the dates', (all1.data || []).some((e) => e.title === 'zz sso meet other google') && !((await (await fetch(`${BASE}/api/v1/calendar/events?from=${new Date(Date.now() + 5 * 86400000).toISOString()}&to=${new Date(Date.now() + 9 * 86400000).toISOString()}`, { headers: { authorization: `Bearer ${tj.access_token}` } })).json()).data || []).length)
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
        check('...and says why when the client is inactive', acc2?.ok === false && acc2.reasons.includes('The client is not active') && (await tryLogin(mail, 'Portal-Test-12345')).status === 401, JSON.stringify(acc2))
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

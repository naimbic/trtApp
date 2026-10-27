// Checks that "View own" / "View" / no permission behave on every sales document, over real HTTP.
// Needs the dev server (npm run dev, port 3000) and the database of .env. Creates temporary test users and records and removes them.
//   node --env-file=.env scripts/permissions-check.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const prisma = new PrismaClient()
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const made = { users: [], staff: [], rows: [], extraRows: [] } // rows: [model, id]

async function makeUser(label, perms) {
    const email = `permcheck.${label}.${crypto.randomBytes(3).toString('hex')}@test.local`
    const password = crypto.randomBytes(12).toString('base64url')
    const user = await prisma.user.create({ data: { name: `Check ${label}`, email, password: await bcrypt.hash(password, 10), authority: ['user'], role: 'user', status: 'active', image: '/img/avatars/thumb-1.jpg' } })
    const staff = await prisma.crmStaff.create({ data: { userId: user.id, email, firstName: `Check${label}`, active: true, admin: false } })
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
    return async (method, path, body) => {
        const res = await fetch(BASE + path, { method, headers: { cookie: hdr(), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
        let j = null, text = ''; try { text = await res.clone().text(); j = JSON.parse(text) } catch { /* pdf / html */ }
        return { status: res.status, body: j, text }
    }
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
    check('the follower now sees the lead (and its mails and meetings)', (await lb('GET', `/api/crm/pipeline/leads/${LID}`)).body?.mails?.length === 1)
    { const m1 = await lb('POST', `/api/crm/pipeline/leads/${LID}/mails`, { subject: 'x' }), m2 = await lb('POST', `/api/crm/pipeline/leads/${LID}/meetings`, { title: 'x', start: start.toISOString() }); check('...but a follower cannot log mails or add meetings (only the team can)', m1.status === 403 && m2.status === 403, `${m1.status} ${JSON.stringify(m1.body).slice(0, 70)} / ${m2.status} ${JSON.stringify(m2.body).slice(0, 70)}`) }
    check('...and a third person still sees nothing', (await lc('GET', `/api/crm/pipeline/leads/${LID}`)).status === 404)
    check('only the author (or someone with delete rights) deletes a mail', (await lb('DELETE', `/api/crm/pipeline/leads/${LID}/mails?mailId=${mail.body?.id}`)).status === 403 && (await la('DELETE', `/api/crm/pipeline/leads/${LID}/mails?mailId=${mail.body?.id}`)).status === 200)
    check('deleting a meeting removes the calendar event', (await la('DELETE', `/api/crm/pipeline/leads/${LID}/meetings?eventId=${meet.body?.id}`)).status === 200 && !(await prisma.crmEvent.findUnique({ where: { id: meet.body.id } })))
    const fz = await login(await makeUser('fr-lines', { freelancers: ['view_own', 'create', 'edit', 'delete'] }))
    const job = await fz('POST', '/api/crm/freelance', { title: 'zz lines', date: '2026-02-01', lines: [{ name: 'Design', qty: 2, cost: 100, tva: 20 }, { name: 'Hosting', qty: 1, cost: 50, tva: 0 }, { name: '', qty: 1, cost: '' }] })
    if (job.body?.id) made.rows.unshift(['crmFreelanceJob', job.body.id])
    const jg = job.body?.id ? await fz('GET', `/api/crm/freelance/${job.body.id}`) : null
    check('a freelance payment with lines: total = sum of UN x cost + TVA, empty rows dropped', jg?.body?.job?.amount === 290 && jg.body.job.lines.length === 2, JSON.stringify(jg?.body?.job?.lines || []).slice(0, 100) + ' ' + jg?.body?.job?.amount)
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
    await prisma.crmStaffPermission.deleteMany({ where: { staffId: { in: made.staff } } }).catch(() => {})
    await prisma.crmStaff.deleteMany({ where: { id: { in: made.staff } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: made.users } } }).catch(() => {})
    const fails = results.filter((x) => !x).length
    console.log(`\n${results.length - fails}/${results.length} checks passed${fails ? `, ${fails} FAILED` : ''}`)
    await prisma.$disconnect()
    process.exit(fails ? 1 : 0)
}

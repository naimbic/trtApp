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
        let j = null; try { j = await res.clone().json() } catch { /* pdf / html */ }
        return { status: res.status, body: j }
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
    const lm = await login(await makeUser('leadmail', { lead_mail: ['view'] }))
    check('Lead email integration view: can list mailboxes', (await lm('GET', '/api/crm/lead-mail')).status === 200)
    check('Lead email integration view only: cannot save a mailbox', (await lm('POST', '/api/crm/lead-mail', { action: 'save', data: { email: 'a@b.com' } })).status === 403)
    const wh = await login(await makeUser('hours', { work_hours: ['view'] }))
    check('Team hours view: can open the hours report', (await wh('GET', '/api/crm/work-hours')).status === 200)
    check('no Team hours permission: hours report refused', (await plain('GET', '/api/crm/work-hours')).status === 403)
    check('Team hours view alone does not open Team members', (await wh('GET', '/api/crm/staff')).status === 403)
    check('non-admin: cannot edit roles', (await plain('PUT', '/api/roles', { action: 'delete', roleId: 'x' })).status === 403)
} catch (e) { console.log('ERROR', e.message) } finally {
    for (const [model, id] of [...made.rows, ...made.extraRows]) await prisma[model].delete({ where: { id } }).catch(() => {})
    await prisma.crmStaffPermission.deleteMany({ where: { staffId: { in: made.staff } } }).catch(() => {})
    await prisma.crmStaff.deleteMany({ where: { id: { in: made.staff } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: made.users } } }).catch(() => {})
    const fails = results.filter((x) => !x).length
    console.log(`\n${results.length - fails}/${results.length} checks passed${fails ? `, ${fails} FAILED` : ''}`)
    await prisma.$disconnect()
    process.exit(fails ? 1 : 0)
}

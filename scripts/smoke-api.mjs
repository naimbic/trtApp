#!/usr/bin/env node
/**
 * Smoke test of the CRM API for one sign-in: opens every list the app has and reports what answers 5xx or an
 * unexpected 401. Read-only (GET requests only). Use it after each deployment, once per role:
 *
 *   BASE_URL=https://staging.trtcrm.com SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='…' node scripts/smoke-api.mjs
 *
 * 403 is normal for a member without the permission and is listed separately, so a role can be compared with what
 * it should reach. The password is only read from the environment and never printed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const EMAIL = process.env.SMOKE_EMAIL, PASSWORD = process.env.SMOKE_PASSWORD
if (!EMAIL || !PASSWORD) { console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD (and BASE_URL for another server).'); process.exit(2) }

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const keys = ['admin', 'crm', 'sales', 'support', 'work'].flatMap((f) => [...fs.readFileSync(path.join(root, `src/lib/crm/resources/${f}.js`), 'utf8').matchAll(/^\s{8}key: '([a-z-]+)'/gm)].map((m) => m[1]))
const own = ['notifications', 'team-dashboard', 'me', 'dashboard', 'calendar?from=2026-01-01&to=2026-12-31', 'work/tasks?limit=5', 'work/tasks/lookups', 'work/projects?limit=5', 'work/time-report', 'issues', 'issues/lookups', 'customers?pageSize=5', 'sales/invoices?pageSize=5', 'sales/estimates?pageSize=5', 'sales/proposals?pageSize=5', 'sales/contracts?pageSize=5', 'sales/purchase-orders?pageSize=5', 'sales/payments?pageSize=5', 'sales/expenses?pageSize=5', 'sales/lookups', 'support/tickets?pageSize=5', 'pipeline/leads', 'kb/hub', 'kb/articles', 'vault/entries?scope=all', 'reports', 'team', 'team/lookups', 'access/roles', 'mail/templates', 'settings?group=general', 'chat/rooms', 'branding']
const paths = [...new Set([...keys.filter((k) => k !== 'settings').map((k) => `${k}?pageSize=3`), ...own])]

// cookie jar for the NextAuth credentials sign-in
const jar = {}
const keep = (res) => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1) } }
const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
const call = async (url, init = {}) => { const res = await fetch(url, { redirect: 'manual', ...init, headers: { 'User-Agent': 'trtcrm-smoke', ...(init.headers || {}), cookie: cookie() } }); keep(res); return res }

const csrf = await (await call(`${BASE}/api/auth/csrf`)).json()
await call(`${BASE}/api/auth/callback/credentials`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: BASE, json: 'true' }) })
const session = await (await call(`${BASE}/api/auth/session`)).json()
if (!session?.user) { console.error('Sign-in failed (wrong credentials, 2FA or locked account).'); process.exit(2) }
console.log(`Signed in as a user with ${session.user.authority?.length ?? 0} permissions on ${BASE}\n`)

const bad = [], denied = [], ok = []
for (const p of paths) {
    const t = Date.now()
    let status = 0
    try { status = (await call(`${BASE}/api/crm/${p}`)).status } catch { status = -1 }
    const ms = Date.now() - t
    if (status >= 500 || status < 0) bad.push([status, p, ms]); else if (status === 401) bad.push([status, p, ms]); else if (status === 403) denied.push(p); else if (status === 404) bad.push([status, p, ms]); else ok.push([p, ms])
}
const slow = ok.filter(([, ms]) => ms > 2500)
console.log(`${ok.length} answered fine, ${denied.length} refused for this role (403), ${bad.length} problem(s)\n`)
if (denied.length) console.log('403 for this role:', denied.map((p) => p.split('?')[0]).join(', '), '\n')
if (slow.length) console.log('Slow (>2.5 s):', slow.map(([p, ms]) => `${p.split('?')[0]} ${ms}ms`).join(', '), '\n')
for (const [s, p, ms] of bad) console.log(`PROBLEM ${s} ${p} (${ms}ms)`)
process.exit(bad.length ? 1 : 0)

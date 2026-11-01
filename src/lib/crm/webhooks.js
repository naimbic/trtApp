import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { requirePermission, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { seal, open } from '@/lib/crm/ai/secret'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })

/** The events the CRM can announce. */
export const EVENTS = [
    ['lead.created', 'A lead is created'], ['lead.converted', 'A lead becomes a client'], ['client.created', 'A client is created'],
    ['task.created', 'A task is created'], ['task.completed', 'A task is completed'],
    ['ticket.created', 'A support request is opened'], ['ticket.replied', 'A client replies to a request'],
    ['idea.created', 'A Grow idea is created'],
    ['appointment.requested', 'An appointment is requested (waiting for acceptance)'], ['appointment.accepted', 'An appointment request is accepted'], ['appointment.declined', 'An appointment request is declined'], ['ping', 'Test event'],
]
const EVENT_IDS = EVENTS.map(([id]) => id)

async function requireAdmin() {
    const session = await requirePermission(null)
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only the super administrator can manage webhooks', 403)
    return session
}

/** An address the CRM may call: https (http only outside production), never the server itself or a private network. */
export function checkUrl(raw, env = process.env) {
    let u
    try { u = new URL(String(raw || '').trim()) } catch { throw fail('The address is not valid') }
    const prod = env.NODE_ENV === 'production' && env.WEBHOOK_ALLOW_PRIVATE !== '1'
    if (!['https:', 'http:'].includes(u.protocol)) throw fail('The address must start with https://')
    if (prod && u.protocol !== 'https:') throw fail('The address must start with https://')
    const h = u.hostname.toLowerCase()
    const privateHost = h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|\[?f[cd])/.test(h)
    if (prod && privateHost) throw fail('The address points to a private network, which is not allowed')
    return u.toString()
}

/** t=<unix seconds>,v1=<hmac sha256 of "<t>.<body>"> : the receiver recomputes it with the shared secret. */
export const sign = (secret, body, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`

async function deliver(hook, event, data) {
    const body = JSON.stringify({ id: crypto.randomUUID(), event, createdAt: new Date().toISOString(), data })
    const secret = open(hook.secret) || ''
    const started = Date.now()
    let ok = false, status = null, error = null
    try {
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000)
        const res = await fetch(hook.url, { method: 'POST', redirect: 'manual', signal: c.signal, headers: { 'content-type': 'application/json', 'user-agent': 'trtCRM-webhook/1', 'x-trt-event': event, 'x-trt-signature': sign(secret, body) }, body })
        clearTimeout(t)
        status = res.status; ok = res.status >= 200 && res.status < 300
        if (!ok) error = `The receiver answered ${res.status}`
    } catch (e) { error = e?.name === 'AbortError' ? 'The receiver took too long to answer (8 seconds)' : String(e?.message || e).slice(0, 200) }
    const failures = ok ? 0 : (hook.failures || 0) + 1
    await prisma.crmWebhook.update({ where: { id: hook.id }, data: { lastAt: new Date(), lastOk: ok, lastError: error, failures, ...(failures >= 20 ? { active: false } : {}) } }).catch(() => {})
    await prisma.crmWebhookDelivery.create({ data: { webhookId: hook.id, event, ok, status, ms: Date.now() - started, error } }).catch(() => {})
    return { ok, status, error }
}

/** Tells every active webhook that listens to this event. Never throws and never waits: the action behind it must not slow down or fail. */
export function emit(event, data) {
    prisma.crmWebhook.findMany({ where: { active: true, events: { has: event } } })
        .then((hooks) => Promise.allSettled(hooks.map((h) => deliver(h, event, data))))
        .catch(() => {})
}

const shape = (h) => ({ id: h.id, name: h.name, url: h.url, events: h.events, active: h.active, lastAt: h.lastAt, lastOk: h.lastOk, lastError: h.lastError, failures: h.failures, createdAt: h.createdAt })

export async function listWebhooks() {
    await requireAdmin()
    return { webhooks: (await prisma.crmWebhook.findMany({ orderBy: { createdAt: 'desc' } })).map(shape), events: EVENTS.filter(([id]) => id !== 'ping') }
}

export async function saveWebhook(body = {}, id = null) {
    const session = await requireAdmin()
    const name = String(body.name || '').trim().slice(0, 80)
    if (!name) throw fail('Give the webhook a name')
    const url = checkUrl(body.url)
    const events = [...new Set((Array.isArray(body.events) ? body.events : []).filter((e) => EVENT_IDS.includes(e) && e !== 'ping'))]
    if (!events.length) throw fail('Choose at least one event')
    if (id) {
        const data = { name, url, events, active: body.active !== false }
        if (body.active !== false) data.failures = 0
        await prisma.crmWebhook.update({ where: { id }, data }).catch(() => { throw fail('Webhook not found', 404) })
        return { success: true, id }
    }
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`
    const row = await prisma.crmWebhook.create({ data: { name, url, events, active: true, secret: seal(secret), createdBy: await getStaffId(session) } })
    return { success: true, id: row.id, secret } // the secret is shown once, now
}

export async function deleteWebhook(id) {
    await requireAdmin()
    await prisma.crmWebhookDelivery.deleteMany({ where: { webhookId: id } }).catch(() => {})
    await prisma.crmWebhook.delete({ where: { id } }).catch(() => { throw fail('Webhook not found', 404) })
    return { success: true }
}

/** A "ping" to see that the address answers and the signature is checked. */
export async function testWebhook(id) {
    await requireAdmin()
    const hook = await prisma.crmWebhook.findUnique({ where: { id } })
    if (!hook) throw fail('Webhook not found', 404)
    checkUrl(hook.url)
    return deliver(hook, 'ping', { message: 'Hello from trtCRM' })
}

export async function webhookDeliveries(id) {
    await requireAdmin()
    return { deliveries: await prisma.crmWebhookDelivery.findMany({ where: { webhookId: id }, orderBy: { createdAt: 'desc' }, take: 30 }) }
}

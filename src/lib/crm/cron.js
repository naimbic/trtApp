import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { getOptions, setOptions, sendTemplate } from '@/lib/crm/mailer'
import { sendMailCore } from '@/lib/crm/mailApi'
import { allocateNumber } from '@/lib/crm/sales/docNumbering'
import { publicBase } from '@/lib/crm/shortLinks'
import { runRecurringTasks, stopForgottenTimers } from '@/lib/crm/recurringTasks'
import { normalizeSchedule, crontabExpr, nextRun } from '@/lib/crm/cronSchedule'

/**
 * The cron job. Call it often (every 5–15 minutes); each task does its work once a day at the hour set in
 * Settings → Cron job (tickets run every time). "Run manually" ignores the hour. Every run is logged.
 */
const DAY = 86400000
const num = (v) => Number(v) || 0

const OPTION_KEYS = ['automatically_stop_task_timer_after_hours', 'default_timezone', 'cron_key', 'cron_enabled', 'invoice_auto_operations_hour', 'invoice_due_notice_before', 'invoice_due_notice_resend_after', 'automatically_send_invoice_overdue_reminder_after', 'automatically_resend_invoice_overdue_reminder_after', 'create_invoice_from_recurring_only_on_paid_invoices', 'new_recurring_invoice_action', 'invoice_due_after',
    'estimates_auto_operations_hour', 'send_estimate_expiry_reminder_before', 'proposals_auto_operations_hour', 'send_proposal_expiry_reminder_before', 'contracts_auto_operations_hour', 'contract_expiration_before', 'tasks_reminder_notification_hour', 'tasks_reminder_notification_before', 'autoclose_tickets_after', 'delete_activity_log_older_then',
    'cron_last_invoices', 'cron_last_estimates', 'cron_last_proposals', 'cron_last_contracts', 'cron_last_tasks', 'cron_last_expenses', 'expenses_auto_operations_hour', 'cron_last_cleanup', 'last_cron_run']

/** Today in the platform time zone, as a UTC-midnight Date (how document dates are stored) and the local hour. */
function clock(tz) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date()).reduce((a, p) => ({ ...a, [p.type]: p.value }), {})
    return { today: new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))), hour: Number(parts.hour) % 24, ymd: `${parts.year}-${parts.month}-${parts.day}` }
}
const addUnits = (d, n, unit) => {
    const x = new Date(d)
    if (unit === 'day') x.setUTCDate(x.getUTCDate() + n)
    else if (unit === 'week') x.setUTCDate(x.getUTCDate() + 7 * n)
    else if (unit === 'year') x.setUTCFullYear(x.getUTCFullYear() + n)
    else x.setUTCMonth(x.getUTCMonth() + n)
    return x
}
/** Remembers which document the line just pushed is about, so the screen can link to it (not stored in the log). */
const ref = (lines, type, id, label) => { (lines.refs ||= [])[lines.length - 1] = { type, id: String(id), label } }
const daysBetween = (a, b) => Math.floor((new Date(a) - new Date(b)) / DAY)

/* ---------------- tasks ---------------- */
async function invoicesJob({ o, today, lines, dry }) {
    // 1) unpaid invoices past their due date become Overdue
    const odWhere = { status: { in: [1, 3] }, dueDate: { lt: today } }
    const od = dry ? { count: await prisma.crmInvoice.count({ where: odWhere }) } : await prisma.crmInvoice.updateMany({ where: odWhere, data: { status: 4 } })
    if (od.count) lines.push(`${dry ? '[preview] ' : ''}${od.count} invoice(s) ${dry ? 'would be ' : ''}marked overdue`)

    const send = async (inv, slug, label) => {
        const nr = `${inv.prefix || ''}${inv.number}`
        if (dry) { lines.push(`[preview] ${label.replace(' sent', ' would be sent').replace(' emailed', ' would be emailed')}: invoice ${nr}`); ref(lines, 'invoice', inv.id, nr); return true }
        try { await sendMailCore({ kind: 'invoice', id: inv.id, template: slug }); lines.push(`${label}: invoice ${nr}`); ref(lines, 'invoice', inv.id, nr); return true } catch (e) { lines.push(`! ${label} failed for invoice ${nr}: ${e.message}`); ref(lines, 'invoice', inv.id, nr); return false }
    }
    // 2) due soon
    const before = num(o('invoice_due_notice_before')), againDue = num(o('invoice_due_notice_resend_after'))
    if (before > 0) {
        const list = await prisma.crmInvoice.findMany({ where: { status: { in: [1, 3] }, dueDate: { gte: today, lte: new Date(today.getTime() + before * DAY) } } })
        for (const inv of list) if (!inv.lastDueNotice || (againDue > 0 && daysBetween(today, inv.lastDueNotice) >= againDue)) await send(inv, 'invoice-due-notice', 'Due reminder sent')
    }
    // 3) overdue reminders
    const first = num(o('automatically_send_invoice_overdue_reminder_after')), again = num(o('automatically_resend_invoice_overdue_reminder_after'))
    if (first > 0) {
        const list = await prisma.crmInvoice.findMany({ where: { status: 4, cancelOverdueReminders: false, dueDate: { lte: new Date(today.getTime() - first * DAY) } } })
        for (const inv of list) if (!inv.lastOverdueReminder || (again > 0 && daysBetween(today, inv.lastOverdueReminder) >= again)) await send(inv, 'invoice-overdue-notice', 'Overdue reminder sent')
    }
    // 4) recurring invoices
    const action = o('new_recurring_invoice_action', 'generate_unpaid')
    const onlyPaid = o('create_invoice_from_recurring_only_on_paid_invoices') === '1'
    const parents = await prisma.crmInvoice.findMany({ where: { recurring: { gt: 0 }, status: { notIn: [5, 6] }, isRecurringFrom: null } })
    for (const p of parents) {
        if (p.cycles > 0 && p.totalCycles >= p.cycles) continue
        const unit = p.customRecurring ? p.recurringType || 'month' : 'month'
        const next = addUnits(p.lastRecurringDate || p.date || p.createdAt, p.recurring, unit)
        if (next > today) continue
        if (onlyPaid) {
            const last = await prisma.crmInvoice.findFirst({ where: { isRecurringFrom: p.id }, orderBy: { createdAt: 'desc' } })
            if ((last || p).status !== 2) { lines.push(`Recurring invoice ${p.prefix || ''}${p.number} skipped: the last one is not paid`); ref(lines, 'invoice', p.id, `${p.prefix || ''}${p.number}`); continue }
        }
        if (dry) { lines.push(`[preview] A recurring invoice would be created from ${p.prefix || ''}${p.number}${action === 'generate_and_send' ? ' and emailed to the client' : ''}`); ref(lines, 'invoice', p.id, `${p.prefix || ''}${p.number}`); continue }
        try {
            const { number, prefix, numberFormat } = await allocateNumber('invoice', today)
            const span = p.dueDate && p.date ? Math.max(daysBetween(p.dueDate, p.date), 0) : num(o('invoice_due_after'))
            const { id: _id, legacyId, createdAt, updatedAt, hash, lastOverdueReminder, lastDueNotice, lastRecurringDate, ...copy } = p
            void [_id, legacyId, createdAt, updatedAt, hash, lastOverdueReminder, lastDueNotice, lastRecurringDate]
            const child = await prisma.crmInvoice.create({ data: { ...copy, number, prefix, numberFormat, date: today, dueDate: new Date(today.getTime() + span * DAY), status: action === 'generate_draft' ? 6 : 1, sent: false, dateSend: null, recurring: 0, recurringType: null, cycles: 0, totalCycles: 0, customRecurring: false, isRecurringFrom: p.id, hash: crypto.randomUUID().replace(/-/g, ''), cancelOverdueReminders: false } })
            const src = await prisma.crmItemable.findMany({ where: { relType: 'invoice', relId: p.id }, include: { taxes: true } })
            for (const l of src) {
                const nl = await prisma.crmItemable.create({ data: { relType: 'invoice', relId: child.id, description: l.description, longDescription: l.longDescription, qty: l.qty, rate: l.rate, unit: l.unit, itemOrder: l.itemOrder } })
                for (const t of l.taxes) await prisma.crmItemTax.create({ data: { itemableId: nl.id, relType: 'invoice', relId: child.id, taxName: t.taxName, taxRate: t.taxRate } })
            }
            await prisma.crmInvoice.update({ where: { id: p.id }, data: { totalCycles: p.totalCycles + 1, lastRecurringDate: today } })
            await prisma.crmSalesActivity.create({ data: { relType: 'invoice', relId: child.id, description: `Recurring invoice created from ${p.prefix || ''}${p.number}`, fullName: 'Automatic', date: new Date() } })
            lines.push(`Recurring invoice created: ${prefix}${number}`); ref(lines, 'invoice', child.id, `${prefix}${number}`)
            if (action === 'generate_and_send') await send({ ...child, prefix, number }, 'invoice-send-to-client', 'Recurring invoice emailed')
        } catch (e) { lines.push(`! Recurring invoice ${p.prefix || ''}${p.number} failed: ${e.message}`) }
    }
}

async function estimatesJob({ o, today, lines, dry }) {
    const exWhere = { status: 2, expiryDate: { lt: today } }
    const ex = dry ? { count: await prisma.crmEstimate.count({ where: exWhere }) } : await prisma.crmEstimate.updateMany({ where: exWhere, data: { status: 5 } })
    if (ex.count) lines.push(`${dry ? '[preview] ' : ''}${ex.count} estimate(s) ${dry ? 'would be ' : ''}marked expired`)
    const before = num(o('send_estimate_expiry_reminder_before'))
    if (before <= 0) return
    // an estimate whose "send reminders to the client" switch is off is never emailed
    const list = (await prisma.crmEstimate.findMany({ where: { status: 2, isExpiryNotified: false, expiryDate: { gte: today, lte: new Date(today.getTime() + before * DAY) } } })).filter((e) => e.remindClient !== false)
    for (const e of list) {
        if (dry) { lines.push(`[preview] Expiry reminder would be sent for estimate ${e.prefix || ''}${e.number}`); ref(lines, 'estimate', e.id, `${e.prefix || ''}${e.number}`); continue }
        try { await sendMailCore({ kind: 'estimate', id: e.id, template: 'estimate-expiry-reminder' }); await prisma.crmEstimate.update({ where: { id: e.id }, data: { isExpiryNotified: true } }); lines.push(`Expiry reminder sent for estimate ${e.prefix || ''}${e.number}`); ref(lines, 'estimate', e.id, `${e.prefix || ''}${e.number}`) } catch (err) { lines.push(`! Estimate ${e.prefix || ''}${e.number}: ${err.message}`) }
    }
}

async function proposalsJob({ o, today, lines, dry }) {
    const before = num(o('send_proposal_expiry_reminder_before'))
    if (before <= 0) return
    const list = (await prisma.crmProposal.findMany({ where: { status: { in: [1, 4, 5] }, isExpiryNotified: false, openTill: { gte: today, lte: new Date(today.getTime() + before * DAY) } } })).filter((p) => p.remindClient !== false)
    for (const p of list) {
        if (dry) { lines.push(`[preview] Expiry reminder would be sent for proposal "${p.subject || p.id}"`); ref(lines, 'proposal', p.id, p.subject || p.id); continue }
        try { await sendMailCore({ kind: 'proposal', id: p.id, template: 'proposal-expiry-reminder' }); await prisma.crmProposal.update({ where: { id: p.id }, data: { isExpiryNotified: true } }); lines.push(`Expiry reminder sent for proposal "${p.subject || p.id}"`); ref(lines, 'proposal', p.id, p.subject || p.id) } catch (err) { lines.push(`! Proposal "${p.subject || p.id}": ${err.message}`) }
    }
}

async function contractsJob({ o, today, lines, dry }) {
    const before = num(o('contract_expiration_before'))
    if (before <= 0) return
    const list = (await prisma.crmContract.findMany({ where: { trash: false, isExpiryNotified: false, dateEnd: { gte: today, lte: new Date(today.getTime() + before * DAY) } } })).filter((c) => c.remindClient !== false)
    for (const c of list) {
        if (dry) { lines.push(`[preview] Expiry notice would be sent for contract "${c.subject}"`); ref(lines, 'contract', c.id, c.subject); continue }
        try {
            await sendMailCore({ kind: 'contract', id: c.id, template: 'contract-expiration' }).catch((e) => lines.push(`! Contract "${c.subject}" client email: ${e.message}`))
            const staff = c.addedFrom ? await prisma.crmStaff.findUnique({ where: { id: c.addedFrom }, select: { email: true, firstName: true } }) : null
            if (staff?.email) await sendTemplate({ slug: 'contract-expiration-to-staff', to: staff.email, relType: 'contract', relId: c.id, data: { staff_firstname: staff.firstName || '', contract_subject: c.subject || '', contract_description: c.description || '', contract_datestart: c.dateStart?.toISOString().slice(0, 10) || '', contract_dateend: c.dateEnd?.toISOString().slice(0, 10) || '' } })
            await prisma.crmContract.update({ where: { id: c.id }, data: { isExpiryNotified: true } })
            lines.push(`Expiry notice sent for contract "${c.subject}"`); ref(lines, 'contract', c.id, c.subject)
        } catch (err) { lines.push(`! Contract "${c.subject}": ${err.message}`) }
    }
}

async function tasksJob({ o, today, lines, dry }) {
    await runRecurringTasks({ today, lines, dry }) // new copies of finished recurring tasks (no email)
    await stopForgottenTimers({ hours: num(o('automatically_stop_task_timer_after_hours')), lines, dry })
    const before = num(o('tasks_reminder_notification_before'))
    if (before <= 0) return
    const list = await prisma.crmTask.findMany({ where: { status: { not: 5 }, deadlineNotified: false, dueDate: { gte: today, lte: new Date(today.getTime() + before * DAY) } }, include: { assignees: true } })
    for (const t of list) {
        if (dry) { lines.push(`[preview] Deadline reminder would be sent for task "${t.name}"`); ref(lines, 'task', t.id, t.name); continue }
        let sent = 0
        for (const a of t.assignees) {
            const s = await prisma.crmStaff.findUnique({ where: { id: a.staffId }, select: { email: true, firstName: true, lastName: true, active: true } })
            if (!s?.email || s.active === false) continue
            const r = await sendTemplate({ slug: 'task-deadline-notification', to: s.email, relType: 'task', relId: t.id, data: { staff_firstname: s.firstName || '', staff_lastname: s.lastName || '', task_name: t.name, task_duedate: t.dueDate.toISOString().slice(0, 10), task_link: `${publicBase()}/crm/tasks/${t.id}` } })
            if (r.sent) sent++; else lines.push(`! Task "${t.name}": ${r.error}`)
        }
        await prisma.crmTask.update({ where: { id: t.id }, data: { deadlineNotified: true } })
        if (sent) { lines.push(`Deadline reminder sent for task "${t.name}" (${sent})`); ref(lines, 'task', t.id, t.name) }
    }
}

async function ticketsJob({ o, lines, dry }) {
    const hours = num(o('autoclose_tickets_after'))
    if (hours <= 0) return
    const statuses = await prisma.crmTicketStatus.findMany()
    const answered = statuses.find((s) => /answer/i.test(s.name)), closed = statuses.find((s) => /clos/i.test(s.name))
    if (!answered || !closed) return
    const list = await prisma.crmTicket.findMany({ where: { statusId: answered.id, lastReply: { lt: new Date(Date.now() - hours * 3600000) } } })
    for (const t of list) {
        if (dry) { lines.push(`[preview] Ticket "${t.subject}" would be closed`); ref(lines, 'ticket', t.id, t.subject); continue }
        await prisma.crmTicket.update({ where: { id: t.id }, data: { statusId: closed.id } })
        if (t.email) await sendTemplate({ slug: 'auto-close-ticket', to: t.email, relType: 'ticket', relId: t.id, data: { contact_firstname: (t.name || '').split(' ')[0], contact_lastname: (t.name || '').split(' ').slice(1).join(' '), ticket_subject: t.subject || '', ticket_id: t.legacyId ?? t.id, ticket_url: `${publicBase()}/crm/tickets/${t.id}` } })
        lines.push(`Ticket "${t.subject}" closed automatically`); ref(lines, 'ticket', t.id, t.subject)
    }
}

async function cleanupJob({ o, lines, dry }) {
    const months = num(o('delete_activity_log_older_then'))
    if (months <= 0) return
    const cutoff = new Date(); cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
    const w = { createdAt: { lt: cutoff } }
    const r = dry ? { count: await prisma.crmActivityLog.count({ where: w }) } : await prisma.crmActivityLog.deleteMany({ where: w })
    if (r.count) lines.push(`${dry ? '[preview] ' : ''}${r.count} old activity log entries ${dry ? 'would be ' : ''}deleted`)
}

/* ---------------- recurring expenses ---------------- */
async function expensesJob({ today, lines, dry }) {
    const parents = await prisma.crmExpense.findMany({ where: { recurring: true, recurringFrom: null } })
    for (const p of parents) {
        if (p.cycles > 0 && p.totalCycles >= p.cycles) continue // reached the number of repeats asked for
        const next = addUnits(p.lastRecurringDate || p.date || p.createdAt, p.repeatEvery || 1, p.recurringType || 'month')
        if (next > today) continue
        const label = p.expenseName || 'Expense'
        if (dry) { lines.push(`[preview] A copy of “${label}” would be created${p.createInvoiceBillable ? ' (its invoice is not automatic yet)' : ''}`); continue }
        try {
            const { id: _id, createdAt, updatedAt, legacyId, invoiceId, ...copy } = p
            void [_id, createdAt, updatedAt, legacyId, invoiceId]
            const last = await prisma.crmExpense.findFirst({ where: { legacyId: { not: null } }, orderBy: { legacyId: 'desc' }, select: { legacyId: true } })
            await prisma.crmExpense.create({ data: { ...copy, legacyId: (last?.legacyId || 0) + 1, date: today, recurring: false, recurringFrom: p.id, cycles: 0, totalCycles: 0, lastRecurringDate: null, invoiceId: null, createInvoiceBillable: false, sendInvoiceToCustomer: false } })
            await prisma.crmExpense.update({ where: { id: p.id }, data: { totalCycles: p.totalCycles + 1, lastRecurringDate: today } })
            lines.push(`Recurring expense created: ${label}`)
            if (p.createInvoiceBillable) lines.push(`! “${label}” is set to invoice the client automatically, which is not available yet: invoice it by hand`)
        } catch (e) { lines.push(`! Recurring expense “${label}” failed: ${e.message}`) }
    }
}

const JOBS = [
    { key: 'invoices', label: 'Invoices', hour: 'invoice_auto_operations_hour', run: invoicesJob },
    { key: 'estimates', label: 'Estimates', hour: 'estimates_auto_operations_hour', run: estimatesJob },
    { key: 'proposals', label: 'Proposals', hour: 'proposals_auto_operations_hour', run: proposalsJob },
    { key: 'contracts', label: 'Contracts', hour: 'contracts_auto_operations_hour', run: contractsJob },
    { key: 'expenses', label: 'Expenses', hour: 'expenses_auto_operations_hour', run: expensesJob },
    { key: 'tasks', label: 'Tasks', hour: 'tasks_reminder_notification_hour', run: tasksJob },
    { key: 'cleanup', label: 'Cleanup', hour: null, daily: true, run: cleanupJob },
    { key: 'tickets', label: 'Tickets', hour: null, run: ticketsJob },
]

let running = null
export function runCron({ trigger = 'http', force = false, dry = false } = {}) {
    running ??= (async () => {
        const t0 = Date.now()
        const lines = []
        const groups = [] // which lines belong to which job, for the screen
        let ok = true
        try {
            const o = await getOptions(OPTION_KEYS)
            if (trigger === 'http' && o('cron_enabled') !== '1') return { ok: true, lines: ['The automatic tasks are turned off (Settings → Cron job → Automatic tasks). Nothing was done.'], ms: 0, skipped: true }
            const { today, hour, ymd } = clock(o('default_timezone'))
            const done = {}
            for (const j of JOBS) {
                const last = o(`cron_last_${j.key}`)
                const atHour = j.hour ? num(o(j.hour, '9')) : 0
                const due = force || (j.hour ? hour >= atHour && last !== ymd : j.daily ? last !== ymd : true)
                if (!due) continue
                const before = lines.length
                try { await j.run({ o, today, lines, dry }) } catch (e) { ok = false; lines.push(`! ${j.label} failed: ${e.message}`); console.error('[cron]', j.key, e) }
                if (lines.length === before) lines.push(`${j.label}: nothing to do`)
                groups.push({ key: j.key, label: j.label, from: before, to: lines.length })
                if ((j.hour || j.daily) && !dry) done[`cron_last_${j.key}`] = ymd
            }
            if (!dry) await setOptions({ ...done, last_cron_run: Math.floor(Date.now() / 1000) })
        } catch (e) { ok = false; lines.push(`! Cron failed: ${e.message}`); console.error('[cron]', e) }
        const summary = lines.filter((l) => !l.endsWith('nothing to do')).slice(0, 3).join(' · ') || 'Nothing to do'
        const run = await prisma.crmCronRun.create({ data: { trigger: dry ? 'preview' : trigger, ok: ok && !lines.some((l) => l.startsWith('!')), summary: summary.slice(0, 300), lines, ms: Date.now() - t0 } })
        await prisma.crmCronRun.deleteMany({ where: { startedAt: { lt: new Date(Date.now() - 30 * DAY) } } }).catch(() => {})
        return { ok: run.ok, lines, refs: lines.refs || [], groups, ms: run.ms }
    })().finally(() => { running = null })
    return running
}

/** The cron key (created the first time it is needed) and the command to schedule. */
export async function cronInfo({ origin } = {}) {
    const o = await getOptions(['cron_key', 'last_cron_run', 'cron_enabled', 'cron_mode', 'cron_every', 'cron_unit', 'cron_at_hour'])
    let key = o('cron_key')
    if (!key) { key = crypto.randomBytes(16).toString('hex'); await setOptions({ cron_key: key }) }
    const last = Number(o('last_cron_run')) || 0
    const schedule = normalizeSchedule({ every: o('cron_every'), unit: o('cron_unit'), atHour: o('cron_at_hour') })
    const mode = o('cron_mode', 'external') === 'built_in' ? 'built_in' : 'external'
    return { enabled: o('cron_enabled') === '1', mode, schedule: { ...schedule, expr: crontabExpr(schedule) }, nextRun: mode === 'built_in' && o('cron_enabled') === '1' ? nextRun(schedule, { lastRunMs: last * 1000 }).toISOString() : null, command: `wget -q -O- "${(origin || publicBase()).replace(/\/$/, '')}/api/cron/index?key=${key}"`, key, lastRun: last ? new Date(last * 1000).toISOString() : null }
}

export async function cronKeyValid(key) {
    const real = (await getOptions(['cron_key']))('cron_key')
    if (!real || !key) return false
    const a = Buffer.from(String(key)), b = Buffer.from(real)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

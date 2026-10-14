import prisma from '@/lib/prisma'
import { requirePermission, viewScope } from '@/lib/crm/permissions'
import { resolveRange } from '@/lib/crm/dashboard'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const monthKey = (d) => iso(d).slice(0, 7)
const sum = (a, f) => round2(a.reduce((s, x) => s + (f(x) || 0), 0))
const DAY = 86400000
const INV_OK = (i) => ![5, 6].includes(i.status)
const TICKET_NEEDS = ['tickets']
const NEEDS = { sales: ['invoices', 'payments'], profit: ['payments', 'expenses'], leads: ['leads'], support: TICKET_NEEDS, work: ['tasks'] }

async function gate(kind) {
    const session = await requirePermission('reports', 'view')
    const authority = session.user.authority || []
    const allowed = (k) => NEEDS[k].every((f) => viewScope(authority, f) === 'all')
    if (kind && !NEEDS[kind]) throw fail('Unknown report', 404)
    if (kind && !allowed(kind)) throw fail('This report needs permission to see all the records behind it', 403)
    return { available: Object.keys(NEEDS).filter(allowed) }
}

export async function reportsMeta() {
    const { available } = await gate()
    const currencies = await prisma.crmCurrency.findMany()
    return { available, currencies: currencies.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, placement: c.placement, isDefault: !!c.isDefault })) }
}

/** buckets (days or months) for charts, matching the range */
function buckets(R) {
    const key = (d) => (R.granularity === 'day' ? iso(d) : monthKey(d))
    return { keys: R.keys, key, blank: () => Object.fromEntries(R.keys.map((k) => [k, 0])) }
}

export async function runReport(kind, params = {}, opts = {}) {
    await gate(kind)
    const R = resolveRange({ range: params.range || 'year', from: params.from, to: params.to })
    const cur = (await prisma.crmCurrency.findMany()).find((c) => c.id === params.currencyId) || (await prisma.crmCurrency.findFirst({ where: { isDefault: true } }))
    const curId = cur?.id || null
    const B = buckets(R)
    const inRange = { gte: R.from, lt: R.until }
    const out = { kind, range: { key: R.key, label: R.label, from: R.fromIso, to: R.toIso, granularity: R.granularity }, labels: R.keys, currency: cur ? { id: cur.id, name: cur.name, symbol: cur.symbol, placement: cur.placement } : null }
    const cw = curId ? { currencyId: curId } : {}

    if (kind === 'sales') {
        const [invoices, payments, allOpen, clients, modes] = await Promise.all([
            prisma.crmInvoice.findMany({ where: { ...cw, date: inRange } }),
            prisma.crmPayment.findMany({ where: { paymentDate: inRange } }),
            prisma.crmInvoice.findMany({ where: { ...cw, status: { in: [1, 3, 4] } }, select: { id: true, total: true, dueDate: true, clientId: true } }),
            prisma.crmClient.findMany({ select: { id: true, company: true } }),
            prisma.crmPaymentMode.findMany(),
        ])
        const live = invoices.filter(INV_OK)
        const invById = Object.fromEntries((await prisma.crmInvoice.findMany({ where: { id: { in: [...new Set(payments.map((p) => p.invoiceId).filter(Boolean))] } }, select: { id: true, currencyId: true, clientId: true } })).map((i) => [i.id, i]))
        const pays = payments.filter((p) => !curId || invById[p.invoiceId]?.currencyId === curId)
        const paidAll = await prisma.crmPayment.findMany({ where: { invoiceId: { in: [...live.map((i) => i.id), ...allOpen.map((i) => i.id)] } }, select: { invoiceId: true, amount: true } })
        const paidBy = {}
        for (const p of paidAll) paidBy[p.invoiceId] = round2((paidBy[p.invoiceId] || 0) + (p.amount || 0))
        const cName = Object.fromEntries(clients.map((c) => [c.id, c.company]))
        const today = new Date(new Date().toDateString())
        const open = allOpen.map((i) => ({ ...i, due: round2(i.total - (paidBy[i.id] || 0)) })).filter((i) => i.due > 0)
        const aging = [['Not yet due', (d) => d <= 0], ['1–30 days', (d) => d >= 1 && d <= 30], ['31–60 days', (d) => d >= 31 && d <= 60], ['61–90 days', (d) => d >= 61 && d <= 90], ['Over 90 days', (d) => d > 90]].map(([label, f]) => { const rows = open.filter((i) => f(i.dueDate ? Math.floor((today - new Date(i.dueDate)) / DAY) : 0)); return { label, count: rows.length, amount: sum(rows, (i) => i.due) } })
        const inv = B.blank(), paid = B.blank(), cnt = B.blank()
        for (const i of live) { const k = B.key(i.date); if (k in inv) { inv[k] = round2(inv[k] + i.total); cnt[k]++ } }
        for (const p of pays) { const k = B.key(p.paymentDate); if (k in paid) paid[k] = round2(paid[k] + (p.amount || 0)) }
        const byClient = {}
        for (const i of live) { const c = (byClient[i.clientId || 'x'] ||= { id: i.clientId, name: cName[i.clientId] || i.deletedCustomerName || '—', invoiced: 0, paid: 0, invoices: 0 }); c.invoiced = round2(c.invoiced + i.total); c.paid = round2(c.paid + (paidBy[i.id] || 0)); c.invoices++ }
        const ids = live.map((i) => i.id)
        const lines = ids.length ? await prisma.crmItemable.findMany({ where: { relType: 'invoice', relId: { in: ids } }, select: { id: true, relId: true, description: true, qty: true, rate: true } }) : []
        const taxRows = ids.length ? await prisma.crmItemTax.findMany({ where: { relType: 'invoice', relId: { in: ids } }, select: { itemableId: true, relId: true, taxName: true, taxRate: true } }) : []
        const byItem = {}
        for (const l of lines) { const k = (l.description || '').trim().toLowerCase().slice(0, 80); const it = (byItem[k] ||= { name: (l.description || '').trim().slice(0, 80), qty: 0, revenue: 0, invoices: new Set() }); it.qty = round2(it.qty + (l.qty || 0)); it.revenue = round2(it.revenue + (l.qty || 0) * (l.rate || 0)); it.invoices.add(l.relId) }
        // tax collected: spread each invoice's real tax total over its tax names by their computed share
        const lineNet = Object.fromEntries(lines.map((l) => [l.id, (l.qty || 0) * (l.rate || 0)]))
        const tax = {}
        for (const i of live) {
            const rows = taxRows.filter((t) => t.relId === i.id)
            const parts = rows.map((t) => ({ ...t, w: (lineNet[t.itemableId] || 0) * (t.taxRate || 0) / 100 }))
            const w = parts.reduce((s, p) => s + p.w, 0)
            if (!w || !i.totalTax) continue
            for (const p of parts) { const k = `${p.taxName}|${p.taxRate}`; const t = (tax[k] ||= { name: p.taxName, rate: p.taxRate, amount: 0 }); t.amount = round2(t.amount + (i.totalTax * p.w) / w) }
        }
        const byMode = {}
        for (const p of pays) { const k = p.paymentModeId || 'none'; byMode[k] = round2((byMode[k] || 0) + (p.amount || 0)) }
        const mName = Object.fromEntries(modes.map((m) => [m.id, m.name]))
        const invoicedTotal = sum(live, (i) => i.total), paidTotal = sum(pays, (p) => p.amount)
        Object.assign(out, {
            stats: { invoiced: invoicedTotal, count: live.length, paid: paidTotal, payments: pays.length, outstanding: sum(open, (i) => i.due), overdue: sum(open.filter((i) => i.dueDate && new Date(i.dueDate) < today), (i) => i.due), average: live.length ? round2(invoicedTotal / live.length) : 0, tax: sum(Object.values(tax), (t) => t.amount), collection: invoicedTotal ? Math.round((sum(live, (i) => Math.min(i.total, paidBy[i.id] || 0)) / invoicedTotal) * 100) : 0 },
            series: { invoiced: B.keys.map((k) => inv[k]), paid: B.keys.map((k) => paid[k]), count: B.keys.map((k) => cnt[k]) },
            recent: await (async () => { const pad = await numberPadding(); const st = (i) => (i.status === 2 ? 'Paid' : (paidBy[i.id] || 0) >= i.total ? 'Paid' : i.dueDate && new Date(i.dueDate) < today ? 'Overdue' : (paidBy[i.id] || 0) > 0 ? 'Partially paid' : 'Unpaid'); return [...live].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 8).map((i) => ({ id: i.id, number: docNumberOf(i, pad), client: cName[i.clientId] || i.deletedCustomerName || '—', date: i.date, dueDate: i.dueDate, total: i.total, due: round2(Math.max(i.total - (paidBy[i.id] || 0), 0)), status: st(i) })) })(),
            topClients: Object.values(byClient).sort((a, b) => b.invoiced - a.invoiced).slice(0, 10).map((c) => ({ ...c, due: round2(Math.max(c.invoiced - c.paid, 0)) })),
            topItems: Object.values(byItem).sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((i) => ({ name: i.name, qty: i.qty, revenue: i.revenue, invoices: i.invoices.size })),
            byMode: Object.entries(byMode).map(([id, amount]) => ({ name: mName[id] || 'Other', amount })).sort((a, b) => b.amount - a.amount),
            tax: Object.values(tax).sort((a, b) => b.amount - a.amount), aging,
        })
    } else if (kind === 'profit') {
        const [payments, expenses, cats, taxes] = await Promise.all([
            prisma.crmPayment.findMany({ where: { paymentDate: inRange } }),
            prisma.crmExpense.findMany({ where: { ...cw, date: inRange } }),
            prisma.crmExpenseCategory.findMany(), prisma.crmTax.findMany(),
        ])
        const invs = await prisma.crmInvoice.findMany({ where: { id: { in: [...new Set(payments.map((p) => p.invoiceId).filter(Boolean))] } }, select: { id: true, currencyId: true } })
        const iCur = Object.fromEntries(invs.map((i) => [i.id, i.currencyId]))
        const pays = payments.filter((p) => !curId || iCur[p.invoiceId] === curId)
        const tx = Object.fromEntries(taxes.map((t) => [t.id, t.taxRate])), cName = Object.fromEntries(cats.map((c) => [c.id, c.name]))
        const exp = (e) => round2((e.amount || 0) * (1 + ((tx[e.taxId] || 0) + (tx[e.tax2Id] || 0)) / 100))
        const inc = B.blank(), out2 = B.blank()
        for (const p of pays) { const k = B.key(p.paymentDate); if (k in inc) inc[k] = round2(inc[k] + (p.amount || 0)) }
        for (const e of expenses) { const k = B.key(e.date); if (k in out2) out2[k] = round2(out2[k] + exp(e)) }
        const byCat = {}
        for (const e of expenses) { const k = e.categoryId || 'none'; const c = (byCat[k] ||= { name: cName[k] || 'Uncategorised', amount: 0, count: 0 }); c.amount = round2(c.amount + exp(e)); c.count++ }
        const income = sum(pays, (p) => p.amount), spent = sum(expenses, exp)
        Object.assign(out, {
            stats: { income, expenses: spent, net: round2(income - spent), margin: income ? Math.round(((income - spent) / income) * 100) : 0, expenseCount: expenses.length },
            series: { income: B.keys.map((k) => inc[k]), expenses: B.keys.map((k) => out2[k]), net: B.keys.map((k) => round2(inc[k] - out2[k])) },
            recent: [...expenses].sort((a, b) => exp(b) - exp(a)).slice(0, 8).map((e) => ({ id: e.id, name: e.expenseName || cName[e.categoryId] || 'Expense', category: cName[e.categoryId] || '—', date: e.date, total: exp(e), reference: e.referenceNo || '' })),
            byCategory: Object.values(byCat).sort((a, b) => b.amount - a.amount).map((c) => ({ ...c, share: spent ? Math.round((c.amount / spent) * 100) : 0 })),
        })
    } else if (kind === 'leads') {
        const [leads, statuses, sources, staff] = await Promise.all([prisma.crmLead.findMany({ where: { createdAt: inRange } }), prisma.crmLeadStatus.findMany(), prisma.crmLeadSource.findMany(), prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true } })])
        const sName = Object.fromEntries(sources.map((s) => [s.id, s.name])), stName = Object.fromEntries(statuses.map((s) => [s.id, s.name])), fName = Object.fromEntries(staff.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(' ')]))
        // the import links leads and clients from the client side (client.leadId), so check both directions
        const fromLeads = new Set((await prisma.crmClient.findMany({ where: { leadId: { not: null } }, select: { leadId: true } })).map((c) => c.leadId))
        const conv = (l) => !!(l.clientId || l.dateConverted || fromLeads.has(l.id)), created = B.blank(), converted = B.blank(), lostS = B.blank()
        for (const l of leads) { const k = B.key(l.createdAt); if (k in created) { created[k]++; if (l.lost) lostS[k]++ } }
        for (const l of leads.filter(conv)) { const k = B.key(l.dateConverted || l.createdAt); if (k in converted) converted[k]++ }
        const group = (f, names) => { const m = {}; for (const l of leads) { const k = f(l) || 'none'; const g = (m[k] ||= { name: names[k] || (k === 'none' ? 'Not set' : '—'), total: 0, converted: 0, lost: 0 }); g.total++; if (conv(l)) g.converted++; if (l.lost) g.lost++ } return Object.values(m).map((g) => ({ ...g, rate: g.total ? Math.round((g.converted / g.total) * 100) : 0 })).sort((a, b) => b.total - a.total) }
        const days = leads.filter((l) => conv(l) && l.dateConverted).map((l) => Math.max(0, (new Date(l.dateConverted) - new Date(l.createdAt)) / DAY))
        Object.assign(out, {
            stats: { total: leads.length, converted: leads.filter(conv).length, rate: leads.length ? Math.round((leads.filter(conv).length / leads.length) * 100) : 0, lost: leads.filter((l) => l.lost).length, junk: leads.filter((l) => l.junk).length, avgDays: days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null },
            series: { created: B.keys.map((k) => created[k]), converted: B.keys.map((k) => converted[k]), lost: B.keys.map((k) => lostS[k]) },
            recent: [...leads].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8).map((l) => ({ id: l.id, name: l.name, company: l.company || '', source: sName[l.sourceId] || '—', status: stName[l.statusId] || (l.lost ? 'Lost' : l.junk ? 'Junk' : '—'), owner: fName[l.assigned] || '—', date: l.createdAt, converted: conv(l) })),
            bySource: group((l) => l.sourceId, sName), byStatus: group((l) => l.statusId, stName), byOwner: group((l) => l.assigned, fName),
        })
    } else if (kind === 'support') {
        const [tickets, statuses, prios, depts] = await Promise.all([prisma.crmTicket.findMany({ where: { createdAt: inRange } }), prisma.crmTicketStatus.findMany(), prisma.crmTicketPriority.findMany(), prisma.crmDepartment.findMany({ select: { id: true, name: true } })])
        const ids = tickets.map((t) => t.id)
        const replies = ids.length ? await prisma.crmTicketReply.findMany({ where: { ticketId: { in: ids } }, select: { ticketId: true, adminId: true, createdAt: true } }) : []
        const st = Object.fromEntries(statuses.map((s) => [s.id, s])), pr = Object.fromEntries(prios.map((p) => [p.id, p.name])), dp = Object.fromEntries(depts.map((d) => [d.id, d.name]))
        const opened = B.blank(), closedS = B.blank(), repS = B.blank()
        for (const t of tickets) { const k = B.key(t.createdAt); if (k in opened) { opened[k]++; if (st[t.statusId]?.legacyId === 5) closedS[k]++ } }
        for (const r of replies) { const rt = tickets.find((x) => x.id === r.ticketId); const k = rt ? B.key(r.createdAt) : null; if (k && k in repS) repS[k]++ }
        const first = {}
        for (const r of replies) if (r.adminId) { const t = tickets.find((x) => x.id === r.ticketId); if (!t) continue; const h = (new Date(r.createdAt) - new Date(t.createdAt)) / 3600000; if (first[r.ticketId] === undefined || h < first[r.ticketId]) first[r.ticketId] = h }
        const hrs = Object.values(first).filter((h) => h >= 0)
        const grp = (f, names) => { const m = {}; for (const t of tickets) { const k = f(t) || 'none'; m[k] = (m[k] || 0) + 1 } return Object.entries(m).map(([k, v]) => ({ name: names[k] || 'Not set', value: v })).sort((a, b) => b.value - a.value) }
        const closed = (t) => st[t.statusId]?.legacyId === 5
        Object.assign(out, {
            stats: { total: tickets.length, open: tickets.filter((t) => !closed(t)).length, closed: tickets.filter(closed).length, replies: replies.length, avgReplies: tickets.length ? Math.round((replies.length / tickets.length) * 10) / 10 : 0, firstResponseHours: hrs.length ? Math.round((hrs.reduce((s, h) => s + h, 0) / hrs.length) * 10) / 10 : null, unanswered: tickets.filter((t) => !first[t.id] && !closed(t)).length },
            series: { opened: B.keys.map((k) => opened[k]), closed: B.keys.map((k) => closedS[k]), replies: B.keys.map((k) => repS[k]) },
            recent: await (async () => { const cl = await prisma.crmClient.findMany({ where: { id: { in: [...new Set(tickets.map((t) => t.clientId).filter(Boolean))] } }, select: { id: true, company: true } }); const cn = Object.fromEntries(cl.map((c) => [c.id, c.company])); return [...tickets].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8).map((t) => ({ id: t.id, number: t.legacyId, subject: t.subject || '', client: cn[t.clientId] || t.name || t.email || '—', department: dp[t.departmentId] || '—', status: st[t.statusId]?.name || '—', date: t.createdAt, closed: closed(t) })) })(),
            byDepartment: grp((t) => t.departmentId, dp), byPriority: grp((t) => t.priorityId, pr), byStatus: grp((t) => t.statusId, Object.fromEntries(statuses.map((s) => [s.id, s.name]))),
        })
    } else if (kind === 'work') {
        const [tasks, timers, projects, staff, assigned] = await Promise.all([
            prisma.crmTask.findMany({ where: { OR: [{ dateFinished: inRange }, { createdAt: inRange }] }, select: { id: true, status: true, dateFinished: true, createdAt: true, dueDate: true, relType: true, relId: true } }),
            prisma.crmTaskTimer.findMany({ where: { startTime: inRange, endTime: { not: null } } }),
            prisma.crmProject.findMany({ select: { id: true, name: true, status: true } }),
            prisma.crmStaff.findMany({ select: { id: true, firstName: true, lastName: true } }), prisma.crmTaskAssigned.findMany({ select: { taskId: true, staffId: true } }),
        ])
        const fName = Object.fromEntries(staff.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(' ')])), pName = Object.fromEntries(projects.map((p) => [p.id, p.name]))
        const done = tasks.filter((t) => t.status === 5 && t.dateFinished && t.dateFinished >= R.from && t.dateFinished < R.until)
        const made = tasks.filter((t) => t.createdAt >= R.from && t.createdAt < R.until)
        const dn = B.blank(), nw = B.blank(), hr = B.blank()
        for (const t of timers) { const k = B.key(t.startTime); if (k in hr) hr[k] = round2(hr[k] + Math.max(0, (new Date(t.endTime) - new Date(t.startTime)) / 3600000)) }
        for (const t of done) { const k = B.key(t.dateFinished); if (k in dn) dn[k]++ }
        for (const t of made) { const k = B.key(t.createdAt); if (k in nw) nw[k]++ }
        const secs = (t) => Math.max(0, (new Date(t.endTime) - new Date(t.startTime)) / 1000)
        const taskInfo = Object.fromEntries(tasks.map((t) => [t.id, t]))
        const allTasks = timers.length ? await prisma.crmTask.findMany({ where: { id: { in: [...new Set(timers.map((t) => t.taskId))] } }, select: { id: true, relType: true, relId: true } }) : []
        const tInfo = Object.fromEntries(allTasks.map((t) => [t.id, t]))
        void taskInfo
        const byStaff = {}
        for (const t of timers) { const k = t.staffId || 'x'; const s = (byStaff[k] ||= { name: fName[k] || 'Unknown', hours: 0, completed: 0 }); s.hours = round2(s.hours + secs(t) / 3600) }
        const asg = {}
        for (const a of assigned) (asg[a.taskId] ||= []).push(a.staffId)
        for (const t of done) for (const sid of asg[t.id] || []) { const s = (byStaff[sid] ||= { name: fName[sid] || 'Unknown', hours: 0, completed: 0 }); s.completed++ }
        const byProject = {}
        for (const t of timers) { const ti = tInfo[t.taskId]; if (ti?.relType !== 'project') continue; const p = (byProject[ti.relId] ||= { name: pName[ti.relId] || 'Project', hours: 0 }); p.hours = round2(p.hours + secs(t) / 3600) }
        const today = new Date(new Date().toDateString())
        const open = await prisma.crmTask.findMany({ where: { status: { not: 5 } }, select: { id: true, name: true, dueDate: true, relType: true, relId: true } })
        const PS = { 1: 'Not started', 2: 'In progress', 3: 'On hold', 4: 'Finished', 5: 'Cancelled' }
        const ps = {}
        for (const p of projects) ps[p.status] = (ps[p.status] || 0) + 1
        Object.assign(out, {
            stats: { completed: done.length, created: made.length, hours: round2(timers.reduce((s, t) => s + secs(t), 0) / 3600), openTasks: open.length, overdue: open.filter((t) => t.dueDate && new Date(t.dueDate) < today).length },
            series: { completed: B.keys.map((k) => dn[k]), created: B.keys.map((k) => nw[k]), hours: B.keys.map((k) => hr[k]) },
            recent: open.filter((t) => t.dueDate && new Date(t.dueDate) < today).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8).map((t) => ({ id: t.id, name: t.name, project: t.relType === 'project' ? pName[t.relId] || '' : '', due: t.dueDate, days: Math.floor((today - new Date(t.dueDate)) / DAY), who: (asg[t.id] || []).map((x) => fName[x]).filter(Boolean).join(', ') })),
            byStaff: Object.values(byStaff).sort((a, b) => b.hours - a.hours || b.completed - a.completed), byProject: Object.values(byProject).sort((a, b) => b.hours - a.hours).slice(0, 10),
            projectsByStatus: Object.entries(ps).map(([k, v]) => ({ name: PS[k], value: v })),
        })
    }
    if (!opts.noPrev && out.stats) {
        const len = R.until - R.from
        const pf = new Date(+R.from - len), pt = new Date(+R.from - DAY)
        try { out.prev = (await runReport(kind, { ...params, range: 'custom', from: iso(pf), to: iso(pt) }, { noPrev: true })).stats } catch { out.prev = null }
    }
    return out
}

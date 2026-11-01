import test from 'node:test'
import assert from 'node:assert/strict'
import { ruleIdeas, stamp, RULE_KEYS } from './growRules.js'

const figures = {
    leads: { open: 40, attention: { neverContacted: 4, noContactFor30Days: 6, openOlderThan90Days: 3, openWithoutOwner: 2 }, sources: [{ name: 'Website', total: 20, converted: 6, conversionRatePct: 30 }, { name: 'Facebook', total: 10, converted: 0, conversionRatePct: 0 }] },
    clients: { clientsWithOverdue: { count: 2, totalOverdue: 5000, top: [{ name: 'Atlas', overdue: 3000 }] }, dormantOverAYear: { count: 3, biggestPast: [{ name: 'Old Co' }] }, top5SharePct: 82 },
    income: { mainCurrency: 'MAD', yearToDate: { invoiced: 80000, samePeriodLastYear: 100000, changePct: -20 } },
    tasks: { overdue: 12, overdueByPerson: [{ name: 'Sara', count: 7 }] }, tickets: { waitingOver24h: 3 }, proposals: { sentNoAnswerOver7d: 2 }, team: { withoutGoal: 3 },
}
const NOW = new Date('2026-11-04T10:00:00Z') // a Wednesday

test('grow: daily rules read the figures and give concrete, prioritised advice', () => {
    const d = ruleIdeas('daily', figures, { now: NOW })
    const keys = d.map((x) => x.key)
    for (const k of ['leads-never-contacted', 'leads-no-owner', 'tasks-overdue', 'tickets-waiting', 'invoices-overdue']) assert.ok(keys.includes(k), k)
    assert.equal(d.find((x) => x.key === 'leads-never-contacted').priority, 3)
    assert.match(d.find((x) => x.key === 'tasks-overdue').title, /12 overdue/)
    assert.match(d.find((x) => x.key === 'tasks-overdue').body, /Sara: 7/)
    assert.match(d.find((x) => x.key === 'invoices-overdue').title, /5 000 MAD/)
})
test('grow: weekly rules find the best source, the dormant clients, the concentration and the silent proposals', () => {
    const w = ruleIdeas('weekly', figures, { now: NOW })
    assert.match(w.find((x) => x.key === 'best-source').title, /Website.*30%/)
    assert.ok(w.some((x) => x.key === 'dormant-clients') && w.some((x) => x.key === 'client-concentration') && w.some((x) => x.key === 'proposals-waiting') && w.some((x) => x.key === 'leads-stale'))
})
test('grow: monthly rules compare the income with last year and always carry the standing advice', () => {
    const m = ruleIdeas('monthly', figures, { now: NOW })
    assert.match(m.find((x) => x.key === 'income-trend').title, /20% below last year/)
    assert.equal(m.find((x) => x.key === 'income-trend').priority, 3)
    assert.ok(m.some((x) => x.key === 'recurring-revenue') && m.some((x) => x.key === 'team-skills'))
    const up = ruleIdeas('monthly', { ...figures, income: { mainCurrency: 'MAD', yearToDate: { invoiced: 120000, samePeriodLastYear: 100000, changePct: 20 } } }, { now: NOW })
    assert.match(up.find((x) => x.key === 'income-trend').title, /20% above/)
})
test('grow: nothing to say when the figures are quiet (only the standing monthly advice)', () => {
    assert.equal(ruleIdeas('daily', {}, { now: NOW }).length, 0)
    assert.deepEqual(ruleIdeas('monthly', {}, { now: NOW }).map((x) => x.key).sort(), ['recurring-revenue', 'review-pricing', 'what-is-new'])
})
test('grow: one idea per rule and period: the fingerprint carries the day, the week or the month', () => {
    assert.equal(ruleIdeas('daily', figures, { now: NOW })[0].fingerprint, `rule:${ruleIdeas('daily', figures, { now: NOW })[0].key}:2026-11-04`)
    assert.equal(stamp('weekly', NOW), '2026-W45')
    assert.equal(stamp('weekly', new Date('2026-11-08T23:00:00Z')), '2026-W45') // Sunday still belongs to the same week
    assert.equal(stamp('weekly', new Date('2026-11-09T00:00:00Z')), '2026-W46')
    assert.equal(stamp('monthly', NOW), '2026-11')
    assert.equal(new Set(RULE_KEYS).size, RULE_KEYS.length)
})
test('grow: French texts exist, and an unknown language falls back to English', () => {
    assert.match(ruleIdeas('daily', figures, { lang: 'fr', now: NOW }).find((x) => x.key === 'tasks-overdue').title, /en retard/)
    assert.match(ruleIdeas('daily', figures, { lang: 'ja', now: NOW }).find((x) => x.key === 'tasks-overdue').title, /overdue/)
})

test('grow: programs not yet on the board bring a monthly idea naming them', () => {
    const m = ruleIdeas('monthly', { programs: { untracked: 3, names: ['AWS Activate credits', 'NVIDIA Inception'] } }, { now: NOW })
    const r = m.find((x) => x.key === 'credits-programs')
    assert.ok(r && /3 program/.test(r.title) && /AWS Activate credits/.test(r.body))
    assert.ok(!ruleIdeas('monthly', { programs: { untracked: 0, names: [] } }, { now: NOW }).some((x) => x.key === 'credits-programs'))
})

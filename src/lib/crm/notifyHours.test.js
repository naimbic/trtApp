import test from 'node:test'
import assert from 'node:assert/strict'
import { config, DEFAULTS, windowState, workStart, hourIn } from './notifyHours.js'

const TZ = 'Africa/Casablanca' // UTC+1
const at = (s) => Date.parse(s)

test('defaults: notify 10:00 to 17:00, the working day 9:00 to 18:00', () => {
    assert.deepEqual(config({}), DEFAULTS)
    assert.equal(config({ from: '8', to: '19', workFrom: '8', workTo: '20' }).to, 19)
})
test('the window ends after it starts, numbers stay in range, it can be switched off', () => {
    const c = config({ from: '15', to: '12' })
    assert.ok(c.to > c.from)
    assert.equal(config({ from: '99' }).from, 23)
    assert.equal(config({ from: '-4' }).from, 0)
    assert.equal(config({ on: '0' }).on, false)
    assert.equal(config({ on: '1' }).on, true)
})
test('inside the hours the CRM may notify, outside it waits for the next opening', () => {
    assert.equal(hourIn(TZ, at('2026-11-03T09:30:00Z')), 10)
    assert.equal(windowState({ now: at('2026-11-03T09:30:00Z'), tz: TZ }).open, true)
    assert.equal(windowState({ now: at('2026-11-03T15:59:00Z'), tz: TZ }).open, true) // 16:59 local
    const late = windowState({ now: at('2026-11-03T16:00:00Z'), tz: TZ }) // 17:00 local
    assert.equal(late.open, false)
    assert.equal(late.nextOpen, at('2026-11-04T09:00:00Z')) // tomorrow 10:00 local
    const night = windowState({ now: at('2026-11-03T23:00:00Z'), tz: TZ }) // midnight local
    assert.equal(night.open, false)
    assert.equal(night.nextOpen, at('2026-11-04T09:00:00Z'))
    const early = windowState({ now: at('2026-11-03T07:00:00Z'), tz: TZ }) // 08:00 local
    assert.equal(early.nextOpen, at('2026-11-03T09:00:00Z')) // today 10:00 local
    assert.equal(windowState({ now: at('2026-11-03T23:00:00Z'), tz: TZ, cfg: config({ on: '0' }) }).open, true)
})
test('the working day starts at its first hour of the local day', () => {
    assert.equal(workStart(TZ, at('2026-11-03T12:00:00Z')), at('2026-11-03T08:00:00Z')) // 09:00 local
    assert.equal(workStart(TZ, at('2026-11-03T23:30:00Z')), at('2026-11-04T08:00:00Z')) // already the 4th in Casablanca
})

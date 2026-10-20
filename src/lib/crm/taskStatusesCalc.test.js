import test from 'node:test'
import assert from 'node:assert/strict'
import { nextCode, deleteBlock, shapeStatuses, defaultStatusCode, TASK_STATUS_DEFAULTS } from './taskStatusesCalc.js'

test('a new status takes the next free code, never below 6', () => {
    assert.equal(nextCode([]), 6)
    assert.equal(nextCode([1, 2, 3, 4, 5]), 6)
    assert.equal(nextCode([1, 2, 3, 4, 5, 6, 9]), 10)
})

test('the statuses the app relies on cannot be deleted', () => {
    for (const code of [1, 4, 5]) assert.ok(deleteBlock(code))
    for (const code of [2, 3, 6, 12]) assert.equal(deleteBlock(code), null)
})

test('statuses come back in board order and say what is custom', () => {
    const rows = TASK_STATUS_DEFAULTS.map((d, i) => ({ id: `id${i}`, code: d.code, name: d.code === 4 ? 'Doing' : d.name, color: d.color, statusOrder: d.statusOrder }))
    rows.push({ id: 'x', code: 6, name: 'Review', color: '#ec4899', statusOrder: 3 })
    const list = shapeStatuses(rows)
    assert.deepEqual(list.map((s) => s.value), [1, 4, 3, 6, 2, 5])
    assert.equal(list.find((s) => s.value === 4).custom, true)
    assert.equal(list.find((s) => s.value === 1).custom, false)
    assert.equal(list.find((s) => s.value === 6).builtIn, false)
})

test('the default status of a new task', () => {
    const rows = TASK_STATUS_DEFAULTS.map((d) => ({ id: `i${d.code}`, code: d.code, name: d.name, color: d.color, statusOrder: d.statusOrder }))
    assert.equal(defaultStatusCode(rows), 1) // nothing marked: the first one
    rows.find((r) => r.code === 3).isDefault = true
    assert.equal(defaultStatusCode(rows), 3)
    rows.find((r) => r.code === 3).isActive = false // turned off: not offered any more
    assert.equal(defaultStatusCode(rows), 1)
    assert.equal(shapeStatuses(rows).find((s) => s.value === 3).active, false)
})

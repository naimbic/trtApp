import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeTaskStatuses, cleanTaskStatuses, TASK_STATUS_DEFAULTS } from './taskStatusesCalc.js'

test('nothing saved: the five defaults in board order', () => {
    const list = mergeTaskStatuses(null)
    assert.deepEqual(list.map((s) => s.value), [1, 4, 3, 2, 5])
    assert.equal(list[0].name, 'Not started')
    assert.ok(list.every((s) => !s.custom))
})

test('a saved name and colour replace the default, the rest keep theirs', () => {
    const list = mergeTaskStatuses(JSON.stringify({ 4: { name: 'Doing', color: '#FF0000' }, 5: { name: '   ', color: 'nope' } }))
    assert.equal(list.find((s) => s.value === 4).name, 'Doing')
    assert.equal(list.find((s) => s.value === 4).color, '#ff0000')
    assert.equal(list.find((s) => s.value === 5).name, TASK_STATUS_DEFAULTS[5].name)
    assert.equal(list.find((s) => s.value === 5).color, TASK_STATUS_DEFAULTS[5].color)
    assert.equal(list.find((s) => s.value === 4).custom, true)
})

test('saving checks colours and refuses duplicate names', () => {
    assert.throws(() => cleanTaskStatuses({ 1: { name: 'A', color: 'red' } }), /colour/)
    assert.throws(() => cleanTaskStatuses({ 1: { name: 'Same' }, 2: { name: 'same' } }), /same name/)
    const ok = cleanTaskStatuses({ 1: { name: ' Backlog ', color: '#111111' } })
    assert.equal(ok[1].name, 'Backlog')
    assert.equal(ok[4].name, 'In progress')
})

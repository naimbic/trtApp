import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanState } from './savedViewsCalc.js'

test('a state is kept as plain JSON', () => {
    assert.deepEqual(cleanState({ search: 'acme', mine: true, n: 3, none: undefined }), { search: 'acme', mine: true, n: 3 })
})
test('an empty, array, or oversized state is refused', () => {
    assert.throws(() => cleanState(null), /cannot be saved|too big/)
    assert.throws(() => cleanState([1, 2]), /too big/)
    assert.throws(() => cleanState({ big: 'x'.repeat(5000) }), /too big/)
})

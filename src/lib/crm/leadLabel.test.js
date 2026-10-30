import test from 'node:test'
import assert from 'node:assert/strict'
import { leadLabel } from './leadLabel.js'

test('a lead with a company is shown as Company (Person)', () => {
    assert.equal(leadLabel({ name: 'Fousenou Saouanera', company: 'Natura Volt' }), 'Natura Volt (Fousenou Saouanera)')
})
test('a lead without a company is shown as (nan) Person', () => {
    assert.equal(leadLabel({ name: 'Fousenou Saouanera', company: '' }), '(nan) Fousenou Saouanera')
    assert.equal(leadLabel({ name: 'Fousenou Saouanera', company: null }), '(nan) Fousenou Saouanera')
    assert.equal(leadLabel({ name: 'Fousenou Saouanera', company: '   ' }), '(nan) Fousenou Saouanera')
})

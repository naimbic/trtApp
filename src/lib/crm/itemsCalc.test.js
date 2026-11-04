import test from 'node:test'
import assert from 'node:assert/strict'
import { GROUP_COLORS, colorName, autoColor, placed, readSuggestions } from './itemsCalc.js'

test('a colour is always one of the palette', () => {
    assert.equal(colorName('red'), 'red'); assert.equal(colorName('#ff0000'), 'slate'); assert.equal(colorName(null), 'slate')
    assert.equal(autoColor('SEO'), autoColor('SEO')); assert.ok(GROUP_COLORS.includes(autoColor('Web design')))
})

test('a dragged id lands where it was dropped, also when it comes from another list', () => {
    assert.deepEqual(placed(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b'])
    assert.deepEqual(placed(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a'])
    assert.deepEqual(placed(['a', 'b'], 'x', 1), ['a', 'x', 'b'])
    assert.deepEqual(placed(['a', 'b'], 'x', 99), ['a', 'b', 'x']); assert.deepEqual(placed([], 'x', 0), ['x'])
})

test('the answer of an AI is read, cleaned, and without duplicates', () => {
    const text = 'Here you go:\n```json\n[{"description":"SEO audit","longDescription":"Full technical audit","unit":"audit","rate":"1 500"},{"name":"seo audit","price":10},{"description":"Monthly SEO","unit":"month","rate":2500.456},{"description":""},{"description":"Existing item","rate":5}]\n```'
    const r = readSuggestions(text, { existing: ['Existing item'] })
    assert.equal(r.length, 2)
    assert.deepEqual(r[0], { description: 'SEO audit', longDescription: 'Full technical audit', unit: 'audit', rate: 1500 })
    assert.equal(r[1].rate, 2500.46)
    assert.deepEqual(readSuggestions('no list here'), []); assert.deepEqual(readSuggestions('[not json]'), [])
    assert.equal(readSuggestions(JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ description: `x${i}` }))), { max: 5 }).length, 5)
})

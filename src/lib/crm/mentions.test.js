import test from 'node:test'
import assert from 'node:assert/strict'
import { mentionedIds } from './mentionsCalc.js'

const staff = [{ id: 'a', name: 'Sarah Alami' }, { id: 'b', name: 'Omar' }, { id: 'c', name: 'Zoé Martin' }]
test('a colleague is mentioned by @ and the full name', () => {
    assert.deepEqual(mentionedIds('Please check @Sarah Alami, thanks', staff), ['a'])
    assert.deepEqual(mentionedIds('@omar can you look?', staff), ['b'])
    assert.deepEqual(mentionedIds('cc @Zoe Martin.', staff), ['c']) // accents are ignored
})
test('an email address or a half name is not a mention', () => {
    assert.deepEqual(mentionedIds('write to omar@acme.com', staff), [])
    assert.deepEqual(mentionedIds('hello @Sarah', staff), [])
    assert.deepEqual(mentionedIds('no mention here', staff), [])
})

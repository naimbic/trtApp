import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanChecklist, cleanLabels, cleanLinks, cleanAttachments, cleanColor, sortNotes, isEmptyNote } from './notesCalc.js'

test('checklist: empty items are dropped, text is kept short, done is a boolean', () => {
    const l = cleanChecklist([{ text: '  Buy   milk ', done: 1 }, { text: '   ' }, { id: 'a', text: 'x'.repeat(500) }])
    assert.equal(l.length, 2)
    assert.equal(l[0].text, 'Buy milk')
    assert.equal(l[0].done, true)
    assert.equal(l[1].text.length, 300)
    assert.deepEqual(cleanChecklist('nope'), [])
})
test('labels: trimmed, unique without regard to case, at most 10', () => {
    assert.deepEqual(cleanLabels(['#Ideas', 'ideas', ' Work ', '']), ['Ideas', 'Work'])
    assert.equal(cleanLabels(Array.from({ length: 30 }, (_, i) => `l${i}`)).length, 10)
})
test('links: only web addresses, https added when missing, no duplicates', () => {
    const l = cleanLinks([{ url: 'example.com/a' }, { url: 'javascript:alert(1)' }, { url: 'ftp://x.com/f' }, { url: 'https://example.com/a' }, { url: 'localhost' }])
    assert.deepEqual(l.map((x) => x.url), ['https://example.com/a'])
})
test('attachments: only files uploaded through the notes upload are kept', () => {
    const p = 'https://cdn.example/trtcrm/notes/'
    const a = cleanAttachments([{ url: `${p}1.webp`, kind: 'image', name: 'a' }, { url: 'https://evil.example/x.png' }, { url: `${p}1.webp` }, { url: `${p}2.webm`, kind: 'weird' }], p)
    assert.deepEqual(a.map((x) => x.kind), ['image', 'file'])
})
test('colour: only the known ones', () => {
    assert.equal(cleanColor('blue'), 'blue')
    assert.equal(cleanColor('url(x)'), null)
})
test('order: pinned, then important, then the latest change', () => {
    const d = (n) => new Date(2026, 0, n)
    const out = sortNotes([{ id: 'old', updatedAt: d(1) }, { id: 'new', updatedAt: d(5) }, { id: 'imp', important: true, updatedAt: d(2) }, { id: 'pin', pinned: true, updatedAt: d(1) }])
    assert.deepEqual(out.map((n) => n.id), ['pin', 'imp', 'new', 'old'])
})
test('a note with nothing in it is empty; a list, a picture or a link is not', () => {
    assert.equal(isEmptyNote({ title: ' ', text: '', checklist: [], attachments: [], links: [] }), true)
    assert.equal(isEmptyNote({ title: '', text: '', checklist: [{ text: 'a' }] }), false)
    assert.equal(isEmptyNote({ attachments: [{}] }), false)
})

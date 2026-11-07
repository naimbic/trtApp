import test from 'node:test'
import assert from 'node:assert/strict'
import { shapeAiMessage } from './scheduledMessagesCalc.js'

test('a JSON answer gives a title and paragraphs', () => {
    const r = shapeAiMessage('{"title":"Use the CRM","message":"Hello team\\n\\nUpdate your tasks.\\n- one\\n- two"}')
    assert.equal(r.title, 'Use the CRM')
    assert.equal(r.html, '<p>Hello team</p><p>Update your tasks.<br>- one<br>- two</p>')
})
test('an answer around the JSON, markdown marks and html are cleaned', () => {
    const r = shapeAiMessage('Here you go: {"title":"T","message":"## **Hi** <b>all</b>"}')
    assert.equal(r.html, '<p>Hi &lt;b&gt;all&lt;/b&gt;</p>')
})
test('real line breaks inside the JSON text are tolerated', () => {
    const r = shapeAiMessage('{"title":"Tips","message":"Line one\n\nLine two"}'.replace(/\\n/g, '\n'))
    assert.equal(r.title, 'Tips')
    assert.equal(r.html, '<p>Line one</p><p>Line two</p>')
})
test('plain text is used as it is, and long text is cut', () => {
    assert.equal(shapeAiMessage('Just text').html, '<p>Just text</p>')
    assert.ok(shapeAiMessage('x'.repeat(5000)).html.length < 2000)
})

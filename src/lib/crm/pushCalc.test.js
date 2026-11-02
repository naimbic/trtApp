import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPayload, validSubscription, isGone } from './pushCalc.js'

const key = (n) => 'A'.repeat(n)

test('payload strips tags, clamps lengths and keeps the link inside the app', () => {
    const p = buildPayload({ title: '<b>Hi</b> ' + 'x'.repeat(200), body: '<p>Hello <i>world</i></p>', url: 'https://evil.example/x' })
    assert.equal(p.url, '/')
    assert.ok(p.title.length <= 80 && !p.title.includes('<'))
    assert.equal(p.body, 'Hello world')
    assert.equal(buildPayload({ title: 'a', url: '//evil.example' }).url, '/')
    assert.equal(buildPayload({ title: 'a', url: '/crm/chat?room=1' }).url, '/crm/chat?room=1')
    assert.equal(buildPayload({}).title, 'trtCRM')
})

test('a subscription needs an https address and both keys', () => {
    const ok = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: key(87), auth: key(22) } }
    assert.equal(validSubscription(ok), true)
    assert.equal(validSubscription({ ...ok, endpoint: 'http://fcm.googleapis.com/x/abcdefgh' }), false)
    assert.equal(validSubscription({ ...ok, keys: { p256dh: 'x', auth: key(22) } }), false)
    assert.equal(validSubscription({ endpoint: ok.endpoint }), false)
    assert.equal(validSubscription(null), false)
})

test('404 and 410 mean the device is gone', () => {
    assert.equal(isGone(410), true)
    assert.equal(isGone(404), true)
    assert.equal(isGone(500), false)
    assert.equal(isGone(201), false)
})

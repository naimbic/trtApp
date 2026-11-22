import test from 'node:test'
import assert from 'node:assert/strict'
import { crossSiteWrite, countsAsAnonymousWrite } from './requestShield.js'

const base = { method: 'POST', path: '/api/crm/pipeline/leads', host: 'app.trtcrm.com' }

test('a change from the app itself passes, whatever the port', () => {
    assert.equal(crossSiteWrite({ ...base, origin: 'https://app.trtcrm.com' }), false)
    assert.equal(crossSiteWrite({ ...base, host: 'localhost:3000', origin: 'http://localhost:3200' }), false)
})
test('a change from another website is refused', () => {
    assert.equal(crossSiteWrite({ ...base, origin: 'https://evil.example' }), true)
    assert.equal(crossSiteWrite({ ...base, origin: 'https://app.trtcrm.com.evil.example' }), true)
    assert.equal(crossSiteWrite({ ...base, origin: 'null' }), true)
    assert.equal(crossSiteWrite({ ...base, method: 'DELETE', origin: 'https://evil.example' }), true)
})
test('reading, servers without Origin, keys and the public addresses are left alone', () => {
    assert.equal(crossSiteWrite({ ...base, method: 'GET', origin: 'https://evil.example' }), false)
    assert.equal(crossSiteWrite({ ...base, origin: null }), false)
    assert.equal(crossSiteWrite({ ...base, origin: 'https://site.example', hasKey: true }), false)
    assert.equal(crossSiteWrite({ ...base, path: '/api/submissions', origin: 'https://site.example' }), false)
    assert.equal(crossSiteWrite({ ...base, path: '/api/crm/public/estimate/1/abc/accept', origin: 'https://site.example' }), false)
    assert.equal(crossSiteWrite({ ...base, path: '/api/v1/calendar/events', origin: 'https://meet.example' }), false)
})
test('an origin on the allowed list passes', () => {
    assert.equal(crossSiteWrite({ ...base, origin: 'https://trtmaroc.com', allowed: ['https://trtmaroc.com'] }), false)
})
test('only changes without a session or a key count against the ceiling', () => {
    assert.equal(countsAsAnonymousWrite({ method: 'POST', path: '/api/portal/auth/login', signedIn: false, hasKey: false }), true)
    assert.equal(countsAsAnonymousWrite({ method: 'POST', path: '/api/crm/public/estimate/1/a/comments', signedIn: false, hasKey: false }), true)
    assert.equal(countsAsAnonymousWrite({ method: 'GET', path: '/api/portal/auth/login', signedIn: false, hasKey: false }), false)
    assert.equal(countsAsAnonymousWrite({ method: 'POST', path: '/api/crm/tasks', signedIn: true, hasKey: false }), false)
    assert.equal(countsAsAnonymousWrite({ method: 'POST', path: '/api/crm/public/whatsapp', signedIn: false, hasKey: false }), false)
    assert.equal(countsAsAnonymousWrite({ method: 'POST', path: '/api/submissions', signedIn: false, hasKey: false }), false)
    assert.equal(countsAsAnonymousWrite({ method: 'POST', path: '/api/portal/auth/login', signedIn: false, hasKey: true }), true) // a made-up key header changes nothing
})

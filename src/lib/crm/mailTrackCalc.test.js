import test from 'node:test'
import assert from 'node:assert/strict'
import { trackLinks, trackedHtml, sign, validSign, webUrl, countsAsHuman, trackInfo, newToken, TOKEN_RE } from './mailTrackCalc.js'

const base = 'https://app.test', token = newToken(), secret = 's3cret'

test('token looks right', () => assert.ok(TOKEN_RE.test(token)))

test('web links go through the click address, others stay', () => {
    const html = '<p><a href="https://site.com/a?x=1&amp;y=2">go</a> <a href="mailto:a@b.c">m</a> <a href="tel:123">t</a> <a href="#top">h</a></p>'
    const out = trackLinks(html, { base, token, secret })
    assert.match(out, /href="https:\/\/app\.test\/api\/crm\/public\/mail\/click\//)
    assert.ok(out.includes('mailto:a@b.c') && out.includes('tel:123') && out.includes('#top'))
    const u = new URL(out.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&'))
    const target = u.searchParams.get('u')
    assert.equal(target, 'https://site.com/a?x=1&y=2')
    assert.ok(validSign(token, target, u.searchParams.get('s'), secret))
})

test('a made-up address or a wrong signature is refused', () => {
    const s = sign(token, 'https://good.com', secret)
    assert.ok(validSign(token, 'https://good.com', s, secret))
    assert.ok(!validSign(token, 'https://evil.com', s, secret))
    assert.ok(!validSign(token, 'https://good.com', s, 'other'))
    assert.ok(!validSign(token, 'https://good.com', '', secret))
})

test('only web addresses are forwarded to', () => {
    assert.ok(webUrl('https://a.com/x'))
    assert.ok(!webUrl('javascript:alert(1)') && !webUrl('data:text/html,x') && !webUrl('//a.com'))
})

test('our own links are not wrapped twice', () => {
    const once = trackLinks('<a href="https://site.com">x</a>', { base, token, secret })
    assert.equal(trackLinks(once, { base, token, secret }), once)
})

test('the signature is not tracked, the picture is last', () => {
    const out = trackedHtml({ body: '<a href="https://a.com">a</a>', signature: '<div class="sig"><a href="https://sig.com">site</a></div>', base, token, secret })
    assert.ok(out.includes('href="https://sig.com"'))
    assert.ok(out.endsWith('style="border:0;width:1px;height:1px">'))
    assert.ok(out.includes(`/open/${token}`))
})

test('hits right after sending do not count as a person', () => {
    const sent = new Date('2026-11-11T10:00:00Z')
    assert.equal(countsAsHuman(sent, new Date('2026-11-11T10:00:05Z')), false)
    assert.equal(countsAsHuman(sent, new Date('2026-11-11T10:01:00Z')), true)
    assert.equal(countsAsHuman(null), false)
})

test('trackInfo only for sent, tracked mails', () => {
    assert.deepEqual(trackInfo({ direction: 'in', trackToken: 'x' }), { tracked: false })
    assert.deepEqual(trackInfo({ direction: 'out' }), { tracked: false })
    assert.equal(trackInfo({ direction: 'out', trackToken: 'x', openCount: 2 }).opens, 2)
})

test('only some links can be tracked (the document mails track our own addresses, not the logo link)', () => {
    const only = (u) => u.startsWith('https://app.test/')
    const out = trackLinks('<a href="https://app.test/s/inv-1">invoice</a> <a href="https://company.com">logo</a>', { base, token, secret, only })
    assert.ok(out.includes('/mail/click/') && out.includes('href="https://company.com"'))
})

test('trackInfo works for a row of the sent log (no direction)', () => {
    assert.equal(trackInfo({ trackToken: 'x', openCount: 1 }).opens, 1)
    assert.deepEqual(trackInfo({ subject: 'old row' }), { tracked: false })
})

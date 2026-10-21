import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSignature } from './signature.js'
import fs from 'node:fs'

test('the signature keeps the logo small and fixed, and stacks on a phone', () => {
    const h = buildSignature({ logo: 'https://x.com/logo.png', name: 'Naim', title: 'CEO', company: 'TRT', phone: '+212 600', email: 'a@b.com', website: 'trt.ma', address: 'Casablanca' })
    assert.match(h, /width="80"/)
    assert.match(h, /max-width:80px/)
    assert.match(h, /class="sig"/)
    assert.match(h, /max-width:520px/)
    assert.match(h, /tel:\+212600/)
    assert.match(h, /https:\/\/trt\.ma/)
})

test('a signature without a logo has no empty logo column', () => {
    assert.doesNotMatch(buildSignature({ name: 'Naim' }), /sig-logo" valign/)
})

test('templates are mobile ready: viewport, stacked rows and a full-width button', () => {
    // build.js imports its catalog without an extension (the bundler resolves it), so the source is checked as text
    const src = fs.readFileSync(new URL('./build.js', import.meta.url), 'utf8')
    assert.match(src, /initial-scale=1/)
    assert.match(src, /tr\.row td\{display:block/)
    assert.match(src, /class="row"/)
    assert.match(src, /class="btn"/)
})

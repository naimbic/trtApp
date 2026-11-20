import test from 'node:test'
import assert from 'node:assert/strict'
import { companyDomain, siteDomain, sameDomain } from './domainMatch.js'

test('company domain of an address', () => {
    assert.equal(companyDomain('Sara@Atlas.ma'), 'atlas.ma')
    assert.equal(companyDomain('sara@gmail.com'), null)
    assert.equal(companyDomain('not an email'), null)
    assert.equal(companyDomain(''), null)
})
test('domain of a website', () => {
    assert.equal(siteDomain('https://www.atlas.ma/contact?x=1'), 'atlas.ma')
    assert.equal(siteDomain('Atlas.ma'), 'atlas.ma')
    assert.equal(siteDomain('shop.atlas.ma:8080'), 'shop.atlas.ma')
    assert.equal(siteDomain('n/a'), null)
})
test('same company', () => {
    assert.ok(sameDomain('atlas.ma', 'atlas.ma'))
    assert.ok(sameDomain('mail.atlas.ma', 'atlas.ma'))
    assert.ok(!sameDomain('myatlas.ma', 'atlas.ma'))
    assert.ok(!sameDomain(null, 'atlas.ma'))
})

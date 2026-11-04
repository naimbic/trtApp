import test from 'node:test'
import assert from 'node:assert/strict'
import { hostOf, rootDomain, isPrivateIp, span, readRdap, readWhois, summary, decodeEntities } from './siteInfoCalc.js'

test('the host of a website, and nothing for what is not a public host name', () => {
    assert.equal(hostOf('https://www.Example.com/path?x=1'), 'www.example.com')
    assert.equal(hostOf('example.ma'), 'example.ma')
    assert.equal(hostOf('http://site.fr:8080/'), 'site.fr')
    for (const bad of ['', 'localhost', 'pas un site', 'http://', 'javascript:alert(1)']) assert.equal(hostOf(bad), '', bad)
})

test('the registrable domain', () => {
    assert.equal(rootDomain('www.example.com'), 'example.com')
    assert.equal(rootDomain('shop.site.co.ma'), 'site.co.ma')
    assert.equal(rootDomain('trtdigital.ma'), 'trtdigital.ma')
})

test('the server never calls its own network', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '172.16.5.5', '169.254.169.254', '::1', 'fd00::1', '100.64.0.1', 'nonsense']) assert.equal(isPrivateIp(ip), true, ip)
    for (const ip of ['8.8.8.8', '104.26.5.1', '2606:4700::1111']) assert.equal(isPrivateIp(ip), false, ip)
})

test('how long ago', () => {
    const now = Date.UTC(2026, 10, 4)
    assert.equal(span(Date.UTC(2023, 8, 4), now), '3 years 2 months')
    assert.equal(span(Date.UTC(2026, 5, 4), now), '5 months')
    assert.equal(span(Date.UTC(2026, 10, 1), now), '3 days')
})

test('rdap and classic whois are read the same way', () => {
    const r = readRdap({ events: [{ eventAction: 'registration', eventDate: '2019-03-01T00:00:00Z' }, { eventAction: 'expiration', eventDate: '2027-03-01T00:00:00Z' }], entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Gandi SAS']]] }], nameservers: [{ ldhName: 'NS1.GANDI.NET' }], status: ['client transfer prohibited'] })
    assert.deepEqual([r.created, r.expires, r.registrar, r.nameservers[0]], ['2019-03-01T00:00:00Z', '2027-03-01T00:00:00Z', 'Gandi SAS', 'ns1.gandi.net'])
    const w = readWhois('Domain Name: EXAMPLE.MA\nCreation Date: 2020-05-17T10:00:00Z\nRegistry Expiry Date: 2026-05-17T10:00:00Z\nRegistrar: Registrar X\nName Server: ns1.host.ma\nName Server: NS2.HOST.MA\n')
    assert.deepEqual([w.created.slice(0, 10), w.expires.slice(0, 10), w.registrar, w.nameservers], ['2020-05-17', '2026-05-17', 'Registrar X', ['ns1.host.ma', 'ns2.host.ma']])
    assert.equal(readWhois('No match'), null); assert.equal(readRdap(null), null)
})

test('the summary keeps the facts that exist', () => {
    const rows = summary({ site: { online: true, status: 200, ms: 320, title: 'Acme', finalUrl: 'https://acme.ma/', redirected: true, ssl: { validTo: '2027-01-01T00:00:00Z', issuer: 'Let’s Encrypt' } }, whois: { created: '2020-01-01T00:00:00Z', expires: '2020-02-01T00:00:00Z', registrar: 'R' }, dns: { ip: ['1.2.3.4'], ns: ['ns1.x.net'], mx: [] } })
    const map = Object.fromEntries(rows)
    assert.equal(map.Website, 'Online · 200 · 320 ms'); assert.equal(map['Goes to'], 'https://acme.ma/'); assert.match(map['Domain expires'], /expired/); assert.equal(map.IP, '1.2.3.4'); assert.equal('Mail' in map, false)
    assert.match(summary({ site: { online: false, error: 'timeout' } })[0][1], /Not reachable \(timeout\)/)
})

test('the entities of a page title are read', () => { assert.equal(decodeEntities('Agence SEO &amp; Webmarketing &#39;x&#x27; &quot;y&quot;'), `Agence SEO & Webmarketing 'x' "y"`); assert.equal(decodeEntities('plain'), 'plain') })

import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { callTool, readRpc } from './mcpClient.js'

const serve = (handler) => new Promise((resolve) => { const s = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => handler(req, res, b ? JSON.parse(b) : null)) }); s.listen(0, '127.0.0.1', () => resolve({ s, url: `http://127.0.0.1:${s.address().port}/mcp` })) })

test('reads plain JSON and event-stream answers', () => {
    assert.deepEqual(readRpc('{"jsonrpc":"2.0","id":2,"result":{"a":1}}'), { jsonrpc: '2.0', id: 2, result: { a: 1 } })
    assert.deepEqual(readRpc('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"a":2}}\n\n', 'text/event-stream').result, { a: 2 })
    assert.equal(readRpc('nonsense'), null); assert.equal(readRpc(''), null)
})

test('initialises, then calls the tool with the key and the session, and returns the JSON of the answer', async () => {
    const seen = []
    const { s, url } = await serve((req, res, body) => {
        seen.push([body.method, req.headers.authorization, req.headers['mcp-session-id']])
        if (body.method === 'initialize') { res.setHeader('mcp-session-id', 'S1'); res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-03-26' } })) }
        if (body.method === 'notifications/initialized') { res.statusCode = 202; return res.end() }
        res.setHeader('content-type', 'text/event-stream')
        res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: JSON.stringify({ domain: body.params.arguments.domain, domainAuthority: 26 }) }] } })}\n\n`)
    })
    try {
        const r = await callTool({ url, token: 'K', name: 'domain_overview', args: { domain: 'acme.ma' } })
        assert.deepEqual(r, { domain: 'acme.ma', domainAuthority: 26 })
        assert.deepEqual(seen.map((x) => x[0]), ['initialize', 'notifications/initialized', 'tools/call'])
        assert.ok(seen.every((x) => x[1] === 'Bearer K')); assert.equal(seen[2][2], 'S1')
    } finally { s.close() }
})

test('a refused key and a tool error are told clearly', async () => {
    const a = await serve((req, res) => { res.statusCode = 401; res.end('no') })
    await assert.rejects(callTool({ url: a.url, token: 'bad', name: 'x' }), /refused/)
    a.s.close()
    const b = await serve((req, res, body) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body.method === 'tools/call' ? { jsonrpc: '2.0', id: 2, result: { isError: true, content: [{ type: 'text', text: 'Daily limit reached' }] } } : { jsonrpc: '2.0', id: 1, result: {} })) })
    await assert.rejects(callTool({ url: b.url, token: 'k', name: 'x' }), /Daily limit reached/)
    b.s.close()
})

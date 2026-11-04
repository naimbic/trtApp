/**
 * A minimal MCP client over HTTP (the "streamable HTTP" transport): initialise, then call one tool and read its answer.
 * The answer comes as JSON or as a server-sent event stream; the tool result is the JSON text of the first content block.
 */
const HEAD = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }

/** The JSON-RPC message inside a response (plain JSON, or the `data:` lines of an event stream). */
export function readRpc(text, contentType = '') {
    const t = String(text || '').trim()
    if (!t) return null
    if (/event-stream/i.test(contentType) || /^(event|data):/m.test(t)) {
        const msgs = t.split(/\r?\n\r?\n/).map((b) => b.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n')).filter(Boolean)
        for (const m of msgs) { try { const j = JSON.parse(m); if (j && (j.result !== undefined || j.error)) return j } catch { /* not JSON */ } }
        return null
    }
    try { return JSON.parse(t) } catch { return null }
}

export async function callTool({ url, token, name, args = {}, fetchFn = fetch, timeoutMs = 20000 }) {
    const headers = { ...HEAD, ...(token ? { authorization: `Bearer ${token}` } : {}) }
    const post = async (body, extra = {}) => {
        const res = await fetchFn(url, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) })
        return { res, text: await res.text() }
    }
    const fail = (m, status) => Object.assign(new Error(m), { status })
    const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'trtCRM', version: '1' } } })
    if (init.res.status === 401 || init.res.status === 403) throw fail('The key was refused', 401)
    if (!init.res.ok) throw fail(`The service answered ${init.res.status}`, 502)
    const sid = init.res.headers.get('mcp-session-id')
    const extra = sid ? { 'mcp-session-id': sid } : {}
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, extra).catch(() => {})
    const call = await post({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } }, extra)
    if (call.res.status === 401 || call.res.status === 403) throw fail('The key was refused', 401)
    const msg = readRpc(call.text, call.res.headers.get('content-type') || '')
    if (!msg) throw fail('The service did not answer', 502)
    if (msg.error) throw fail(String(msg.error.message || 'The service refused the request').slice(0, 200), 502)
    if (msg.result?.isError) throw fail(String(msg.result.content?.[0]?.text || 'The service refused the request').slice(0, 200), 502)
    const text = msg.result?.content?.find((c) => c.type === 'text')?.text
    try { return JSON.parse(text) } catch { return text ?? msg.result }
}

#!/usr/bin/env node
/**
 * A stand-in for an OpenAI-compatible AI provider, to try the AI analyses without a real key or credit.
 *   node scripts/fake-ai.mjs                       listens on http://127.0.0.1:4200
 *   AI_BASE_URL_OPENAI=http://127.0.0.1:4200/v1 npx next dev -p 3000     (then add any key in Settings → AI)
 * It answers every question with a short Markdown reading built from the figures it was sent, and refuses any key starting with "bad-key".
 */
import http from 'node:http'
import { pathToFileURL } from 'node:url'

export function startFakeAi({ port = 4200, onRequest } = {}) {
    const server = http.createServer(async (req, res) => {
        let body = ''
        for await (const c of req) body += c
        const send = (status, json) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(json)) }
        const key = (req.headers.authorization || '').replace(/^Bearer /, '')
        onRequest?.({ url: req.url, key, body: body ? JSON.parse(body) : null })
        if (key.startsWith('bad-key')) return send(401, { error: { message: `Incorrect API key provided: ${key}` } })
        if (req.url.endsWith('/models')) return send(200, { data: [{ id: 'fake-model-large' }, { id: 'fake-model-small' }, { id: 'text-embedding-fake' }] })
        if (req.url.endsWith('/chat/completions')) {
            const b = JSON.parse(body)
            if (b.model === 'missing-model') return send(404, { error: { message: 'model not found' } })
            const user = b.messages.find((m) => m.role === 'user')?.content || ''
            const json = user.slice(user.indexOf('{')) // the figures
            let facts = ''
            try { const d = JSON.parse(json); facts = d.total !== undefined ? `Total: ${d.total}.` : d.years ? `Years: ${d.years.map((y) => y.year).join(', ')}.` : '' } catch { /* not JSON */ }
            const asked = /owner also asks[^:]*: ([^\n]+)/.exec(user)?.[1]
            return send(200, { choices: [{ message: { content: `## Summary\n(fake model) I read the figures you sent. ${facts}\n\n## Key numbers\n- sent ${user.length} characters\n\n## What stands out\nNothing: this is a fake provider.\n\n## Risks\nNone.\n\n## Recommended actions\n1. Connect a real provider.${asked ? `\n\nYou asked: ${asked}` : ''}` } }], usage: { prompt_tokens: Math.round(user.length / 4), completion_tokens: 90 } })
        }
        send(404, { error: { message: 'not found' } })
    })
    return new Promise((r) => server.listen(port, '127.0.0.1', () => r({ server, port: server.address().port, close: () => new Promise((x) => server.close(x)) })))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const p = await startFakeAi({ port: Number(process.env.PORT) || 4200 })
    console.log(`Fake AI provider on http://127.0.0.1:${p.port}/v1 (keys starting with "bad-key" are refused). Ctrl+C to stop.`)
}

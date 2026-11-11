import test from 'node:test'
import assert from 'node:assert/strict'
import { swr, dropCache } from './memoCache.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

test('the answer is reused while fresh', async () => {
    dropCache()
    let n = 0
    const load = async () => ++n
    assert.equal(await swr('a', load, { fresh: 1000 }), 1)
    assert.equal(await swr('a', load, { fresh: 1000 }), 1)
    assert.equal(n, 1)
})

test('two people asking at once share one computation', async () => {
    dropCache()
    let n = 0
    const load = async () => { n++; await wait(30); return n }
    const [x, y] = await Promise.all([swr('b', load), swr('b', load)])
    assert.equal(n, 1); assert.equal(x, y)
})

test('a stale answer is returned at once and renewed in the background', async () => {
    dropCache()
    let n = 0
    const load = async () => { n++; await wait(20); return `v${n}` }
    assert.equal(await swr('c', load, { fresh: 5, stale: 5000 }), 'v1')
    await wait(15)
    assert.equal(await swr('c', load, { fresh: 5, stale: 5000 }), 'v1') // old one, no waiting
    await wait(50)
    assert.equal(await swr('c', load, { fresh: 1000, stale: 5000 }), 'v2') // the renewed one
})

test('force computes now; an error is not cached', async () => {
    dropCache()
    let n = 0
    assert.equal(await swr('d', async () => ++n, { fresh: 1000 }), 1)
    assert.equal(await swr('d', async () => ++n, { fresh: 1000, force: true }), 2)
    await assert.rejects(() => swr('e', async () => { throw new Error('boom') }))
    assert.equal(await swr('e', async () => 'ok'), 'ok')
})

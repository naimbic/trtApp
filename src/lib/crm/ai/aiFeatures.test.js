import test from 'node:test'
import assert from 'node:assert/strict'
import { readFeatures, pickFor, AI_FEATURES } from './aiFeatures.js'

const ids = ['anthropic', 'openai', 'deepseek']

test('every feature is on by default, off only when switched off', () => {
    const f = readFeatures({}, ids)
    assert.ok(AI_FEATURES.every((x) => f[x.id].on))
    assert.equal(readFeatures({ ai_feat_email_on: '0' }, ids).email.on, false)
    assert.equal(readFeatures({ ai_feat_email_on: '1' }, ids).email.on, true)
})

test('an unknown provider in the settings is ignored', () => {
    assert.equal(readFeatures({ ai_feat_email_provider: 'nope' }, ids).email.provider, '')
    assert.equal(readFeatures({ ai_feat_email_provider: 'deepseek' }, ids).email.provider, 'deepseek')
})

test('a feature uses its own provider and model, the others follow the default', () => {
    const features = readFeatures({ ai_feat_email_provider: 'deepseek', ai_feat_email_model: 'deepseek-chat', ai_feat_grow_provider: 'anthropic' }, ids)
    const ctx = { provider: 'openai', model: 'gpt-4.1', models: { anthropic: 'claude-x', deepseek: 'ds-default' }, have: ['openai', 'deepseek', 'anthropic'] }
    assert.deepEqual(pickFor('email', features, ctx), { provider: 'deepseek', model: 'deepseek-chat' })
    assert.deepEqual(pickFor('grow', features, ctx), { provider: 'anthropic', model: 'claude-x' }) // its provider, that provider's own model
    assert.deepEqual(pickFor('insights', features, ctx), { provider: 'openai', model: 'gpt-4.1' }) // the default
})

test('a provider without a key falls back to the default; an off feature gives nothing', () => {
    const features = readFeatures({ ai_feat_email_provider: 'deepseek', ai_feat_email_model: 'deepseek-chat', ai_feat_grow_on: '0' }, ids)
    assert.deepEqual(pickFor('email', features, { provider: 'openai', model: 'gpt-4.1', models: {}, have: ['openai'] }), { provider: 'openai', model: 'gpt-4.1' })
    assert.equal(pickFor('grow', features, { provider: 'openai', model: 'm', have: ['openai'] }), null)
})

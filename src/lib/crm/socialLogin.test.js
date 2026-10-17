import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSocialUser, socialProviders } from './socialLogin.js'

const deps = (rows) => ({ findByEmail: async (e) => rows.find((u) => u.email === e) || null, authorityOf: async (u) => ({ authority: ['user'], blocked: u.status === 'staff-inactive' }) })
const ada = { id: 'a1', email: 'ada@x.test', status: 'active' }

test('social: providers are on only when both keys are set', () => {
    assert.deepEqual(socialProviders({}), { google: false, github: false })
    assert.deepEqual(socialProviders({ GOOGLE_AUTH_CLIENT_ID: 'i', GOOGLE_AUTH_CLIENT_SECRET: 's', GITHUB_AUTH_CLIENT_ID: 'i' }), { google: true, github: false })
})
test('social: a verified Google email signs in the account with that email (any letter case)', async () => {
    const r = await resolveSocialUser({ account: { provider: 'google' }, profile: { email: 'ADA@x.test', email_verified: true } }, deps([ada]))
    assert.equal(r.ok, true); assert.equal(r.user.id, 'a1')
})
test('social: an unverified Google email is refused', async () => {
    for (const email_verified of [false, undefined]) assert.deepEqual(await resolveSocialUser({ account: { provider: 'google' }, profile: { email: 'ada@x.test', email_verified } }, deps([ada])), { ok: false, code: 'unverified' })
})
test('social: GitHub hands out its verified email, which signs in the account', async () => {
    assert.equal((await resolveSocialUser({ account: { provider: 'github' }, profile: { email: 'ada@x.test' } }, deps([ada]))).ok, true)
})
test('social: nobody gets an account by having a Google or GitHub login', async () => {
    assert.deepEqual(await resolveSocialUser({ account: { provider: 'github' }, profile: { email: 'stranger@x.test' } }, deps([ada])), { ok: false, code: 'no_account' })
})
test('social: no email, an inactive or a deactivated team member is refused', async () => {
    assert.equal((await resolveSocialUser({ account: { provider: 'github' }, profile: {} }, deps([ada]))).code, 'no_email')
    assert.equal((await resolveSocialUser({ account: { provider: 'github' }, profile: { email: 'ada@x.test' } }, deps([{ ...ada, status: 'inactive' }]))).code, 'blocked')
    assert.equal((await resolveSocialUser({ account: { provider: 'github' }, profile: { email: 'ada@x.test' } }, deps([{ ...ada, status: 'staff-inactive' }]))).code, 'blocked')
})
test('social: the credentials sign-in and unknown providers never go through here', async () => {
    assert.equal((await resolveSocialUser({ account: { provider: 'credentials' }, profile: { email: 'ada@x.test' } }, deps([ada]))).code, 'provider_error')
    assert.equal((await resolveSocialUser({ profile: { email: 'ada@x.test' } }, deps([ada]))).code, 'provider_error')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { FEATURES, cleanPermissions, FEATURE_HINTS } from './permissionCatalog.js'
import { ROLES } from './standardRoles.js'

test('roles: Calendar, Team chat and File manager are permissions every standard role carries', () => {
    for (const k of ['calendar', 'chat', 'file_manager']) {
        assert.ok(FEATURES.some((f) => f.key === k), `${k} is in the catalog`)
        assert.ok(FEATURE_HINTS[k], `${k} has an explanation`)
        for (const [name, perms] of Object.entries(ROLES)) assert.deepEqual(perms[k], ['view'], `${name} has ${k}`)
    }
})
test('roles: a role keeps the tools it was given and drops what does not exist', () => {
    assert.deepEqual(cleanPermissions({ chat: ['view', 'delete'], nothing: ['view'] }), { chat: ['view'] })
})
test('roles: every feature key is unique', () => {
    const keys = FEATURES.map((f) => f.key)
    assert.equal(new Set(keys).size, keys.length)
})

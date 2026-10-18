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

import { IMPLIED_BY } from './capRules.js'

// every action a screen needs from a feature must be grantable: offered by the checklist, implied by another one, or automatic
test('roles: every feature the screens use can be given every action they need', () => {
    for (const [feature, wanted] of Object.entries({ settings: ['view', 'create', 'edit', 'delete'], email_templates: ['view', 'create', 'edit', 'delete'], checklist_templates: ['view', 'create', 'edit', 'delete'] })) {
        const def = FEATURES.find((f) => f.key === feature)
        for (const cap of wanted) assert.ok(def.caps.includes(cap) || IMPLIED_BY[feature]?.[cap], `${feature}.${cap} cannot be granted`)
    }
})
test('roles: every resource feature the app uses exists and can be viewed by someone who is not an administrator', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const dir = new URL('./resources/', import.meta.url)
    for (const f of readdirSync(dir)) for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/ feature: '([a-z_]+)'/g)) {
        if (m[1] === 'asc') continue
        const def = FEATURES.find((x) => x.key === m[1])
        assert.ok(def, `${f}: feature ${m[1]} is not in the permission catalog`)
        assert.ok(def.caps.includes('view') || def.caps.includes('view_own') || IMPLIED_BY[m[1]]?.view || def.auto?.view_own, `${m[1]} cannot be viewed by a non-administrator`)
    }
})

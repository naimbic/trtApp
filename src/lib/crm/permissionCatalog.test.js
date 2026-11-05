import test from 'node:test'
import assert from 'node:assert/strict'
import { FEATURES, PERMISSION_GROUPS, cleanPermissions, FEATURE_HINTS } from './permissionCatalog.js'
import { ROLES } from './standardRoles.js'

test('roles: Calendar, Team chat and File manager are permissions every standard role carries', () => {
    for (const k of ['calendar', 'chat', 'file_manager']) {
        assert.ok(FEATURES.some((f) => f.key === k), `${k} is in the catalog`)
        assert.ok(FEATURE_HINTS[k], `${k} has an explanation`)
        for (const [name, perms] of Object.entries(ROLES)) {
            // the administrator roles also carry every extra switch of the tool (the calendar's "see every event" and "edit events of others")
            if (k === 'calendar' && ['Super Admin', 'Admin'].includes(name)) assert.deepEqual(perms[k], ['view', 'view_all_events', 'edit_others_events', 'close_days'], `${name} has every calendar switch`)
            else if (k === 'chat') assert.deepEqual(perms[k], name === 'Viewer' ? ['view'] : ['view', 'send_files', 'create_groups', 'call', 'client_chats'], `${name} has the chat with its switches (the read-only Viewer only reads)`)
            else assert.deepEqual(perms[k], ['view'], `${name} has ${k}`)
        }
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
test('roles: a resource that is written under another permission names one that exists, and setup items need Settings', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const dir = new URL('./resources/', import.meta.url)
    const seen = []
    for (const f of readdirSync(dir)) for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/writeFeature: '([a-z_]+)'/g)) { seen.push(m[1]); assert.ok(FEATURES.some((x) => x.key === m[1]), `writeFeature ${m[1]} is not in the catalog`) }
    assert.ok(seen.length >= 4, 'the lead setup items (sources, statuses, web-to-lead, email integration) are written under Settings')
})

test('roles: payroll, API keys and AI keys have their own rows and stay off the Admin role', () => {
    for (const k of ['payroll', 'api', 'ai']) {
        assert.ok(FEATURES.some((f) => f.key === k), `${k} is in the catalog`)
        assert.ok(FEATURE_HINTS[k], `${k} has an explanation`)
        assert.equal(ROLES['Super Admin'][k]?.includes('view'), true)
        assert.equal(ROLES.Admin[k], undefined, `Admin does not get ${k} by default`)
        assert.equal(ROLES.Viewer[k], undefined)
    }
})
test('roles: growth can be given team view and approval', () => {
    assert.deepEqual(FEATURES.find((f) => f.key === 'growth').caps, ['view', 'view_team', 'manage'])
    assert.deepEqual(ROLES['Sales Rep'].growth, ['view'])
})

test('roles: chat messages have their own row, and every standard role keeps the message tools (only Admins moderate)', () => {
    assert.deepEqual(FEATURES.find((f) => f.key === 'chat_messages').caps, ['react', 'bookmark', 'pin', 'edit_own', 'delete_own', 'delete_others'])
    for (const [name, perms] of Object.entries(ROLES)) {
        const tools = perms.chat_messages || []
        if (name === 'Viewer') { assert.deepEqual(tools, [], 'the read-only Viewer has no message tool'); continue }
        for (const c of ['react', 'bookmark', 'pin', 'edit_own', 'delete_own']) assert.ok(tools.includes(c), `${name} can ${c}`)
        assert.equal(tools.includes('delete_others'), ['Super Admin', 'Admin'].includes(name), `${name} moderation`)
    }
    assert.ok(FEATURE_HINTS.chat_messages)
})

test('roles: every permission has an explanation in the editor, and the password vault is among the team tools', () => {
    for (const f of FEATURES) assert.ok(FEATURE_HINTS[f.key], `${f.key} has an explanation`)
    const tools = PERMISSION_GROUPS.find((g) => g.group === 'Tools')
    assert.ok(tools.features.some((f) => f.key === 'passwords'), 'the vault is listed under Tools')
})

// Collects the texts that live in data and not in JSX, for the staff dictionaries:
//  - the shared definitions the web app imports (resources, settings registry, permission catalog),
//  - the messages the API answers with (fail('...'), new Error('...'), { error: '...' }).
// Writes web/src/locales/staff/extra-keys.json. Usage: node scripts/i18n-extra-keys.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const esbuild = require('../web/node_modules/esbuild')
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const root = path.resolve('src/lib/crm')
const PROSE = /[A-Za-zÀ-ɏ]{2}/
const TEXT_KEYS = new Set(['label', 'plural', 'section', 'title', 'desc', 'hint', 'ph', 'placeholder', 'description', 'text', 'help', 'name', 'singular'])
const out = new Set()

// 1) shared definitions: bundle them (they use extensionless imports) and walk the objects
const entry = `export * as resources from '${root}/resources/index.js'
export * as registry from '${root}/settings/registry.js'
export * as perms from '${root}/permissionCatalog.js'
export * as nav from '${root}/custom-nav.js'`
const built = await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'js' }, bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': path.resolve('src') } })
const file = '/tmp/i18n-shared-bundle.mjs'
fs.writeFileSync(file, built.outputFiles[0].text)
const mod = await import(file)
const seen = new WeakSet()
const walkObj = (v, key) => {
    if (typeof v === 'string') { if (key && TEXT_KEYS.has(key) && PROSE.test(v)) out.add(v); return }
    if (!v || typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) {
        // [value, label] pairs
        if (v.length === 2 && ['string', 'number'].includes(typeof v[0]) && typeof v[1] === 'string' && PROSE.test(v[1]) && !/^[a-z_]+$/.test(v[1])) out.add(v[1])
        v.forEach((x) => walkObj(x, key))
        return
    }
    for (const [k, x] of Object.entries(v)) walkObj(x, k)
}
walkObj(mod.resources.resources); walkObj(mod.registry.GROUPS); walkObj(mod.registry.SECTIONS); for (const k of ['DATE_FORMATS', 'NUMBER_FORMATS', 'RESET', 'PAGE_FORMATS', 'PDF_FONTS']) walkObj(mod.registry[k])
walkObj(mod.perms.PERMISSION_GROUPS); walkObj(mod.perms.CAPABILITIES); Object.values(mod.perms.EXTRA_LABELS).forEach((s) => out.add(s)); Object.values(mod.perms.FEATURE_HINTS).forEach((s) => out.add(s)); walkObj(mod.nav.customNavItems)
// the tuple pairs inside CAPABILITIES etc. and 'group' names used as headings
for (const r of mod.resources.resources) { if (r.group) out.add(r.group) }

// 2) API messages
const files = []
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(e.name)) files.push(p) } }
walk('src/lib/crm'); walk('src/server'); walk('src/app/api/crm')
for (const f of files) {
    let ast
    try { ast = parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }) } catch { continue }
    traverse(ast, {
        CallExpression(p) { const c = p.node.callee; if (c.type === 'Identifier' && ['fail', 'httpError', 'badRequest'].includes(c.name) && p.node.arguments[0]?.type === 'StringLiteral' && PROSE.test(p.node.arguments[0].value)) out.add(p.node.arguments[0].value) },
        NewExpression(p) { if (p.node.callee.name === 'Error' && p.node.arguments[0]?.type === 'StringLiteral' && PROSE.test(p.node.arguments[0].value)) out.add(p.node.arguments[0].value) },
        ObjectProperty(p) { const k = p.node.key; if ((k.name === 'error' || k.value === 'error') && p.node.value.type === 'StringLiteral' && PROSE.test(p.node.value.value)) out.add(p.node.value.value) },
    })
}
// no template placeholders, no identifiers (textarea, multiselect, #fff ...)
const list = [...out].filter((s) => !/\$\{/.test(s) && !/^[a-z][a-z0-9_.\-/]*$/.test(s) && !/^[#<.\-]/.test(s) && !/^(https?:|\{|\[)/.test(s)).sort()
fs.writeFileSync('web/src/locales/staff/extra-keys.json', JSON.stringify(list, null, 1) + '\n')
console.log(list.length, 'extra texts')

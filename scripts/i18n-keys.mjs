// Lists every text used with tr('...') in the staff area and which language dictionaries lack it.
// Usage: node scripts/i18n-keys.mjs [--missing] [--out file.json]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const root = 'web/src'
const dirs = ['views/crm', 'views/account', 'views/auth', 'views/others', 'auth', 'components/crm', 'components/template', 'components/shared', 'components/layouts', 'components/ui', 'configs', 'utils', 'store'].map((d) => path.join(root, d))
const keys = new Map()
const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx|js)$/.test(e.name)) scan(p) } }
function scan(f) {
    const code = fs.readFileSync(f, 'utf8')
    if (!code.includes('@/utils/t')) return
    let ast
    try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }) } catch { return }
    traverse(ast, { CallExpression(p) { const c = p.node.callee; if (c.type === 'Identifier' && c.name === 'tr' && p.node.arguments[0]?.type === 'StringLiteral') { const k = p.node.arguments[0].value; if (!keys.has(k)) keys.set(k, f) } } })
}
dirs.forEach(walk)
// extra texts that are not in tr() calls (server messages, resource labels...) live in web/src/locales/staff/extra-keys.json
try { for (const k of JSON.parse(fs.readFileSync('web/src/locales/staff/extra-keys.json', 'utf8'))) if (!keys.has(k)) keys.set(k, 'extra') } catch { /* none yet */ }
try { for (const k of JSON.parse(fs.readFileSync('web/src/locales/staff/manual-keys.json', 'utf8'))) if (!keys.has(k)) keys.set(k, 'manual') } catch { /* none */ }
let list = [...keys.keys()].sort()
if (process.argv.includes('--missing')) {
    const have = {}
    for (const l of ['fr', 'es', 'ja', 'ar']) { try { have[l] = new Set(Object.keys((await import(path.resolve(root, `locales/staff/${l}.js`))).default)) } catch { have[l] = new Set() } }
    list = list.filter((k) => ['fr', 'es', 'ja', 'ar'].some((l) => !have[l].has(k)))
}
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/i18n-all.json'
fs.writeFileSync(out, JSON.stringify(list, null, 1))
console.log(list.length, 'texts ->', out)

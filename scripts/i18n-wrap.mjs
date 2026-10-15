// Wraps the visible English texts of the staff area in tr('...') so they can be translated (see web/src/utils/t.js).
// Usage: node scripts/i18n-wrap.mjs [--write] [dir ...]   (without --write it only reports)
// Handles: JSX text, text-like JSX attributes, string literals in conditionals inside JSX, `new Error('..')`, notify('type','..'),
// and the values of keys like label / title / header / placeholder in objects. Template literals are listed for manual work.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const MagicString = require('../web/node_modules/magic-string')

const WRITE = process.argv.includes('--write')
const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const ATTR = new Set(['placeholder', 'title', 'label', 'alt', 'aria-label', 'description', 'confirmText', 'cancelText', 'emptyText', 'tooltip', 'okText', 'header', 'subtitle', 'text', 'noOptionsMessage', 'loadingMessage', 'helperText', 'errorText', 'successText'])
const KEYS = new Set(['label', 'title', 'header', 'placeholder', 'description', 'subtitle', 'emptyText', 'confirmText', 'cancelText', 'tooltip', 'text', 'message', 'hint', 'helper', 'empty', 'heading', 'caption', 'summary', 'tab', 'badge', 'button', 'cta'])
const CALLS = new Set(['notify', 'setError', 'setErr', 'setMessage', 'setMsg', 'setFeedback', 'toast', 'showError', 'showSuccess'])
const PROSE = /[A-Za-zÀ-ɏ]{2}/
// 'tr' may be our own import, but not a local variable or parameter
const clash = (scope) => { const b = scope.getBinding('tr'); return !!b && b.kind !== 'module' }
const files = []
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx|js)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) files.push(p) } }
dirs.forEach(walk)

const stats = { files: 0, edits: 0, skipped: [], templates: [] }
const keys = new Set()
for (const file of files) {
    const code = fs.readFileSync(file, 'utf8')
    const hasImport = /from '@\/utils\/t'/.test(code)
    let ast
    try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }) } catch (e) { stats.skipped.push(`${file}: parse ${e.message}`); continue }
    const ms = new MagicString(code)
    const done = new Set()
    let n = 0
    let blocked = false
    const wrapRange = (start, end, text) => { if (done.has(start)) return; done.add(start); ms.overwrite(start, end, `tr(${JSON.stringify(text)})`); keys.add(text); n++ }
    const wrapExpr = (node, scope) => {
        if (!node) return
        if (node.type === 'StringLiteral') { if (PROSE.test(node.value)) { if (clash(scope)) { blocked = true; return } wrapRange(node.start, node.end, node.value) } }
        else if (node.type === 'ConditionalExpression') { wrapExpr(node.consequent, scope); wrapExpr(node.alternate, scope) }
        else if (node.type === 'LogicalExpression') { wrapExpr(node.right, scope) }
        else if (node.type === 'TemplateLiteral' && node.expressions.length && node.quasis.some((q) => PROSE.test(q.value.cooked))) {
            // `Delete ${name}?` -> tr('Delete {name}?', { name }); plural tricks like `file${n === 1 ? '' : 's'}` are left for hand work
            const plural = node.expressions.some((x) => x.type === 'ConditionalExpression' && x.consequent.type === 'StringLiteral' && x.alternate.type === 'StringLiteral' && (x.consequent.value === '' || x.alternate.value === ''))
            if (plural || clash(scope)) { stats.templates.push(`${file}:${node.loc.start.line} ${code.slice(node.start, node.end).slice(0, 90)}`); return }
            const names = []
            const vars = node.expressions.map((x, i) => {
                let nm = x.type === 'Identifier' ? x.name : x.type === 'MemberExpression' && !x.computed && x.property.type === 'Identifier' ? x.property.name : x.type === 'OptionalMemberExpression' && x.property.type === 'Identifier' ? x.property.name : `v${i + 1}`
                while (names.includes(nm)) nm += '_'
                names.push(nm)
                return `${nm}: ${code.slice(x.start, x.end)}`
            })
            let text = ''
            node.quasis.forEach((q, i) => { text += q.value.cooked + (i < names.length ? `{${names[i]}}` : '') })
            if (!done.has(node.start)) { done.add(node.start); ms.overwrite(node.start, node.end, `tr(${JSON.stringify(text)}, { ${vars.join(', ')} })`); keys.add(text); n++ }
        }
    }
    traverse(ast, {
        JSXText(p) {
            const v = p.node.value.replace(/\s+/g, ' ').trim()
            if (!PROSE.test(v)) return
            const parent = p.parent?.openingElement?.name?.name
            if (['code', 'pre', 'style', 'script'].includes(parent)) return
            if (clash(p.scope)) { blocked = true; return }
            const raw = code.slice(p.node.start, p.node.end)
            const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0]
            if (done.has(p.node.start)) return
            done.add(p.node.start)
            ms.overwrite(p.node.start, p.node.end, `${lead}{tr(${JSON.stringify(v)})}${trail}`)
            keys.add(v); n++
        },
        JSXAttribute(p) {
            const nm = p.node.name.name
            if (typeof nm !== 'string' || !ATTR.has(nm)) return
            const v = p.node.value
            if (v?.type === 'StringLiteral' && PROSE.test(v.value)) {
                if (clash(p.scope)) { blocked = true; return }
                if (done.has(v.start)) return
                done.add(v.start)
                ms.overwrite(v.start, v.end, `{tr(${JSON.stringify(v.value)})}`)
                keys.add(v.value); n++
            } else if (v?.type === 'JSXExpressionContainer') wrapExpr(v.expression, p.scope)
        },
        JSXExpressionContainer(p) { if (p.parent.type === 'JSXElement' || p.parent.type === 'JSXFragment') wrapExpr(p.node.expression, p.scope) },
        NewExpression(p) { if (p.node.callee.name === 'Error' && p.node.arguments[0]?.type === 'StringLiteral') wrapExpr(p.node.arguments[0], p.scope) },
        CallExpression(p) {
            const c = p.node.callee
            const name = c.type === 'Identifier' ? c.name : null
            if (!name || !CALLS.has(name)) return
            const args = p.node.arguments
            const target = name === 'notify' ? args[1] : args[0]
            if (target?.type === 'StringLiteral') wrapExpr(target, p.scope)
        },
        ObjectProperty(p) {
            const k = p.node.key
            const nm = k.type === 'Identifier' ? k.name : k.type === 'StringLiteral' ? k.value : null
            if (!nm || !KEYS.has(nm) || p.node.computed) return
            if (p.node.value.type === 'StringLiteral' || p.node.value.type === 'ConditionalExpression') wrapExpr(p.node.value, p.scope)
        },
    })
    if (blocked) stats.skipped.push(`${file}: 'tr' is already a variable in some scope (partly wrapped)`)
    if (!n) continue
    stats.files++; stats.edits += n
    if (WRITE) {
        const imports = ast.program.body.filter((b) => b.type === 'ImportDeclaration')
        // end of the last import's line (after a CR when the file uses CRLF)
        let at = imports.length ? imports[imports.length - 1].end : 0
        if (code[at] === '\r') at++
        if (!hasImport) ms.appendLeft(at, `${imports.length ? '\n' : ''}import { tr } from '@/utils/t'${imports.length ? '' : '\n'}`)
        fs.writeFileSync(file, ms.toString())
    }
}
fs.writeFileSync('/tmp/i18n-keys.json', JSON.stringify([...keys].sort(), null, 1))
fs.writeFileSync('/tmp/i18n-templates.txt', stats.templates.join('\n'))
console.log(JSON.stringify({ files: stats.files, edits: stats.edits, unique: keys.size, skipped: stats.skipped.length, templates: stats.templates.length }))
if (stats.skipped.length) console.log(stats.skipped.slice(0, 20).join('\n'))

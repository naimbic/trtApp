// Lists English-looking string literals in the staff area that are not wrapped in tr() yet, to review by hand.
// Usage: node scripts/i18n-scan.mjs [dir ...]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const argDirs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dirs = argDirs.length ? argDirs : ['views/crm', 'views/account', 'views/auth', 'views/others', 'components/crm', 'components/template', 'components/shared', 'components/layouts'].map((d) => path.join('web/src', d))
const SKIP_KEYS = new Set(['type', 'key', 'value', 'id', 'to', 'path', 'className', 'icon', 'color', 'variant', 'size', 'shape', 'name', 'href', 'src', 'method', 'mode', 'kind', 'status', 'state', 'field', 'sort', 'order', 'format', 'render', 'resource', 'model', 'feature', 'cap', 'tab', 'view', 'role', 'target', 'rel', 'autoComplete', 'inputMode', 'htmlFor', 'width', 'height', 'placement', 'align', 'justify', 'position', 'fill', 'stroke', 'style', 'tone', 'dir', 'lang', 'locale', 'currency', 'unit', 'accept', 'pattern', 'step', 'min', 'max', 'rows', 'cols', 'contentType', 'credentials', 'cache', 'action', 'event', 'level', 'scope', 'slug', 'code', 'bg', 'fg', 'tag', 'badge', 'link'])
const ATTR_OK = new Set(['placeholder', 'title', 'label', 'alt', 'aria-label', 'description', 'confirmText', 'cancelText', 'emptyText', 'tooltip', 'header', 'subtitle', 'text'])
const MagicString = require('../web/node_modules/magic-string')
const WRITE = process.argv.includes('--write')
const EXCLUDE = (f, v) => /settings\/tokens\.js$/.test(f) || /^[A-Z][a-z]+\/[A-Za-z_]+$/.test(v) || /^[DMYHhmsAa :,\-\/.]+$/.test(v) || ['Files', 'AbortError', 'NotAllowedError', 'Morocco', 'Casablanca', 'Atlas Studio SARL'].includes(v)
const out = []
const files = []
const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx|js)$/.test(e.name)) files.push(p) } }
dirs.forEach(walk)
const UIISH = /^[A-Z][A-Za-z0-9&'’\-\/\. ,:()%+#!?…“”]{2,}$/
for (const f of files) {
    const code = fs.readFileSync(f, 'utf8')
    let ast
    try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }) } catch { continue }
    const ms = new MagicString(code)
    let n = 0
    traverse(ast, {
        StringLiteral(p) {
            const v = p.node.value
            if (!UIISH.test(v) || /^[A-Z_]+$/.test(v) || /^[A-Z][a-z]+[A-Z]/.test(v) || /^[A-Z]{2,4}$/.test(v)) return
            const par = p.parent
            if (par.type === 'ImportDeclaration' || par.type === 'ExportNamedDeclaration' || par.type === 'ExportAllDeclaration') return
            // inside tr('...')
            if (par.type === 'CallExpression' && par.callee.name === 'tr') return
            if (par.type === 'CallExpression' && ['trn', 'require', 'cn', 'classNames', 'dayjs', 'format', 'import', 'localStorage', 'getItem', 'setItem', 'fetch', 'api', 'Number', 'String', 'querySelector', 'getElementById', 'addEventListener', 'removeEventListener', 'createElement', 'useRef', 'useState'].includes(par.callee.name || par.callee.property?.name)) return
            if (par.type === 'JSXAttribute') { if (!ATTR_OK.has(par.name.name)) return }
            if (par.type === 'ObjectProperty') { const k = par.key.name || par.key.value; if (par.value === p.node && (SKIP_KEYS.has(k) || par.computed)) return; if (par.key === p.node) return }
            if (par.type === 'BinaryExpression' || par.type === 'SwitchCase' || par.type === 'MemberExpression') return
            if (par.type === 'AssignmentPattern' && /^[a-z]+$/i.test(v) && v.length < 8) return
            if (par.type === 'JSXAttribute' && p.node.value === v) { /* ok */ }
            if (EXCLUDE(f, v)) return
            out.push(`${f.replace('web/src/', '')}:${p.node.loc.start.line}\t${par.type}\t${v}`)
            if (WRITE) { ms.overwrite(p.node.start, p.node.end, par.type === 'JSXAttribute' ? `{tr(${JSON.stringify(v)})}` : `tr(${JSON.stringify(v)})`); n++ }
        },
    })
    if (WRITE && n) {
        if (!/from '@\/utils\/t'/.test(code)) {
            const imports = ast.program.body.filter((b) => b.type === 'ImportDeclaration')
            let at = imports.length ? imports[imports.length - 1].end : 0
            if (code[at] === '\r') at++
            ms.appendLeft(at, `${imports.length ? '\n' : ''}import { tr } from '@/utils/t'${imports.length ? '' : '\n'}`)
        }
        fs.writeFileSync(f, ms.toString())
    }
}
fs.writeFileSync('/tmp/i18n-scan.txt', out.join('\n'))
console.log(out.length, 'candidates -> /tmp/i18n-scan.txt')

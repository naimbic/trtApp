// Second, broader pass: wraps prose in any JSX attribute that is not technical, values of object properties that are not
// technical keys (series names, labels under other names) and template literals made of words and expressions.
// Usage: node scripts/i18n-broad.mjs [--write] [dir ...]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const MagicString = require('../web/node_modules/magic-string')
const WRITE = process.argv.includes('--write')
const argDirs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dirs = argDirs.length ? argDirs : ['views/crm', 'views/account', 'views/auth', 'views/others', 'components/crm', 'components/template', 'components/shared', 'components/layouts'].map((d) => path.join('web/src', d))
const NOT_ATTR = new Set(['className', 'key', 'to', 'type', 'variant', 'id', 'name', 'value', 'href', 'src', 'icon', 'size', 'shape', 'color', 'tone', 'accent', 'mode', 'format', 'style', 'ref', 'htmlFor', 'rel', 'target', 'method', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'role', 'autoComplete', 'inputMode', 'dir', 'lang', 'accept', 'pattern', 'step', 'min', 'max', 'rows', 'cols', 'placement', 'position', 'align', 'justify', 'layout', 'direction', 'kind', 'status', 'state', 'field', 'resource', 'model', 'feature', 'cap', 'tab', 'view', 'scope', 'slug', 'code', 'unit', 'currency', 'locale', 'mask', 'csvName', 'droppableId', 'draggableId', 'eventKey', 'defaultValue', 'defaultActiveKey', 'activeKey', 'trigger', 'on', 'as', 'component', 'api', 'url', 'endpoint', 'path', 'dataKey', 'labelKey', 'valueKey', 'sort', 'order', 'bg', 'border', 'text'])
const NOT_KEY = new Set([...NOT_ATTR, 'render', 'link', 'badge', 'tag', 'title', 'label', 'header', 'placeholder', 'description', 'subtitle'])
const KEEP = (f, v) => /settings\/tokens\.js$/.test(f) || /^[A-Z][a-z]+\/[A-Za-z_]+$/.test(v) || /^[DMYHhmsAa :,\-\/.]+$/.test(v) || /^(Files|AbortError|NotAllowedError|Morocco|Casablanca|Atlas Studio SARL|Content-Type|Cache-Control|GET|POST|PUT|PATCH|DELETE)$/.test(v)
const CSS = /(\b(flex|grid|block|hidden|inline|absolute|relative|fixed|sticky|truncate|uppercase|italic|underline)\b|\b(text|bg|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|w|h|min|max|border|rounded|ring|shadow|hover|dark|sm|md|lg|xl|space|divide|items|justify|font|leading|tracking|opacity|z|top|left|right|bottom|col|row|order|cursor|transition|duration|ease|animate|overflow|object)-)/
const SAFE_CALLEES = new Set(['fetch', 'api', 'dayjs', 'format', 'querySelector', 'querySelectorAll', 'getElementById', 'getItem', 'setItem', 'removeItem', 'cn', 'classNames', 'require', 'import', 'push', 'navigate', 'open', 'createElement', 'RegExp', 'Number', 'parseInt', 'encodeURIComponent', 'log', 'warn', 'error', 'matches', 'closest', 'includes', 'startsWith', 'endsWith', 'indexOf', 'split', 'join', 'replace', 'toLocaleString', 'toLocaleDateString', 'sort', 'localeCompare', 'getAttribute', 'setAttribute', 'assign', 'post', 'patch', 'del', 'put', 'get', 'useNavigate', 'useRef', 'Date', 'URL', 'URLSearchParams', 'resize'])
const files = []
const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx|js)$/.test(e.name)) files.push(p) } }
dirs.forEach(walk)
const clash = (scope) => { const b = scope.getBinding('tr'); return !!b && b.kind !== 'module' }
const PROSE_STR = /^[A-ZÀ-Þ][A-Za-z0-9&'’\-\/\. ,:;()%+#!?…“”·→—@*]{2,}$/
let total = 0
const rows = []
for (const f of files) {
    const code = fs.readFileSync(f, 'utf8')
    let ast
    try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }) } catch { continue }
    const ms = new MagicString(code)
    const done = new Set()
    let n = 0
    const wrap = (node, text, isAttr) => {
        if (done.has(node.start)) return
        done.add(node.start)
        rows.push(`${f.replace('web/src/', '')}:${node.loc.start.line}\t${text.slice(0, 90)}`)
        if (WRITE) ms.overwrite(node.start, node.end, isAttr ? `{tr(${JSON.stringify(text)})}` : `tr(${typeof node.value === 'string' ? JSON.stringify(text) : text})`)
        n++
    }
    traverse(ast, {
        StringLiteral(p) {
            const v = p.node.value
            const par = p.parent
            if (!PROSE_STR.test(v) || CSS.test(v) || KEEP(f, v) || clash(p.scope)) return
            if (/^[A-Z][A-Z0-9_ ]+$/.test(v) || /^[A-Z][a-z]+[A-Z]/.test(v)) return
            if (par.type === 'JSXAttribute') { if (NOT_ATTR.has(par.name.name)) return; wrap(p.node, v, true) }
            else if ((par.type === 'ConditionalExpression' && par.test !== p.node) || (par.type === 'LogicalExpression' && par.right === p.node)) {
                // {cond ? 'text' : 'other'} / {cond && 'text'} inside JSX children or a non-technical attribute
                const box = p.findParent((x) => x.isJSXExpressionContainer())
                if (!box) return
                const up = box.parent
                if (up.type === 'JSXAttribute' && NOT_ATTR.has(up.name.name)) return
                if (up.type !== 'JSXAttribute' && up.type !== 'JSXElement' && up.type !== 'JSXFragment') return
                if (!/\s/.test(v) && v.length < 4) return
                wrap(p.node, v, false)
            }
            else if (par.type === 'ObjectProperty' && par.value === p.node && !par.computed) { const k = par.key.name || par.key.value; if (NOT_KEY.has(k)) return; wrap(p.node, v, false) }
        },
        TemplateLiteral(p) {
            const node = p.node
            if (!node.expressions.length || clash(p.scope)) return
            const par = p.parent
            if (par.type === 'TaggedTemplateExpression') return
            if (par.type === 'JSXAttribute' || (par.type === 'JSXExpressionContainer' && p.parentPath.parent.type === 'JSXAttribute' && NOT_ATTR.has(p.parentPath.parent.name.name))) return
            if (par.type === 'JSXExpressionContainer' && p.parentPath.parent.type === 'JSXAttribute' && NOT_ATTR.has(p.parentPath.parent.name.name)) return
            if (par.type === 'MemberExpression' || par.type === 'BinaryExpression') return
            if (par.type === 'CallExpression' && (SAFE_CALLEES.has(par.callee.name) || SAFE_CALLEES.has(par.callee.property?.name))) return
            if (par.type === 'ObjectProperty' && par.value === node) { const k = par.key.name || par.key.value; if (NOT_KEY.has(k) && !['title', 'label', 'header', 'placeholder', 'description', 'subtitle'].includes(k)) return }
            const joined = node.quasis.map((q) => q.value.cooked).join('')
            if (/^\s*(\/|https?:|#|\?)/.test(joined) || CSS.test(joined)) return
            if (/settings\/tokens\.js$/.test(f) || /^[&?\/]/.test(joined.trim()) || /\.(csv|png|jpg|webp|pdf|zip|ext)\b|^[a-z]+-$/i.test(joined.trim()) || !/[A-Za-z]{4,}/.test(joined)) return
            if (/^[a-z]+\(|\.svg|notif\.|voice-|themeConfig|^DRAFT$|^\s*$/.test(joined.trim()) || /DRAFT$/.test(joined)) return
            if (!/[A-Za-z]{3,}/.test(joined) || /^[A-Za-z_]+[:=]/.test(joined.trim()) && /^[a-z]/.test(joined.trim())) return
            const plural = node.expressions.some((x) => x.type === 'ConditionalExpression' && x.consequent.type === 'StringLiteral' && x.alternate.type === 'StringLiteral' && (x.consequent.value === '' || x.alternate.value === ''))
            if (plural) { rows.push(`PLURAL ${f.replace('web/src/', '')}:${node.loc.start.line}`); return }
            const names = []
            const vars = node.expressions.map((x, i) => {
                let nm = x.type === 'Identifier' ? x.name : x.type === 'MemberExpression' && !x.computed && x.property.type === 'Identifier' ? x.property.name : `v${i + 1}`
                if (!/^[A-Za-z_]\w*$/.test(nm)) nm = `v${i + 1}`
                while (names.includes(nm)) nm += '_'
                names.push(nm)
                return `${nm}: ${code.slice(x.start, x.end)}`
            })
            let text = ''
            node.quasis.forEach((q, i) => { text += q.value.cooked + (i < names.length ? `{${names[i]}}` : '') })
            if (done.has(node.start)) return
            done.add(node.start)
            rows.push(`${f.replace('web/src/', '')}:${node.loc.start.line}\tTPL ${text.slice(0, 90)}`)
            if (WRITE) ms.overwrite(node.start, node.end, `tr(${JSON.stringify(text)}, { ${vars.join(', ')} })`)
            n++
        },
    })
    if (!n) continue
    total += n
    if (WRITE) {
        if (!/from '@\/utils\/t'/.test(code)) {
            const imports = ast.program.body.filter((b) => b.type === 'ImportDeclaration')
            let at = imports.length ? imports[imports.length - 1].end : 0
            if (code[at] === '\r') at++
            ms.appendLeft(at, `${imports.length ? '\n' : ''}import { tr } from '@/utils/t'${imports.length ? '' : '\n'}`)
        }
        fs.writeFileSync(f, ms.toString())
    }
}
fs.writeFileSync('/tmp/i18n-broad.txt', rows.join('\n'))
console.log(total, 'edits ->', '/tmp/i18n-broad.txt')

// Minimal, dependency-free parser for `mysqldump` output (CREATE TABLE + INSERT ... VALUES).
// Values come back as strings (numbers kept verbatim) or null — exactly what mappers expect.

const ESC = { n: '\n', r: '\r', t: '\t', '0': '\0', b: '\b', Z: '\x1a' }

/** Split the dump into top-level statements, honouring quotes and comments. */
export function* statements(text) {
    const n = text.length
    let i = 0
    let start = 0
    while (i < n) {
        const c = text[i]
        if (c === "'" || c === '"' || c === '`') {
            const q = c
            i++
            while (i < n) {
                if (text[i] === '\\' && q !== '`') i += 2
                else if (text[i] === q) {
                    if (text[i + 1] === q) i += 2
                    else break
                } else i++
            }
            i++
        } else if (c === '-' && text[i + 1] === '-' && (text[i + 2] === ' ' || text[i + 2] === '\n')) {
            while (i < n && text[i] !== '\n') i++
            if (start === i) start = i
        } else if (c === '#') {
            while (i < n && text[i] !== '\n') i++
        } else if (c === '/' && text[i + 1] === '*') {
            const end = text.indexOf('*/', i + 2)
            i = end === -1 ? n : end + 2
        } else if (c === ';') {
            const s = text.slice(start, i).trim()
            if (s) yield s
            i++
            start = i
        } else i++
    }
    const tail = text.slice(start).trim()
    if (tail) yield tail
}

/** Parse the VALUES tuples portion into arrays. */
export function parseTuples(s, pos = 0) {
    const rows = []
    const n = s.length
    let i = pos
    const skipWs = () => { while (i < n && /\s/.test(s[i])) i++ }
    while (i < n) {
        skipWs()
        if (s[i] === ',') { i++; continue }
        if (s[i] !== '(') break
        i++
        const row = []
        while (i < n) {
            skipWs()
            const c = s[i]
            if (c === "'") {
                i++
                let out = ''
                while (i < n) {
                    const ch = s[i]
                    if (ch === '\\') {
                        const nx = s[i + 1]
                        out += nx in ESC ? ESC[nx] : nx
                        i += 2
                    } else if (ch === "'") {
                        if (s[i + 1] === "'") { out += "'"; i += 2 } else { i++; break }
                    } else { out += ch; i++ }
                }
                row.push(out)
            } else {
                let j = i
                while (j < n && s[j] !== ',' && s[j] !== ')') j++
                const raw = s.slice(i, j).trim()
                i = j
                if (/^null$/i.test(raw)) row.push(null)
                else if (/^0x[0-9a-f]+$/i.test(raw)) row.push(Buffer.from(raw.slice(2), 'hex').toString('utf8'))
                else row.push(raw.replace(/^_binary\s+/i, ''))
            }
            skipWs()
            if (s[i] === ',') { i++; continue }
            if (s[i] === ')') { i++; break }
        }
        rows.push(row)
    }
    return rows
}

const unq = (s) => s.replace(/^`|`$/g, '')

/**
 * Walk a dump. Yields:
 *  { type:'table', table, columns:[names], pk:[names] }
 *  { type:'rows',  table, columns:[names], rows:[[values]] }
 */
export function* parseDump(text, prefix = 'tbl') {
    const tables = new Map()
    const strip = (name) => (prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name)
    for (const st of statements(text)) {
        if (/^CREATE\s+TABLE/i.test(st)) {
            const m = st.match(/^CREATE\s+TABLE\s+(?:IF NOT EXISTS\s+)?`([^`]+)`\s*\(([\s\S]*)\)[^)]*$/i)
            if (!m) continue
            const name = strip(m[1])
            const body = m[2]
            const columns = []
            let pk = []
            for (const line of body.split(/,\s*\n/)) {
                const l = line.trim()
                const col = l.match(/^`([^`]+)`/)
                if (col) columns.push(col[1])
                const p = l.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i)
                if (p) pk = p[1].split(',').map((x) => unq(x.trim().replace(/\(\d+\)$/, '')))
            }
            tables.set(name, { columns, pk })
            yield { type: 'table', table: name, columns, pk }
        } else if (/^INSERT\s+/i.test(st)) {
            const m = st.match(/^INSERT\s+(?:IGNORE\s+)?INTO\s+`([^`]+)`\s*(\(([^)]*)\))?\s*VALUES\s*/i)
            if (!m) continue
            const name = strip(m[1])
            const columns = m[3] ? m[3].split(',').map((c) => unq(c.trim())) : tables.get(name)?.columns
            if (!columns) throw new Error(`No column list for ${name} (CREATE TABLE not seen before INSERT)`)
            yield { type: 'rows', table: name, columns, rows: parseTuples(st, m[0].length) }
        }
    }
}

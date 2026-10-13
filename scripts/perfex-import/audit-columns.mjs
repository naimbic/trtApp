#!/usr/bin/env node
// Audits the importer mappers against a real dump: lists every column a mapper READS that does not exist
// in the real table (those silently become null/undefined), plus real columns no mapper reads.
// Read-only. Usage: node scripts/perfex-import/audit-columns.mjs /path/to/dump.sql [--prefix tbl]
import fs from 'node:fs'
import { parseDump } from './sql.mjs'
import mappers from './tables/index.mjs'

const file = process.argv[2]
const prefix = process.argv.includes('--prefix') ? process.argv[process.argv.indexOf('--prefix') + 1] : 'tbl'
if (!file) {
    console.error('usage: audit-columns.mjs <dump.sql> [--prefix tbl]')
    process.exit(1)
}

const missing = {} // table -> Set(columns read but absent)
const unread = {} // table -> Set(real columns never read)
for (const ev of parseDump(fs.readFileSync(file, 'utf8'), prefix)) {
    if (ev.type !== 'rows' && !ev.rows) continue
    const { table, columns, rows } = ev
    const mapper = mappers[table]
    if (!mapper || !rows?.length) continue
    const real = new Set(columns)
    const read = new Set()
    for (const values of rows.slice(0, 200)) {
        const row = Object.fromEntries(columns.map((c, i) => [c, values[i] ?? null]))
        const proxy = new Proxy(row, { get: (t, k) => (typeof k === 'string' && (read.add(k), true), t[k]) })
        try { mapper.map(proxy) } catch { /* mapper errors are reported by run.mjs */ }
    }
    const bad = [...read].filter((c) => !real.has(c))
    if (bad.length) missing[table] = new Set(bad)
    const idle = columns.filter((c) => !read.has(c))
    if (idle.length) unread[table] = new Set(idle)
}

console.log('=== Columns READ by mappers that do NOT exist in the real dump (fix these) ===')
const tabs = Object.keys(missing)
if (!tabs.length) console.log('none')
for (const t of tabs) console.log(`${t}: ${[...missing[t]].join(', ')}`)
console.log('\n=== Real columns never read by a mapper (data not imported into typed fields) ===')
for (const t of Object.keys(unread)) console.log(`${t}: ${[...unread[t]].join(', ')}`)

#!/usr/bin/env node
/**
 * Perfex (MySQL dump) -> trtApp (MongoDB via Prisma) importer.
 *
 *   node scripts/perfex-import/run.mjs <dump.sql> [--apply] [--prefix tbl] [--only a,b]
 *        [--skip a,b] [--keep-passwords] [--report report.json]
 *
 * Default is a DRY RUN: parses everything, runs every mapper, prints per-table counts and
 * writes a report — nothing touches the database. `--apply` writes (idempotent: rows have
 * deterministic ids, existing ids are replaced). Tables without a typed mapper are stored
 * verbatim in crm_legacy_rows so no data is lost.
 */
import fs from 'node:fs'
import { parseDump } from './sql.mjs'
import mappers from './tables/index.mjs'
import { oid } from './lib.mjs'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const flag = (n) => args.includes(`--${n}`)
const opt = (n, d) => {
    const i = args.indexOf(`--${n}`)
    return i >= 0 && args[i + 1] ? args[i + 1] : d
}
if (!file) {
    console.error('usage: run.mjs <dump.sql> [--apply] [--prefix tbl] [--only a,b] [--skip a,b] [--keep-passwords] [--report file]')
    process.exit(1)
}
const apply = flag('apply')
const prefix = opt('prefix', 'tbl')
const only = opt('only', '')?.split(',').filter(Boolean)
const skip = new Set(opt('skip', 'sessions')?.split(',').filter(Boolean))
const keepPasswords = flag('keep-passwords')
const reportFile = opt('report', 'perfex-import-report.json')
const BATCH = 500

// Secrets are dropped unless explicitly kept.
const SECRET_FIELDS = ['passwordHash', 'token', 'apiKey', 'newPassMessage', 'resetKey']

const SECRET_OPTION = /(password|secret|token|api[_-]?key|private[_-]?key|smtp_pass|oauth|stripe_.*key|paypal_.*(secret|key))/i
const scrub = (data, model) => {
    if (keepPasswords) return data
    for (const f of SECRET_FIELDS) if (f in data) data[f] = null
    // settings rows can hold SMTP / gateway secrets in `value`
    if (model === 'crmOption' && SECRET_OPTION.test(data.name || '')) data.value = null
    return data
}

const text = fs.readFileSync(file, 'utf8')
const tables = new Map() // name -> { columns, pk }
const report = { file, apply, startedAt: new Date().toISOString(), tables: {} }
const buffers = new Map() // model|legacy -> rows

let prisma = null
if (apply) {
    const mod = await import('@prisma/client')
    prisma = new mod.PrismaClient()
}

const flush = async (key, rows, force = false) => {
    if (!rows.length || (!force && rows.length < BATCH)) return
    const batch = rows.splice(0, rows.length)
    if (!apply) return
    const delegate = key === '__legacy' ? prisma.crmLegacyRow : prisma[key]
    const ids = batch.map((r) => r.id).filter(Boolean)
    if (ids.length) await delegate.deleteMany({ where: { id: { in: ids } } })
    await delegate.createMany({ data: batch })
}

const stat = (t) => (report.tables[t] ||= { source: 0, mapped: 0, legacy: 0, skipped: 0, errors: [] })

for (const ev of parseDump(text, prefix)) {
    if (ev.type === 'table') {
        tables.set(ev.table, ev)
        continue
    }
    const { table, columns, rows } = ev
    if (skip.has(table) || (only?.length && !only.includes(table))) continue
    const st = stat(table)
    const mapper = mappers[table]
    const pk = tables.get(table)?.pk || []
    for (const values of rows) {
        st.source++
        const row = Object.fromEntries(columns.map((c, i) => [c, values[i] ?? null]))
        try {
            if (mapper) {
                const data = mapper.map(row)
                if (!data) { st.skipped++; continue }
                const key = mapper.model
                if (!buffers.has(key)) buffers.set(key, [])
                buffers.get(key).push(scrub(data, key))
                st.mapped++
                await flush(key, buffers.get(key))
            } else {
                const legacyId = pk.length ? pk.map((c) => row[c]).join(':') : String(st.source)
                const data = { id: oid(`legacy:${table}`, legacyId), table, legacyId, data: row }
                if (!buffers.has('__legacy')) buffers.set('__legacy', [])
                buffers.get('__legacy').push(data)
                st.legacy++
                await flush('__legacy', buffers.get('__legacy'))
            }
        } catch (e) {
            if (st.errors.length < 5) st.errors.push(`${e.message} (row ${st.source})`)
            st.skipped++
        }
    }
}
for (const [key, rows] of buffers) await flush(key, rows, true)

report.finishedAt = new Date().toISOString()
const totals = Object.values(report.tables).reduce(
    (a, t) => ({ source: a.source + t.source, mapped: a.mapped + t.mapped, legacy: a.legacy + t.legacy, skipped: a.skipped + t.skipped }),
    { source: 0, mapped: 0, legacy: 0, skipped: 0 },
)
report.totals = totals
report.unmappedTables = Object.entries(report.tables).filter(([, t]) => t.legacy).map(([n]) => n)
const unseen = Object.keys(mappers).filter((t) => !report.tables[t])
report.mappersWithoutData = unseen

if (apply) {
    // verification: compare written counts with expectations
    for (const [t, st] of Object.entries(report.tables)) {
        const m = mappers[t]
        if (m && st.mapped) {
            const n = await prisma[m.model].count()
            st.dbCount = n
            if (n < st.mapped) st.errors.push(`db has ${n} < mapped ${st.mapped}`)
        }
    }
    await prisma.$disconnect()
}

fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
console.log(`${apply ? 'APPLIED' : 'DRY RUN'}  source=${totals.source} mapped=${totals.mapped} legacy=${totals.legacy} skipped=${totals.skipped}`)
for (const [t, s] of Object.entries(report.tables)) {
    if (s.skipped || s.errors.length) console.log(`  ! ${t}: skipped=${s.skipped} ${s.errors[0] || ''}`)
}
console.log(`report: ${reportFile}`)

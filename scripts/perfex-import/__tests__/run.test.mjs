// End-to-end dry-run on a tiny synthetic dump.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfx-'))
const sql = path.join(dir, 'd.sql')
fs.writeFileSync(sql, `
CREATE TABLE \`tblmystery\` (\`id\` int NOT NULL, \`v\` varchar(10), PRIMARY KEY (\`id\`)) ENGINE=InnoDB;
INSERT INTO \`tblmystery\` VALUES (1,'a'),(2,'b');
`)
const rep = path.join(dir, 'r.json')
execFileSync('node', ['scripts/perfex-import/run.mjs', sql, '--report', rep], { stdio: 'pipe' })
const r = JSON.parse(fs.readFileSync(rep, 'utf8'))
assert.equal(r.tables.mystery.legacy, 2)
assert.deepEqual(r.unmappedTables, ['mystery'])
console.log('run.test.mjs ok')

import test from 'node:test'
import assert from 'node:assert/strict'
import { backupKey, backupDay, pickDeletes, backupLate, ymdOf } from './backupCalc.js'

const NOW = Date.UTC(2026, 10, 6, 12) // Fri 6 Nov 2026
const k = (y, m, d) => backupKey(Date.UTC(y, m - 1, d))

test('a key carries its day', () => {
    assert.equal(backupKey(NOW), 'backups/trtcrm-2026-11-06.ndjson.gz')
    assert.equal(ymdOf(backupDay(backupKey(NOW))), '2026-11-06')
    assert.equal(backupDay('backups/other.txt'), null)
})

test('the last 14 days stay, older ones go, but a Sunday is kept for 12 weeks', () => {
    const keys = [k(2026, 11, 6), k(2026, 10, 24), k(2026, 10, 22), k(2026, 10, 18) /* Sunday, 19 days old */, k(2026, 8, 30) /* Sunday, 68 days */, k(2026, 8, 31) /* Monday, 67 days */, k(2026, 5, 3) /* Sunday, > 12 weeks */]
    const gone = pickDeletes(keys, NOW)
    assert.deepEqual(gone.sort(), [k(2026, 5, 3), k(2026, 8, 31), k(2026, 10, 22)].sort())
})

test('files that are not backups are never deleted', () => {
    assert.deepEqual(pickDeletes(['backups/notes.txt', 'backups/'], NOW), [])
})

test('a backup is late after 36 hours', () => {
    assert.equal(backupLate(NOW - 10 * 3600000, NOW), false)
    assert.equal(backupLate(NOW - 40 * 3600000, NOW), true)
    assert.equal(backupLate(0, NOW), true)
})

import { createHash } from 'node:crypto'

/**
 * Deterministic ObjectId for an imported Perfex row.
 * oid('clients', 12) always returns the same 24-hex string, so the importer can
 * compute foreign keys without lookups and can be re-run idempotently.
 */
export const oid = (table, legacyId) => {
    if (legacyId === null || legacyId === undefined || legacyId === '') return null
    return createHash('sha1')
        .update(`perfex:${table}:${legacyId}`)
        .digest('hex')
        .slice(0, 24)
}

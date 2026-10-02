# Importing the TRT Perfex data into trtApp

Source of truth: the MySQL dump (`u740321864_trtcrm.sql`, 217 tables, ~51k rows). Nothing in this repo
contains real data.

```bash
# 1. dry run: parses the dump, runs every mapper, writes perfex-import-report.json. No DB access.
node scripts/perfex-import/run.mjs /path/to/u740321864_trtcrm.sql

# 2. read the report: totals, `unmappedTables` (kept verbatim in crm_legacy_rows), per-table errors.

# 3. apply (needs DATABASE_URL pointing at an EMPTY/staging MongoDB first; idempotent, re-runnable)
npx prisma generate && npx prisma db push
node scripts/perfex-import/run.mjs /path/to/dump.sql --apply

# 4. create login users for staff (inactive staff are linked but can never sign in)
node scripts/perfex-import/link-staff.mjs            # users must use "Forgot password"
```
Flags: `--only a,b`, `--skip a,b`, `--prefix tbl`, `--keep-passwords` (keeps staff/contact password hashes and
settings secrets; default is to null them), `--report file`.

Acceptance checks after `--apply` (compare with `docs/perfex-backup-analysis.md` in trtCRMMaroc):
clients 102, contacts 90, staff 10, leads 317, projects 15, tasks 533, invoices 445, payments 399, estimates 89,
proposals 360, contracts 37, expenses 1,122, tickets 68, custom fields 22 / values 429. Then per-currency
invoice totals vs `report.private.json`. 

Attachments (516 files) are NOT in the dump: copy the original upload folders to the new file storage and
point `CrmFile`/`CrmProjectFile`/`CrmTicketAttachment` paths at them (11 ticket files are known missing).

## Verified so far
Parser, all mappers and the generic CRUD layer are tested against synthetic rows only. The Perfex DDL was
written from knowledge of Perfex 3.4, NOT from the real dump — run the dry run first and review
`assumptions` listed in `docs/perfex/COVERAGE.md`.

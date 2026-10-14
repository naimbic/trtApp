# Deploying trtCRM on Coolify (test sub-domain first)

## Simple way: one `Dockerfile` (build pack "Dockerfile")
Application from the repo, branch `staging`, build pack **Dockerfile**, Dockerfile location `/Dockerfile`, port **80**,
domain on the app. The image contains MongoDB (single-node replica set), the API and the web app.
Storages (Coolify -> Storages): `/data/db` (database) and `/app/storage` (logos/signatures) - without them the data is lost on redeploy.
Environment variables: `PUBLIC_URL`, `AUTH_SECRET`, `DO_SPACES_*` (see below). Restore data with `mongorestore` inside the same container.
The compose files below are the alternative for a separate database container.

Files: `docker-compose.coolify.yml`, `Dockerfile.api`, `Dockerfile.web`, `nginx.conf`.
Services: `mongo` (single-node replica set, needed by Prisma), `api` (Next.js, includes Chromium for PDFs), `web` (nginx: the SPA + proxy of `/api` and `/s/*` to the API).

## 1. Create the app
1. Coolify -> New Resource -> Docker Compose -> pick the repo/branch (build pack: Docker Compose, file `docker-compose.coolify.yml`).
2. Domain: give `https://crm-test.<your-domain>` to the **web** service (port 80). DNS: an A record for the sub-domain to the Hetzner IP.
3. Environment variables:
   - `PUBLIC_URL` = `https://crm-test.<your-domain>` (used for links in emails, portal, short links)
   - `AUTH_SECRET` = a NEW long random value (`openssl rand -base64 48`). Keep it: changing it signs everybody out and
     makes the encrypted password-vault entries unreadable.
   - `DB_NAME` = `trtapp_real` (default)
   - `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET`, `DO_SPACES_REGION` (same bucket = shared uploads; use a test bucket if you do not want the test to touch live files)
   - optional: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
4. Deploy. First build takes several minutes; the server needs ~4 GB of free RAM for the web build.

## 2. Put the data in
Option A (recommended for the test) - copy the working local database (keeps everything done in trtCRM: vault, chat, KB, settings):
```bash
# on the Mac (Mongo on :27019)
mongodump --uri "mongodb://127.0.0.1:27019/trtapp_real?replicaSet=rs0&directConnection=true" --archive=trtapp_real.gz --gzip
scp trtapp_real.gz root@<hetzner>:/tmp/
# on the server
docker cp /tmp/trtapp_real.gz $(docker ps -qf name=mongo):/tmp/
docker exec $(docker ps -qf name=mongo) mongorestore --archive=/tmp/trtapp_real.gz --gzip --nsFrom 'trtapp_real.*' --nsTo 'trtapp_real.*'
```
Option B - a fresh import from a new Perfex SQL dump of the live trtcrm.com (see `docs/perfex/IMPORT.md`; it is idempotent).
Do this again right before going live to pick up the latest live data.

Files: copy the company logo/signature folder into the `storage` volume (`/app/storage/company`) if the PDFs need them.

## 3. Safety while testing with real data
- Outgoing email uses the SMTP settings stored in the database. If you restored real settings, anything you "Send" in the
  test will email real clients. Change Setup -> Mail settings to a test mailbox first.
- The cron job only runs when something calls the cron endpoint, so nothing runs automatically (leave `cron_enabled` off).
- Staff passwords: log in with your own account; others use "Forgot password" if needed.

## 4. Go live
Point the real domain to the same app (or re-deploy with `PUBLIC_URL` = live domain), re-import the latest Perfex data,
turn on cron and mail, and switch DNS.

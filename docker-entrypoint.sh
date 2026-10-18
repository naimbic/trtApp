#!/bin/bash
set -e
mkdir -p /data/db
mongod --replSet rs0 --bind_ip 127.0.0.1 --dbpath /data/db --fork --logpath /var/log/mongod.log --quiet
for i in $(seq 1 30); do mongosh --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q 1 && break; sleep 1; done
mongosh --quiet --eval "try { rs.status().ok } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]}) }" >/dev/null
for i in $(seq 1 30); do mongosh --quiet --eval "db.hello().isWritablePrimary" 2>/dev/null | grep -q true && break; sleep 1; done
# A dev copy with its own empty database: DEMO_SEED=1 creates the tables, the admin login and three years of demo data (once; every step is safe to repeat)
if [ "$DEMO_SEED" = "1" ]; then
  npx prisma db push --skip-generate || true
  node scripts/admin-user.mjs || true
  node scripts/seed-crm-team.mjs || true
  node scripts/seed-crm-demo.mjs --years "${DEMO_YEARS:-3}" || true
fi
nginx
exec npx next start -H 0.0.0.0 -p 3001

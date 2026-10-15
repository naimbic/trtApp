# trtCRM all-in-one image for Coolify (build pack "Dockerfile"): MongoDB (single-node replica set) + API + web app (nginx).
# Add a persistent storage in Coolify: /data/db  (database)  and /app/storage (logos, signatures).

# ---- web app (Vite) ----
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY src/lib/crm ./src/lib/crm
COPY web ./web
WORKDIR /app/web
RUN npm install --no-audit --no-fund
ARG SOURCE_COMMIT=
ENV SOURCE_COMMIT=$SOURCE_COMMIT
RUN NODE_OPTIONS=--max-old-space-size=3072 npx vite build

# ---- API (Next.js + Prisma) ----
FROM node:22-bookworm-slim AS api
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl gnupg nginx chromium fonts-liberation \
 && curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-7.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/mongodb-7.gpg] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list \
 && apt-get update && apt-get install -y --no-install-recommends mongodb-org-server mongodb-mongosh \
 && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default
WORKDIR /app
ENV NODE_ENV=production CHROME_PATH=/usr/bin/chromium PORT=3001 AUTH_TRUST_HOST=true \
    DATABASE_URL="mongodb://127.0.0.1:27017/trtapp_real?replicaSet=rs0&directConnection=true"
COPY --from=api /app/package.json /app/package-lock.json ./
COPY --from=api /app/node_modules ./node_modules
COPY --from=api /app/.next ./.next
COPY --from=api /app/prisma ./prisma
COPY --from=api /app/messages ./messages
COPY --from=api /app/next.config.mjs ./next.config.mjs
COPY --from=api /app/scripts ./scripts
COPY --from=api /app/src/lib/crm/permissionCatalog.js ./src/lib/crm/permissionCatalog.js
COPY --from=api /app/src/lib/crm/standardRoles.js ./src/lib/crm/standardRoles.js
COPY --from=web /app/web/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's#http://api:3000#http://127.0.0.1:3001#g; s#listen 80;#listen 80; listen 3000;#' /etc/nginx/conf.d/default.conf \
 && mkdir -p /data/db data-backups storage/company && chmod +x /docker-entrypoint.sh
EXPOSE 80 3000
CMD ["/docker-entrypoint.sh"]
